import test from 'node:test';
import assert from 'node:assert/strict';
import { faroFixture, offerInput } from './faro-fixture.js';
import { AssessmentService } from '../server/faro/assessmentService.js';
import { TrustService } from '../server/faro/trustService.js';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { JobDatabase } from '../server/db.js';

async function assessmentSetup() {
  const f = await faroFixture();
  const employer = await f.user('AssessEmployer'), candidate = await f.user('AssessCandidate'), admin = await f.user('AssessAdmin');
  f.app.db.db.prepare("UPDATE users SET role='ADMIN' WHERE id=?").run(admin.id);
  const org = await f.request<{ id: string }>('/api/faro/organizations', employer.cookie, 'POST', { name: 'Assessment Org' }, 201);
  await f.request(`/api/faro/organizations/${org.id}/verify`, admin.cookie, 'POST', { note: 'Fixture verification for assessment tests' });
  await f.request('/api/faro/profile', candidate.cookie, 'PUT', { firstName: 'AssessCandidate', expectedVersion: 0, availability: { kind: 'IMMEDIATE' } });
  const draft = await f.request<{ id: string }>(`/api/faro/organizations/${org.id}/offers`, employer.cookie, 'POST', offerInput(employer.id), 201);
  await f.request(`/api/faro/offers/${draft.id}/lifecycle`, employer.cookie, 'POST', { action: 'REVIEW', expectedVersion: 1 });
  const offer = await f.request<{ id: string; version: number; revision: number }>(`/api/faro/offers/${draft.id}/lifecycle`, employer.cookie, 'POST', { action: 'PUBLISH', expectedVersion: 2, confirmed: true });
  const preview = await f.request<{confirmationToken:string}>('/api/faro/profile/preview-confirmation', candidate.cookie);
  const interest = await f.request<{ id: string }>(`/api/faro/offers/${offer.id}/interest`, candidate.cookie, 'POST', { offerVersion: 1, projectionConfirmed: true, confirmationToken:preview.confirmationToken, idempotencyKey: 'assessment-interest' }, 201);
  await f.request(`/api/faro/processes/${interest.id}/commands`, employer.cookie, 'POST', { command: 'ADVANCE', nextAction: 'Ukończ assessment', dueAt: new Date(Date.now() + 86_400_000).toISOString(), expectedVersion: 1, idempotencyKey: 'assessment-advance' });
  return { ...f, employer, candidate, admin, org, offer, interest };
}

test('open answer stays unscored until scoped human rubric review, preserves missing answers and pinned evidence through amendments',async()=>{
  const f=await assessmentSetup();try {
    const s=new AssessmentService(f.app.db),input={type:'OPEN_ANSWER',title:'Ręczna odpowiedź',timeLimitMinutes:5,expectedMinutes:3,rubricVersion:'human-r1',tasks:[{prompt:'Opisz następny krok.',evaluationCriteria:'0: brak uzasadnienia; 1: krok; 2: krok i uzasadnienie.',points:2},{prompt:'Opisz alternatywę.',evaluationCriteria:'0: nieadekwatna; 1: adekwatna alternatywa.',points:1}]};
    for(const bad of [{...input,type:'CODE'},{...input,scoringMode:'OBJECTIVE'},{...input,tasks:[{...input.tasks[0],evaluationCriteria:''}]},{...input,tasks:[{...input.tasks[0],options:['A','B'],answer:0}]}])assert.throws(()=>s.create(f.employer.id,f.offer.id,bad));
    const d=s.create(f.employer.id,f.offer.id,input);s.approve(f.employer.id,d.id,{version:1,action:'REVIEW'});s.approve(f.employer.id,d.id,{version:1,action:'APPROVE',confirmed:true});
    const a=s.assign(f.employer.id,f.interest.id,{assessmentId:d.id,version:1,deadline:new Date(Date.now()+86400000).toISOString(),expectedVersion:2,idempotencyKey:'open-assign'});
    const initial=s.overview(f.candidate.id,a.id);assert.equal(initial.type,'OPEN_ANSWER');assert.equal(initial.scoringMode,'HUMAN');assert.equal(initial.tasks.length,0);
    s.start(f.candidate.id,a.id);const started=s.row(a.id).expires_at;
    for(const answers of [{'task-1':0},{'task-1':''},{'task-1':'a'.repeat(5001)},{foreign:'text'}])assert.throws(()=>s.save(f.candidate.id,a.id,{expectedVersion:s.row(a.id).revision,answers},false));
    const answer='<script>not executable</script> Proponuję krok i jego uzasadnienie.';
    s.save(f.candidate.id,a.id,{expectedVersion:s.row(a.id).revision,answers:{'task-1':answer}},false);
    assert.equal(s.overview(f.employer.id,a.id).reviewTasks.length,0);assert.equal(s.row(a.id).expires_at,started);
    s.save(f.candidate.id,a.id,{expectedVersion:s.row(a.id).revision,answers:{'task-1':answer}},true);
    const pending=s.overview(f.employer.id,a.id);assert.equal((pending.result as {earned:unknown}).earned,null);assert.equal((pending.result as {unanswered:number}).unanswered,1);assert.equal(pending.reviewTasks[0]!.chosenText,answer);assert.equal(pending.reviewTasks[0]!.correctOption,null);assert.equal(s.overview(f.candidate.id,a.id).result,null);
    s.edit(f.employer.id,d.id,1,{expectedVersion:1,idempotencyKey:'open-edit',data:{...input,rubricVersion:'human-r2',tasks:input.tasks.map(t=>({...t,evaluationCriteria:'Nowe kryteria przyszłej wersji, nie tej próby.'}))}});
    assert.equal(s.overview(f.employer.id,a.id).reviewTasks[0]!.evaluationCriteria,input.tasks[0]!.evaluationCriteria);
    const body={expectedVersion:pending.revision,processVersion:pending.processVersion,confirmed:true,note:'Ręcznie oceniono odpowiedź według przypisanej rubryki.',idempotencyKey:'open-review'};
    for(const scores of [undefined,{'task-1':2},{'task-1':3,'task-2':null},{'task-1':1.5,'task-2':null},{'task-1':2,'task-2':0}])assert.throws(()=>s.finalize(f.employer.id,a.id,{...body,scores}));
    await f.request(`/api/faro/attempts/${a.id}/review`,f.candidate.cookie,'POST',{...body,scores:{'task-1':2,'task-2':null}},404);
    s.finalize(f.employer.id,a.id,{...body,scores:{'task-1':2,'task-2':null}});
    const final=s.overview(f.candidate.id,a.id);assert.equal((final.result as {earned:number}).earned,2);assert.equal((final.result as {unanswered:number}).unanswered,1);assert.equal(s.row(a.id).answers,JSON.stringify({'task-1':answer}));
    assert.throws(()=>s.keyCorrectionPreview(f.employer.id,d.id,1,{acceptedOptions:{},reason:'Nie ma obiektywnego klucza odpowiedzi.'}),/ręcznego/);
    s.amendResult(f.employer.id,a.id,{expectedVersion:final.revision,processVersion:final.processVersion,confirmed:true,reason:'Ręczna korekta zachowuje pierwotną rubrykę i odpowiedź.',scores:{'task-1':1,'task-2':null},idempotencyKey:'open-amend'});
    const amended=s.overview(f.candidate.id,a.id);assert.equal((amended.result as {earned:number}).earned,1);assert.equal(amended.resultHistory.length,2);assert.equal(s.recruitment.row(f.interest.id).status,'ACTIVE');
    const original=JSON.parse(s.row(a.id).result!) as {earned:number};assert.equal(original.earned,2);
    const exported=await f.request('/api/export',f.candidate.cookie);assert.ok(JSON.stringify(exported).includes(answer));
    await f.request('/api/account',f.candidate.cookie,'DELETE',{password:'Bezpieczne123',confirmation:'USUŃ KONTO'});
    for(const table of ['faro_attempts','faro_result_history'])assert.equal(f.app.db.db.prepare(`SELECT COUNT(*) n FROM ${table} WHERE ${table==='faro_attempts'?'id':'attempt_id'}=?`).get(a.id)!.n,0);
  }finally{await f.close();}
});

test('cohort key correction previews the complete pinned group, fences changes and live attempts, preserves invalid evidence and decisions',async()=>{
  const f=await assessmentSetup();try {
    const s=new AssessmentService(f.app.db),d=s.create(f.employer.id,f.offer.id,{title:'Shared key',timeLimitMinutes:5,expectedMinutes:2,rubricVersion:'cohort-r1',tasks:[{prompt:'Q1',options:['A','B'],answer:1,points:2},{prompt:'Q2',options:['C','D'],answer:0,points:3}]});
    s.approve(f.employer.id,d.id,{version:1,action:'REVIEW'});s.approve(f.employer.id,d.id,{version:1,action:'APPROVE',confirmed:true});
    const enroll=async(name:string)=>{
      const u=await f.user(name);await f.request('/api/faro/profile',u.cookie,'PUT',{firstName:name,expectedVersion:0,availability:{kind:'IMMEDIATE'}});
      const preview=await f.request<{confirmationToken:string}>('/api/faro/profile/preview-confirmation',u.cookie);
      const p=await f.request<{id:string}>(`/api/faro/offers/${f.offer.id}/interest`,u.cookie,'POST',{offerVersion:1,projectionConfirmed:true,confirmationToken:preview.confirmationToken,idempotencyKey:`cohort-interest-${name}`},201);
      s.recruitment.change(f.employer.id,p.id,{command:'ADVANCE',expectedVersion:1,nextAction:'Ukończ syntetyczny test',dueAt:new Date(Date.now()+86400000).toISOString(),idempotencyKey:`cohort-advance-${name}`});return {u,p};
    };
    const second=await enroll('CohortSecond'),third=await enroll('CohortThird');
    const invite=(processId:string)=>s.assign(f.employer.id,processId,{assessmentId:d.id,version:1,deadline:new Date(Date.now()+86400000).toISOString(),expectedVersion:2,idempotencyKey:`cohort-assign-${processId}`});
    const a=invite(f.interest.id),b=invite(second.p.id),c=invite(third.p.id);
    const finish=(userId:string,id:string,answers:Record<string,number>)=>{s.start(userId,id);s.save(userId,id,{expectedVersion:s.row(id).revision,answers},true);s.finalize(f.employer.id,id,{expectedVersion:s.row(id).revision,processVersion:s.recruitment.row(s.row(id).process_id).revision,confirmed:true,note:'Sprawdzono pierwotny klucz i odpowiedzi.',idempotencyKey:`cohort-finalize-${id}`});};
    finish(f.candidate.id,a.id,{'task-1':0});
    const path=`/api/faro/assessments/${d.id}/versions/1/key-correction`,input={acceptedOptions:{'task-1':[0],'task-2':[0]},reason:'Wspólny przegląd poprawia błędny klucz zadania pierwszego.'};
    for(const acceptedOptions of [{'task-1':[],'task-2':[0]},{'task-1':[0,0],'task-2':[0]},{'task-1':[2],'task-2':[0]},{'task-1':[0.5],'task-2':[0]},{'task-1':[0]},{'task-1':[0],'task-2':[0],extra:[0]}])await f.request(path+'/preview',f.employer.cookie,'POST',{...input,acceptedOptions},400);
    type Preview=ReturnType<AssessmentService['keyCorrectionPreview']>;
    const early=await f.request<Preview>(path+'/preview',f.employer.cookie,'POST',input);assert.equal(early.blocked,true);assert.equal(early.attempts.length,3);
    await f.request(path,f.employer.cookie,'POST',{...input,previewToken:early.token,confirmed:true,idempotencyKey:'cohort-early'},409);
    finish(second.u.id,b.id,{'task-1':1});finish(third.u.id,c.id,{});
    s.invalidateResult(f.employer.id,c.id,{expectedVersion:s.row(c.id).revision,processVersion:s.recruitment.row(third.p.id).revision,confirmed:true,reasonCode:'TECHNICAL_INCIDENT',reason:'Potwierdzono odrębny problem techniczny trzeciej próby.',idempotencyKey:'cohort-invalid'});
    const stale=await f.request<Preview>(path+'/preview',f.employer.cookie,'POST',input);
    s.amendResult(f.employer.id,a.id,{expectedVersion:s.row(a.id).revision,processVersion:s.recruitment.row(f.interest.id).revision,confirmed:true,reason:'Indywidualnie przyznano punkt w pierwotnym review.',scores:{'task-1':1,'task-2':null},idempotencyKey:'cohort-manual'});
    await f.request(path,f.employer.cookie,'POST',{...input,previewToken:stale.token,confirmed:true,idempotencyKey:'cohort-stale'},409);
    const preview=await f.request<Preview>(path+'/preview',f.employer.cookie,'POST',input);assert.equal(preview.affected,2);assert.equal(preview.manualCount,1);assert.equal(preview.blocked,false);assert.equal(preview.attempts.find(x=>x.id===c.id)!.after,null);
    const body={...input,previewToken:preview.token,confirmed:true,idempotencyKey:'cohort-apply'};
    for(const cookie of [f.candidate.cookie,f.admin.cookie]) {await f.request(path+'/preview',cookie,'POST',input,404);await f.request(path,cookie,'POST',body,404);}
    await f.request(path,f.employer.cookie,'POST',body,400);assert.equal(f.app.db.db.prepare('SELECT COUNT(*) n FROM faro_key_corrections').get()!.n,0);
    const originals=[a,b,c].map(x=>({...s.row(x.id)})),processes=[f.interest.id,second.p.id,third.p.id].map(id=>({...s.recruitment.row(id)})),definition={...s.definition(d.id,1)};
    const command={...body,replaceIndividualAmendments:true},ack=await f.request<{correctionId:string;affected:number}>(path,f.employer.cookie,'POST',command);assert.equal(ack.affected,2);
    assert.deepEqual(await f.request(path,f.employer.cookie,'POST',command),ack);assert.equal(f.app.db.db.prepare('SELECT COUNT(*) n FROM faro_key_corrections').get()!.n,1);
    [a,b,c].forEach((x,i)=>assert.deepEqual({...s.row(x.id)},{...originals[i],revision:originals[i]!.revision+(i<2?1:0)}));
    [f.interest.id,second.p.id,third.p.id].forEach((id,i)=>assert.deepEqual({...s.recruitment.row(id)},processes[i]));assert.deepEqual({...s.definition(d.id,1)},definition);
    assert.equal(s.overview(f.candidate.id,a.id).result!.earned,2);assert.equal(s.overview(second.u.id,b.id).result!.earned,0);assert.equal(s.overview(third.u.id,c.id).result,null);
    assert.equal(s.overview(f.candidate.id,a.id).result!.scoringRevision,ack.correctionId);assert.equal(s.overview(f.candidate.id,a.id).result!.unanswered,1);assert.equal(s.resultHistory(a.id)[0]!.result.earned,0);assert.equal(s.resultHistory(a.id)[1]!.result.earned,1);
    assert.doesNotMatch(JSON.stringify(s.overview(f.candidate.id,a.id)),/acceptedOptions|correctOption|actor_id/);
    assert.equal(f.app.db.db.prepare("SELECT COUNT(*) n FROM faro_events WHERE kind='ASSESSMENT_COHORT_CORRECTED'").get()!.n,2);
    const fourth=await enroll('CohortFuture');assert.throws(()=>invite(fourth.p.id),/nową zatwierdzoną wersję/);
    s.recruitment.change(f.candidate.id,f.interest.id,{command:'WITHDRAW',expectedVersion:s.recruitment.row(f.interest.id).revision,idempotencyKey:'cohort-withdraw'});
    const nextInput={...input,acceptedOptions:{'task-1':[0,1],'task-2':[0]}};const next=s.keyCorrectionPreview(f.employer.id,d.id,1,nextInput);
    s.correctCohortKey(f.employer.id,d.id,1,{...nextInput,previewToken:next.token,confirmed:true,idempotencyKey:'cohort-second'});assert.equal(s.recruitment.row(f.interest.id).status,'WITHDRAWN');assert.equal(s.overview(second.u.id,b.id).result!.earned,2);
    f.app.db.db.prepare('DELETE FROM faro_assignments WHERE offer_id=? AND user_id=?').run(f.offer.id,f.employer.id);await f.request(path,f.employer.cookie,'POST',command,404);
    await f.request('/api/account',f.candidate.cookie,'DELETE',{confirmation:'USUŃ KONTO',password:'Bezpieczne123'});assert.equal(s.resultHistory(a.id).length,0);assert.equal(f.app.db.db.prepare('PRAGMA foreign_key_check').all().length,0);
  }finally{await f.close();}
});

test('human amendment preserves pinned original evidence, missing answers and terminal decisions with fresh scoped replay',async()=>{
  const f=await assessmentSetup();try {
    const s=new AssessmentService(f.app.db),d=s.create(f.employer.id,f.offer.id,{title:'Manual review',timeLimitMinutes:5,expectedMinutes:2,rubricVersion:'pinned-review',tasks:[{prompt:'Q1',options:['A','B'],answer:1,points:2},{prompt:'Q2',options:['C','D'],answer:0,points:3}]});
    s.approve(f.employer.id,d.id,{version:1,action:'REVIEW'});s.approve(f.employer.id,d.id,{version:1,action:'APPROVE',confirmed:true});
    const a=s.assign(f.employer.id,f.interest.id,{assessmentId:d.id,version:1,deadline:new Date(Date.now()+86400000).toISOString(),expectedVersion:2,idempotencyKey:'amend-assign'});
    s.start(f.candidate.id,a.id);s.save(f.candidate.id,a.id,{expectedVersion:s.row(a.id).revision,answers:{'task-1':0}},true);
    const path=`/api/faro/attempts/${a.id}/amend-result`,command=()=>({expectedVersion:s.row(a.id).revision,processVersion:s.recruitment.row(f.interest.id).revision,confirmed:true,reason:'Ręczny przegląd przyznaje punkt za częściowo poprawną odpowiedź.',scores:{'task-1':1,'task-2':null},idempotencyKey:'amend-once'});
    await f.request(path,f.employer.cookie,'POST',command(),409);
    s.finalize(f.employer.id,a.id,{expectedVersion:s.row(a.id).revision,processVersion:s.recruitment.row(f.interest.id).revision,confirmed:true,note:'Sprawdzono pierwotny wynik i odpowiedzi.',idempotencyKey:'amend-finalize'});
    s.recruitment.change(f.candidate.id,f.interest.id,{command:'WITHDRAW',expectedVersion:s.recruitment.row(f.interest.id).revision,idempotencyKey:'amend-withdraw'});
    const original={...s.row(a.id)},process={...s.recruitment.row(f.interest.id)},definition={...s.definition(d.id,1)},body=command();
    for(const cookie of [f.candidate.cookie,f.admin.cookie])await f.request(path,cookie,'POST',body,404);
    await f.request(path,f.employer.cookie,'POST',{...body,confirmed:false},400);
    await f.request(path,f.employer.cookie,'POST',{...body,expectedVersion:1},409);
    await f.request(path,f.employer.cookie,'POST',{...body,processVersion:1},409);
    for(const scores of [{'task-1':3,'task-2':null},{'task-1':1.5,'task-2':null},{'task-1':1,'task-2':0},{'task-1':1},{'task-1':1,'task-2':null,extra:0}])await f.request(path,f.employer.cookie,'POST',{...body,scores},400);
    assert.equal(s.resultHistory(a.id).length,1);
    const updated=await f.request<ReturnType<AssessmentService['overview']>>(path,f.employer.cookie,'POST',body);
    assert.equal(updated.result!.earned,1);assert.equal(updated.result!.possible,5);assert.equal(updated.result!.unanswered,1);assert.equal(updated.result!.review,'AMENDED');
    assert.deepEqual({...s.row(a.id)},{...original,revision:original.revision+1});assert.deepEqual({...s.definition(d.id,1)},definition);assert.deepEqual({...s.recruitment.row(f.interest.id)},process);
    assert.equal(updated.resultHistory[0]!.result.earned,0);assert.equal(updated.resultHistory[1]!.reason,body.reason);
    const replay=await f.request<ReturnType<AssessmentService['overview']>>(path,f.employer.cookie,'POST',body);assert.deepEqual({...replay,serverNow:updated.serverNow},updated);assert.ok(replay.serverNow>=updated.serverNow);
    await f.request(path,f.employer.cookie,'POST',{...body,reason:'Odnowione uzasadnienie tego samego klucza.'},409);
    const candidate=s.overview(f.candidate.id,a.id);assert.equal(candidate.result!.earned,1);assert.doesNotMatch(JSON.stringify(candidate),/correctOption|reviewer_id/);
    const events=f.app.db.db.prepare("SELECT id FROM faro_events WHERE process_id=? AND kind='ASSESSMENT_RESULT_AMENDED'").all(process.id);assert.equal(events.length,1);
    assert.equal(f.app.db.db.prepare('SELECT COUNT(*) n FROM faro_outbox WHERE dedupe_key=?').get(String(events[0]!.id))!.n,2);
    const exported=await f.request<{faro:{faro_result_history:unknown[]}}>('/api/export',f.candidate.cookie);assert.equal(exported.faro.faro_result_history.length,2);
    s.invalidateResult(f.employer.id,a.id,{...command(),reasonCode:'KEY_ERROR',idempotencyKey:'amend-invalid'});assert.equal(s.resultHistory(a.id).at(-1)!.result.earned,1);assert.equal(s.overview(f.candidate.id,a.id).result,null);
    await f.request(path,f.employer.cookie,'POST',body);assert.equal(s.overview(f.candidate.id,a.id).result,null); // Replay is freshly projected, never stale cached valid evidence.
    f.app.db.db.prepare('DELETE FROM faro_assignments WHERE offer_id=? AND user_id=?').run(f.offer.id,f.employer.id);await f.request(path,f.employer.cookie,'POST',body,404);
    await f.request('/api/account',f.candidate.cookie,'DELETE',{confirmation:'USUŃ KONTO',password:'Bezpieczne123'});assert.equal(s.resultHistory(a.id).length,0);assert.equal(f.app.db.db.prepare('PRAGMA foreign_key_check').all().length,0);
  }finally{await f.close();}
});

test('technical retry creates a pinned separate lineage, preserves original evidence and clocks, scopes replay and cascades privacy',async()=>{
  const f=await assessmentSetup();try {
    const s=new AssessmentService(f.app.db),d=s.create(f.employer.id,f.offer.id,{title:'Retry synthetic',timeLimitMinutes:5,expectedMinutes:2,rubricVersion:'retry-1',tasks:[{prompt:'Q',options:['A','B'],answer:1,points:2}]});
    s.approve(f.employer.id,d.id,{version:1,action:'REVIEW'});s.approve(f.employer.id,d.id,{version:1,action:'APPROVE',confirmed:true});
    const a=s.assign(f.employer.id,f.interest.id,{assessmentId:d.id,version:1,deadline:new Date(Date.now()+86400000).toISOString(),expectedVersion:2,idempotencyKey:'retry-assign'});
    s.start(f.candidate.id,a.id);s.save(f.candidate.id,a.id,{expectedVersion:s.row(a.id).revision,answers:{'task-1':1}},false);
    const baseBody=()=>({expectedVersion:s.row(a.id).revision,processVersion:s.recruitment.row(f.interest.id).revision});
    const path=`/api/faro/attempts/${a.id}/retry`,deadline=new Date(Date.now()+172800000).toISOString();
    const body={...baseBody(),deadline,reason:'Potwierdzona awaria; osobna próba bez resetu historii.',confirmed:true,idempotencyKey:'retry-command'};
    await f.request(path,f.employer.cookie,'POST',body,409);
    s.reportIncident(f.candidate.id,a.id,{...baseBody(),idempotencyKey:'retry-report',category:'ANSWER_SAVE',statement:'Syntetyczny problem techniczny zapisu odpowiedzi.',confirmed:true});
    s.resolveIncident(f.employer.id,a.id,{...baseBody(),incidentVersion:1,idempotencyKey:'retry-resolve',resolution:'ISSUE_CONFIRMED',reason:'Potwierdzono syntetyczny problem techniczny.',confirmed:true});
    const original={...s.row(a.id)},originalIncident=s.incident(a.id),process={...s.recruitment.row(f.interest.id)};
    // An unrelated newer draft must not alter the pinned approved definition used for recovery.
    s.create(f.employer.id,f.offer.id,{title:'New draft',timeLimitMinutes:1,expectedMinutes:1,rubricVersion:'different',tasks:[{prompt:'Other',options:['C','D'],answer:0,points:9}]},d.id);
    const retry={...body,...baseBody()};
    for(const cookie of [f.candidate.cookie,f.admin.cookie])await f.request(path,cookie,'POST',retry,404);
    f.app.db.db.prepare("UPDATE faro_members SET role='HIRING_MANAGER' WHERE organization_id=? AND user_id=?").run(f.org.id,f.employer.id);
    assert.equal(s.overview(f.employer.id,a.id).canRetry,false);await f.request(path,f.employer.cookie,'POST',retry,404);
    f.app.db.db.prepare("UPDATE faro_members SET role='OWNER' WHERE organization_id=? AND user_id=?").run(f.org.id,f.employer.id);
    f.app.db.db.prepare("UPDATE faro_interests SET status='WITHDRAWN' WHERE id=?").run(f.interest.id);
    await f.request(path,f.employer.cookie,'POST',retry,409);assert.deepEqual({...s.row(a.id)},original);
    f.app.db.db.prepare("UPDATE faro_interests SET status='ACTIVE' WHERE id=?").run(f.interest.id);
    await f.request(path,f.employer.cookie,'POST',{...retry,expectedVersion:1},409);
    await f.request(path,f.employer.cookie,'POST',{...retry,confirmed:false},400);
    await f.request(path,f.employer.cookie,'POST',{...retry,deadline:'2000-01-01T00:00:00.000Z'},400);
    const next=await f.request<ReturnType<AssessmentService['overview']>>(path,f.employer.cookie,'POST',retry,201);
    assert.equal(next.state,'INVITED');assert.equal(next.attemptNumber,2);assert.equal(next.retryOf,a.id);assert.equal(next.rubricVersion,'retry-1');assert.equal(next.startedAt,null);assert.equal(next.expiresAt,null);assert.equal(next.result,null);
    assert.deepEqual({...s.row(a.id)},original);assert.deepEqual(s.incident(a.id),originalIncident);
    assert.equal(s.recruitment.row(f.interest.id).first_response_at,process.first_response_at);assert.equal(s.recruitment.row(f.interest.id).response_due_at,process.response_due_at);assert.equal(s.recruitment.row(f.interest.id).snapshot,process.snapshot);
    const replay=await f.request<ReturnType<AssessmentService['overview']>>(path,f.employer.cookie,'POST',retry,201);assert.equal(replay.id,next.id);
    await f.request(path,f.employer.cookie,'POST',{...retry,reason:'Zmienione uzasadnienie ponowienia.'},409);
    await f.request(path,f.employer.cookie,'POST',{...retry,...baseBody(),idempotencyKey:'another-retry'},409);
    assert.equal(s.overview(f.candidate.id,a.id).retryAttemptId,next.id);assert.equal(s.overview(f.employer.id,a.id).canRetry,false);
    const started=s.start(f.candidate.id,next.id);assert.equal(started.state,'STARTED');assert.deepEqual(started.answers,{});assert.equal(started.tasks[0]!.prompt,'Q');assert.deepEqual({...s.row(a.id)},original);
    const events=f.app.db.db.prepare("SELECT id,data FROM faro_events WHERE kind='ATTEMPT_RETRY_AUTHORIZED'").all();assert.equal(events.length,1);assert.doesNotMatch(events[0]!.data as string,/Potwierdzona|osobna próba/);
    assert.equal(f.app.db.db.prepare('SELECT COUNT(*) n FROM faro_outbox WHERE dedupe_key=?').get(events[0]!.id!)!.n,2);
    const own=await f.request<{faro:{faro_attempts:Array<{id:string;retry_of:string|null}>}}>('/api/export',f.candidate.cookie);assert.equal(own.faro.faro_attempts.find(r=>r.id===next.id)!.retry_of,a.id);
    assert.doesNotMatch(JSON.stringify(own.faro.faro_attempts),/retry_authorized_by|reviewer_id/);
    f.app.db.db.prepare('UPDATE faro_members SET active=0 WHERE organization_id=? AND user_id=?').run(f.org.id,f.employer.id);await f.request(path,f.employer.cookie,'POST',retry,404);
    await f.request('/api/account',f.candidate.cookie,'DELETE',{confirmation:'USUŃ KONTO',password:'Bezpieczne123'});assert.equal(f.app.db.db.prepare('SELECT COUNT(*) n FROM faro_attempts').get()!.n,0);assert.deepEqual(f.app.db.db.prepare('PRAGMA foreign_key_check').all(),[]);
  }finally{await f.close();}
});

test('0031 upgrade preserves old attempts and cascading incident/result children with foreign keys restored',async()=>{
  const f=await assessmentSetup();let upgraded:JobDatabase|undefined;
  try {
    const s=new AssessmentService(f.app.db),d=s.create(f.employer.id,f.offer.id,{title:'Migration synthetic',timeLimitMinutes:5,expectedMinutes:1,rubricVersion:'migration-1',tasks:[{prompt:'Q',options:['A','B'],answer:0,points:1}]});
    s.approve(f.employer.id,d.id,{version:1,action:'REVIEW'});s.approve(f.employer.id,d.id,{version:1,action:'APPROVE',confirmed:true});
    const a=s.assign(f.employer.id,f.interest.id,{assessmentId:d.id,version:1,deadline:new Date(Date.now()+86400000).toISOString(),expectedVersion:2,idempotencyKey:'migration-assign'});
    s.start(f.candidate.id,a.id);s.reportIncident(f.candidate.id,a.id,{expectedVersion:2,processVersion:3,idempotencyKey:'migration-incident',category:'CONNECTION',statement:'Syntetyczny zapis historii migracji.',confirmed:true});
    f.app.db.db.prepare("INSERT INTO faro_result_history(attempt_id,revision,validity,result,created_at) VALUES(?,1,'VALID','{}',NULL)").run(a.id);
    const target=join(f.app.config.dataDir,'upgrade.sqlite');f.app.db.db.exec(`VACUUM INTO '${target.replaceAll("'","''")}'`);
    const old=new DatabaseSync(target);
    try {
      old.exec('PRAGMA foreign_keys=OFF; BEGIN IMMEDIATE;');
      // Reconstruct the genuine pre0031 table from its immutable original migration.
      const create=readFileSync('migrations/0022_faro_assessment_trust_economics.sql','utf8').split('CREATE TABLE faro_attempts (')[1]!.split('CREATE TABLE faro_cases')[0]!;
      old.exec('CREATE TABLE old_attempts ('+create.replaceAll('faro_attempts','old_attempts'));
      old.exec('INSERT INTO old_attempts SELECT id,process_id,assessment_id,assessment_version,state,deadline,started_at,expires_at,answers,revision,result,reviewer_id,reviewed_at FROM faro_attempts; DROP TABLE faro_attempts; ALTER TABLE old_attempts RENAME TO faro_attempts; DELETE FROM schema_migrations WHERE version=\'0031_faro_attempt_retry_lineage\'; COMMIT;');
    }finally{old.close();}
    upgraded=new JobDatabase(target);
    const restored=new AssessmentService(upgraded);assert.equal(restored.row(a.id).attempt_number,1);assert.equal(restored.row(a.id).answers,s.row(a.id).answers);assert.deepEqual(restored.incident(a.id),s.incident(a.id));assert.deepEqual(restored.resultHistory(a.id),s.resultHistory(a.id));
    assert.equal(upgraded.db.prepare('PRAGMA foreign_keys').get()!.foreign_keys,1);assert.deepEqual(upgraded.db.prepare('PRAGMA foreign_key_check').all(),[]);
    upgraded.db.prepare('DELETE FROM faro_interests WHERE id=?').run(f.interest.id);assert.equal(upgraded.db.prepare('SELECT COUNT(*) n FROM faro_attempt_incidents').get()!.n,0);assert.equal(upgraded.db.prepare('SELECT COUNT(*) n FROM faro_result_history').get()!.n,0);
  }finally{upgraded?.close();await f.close();}
});

test('attempt technical report and human confirmation preserve evidence and clocks, reject stale/scoped retries and erase derivatives',async()=>{
  const f=await assessmentSetup();try {
    const unchanged=(actual:ReturnType<AssessmentService['overview']>,expected:ReturnType<AssessmentService['overview']>)=>{
      assert.ok(Date.parse(actual.serverNow)>=Date.parse(expected.serverNow));
      assert.deepEqual({...actual,serverNow:expected.serverNow},expected);
    };
    const service=new AssessmentService(f.app.db);
    const d=service.create(f.employer.id,f.offer.id,{title:'Próba techniczna',timeLimitMinutes:5,expectedMinutes:3,rubricVersion:'incident-r1',tasks:[{prompt:'Pytanie',options:['A','B'],answer:1,points:2}]});
    service.approve(f.employer.id,d.id,{version:1,action:'REVIEW'});service.approve(f.employer.id,d.id,{version:1,action:'APPROVE',confirmed:true});
    const attempt=service.assign(f.employer.id,f.interest.id,{assessmentId:d.id,version:1,deadline:new Date(Date.now()+86400000).toISOString(),expectedVersion:2,idempotencyKey:'incident-assign'});
    const started=service.start(f.candidate.id,attempt.id);
    service.save(f.candidate.id,attempt.id,{expectedVersion:started.revision,answers:{'task-1':1}},false);
    const original=service.row(attempt.id),process=service.recruitment.row(f.interest.id);
    const body={expectedVersion:original.revision,processVersion:process.revision,idempotencyKey:'technical-report',category:'ANSWER_SAVE',statement:'Zapis odpowiedzi przestał działać. Proszę sprawdzić próbę.',confirmed:true,startedAt:'1999-01-01',answers:{'task-1':0}};
    const path=`/api/faro/attempts/${attempt.id}/incident`;
    for(const cookie of [f.admin.cookie,f.employer.cookie])await f.request(path,cookie,'POST',body,404);
    await f.request('/api/faro/attempts/foreign/incident',f.candidate.cookie,'POST',body,404);
    await f.request(path,f.candidate.cookie,'POST',{...body,confirmed:false},400);
    await f.request(path,f.candidate.cookie,'POST',{...body,category:'DIAGNOSIS'},400);
    await f.request(path,f.candidate.cookie,'POST',{...body,expectedVersion:1},409);
    const reported=await f.request<ReturnType<AssessmentService['overview']>>(path,f.candidate.cookie,'POST',body,201);
    assert.equal(reported.state,'STARTED');assert.equal(reported.incident!.state,'OPEN');
    assert.equal(reported.incident!.originalStartedAt,original.started_at);assert.equal(reported.incident!.originalExpiresAt,original.expires_at);assert.equal(reported.incident!.observedRevision,original.revision);
    assert.equal(service.row(attempt.id).answers,original.answers);assert.equal(service.row(attempt.id).deadline,original.deadline);assert.equal(service.row(attempt.id).result,null);
    assert.equal(service.recruitment.row(f.interest.id).revision,process.revision);
    unchanged(await f.request(path,f.candidate.cookie,'POST',body,201),reported);
    await f.request(path,f.candidate.cookie,'POST',{...body,statement:'Zmiana danych tej samej operacji.'},409);
    await f.request(path,f.candidate.cookie,'POST',{...body,expectedVersion:reported.revision,idempotencyKey:'second-report'},409);
    const employerView=service.overview(f.employer.id,attempt.id);assert.deepEqual(employerView.answers,{});assert.deepEqual(employerView.reviewTasks,[]);
    assert.doesNotMatch(JSON.stringify(employerView),/reporter_id|reviewer_id|correctOption/);
    const resolve={expectedVersion:reported.revision,processVersion:process.revision,incidentVersion:1,idempotencyKey:'technical-resolve',resolution:'ISSUE_CONFIRMED',reason:'Sprawdzono zapis. Potwierdzamy problem; dalszy krok ustalimy ręcznie.',confirmed:true};
    await f.request(`${path}/resolve`,f.candidate.cookie,'POST',resolve,404);await f.request(`${path}/resolve`,f.admin.cookie,'POST',resolve,404);
    await f.request(`${path}/resolve`,f.employer.cookie,'POST',{...resolve,confirmed:false},400);
    await f.request(`${path}/resolve`,f.employer.cookie,'POST',{...resolve,processVersion:1},409);
    const resolved=await f.request<ReturnType<AssessmentService['overview']>>(`${path}/resolve`,f.employer.cookie,'POST',resolve);
    assert.equal(resolved.state,'TECHNICAL_ISSUE');assert.equal(resolved.incident!.resolution,'ISSUE_CONFIRMED');assert.equal(resolved.result,null);
    unchanged(await f.request(`${path}/resolve`,f.employer.cookie,'POST',resolve),resolved);
    await f.request(`${path}/resolve`,f.employer.cookie,'POST',{...resolve,reason:'Inne uzasadnienie tej samej operacji.'},409);
    const after=service.row(attempt.id);for(const key of ['started_at','expires_at','deadline','answers','result'] as const)assert.equal(after[key],original[key]);
    const currentProcess=service.recruitment.row(f.interest.id);assert.equal(currentProcess.status,'ACTIVE');assert.equal(currentProcess.stage,'ACCEPTED_TO_NEXT_STAGE');assert.equal(currentProcess.response_due_at,process.response_due_at);assert.equal(currentProcess.first_response_at,process.first_response_at);
    await f.request(`/api/faro/attempts/${attempt.id}`,f.candidate.cookie,'POST',{},409);
    await f.request(`/api/faro/attempts/${attempt.id}/answers`,f.candidate.cookie,'PUT',{expectedVersion:resolved.revision,answers:{}},409);
    const events=f.app.db.db.prepare("SELECT id,data FROM faro_events WHERE process_id=? AND kind IN ('ATTEMPT_INCIDENT_REPORTED','ATTEMPT_INCIDENT_RESOLVED')").all(f.interest.id);assert.equal(events.length,2);
    for(const event of events){assert.doesNotMatch(event.data as string,/Zapis odpowiedzi|Sprawdzono zapis/);assert.equal((f.app.db.db.prepare('SELECT COUNT(*) n FROM faro_outbox WHERE dedupe_key=?').get(event.id!) as {n:number}).n,2);}
    const own=await f.request<{faro:{faro_attempt_incidents:Array<{statement:string;resolution:string}>}}>('/api/export',f.candidate.cookie);assert.equal(own.faro.faro_attempt_incidents[0]!.statement,body.statement);assert.equal(own.faro.faro_attempt_incidents[0]!.resolution,'ISSUE_CONFIRMED');
    const other=await f.request<{faro:{faro_attempt_incidents:unknown[]}}>('/api/export',f.employer.cookie);assert.deepEqual(other.faro.faro_attempt_incidents,[]);
    f.app.db.db.prepare('UPDATE faro_members SET active=0 WHERE organization_id=? AND user_id=?').run(f.org.id,f.employer.id);
    await f.request(`${path}/resolve`,f.employer.cookie,'POST',resolve,404);await f.request(`/api/faro/attempts/${attempt.id}`,f.employer.cookie,'GET',undefined,404);
    await f.request('/api/account',f.candidate.cookie,'DELETE',{confirmation:'USUŃ KONTO',password:'Bezpieczne123'});
    const caches=f.app.db.db.prepare('SELECT result FROM faro_commands WHERE user_id=?').all(f.employer.id);
    assert.doesNotMatch(JSON.stringify(caches),/Zapis odpowiedzi przestał|Sprawdzono zapis/);
    assert.equal((f.app.db.db.prepare('SELECT COUNT(*) n FROM faro_attempt_incidents').get() as {n:number}).n,0);assert.deepEqual(f.app.db.db.prepare('PRAGMA foreign_key_check').all(),[]);
  }finally{await f.close();}
});

test('open technical report requires human handling before result review; resolution preserves submitted evidence and terminal decisions',async()=>{
  const f=await assessmentSetup();try {
    const s=new AssessmentService(f.app.db);
    const d=s.create(f.employer.id,f.offer.id,{title:'Próba z przeglądem',timeLimitMinutes:5,expectedMinutes:3,rubricVersion:'incident-r2',tasks:[{prompt:'Pytanie',options:['A','B'],answer:1,points:2}]});
    s.approve(f.employer.id,d.id,{version:1,action:'REVIEW'});s.approve(f.employer.id,d.id,{version:1,action:'APPROVE',confirmed:true});
    const attempt=s.assign(f.employer.id,f.interest.id,{assessmentId:d.id,version:1,deadline:new Date(Date.now()+86400000).toISOString(),expectedVersion:2,idempotencyKey:'pending-assign'});
    const before=s.overview(f.candidate.id,attempt.id);
    const reported=s.reportIncident(f.candidate.id,attempt.id,{expectedVersion:before.revision,processVersion:before.processVersion,idempotencyKey:'prestart-incident',category:'ACCESS',statement:'Pojawił się błąd dostępu przed rozpoczęciem próby.',confirmed:true});
    assert.equal(reported.startedAt,null);assert.equal(reported.expiresAt,null);
    const started=s.start(f.candidate.id,attempt.id),submitted=s.save(f.candidate.id,attempt.id,{expectedVersion:started.revision,answers:{'task-1':1}},true);
    const review={expectedVersion:submitted.revision,processVersion:submitted.processVersion,idempotencyKey:'blocked-review',note:'Sprawdzono odpowiedź według oryginalnej rubryki.',confirmed:true};
    await f.request(`/api/faro/attempts/${attempt.id}/review`,f.employer.cookie,'POST',review,409);
    const original=s.row(attempt.id),process=s.recruitment.row(f.interest.id);
    await f.request(`/api/faro/processes/${f.interest.id}/commands`,f.candidate.cookie,'POST',{command:'WITHDRAW',expectedVersion:process.revision,idempotencyKey:'incident-withdraw'});
    const terminal=s.recruitment.row(f.interest.id);
    const current=s.overview(f.employer.id,attempt.id);
    const resolved=s.resolveIncident(f.employer.id,attempt.id,{expectedVersion:current.revision,processVersion:current.processVersion,incidentVersion:1,idempotencyKey:'terminal-technical',resolution:'ISSUE_CONFIRMED',reason:'Potwierdzono problem. Proces został wycofany; nie zmieniamy jego decyzji.',confirmed:true});
    assert.equal(resolved.incident!.observedState,'INVITED');assert.equal(resolved.incident!.originalStartedAt,null);
    assert.equal(resolved.result,null);assert.equal(s.row(attempt.id).result,original.result);
    assert.deepEqual(s.recruitment.row(f.interest.id),terminal);
    assert.equal(s.row(attempt.id).answers,original.answers);assert.equal(s.row(attempt.id).started_at,original.started_at);assert.equal(s.row(attempt.id).expires_at,original.expires_at);
    const duplicate={expectedVersion:resolved.revision,processVersion:resolved.processVersion,incidentVersion:2,idempotencyKey:'another-resolution',resolution:'NOT_ESTABLISHED',reason:'Nie wolno zastąpić wcześniejszego rozstrzygnięcia.',confirmed:true};
    await f.request(`/api/faro/attempts/${attempt.id}/incident/resolve`,f.employer.cookie,'POST',duplicate,409);
  }finally{await f.close();}
});

test('expired technical incident cannot overwrite a newer active assessment; unconfirmed report leaves its invitation and original times intact',async()=>{
  const f=await assessmentSetup();try {
    let now=new Date();const s=new AssessmentService(f.app.db,()=>now);
    const create=(title:string)=>{const d=s.create(f.employer.id,f.offer.id,{title,timeLimitMinutes:1,expectedMinutes:1,rubricVersion:'expiry-incident',tasks:[{prompt:'Zadanie',options:['A','B'],answer:0,points:1}]});s.approve(f.employer.id,d.id,{version:1,action:'REVIEW'});s.approve(f.employer.id,d.id,{version:1,action:'APPROVE',confirmed:true});return d;};
    const assign=(d:{id:string})=>s.assign(f.employer.id,f.interest.id,{assessmentId:d.id,version:1,deadline:new Date(now.getTime()+86400000).toISOString(),expectedVersion:s.recruitment.row(f.interest.id).revision,idempotencyKey:`assign:${d.id}`});
    const report=(id:string)=>{const a=s.overview(f.candidate.id,id);return s.reportIncident(f.candidate.id,id,{expectedVersion:a.revision,processVersion:a.processVersion,idempotencyKey:`report:${id}`,category:'CONNECTION',statement:'Połączenie przerwano w trakcie próby technicznej.',confirmed:true});};
    const old=assign(create('Pierwsza próba')),started=s.start(f.candidate.id,old.id);
    s.save(f.candidate.id,old.id,{expectedVersion:started.revision,answers:{'task-1':0}},false);
    const evidence=s.row(old.id);now=new Date(Date.parse(started.expiresAt!)+1);s.expire(old.id);
    const reported=report(old.id);assert.equal(reported.incident!.observedState,'EXPIRED');
    const next=assign(create('Nowa odrębna wersja zadania')),nextEvidence=s.row(next.id),before=s.recruitment.row(f.interest.id);
    const current=s.overview(f.employer.id,old.id);
    s.resolveIncident(f.employer.id,old.id,{expectedVersion:current.revision,processVersion:current.processVersion,incidentVersion:1,idempotencyKey:'old-confirmation',resolution:'ISSUE_CONFIRMED',reason:'Potwierdzono problem starej próby. Nowe zaproszenie zachowuje swój termin.',confirmed:true});
    assert.equal(s.row(old.id).state,'TECHNICAL_ISSUE');assert.equal(s.row(old.id).started_at,evidence.started_at);assert.equal(s.row(old.id).expires_at,evidence.expires_at);assert.equal(s.row(old.id).answers,evidence.answers);
    assert.deepEqual(s.recruitment.row(f.interest.id),before);assert.deepEqual(s.row(next.id),nextEvidence);
    const newerReport=report(next.id);
    const result=s.resolveIncident(f.employer.id,next.id,{expectedVersion:newerReport.revision,processVersion:newerReport.processVersion,incidentVersion:1,idempotencyKey:'new-no-evidence',resolution:'NOT_ESTABLISHED',reason:'Sprawdzono dostęp. Nie potwierdzono awarii; zaproszenie pozostaje aktywne.',confirmed:true});
    assert.equal(result.state,'INVITED');assert.equal(result.startedAt,null);assert.equal(result.expiresAt,null);assert.equal(result.deadline,nextEvidence.deadline);assert.deepEqual(s.recruitment.row(f.interest.id),before);
    assert.deepEqual(f.app.db.db.prepare('PRAGMA foreign_key_check').all(),[]);
  }finally{await f.close();}
});

test('assessment lifecycle is approved before assignment and timer is server-authoritative', async () => {
  const f = await assessmentSetup();
  try {
    const draft = await f.request<{ id: string; version: number; state: string }>(`/api/faro/offers/${f.offer.id}/assessments`, f.employer.cookie, 'POST', {
      origin: 'AI', state: 'APPROVED', confirmed: true,
      title: 'Podstawy obsługi klienta', timeLimitMinutes: 5, expectedMinutes: 3, rubricVersion: 'rubric-1',
      tasks: [{ prompt: 'Wybierz właściwą odpowiedź', options: ['A', 'B'], answer: 1, points: 2 }]
    }, 201);
    assert.equal(draft.state, 'DRAFT');
    const definition = new AssessmentService(f.app.db);
    assert.equal(definition.definition(draft.id, draft.version).origin, 'AI');
    const assignment = { expectedVersion:2,idempotencyKey:'assessment-assignment',assessmentId: draft.id, version: draft.version, deadline: new Date(Date.now() + 86_400_000).toISOString() };
    const processBefore = f.app.db.db.prepare('SELECT stage,revision FROM faro_interests WHERE id=?').get(f.interest.id);
    const assertAssignmentBlocked = async (state: string) => {
      await f.request(`/api/faro/processes/${f.interest.id}/assessment`, f.employer.cookie, 'POST', assignment, 409);
      assert.equal(definition.definition(draft.id, draft.version).state, state);
      assert.deepEqual(f.app.db.db.prepare('SELECT stage,revision FROM faro_interests WHERE id=?').get(f.interest.id), processBefore);
      const attempts = f.app.db.db.prepare('SELECT COUNT(*) count FROM faro_attempts WHERE process_id=?').get(f.interest.id) as { count: number };
      assert.equal(attempts.count, 0);
    };
    await assertAssignmentBlocked('DRAFT');
    await f.request(`/api/faro/assessments/${draft.id}/versions/${draft.version}`, f.employer.cookie, 'POST', { action: 'APPROVE', confirmed: true }, 409);
    await f.request(`/api/faro/assessments/${draft.id}/versions/${draft.version}`, f.employer.cookie, 'POST', { action: 'REVIEW' });
    await assertAssignmentBlocked('IN_REVIEW');
    await f.request(`/api/faro/assessments/${draft.id}/versions/${draft.version}`, f.employer.cookie, 'POST', { action: 'APPROVE', confirmed: false }, 400);
    await assertAssignmentBlocked('IN_REVIEW');
    await f.request(`/api/faro/assessments/${draft.id}/versions/${draft.version}`, f.employer.cookie, 'POST', { action: 'APPROVE', confirmed: true });
    await f.request(`/api/faro/processes/${f.interest.id}/assessment`, f.employer.cookie, 'POST', {...assignment,expectedVersion:1,idempotencyKey:'stale-assignment'},409);
    const attempt = await f.request<{ id: string }>(`/api/faro/processes/${f.interest.id}/assessment`, f.employer.cookie, 'POST', assignment, 201);
    assert.deepEqual(await f.request(`/api/faro/processes/${f.interest.id}/assessment`, f.employer.cookie, 'POST', assignment, 201),attempt);
    assert.equal(definition.recruitment.row(f.interest.id).revision,3);
    assert.equal(f.app.db.db.prepare("SELECT COUNT(*) n FROM faro_events WHERE process_id=? AND kind='ASSESSMENT_ASSIGNED'").get(f.interest.id)!.n,1);
    const before = await f.request<{ state: string; taskCount: number; tasks: unknown[]; revision: number }>(`/api/faro/attempts/${attempt.id}`, f.candidate.cookie);
    assert.equal(before.state, 'INVITED'); assert.equal(before.taskCount, 1); assert.equal(before.tasks.length, 0);
    const invitedBefore={...definition.row(attempt.id)};
    f.app.db.db.exec("CREATE TRIGGER start_audit_failure BEFORE INSERT ON audit_logs WHEN NEW.action='ATTEMPT_STARTED' BEGIN SELECT RAISE(ABORT,'start audit failed'); END");
    await f.request(`/api/faro/attempts/${attempt.id}`,f.candidate.cookie,'POST',{},500);assert.deepEqual({...definition.row(attempt.id)},invitedBefore);assert.equal(f.app.db.db.prepare("SELECT COUNT(*) n FROM audit_logs WHERE action='ATTEMPT_STARTED' AND entity_id=?").get(attempt.id)!.n,0);
    f.app.db.db.exec('DROP TRIGGER start_audit_failure');
    const started = await f.request<{ state: string; startedAt: string; expiresAt: string; revision: number; tasks: Array<{ options: string[] }> }>(`/api/faro/attempts/${attempt.id}`, f.candidate.cookie, 'POST', {});
    assert.equal(started.state, 'STARTED'); assert.ok(started.startedAt); assert.ok(started.expiresAt); assert.equal(started.tasks[0]!.options.length, 2);
    const replay = await f.request<{ startedAt: string; expiresAt: string }>(`/api/faro/attempts/${attempt.id}`, f.candidate.cookie, 'POST', {});
    assert.equal(replay.startedAt, started.startedAt); assert.equal(replay.expiresAt, started.expiresAt);
    assert.equal(definition.overview(f.employer.id,attempt.id).reviewTasks.length,0);
    const saved = await f.request<{ state: string; revision: number }>(`/api/faro/attempts/${attempt.id}/answers`, f.candidate.cookie, 'PUT', { expectedVersion: started.revision, answers: { 'task-1': 1 } });
    assert.equal(saved.state, 'STARTED');
    const savedBefore={...definition.row(attempt.id)},submitProcessBefore={...definition.recruitment.row(f.interest.id)};
    f.app.db.db.exec("CREATE TRIGGER submit_delivery_failure BEFORE INSERT ON faro_outbox BEGIN SELECT RAISE(ABORT,'submit delivery failed'); END");
    await f.request(`/api/faro/attempts/${attempt.id}/submit`,f.candidate.cookie,'POST',{expectedVersion:saved.revision,answers:{'task-1':1}},500);assert.deepEqual({...definition.row(attempt.id)},savedBefore);assert.deepEqual({...definition.recruitment.row(f.interest.id)},submitProcessBefore);assert.equal(f.app.db.db.prepare("SELECT COUNT(*) n FROM faro_events WHERE process_id=? AND kind='ATTEMPT_SUBMITTED'").get(f.interest.id)!.n,0);
    f.app.db.db.exec('DROP TRIGGER submit_delivery_failure');
    const submitted = await f.request<{ state: string; result: unknown }>(`/api/faro/attempts/${attempt.id}/submit`, f.candidate.cookie, 'POST', { expectedVersion: saved.revision, answers: { 'task-1': 1 } });
    assert.equal(submitted.state, 'SCORED_PENDING_REVIEW'); assert.equal(submitted.result, null);
    assert.ok(definition.recruitment.row(f.interest.id).stage_due_at);
    const employerPending = await f.request<{ result: { earned: number; possible: number; unanswered: number; review: string } }>(`/api/faro/attempts/${attempt.id}`, f.employer.cookie);
    const review=definition.overview(f.employer.id,attempt.id);assert.equal(review.viewer,'EMPLOYER');assert.equal(review.reviewTasks[0]!.correctOption,1);assert.equal(review.reviewTasks[0]!.chosenOption,1);
    assert.equal(definition.overview(f.candidate.id,attempt.id).reviewTasks.length,0);assert.doesNotMatch(JSON.stringify(definition.overview(f.candidate.id,attempt.id)),/correctOption|chosenOption/);
    assert.equal(employerPending.result.earned, 2); assert.equal(employerPending.result.possible, 2); assert.equal(employerPending.result.unanswered, 0); assert.equal(employerPending.result.review, 'PENDING');
    await f.request(`/api/faro/attempts/${attempt.id}/review`, f.employer.cookie, 'POST', { confirmed: true, note: 'Sprawdzono według rubric-1',expectedVersion:definition.row(attempt.id).revision,processVersion:definition.recruitment.row(f.interest.id).revision,idempotencyKey:'human-final-review' });
    const final = await f.request<{ state: string; result: { review: string } }>(`/api/faro/attempts/${attempt.id}`, f.employer.cookie);
    assert.equal(definition.overview(f.candidate.id,attempt.id).reviewTasks.length,0);
    assert.equal(final.state, 'FINALIZED'); assert.equal(final.result.review, 'FINALIZED');
    const old = definition.row(attempt.id);
    f.app.db.db.prepare("UPDATE faro_attempts SET state='STARTED',expires_at=? WHERE id=?").run(new Date(Date.now() - 1000).toISOString(), attempt.id);
    await f.request(`/api/faro/attempts/${attempt.id}/answers`,f.employer.cookie,'PUT',{expectedVersion:old.revision,answers:{'task-1':0}},404);assert.equal(definition.row(attempt.id).state,'STARTED');
    await f.request(`/api/faro/attempts/${attempt.id}/answers`, f.candidate.cookie, 'PUT', { expectedVersion: old.revision, answers: { 'task-1': 0 } }, 409);
    assert.equal(definition.row(attempt.id).state, 'EXPIRED');
    assert.equal('ranking' in final.result, false);
  } finally { await f.close(); }
});

test('idle assessment expiry is server driven and neutral; started expiry retains saved answers and original first clock',async()=>{
  const f=await assessmentSetup();try {
    const service=new AssessmentService(f.app.db);
    const draft=service.create(f.employer.id,f.offer.id,{title:'Próba wygaśnięcia',timeLimitMinutes:1,expectedMinutes:1,rubricVersion:'expiry-1',tasks:[{prompt:'Pytanie',options:['A','B'],answer:1,points:2}]});
    service.approve(f.employer.id,draft.id,{version:1,action:'REVIEW'});
    service.approve(f.employer.id,draft.id,{version:1,action:'APPROVE',confirmed:true});
    const deadline=new Date(Date.now()+86400000).toISOString(),first=service.recruitment.row(f.interest.id).first_response_at;
    const attempt=service.assign(f.employer.id,f.interest.id,{assessmentId:draft.id,version:1,deadline,expectedVersion:2,idempotencyKey:'expiry-assign'});
    const start=service.start(f.candidate.id,attempt.id);
    service.save(f.candidate.id,attempt.id,{expectedVersion:start.revision,answers:{'task-1':1}},false);
    const future=new Date(Date.parse(start.expiresAt!)+1000),late=new AssessmentService(f.app.db,()=>future);
    const beforeAttempt={...late.row(attempt.id)},beforeProcess={...late.recruitment.row(f.interest.id)};
    f.app.db.db.exec("CREATE TRIGGER expiry_delivery_failure BEFORE INSERT ON faro_outbox BEGIN SELECT RAISE(ABORT,'expiry delivery failed'); END");
    assert.throws(()=>late.expire(attempt.id),/expiry delivery failed/);assert.deepEqual({...late.row(attempt.id)},beforeAttempt);assert.deepEqual({...late.recruitment.row(f.interest.id)},beforeProcess);assert.equal(f.app.db.db.prepare("SELECT COUNT(*) n FROM faro_events WHERE process_id=? AND kind='ATTEMPT_EXPIRED'").get(f.interest.id)!.n,0);
    f.app.db.db.exec('DROP TRIGGER expiry_delivery_failure');
    new TrustService(f.app.db,()=>future).tick();
    const expired=late.row(attempt.id),p=late.recruitment.row(f.interest.id);
    assert.equal(expired.state,'EXPIRED');assert.equal(expired.answers,'{"task-1":1}');assert.equal(expired.result,null);
    assert.equal(p.status,'ACTIVE');assert.equal(p.stage,'ACCEPTED_TO_NEXT_STAGE');assert.equal(p.first_response_at,first);assert.ok(p.stage_due_at!>future.toISOString());assert.equal(p.next_action,'Termin assessmentu upłynął. Ustal kolejny krok; brak automatycznej odmowy.');
    assert.throws(()=>late.start(f.candidate.id,attempt.id),/nie jest już aktywne/);
    assert.throws(()=>late.save(f.candidate.id,attempt.id,{expectedVersion:expired.revision,answers:{'task-1':0}},true),/upłynął/);
    assert.equal(late.row(attempt.id).answers,expired.answers);
    new TrustService(f.app.db,()=>future).tick();
    assert.equal(f.app.db.db.prepare("SELECT COUNT(*) n FROM faro_events WHERE process_id=? AND kind='ATTEMPT_EXPIRED'").get(f.interest.id)!.n,1);
    const next=service.create(f.employer.id,f.offer.id,{title:'Druga próba',timeLimitMinutes:1,expectedMinutes:1,rubricVersion:'expiry-2',tasks:[{prompt:'Pytanie',options:['A','B'],answer:0,points:1}]});
    service.approve(f.employer.id,next.id,{version:1,action:'REVIEW'});service.approve(f.employer.id,next.id,{version:1,action:'APPROVE',confirmed:true});
    const invited=service.assign(f.employer.id,f.interest.id,{assessmentId:next.id,version:1,deadline,expectedVersion:p.revision,idempotencyKey:'unstarted-assign'});
    new TrustService(f.app.db,()=>new Date(Date.parse(deadline)+1000)).tick();
    assert.equal(service.row(invited.id).state,'EXPIRED');assert.equal(service.row(invited.id).started_at,null);
    assert.equal(service.recruitment.row(f.interest.id).status,'ACTIVE');
  }finally{await f.close();}
});

test('economics is private, versioned and honest about unsupported automatic tax rules', async () => {
  const f = await assessmentSetup();
  try {
    const result = await f.request<{ result: { estimatedNetRange: { min: number; max: number }; netAfterCommute: { min: number; max: number }; automaticTax: { supported: boolean }; calculationVersion: string }; offerVersion: number }>(`/api/faro/offers/${f.offer.id}/economics`, f.candidate.cookie, 'PUT', {
      salaryOptionIndex: 0, netMin: 420000, netMax: 470000, commuteCost: 30000, commuteMinutes: 45, transport: 'CAR', source: 'candidate-scenario', observedAt: new Date().toISOString(), assumptions: 'Ręcznie podany miesięczny koszt paliwa w groszach'
    });
    assert.equal(result.result.estimatedNetRange.min, 420000); assert.equal(result.result.netAfterCommute.max, 440000); assert.equal(result.result.automaticTax.supported, false); assert.equal(result.result.calculationVersion, 'manual-scenario-v2');
    const stored=f.app.db.db.prepare('SELECT result FROM faro_economics WHERE candidate_id=? AND offer_id=?').get(f.candidate.id,f.offer.id) as {result:string};
    assert.deepEqual((JSON.parse(stored.result) as {units:unknown}).units,{money:'PLN_MINOR',netPeriod:'MONTH',commuteCostPeriod:'MONTH',commuteTime:'ROUND_TRIP_MINUTES_PER_WORK_DAY'});
    const input={salaryOptionIndex:0,netMin:420000,netMax:470000,commuteCost:30000,commuteMinutes:45,transport:'CAR',source:'candidate-scenario',observedAt:new Date().toISOString(),assumptions:'Jawne założenia miesięcznego scenariusza'};
    await f.request(`/api/faro/offers/${f.offer.id}/economics`,f.candidate.cookie,'PUT',{...input,commuteCostPeriod:'YEAR'},400);
    await f.request(`/api/faro/offers/${f.offer.id}/economics`,f.candidate.cookie,'PUT',{...input,commuteTimeBasis:'ONE_WAY'},400);
    assert.deepEqual(f.app.db.db.prepare('SELECT result FROM faro_economics WHERE candidate_id=? AND offer_id=?').get(f.candidate.id,f.offer.id),stored);
    const employerView = await f.request<Record<string, unknown>>(`/api/faro/offers/${f.offer.id}/economics`, f.employer.cookie, 'GET', undefined, 200);
    assert.equal(employerView, null);
    const text = JSON.stringify(result);
    assert.equal(/effective.?hourly|life.?score/i.test(text), false);
  } finally { await f.close(); }
});

test('edited assessment is a new draft with fresh approval; replay and stale edit preserve pinned attempts and keys stay scoped',async()=>{
  const f=await assessmentSetup();try {
    const service=new AssessmentService(f.app.db),data={title:'Wersjonowane zadanie',timeLimitMinutes:5,expectedMinutes:3,rubricVersion:'r1',tasks:[{prompt:'Pierwotne pytanie',options:['A','B'],answer:1,points:2}]};
    const draft=service.create(f.employer.id,f.offer.id,{...data,origin:'AI'});
    service.approve(f.employer.id,draft.id,{version:1,action:'REVIEW'});service.approve(f.employer.id,draft.id,{version:1,action:'APPROVE',confirmed:true});
    const attempt=service.assign(f.employer.id,f.interest.id,{assessmentId:draft.id,version:1,deadline:new Date(Date.now()+86400000).toISOString(),expectedVersion:2,idempotencyKey:'version-one-assign'});
    const start=service.start(f.candidate.id,attempt.id);
    const body={data:{...data,state:'APPROVED',origin:'HUMAN',rubricVersion:'r2',timeLimitMinutes:10,tasks:[{prompt:'Nowe pytanie',options:['C','D'],answer:0,points:4}]},expectedVersion:1,idempotencyKey:'edit-definition'};
    const url=`/api/faro/assessments/${draft.id}/versions/1`;
    await f.request(url,f.candidate.cookie,'GET',undefined,404);
    await f.request(url,f.candidate.cookie,'PUT',body,404);
    const edited=await f.request<{id:string;version:number;state:string}>(url,f.employer.cookie,'PUT',body,201);
    assert.equal(edited.version,2);assert.equal(edited.state,'DRAFT');assert.equal(service.definition(draft.id,2).origin,'AI');
    assert.deepEqual(await f.request(url,f.employer.cookie,'PUT',body,201),edited);
    await f.request(url,f.employer.cookie,'PUT',{...body,idempotencyKey:'stale-definition'},409);
    const pinned=service.overview(f.candidate.id,attempt.id);
    assert.equal(pinned.tasks[0]!.prompt,'Pierwotne pytanie');assert.equal(pinned.rubricVersion,'r1');assert.equal(pinned.expiresAt,start.expiresAt);
    assert.equal(service.definition(draft.id,1).state,'APPROVED');assert.equal(service.row(attempt.id).assessment_version,1);
    f.app.db.db.prepare("UPDATE faro_attempts SET expires_at='2000-01-01T00:00:00.000Z' WHERE id=?").run(attempt.id);service.expire();
    const next={assessmentId:draft.id,version:2,deadline:new Date(Date.now()+86400000).toISOString(),expectedVersion:4,idempotencyKey:'version-two-assign'};
    await f.request(`/api/faro/processes/${f.interest.id}/assessment`,f.employer.cookie,'POST',{...next,version:1,idempotencyKey:'old-version-denied'},409);
    await f.request(`/api/faro/processes/${f.interest.id}/assessment`,f.employer.cookie,'POST',next,409);
    service.approve(f.employer.id,draft.id,{version:2,action:'REVIEW'});service.approve(f.employer.id,draft.id,{version:2,action:'APPROVE',confirmed:true});
    const assigned=await f.request<{id:string}>(`/api/faro/processes/${f.interest.id}/assessment`,f.employer.cookie,'POST',next,201);
    assert.equal(service.row(assigned.id).assessment_version,2);
  }finally{await f.close();}
});

test('trust report and stale-offer worker create reviewable signals, proportional restrictions and appeals', async () => {
  const f = await assessmentSetup();
  try {
    const report = await f.request<{ id: string; state: string }>(`/api/faro/processes/${f.interest.id}/reports`, f.candidate.cookie, 'POST', { kind: 'CV_REQUEST', statement: 'Pracodawca poprosił o dokument poza natywnym procesem.',idempotencyKey:'cv-report' }, 201);
    assert.equal(report.state, 'OPEN');
    assert.equal((await f.request<{ cases: unknown[] }>('/api/faro/cases', f.candidate.cookie)).cases.length, 1);
    await f.request(`/api/faro/cases/${report.id}/review`, f.candidate.cookie, 'POST', { state: 'ACTION', decision: 'Wstrzymano ofertę do sprawdzenia.', reviewAt: new Date().toISOString(), restrict: true }, 403);
    await f.request(`/api/faro/cases/${report.id}/review`, f.admin.cookie, 'POST', { state: 'EVIDENCE_REVIEW', decision: 'Sprawdzamy dowody.', reviewAt: new Date().toISOString(),expectedVersion:1,idempotencyKey:'review-evidence' });
    await f.request(`/api/faro/cases/${report.id}/review`, f.admin.cookie, 'POST', { state: 'ACTION', decision: 'Wstrzymano ofertę do sprawdzenia.', decisionCode:'PROCESS_VIOLATION_CONFIRMED',reviewAt: new Date(Date.now()+86400000).toISOString(), restrict: true,restorationCondition:'Sprawdzenie usunięcia naruszenia w niezależnym review.',expectedVersion:2,idempotencyKey:'review-action' });
    await f.request(`/api/faro/cases/${report.id}/appeal`, f.candidate.cookie, 'POST', { statement: 'Proszę o ponowne sprawdzenie.',expectedVersion:3,idempotencyKey:'case-appeal' });
    const appeal = await f.request<{ state: string }>(`/api/faro/cases/${report.id}/review`, f.admin.cookie, 'POST', { state: 'RESOLVED', decision: 'Rozstrzygnięcie po odwołaniu.',decisionCode:'CASE_RESOLVED', reviewAt: new Date().toISOString(),expectedVersion:4,idempotencyKey:'review-resolved' });
    assert.equal(appeal.state, 'RESOLVED');
    const service = new TrustService(f.app.db, () => new Date('2026-09-17T12:00:00.000Z'));
    f.app.db.db.prepare("UPDATE faro_offers SET status='PUBLISHED',confirmed_until='2026-09-16T00:00:00.000Z' WHERE id=?").run(f.offer.id);
    service.tick();
    const offer = f.app.db.db.prepare('SELECT status FROM faro_offers WHERE id=?').get(f.offer.id) as { status: string };
    assert.equal(offer.status, 'PAUSED');
    const stale = f.app.db.db.prepare("SELECT COUNT(*) n FROM faro_cases WHERE kind='STALE_OFFER' AND organization_id=?").get(f.org.id) as { n: number };
    assert.equal(stale.n, 1);
    service.tick();
    const staleAgain = f.app.db.db.prepare("SELECT COUNT(*) n FROM faro_cases WHERE kind='STALE_OFFER' AND organization_id=?").get(f.org.id) as { n: number };
    assert.equal(staleAgain.n, 1);
  } finally { await f.close(); }
});

test('human assessment result review is revision guarded and idempotent; terminal or unauthorized review has no effects',async()=>{
  const f=await assessmentSetup();try {
    const service=new AssessmentService(f.app.db),r=service.recruitment;
    const attempt=()=>{
      const d=service.create(f.employer.id,f.offer.id,{title:'Świadomy przegląd wyniku',timeLimitMinutes:5,expectedMinutes:3,rubricVersion:'review-1',tasks:[{prompt:'Wybierz odpowiedź',options:['A','B'],answer:1,points:2}]});
      service.approve(f.employer.id,d.id,{version:1,action:'REVIEW'});service.approve(f.employer.id,d.id,{version:1,action:'APPROVE',confirmed:true});
      const a=service.assign(f.employer.id,f.interest.id,{assessmentId:d.id,version:1,deadline:new Date(Date.now()+86400000).toISOString(),expectedVersion:r.row(f.interest.id).revision,idempotencyKey:'assign-'+d.id});
      const started=service.start(f.candidate.id,a.id);service.save(f.candidate.id,a.id,{expectedVersion:started.revision,answers:{'task-1':1}},true);return a;
    };
    const a=attempt(),first=r.row(f.interest.id).first_response_at;
    const url=`/api/faro/attempts/${a.id}/review`,body={confirmed:true,note:'Sprawdzono zgodnie z rubryką review-1',expectedVersion:service.row(a.id).revision,processVersion:r.row(f.interest.id).revision,idempotencyKey:'finalize-once'};
    await f.request(url,f.candidate.cookie,'POST',body,404);await f.request(url,f.admin.cookie,'POST',body,404);
    await f.request(url,f.employer.cookie,'POST',{...body,confirmed:false},409);
    await f.request(url,f.employer.cookie,'POST',{...body,expectedVersion:body.expectedVersion-1},409);
    r.change(f.employer.id,f.interest.id,{command:'ADVANCE',expectedVersion:body.processVersion,idempotencyKey:'review-concurrent-stage',nextAction:'Uzgodnienie kolejnego kroku',dueAt:new Date(Date.now()+86400000).toISOString()});
    await f.request(url,f.employer.cookie,'POST',body,409);
    assert.equal(service.row(a.id).state,'SCORED_PENDING_REVIEW');assert.equal(service.overview(f.candidate.id,a.id).result,null);
    const current={...body,processVersion:r.row(f.interest.id).revision};
    const reviewBefore={...service.row(a.id)};
    f.app.db.db.exec("CREATE TRIGGER review_audit_failure BEFORE INSERT ON audit_logs WHEN NEW.action='ASSESSMENT_RESULT_REVIEWED' BEGIN SELECT RAISE(ABORT,'review audit failed'); END");
    await f.request(url,f.employer.cookie,'POST',current,500);assert.deepEqual({...service.row(a.id)},reviewBefore);assert.equal(service.resultHistory(a.id).length,0);assert.equal(f.app.db.db.prepare('SELECT COUNT(*) n FROM faro_commands WHERE user_id=? AND command_key=?').get(f.employer.id,current.idempotencyKey)!.n,0);
    f.app.db.db.exec('DROP TRIGGER review_audit_failure');
    const result=await f.request<{state:string;revision:number}>(url,f.employer.cookie,'POST',current);
    assert.equal(result.state,'FINALIZED');assert.equal(result.revision,body.expectedVersion+1);
    assert.deepEqual(await f.request(url,f.employer.cookie,'POST',current),result);
    await f.request(url,f.employer.cookie,'POST',{...current,note:'Zmiana wyniku pod tym samym kluczem'},409);
    await f.request(url,f.employer.cookie,'POST',{...current,idempotencyKey:'second-review'},409);
    assert.equal(f.app.db.db.prepare("SELECT COUNT(*) n FROM faro_events WHERE process_id=? AND kind='ASSESSMENT_FINALIZED'").get(f.interest.id)!.n,1);
    assert.equal(f.app.db.db.prepare("SELECT COUNT(*) n FROM audit_logs WHERE entity_id=? AND action='ASSESSMENT_RESULT_REVIEWED'").get(a.id)!.n,1);
    assert.equal(r.row(f.interest.id).first_response_at,first);
    const second=attempt();r.change(f.candidate.id,f.interest.id,{command:'WITHDRAW',expectedVersion:r.row(f.interest.id).revision,idempotencyKey:'withdraw-before-review'});
    await f.request(`/api/faro/attempts/${second.id}/review`,f.employer.cookie,'POST',{...body,expectedVersion:service.row(second.id).revision,processVersion:r.row(f.interest.id).revision,idempotencyKey:'review-after-withdraw'},409);
    assert.equal(service.row(second.id).state,'SCORED_PENDING_REVIEW');assert.equal(service.overview(f.candidate.id,second.id).result,null);
  }finally{await f.close();}
});


test('invalid result retains original evidence, informs both roles, rejects stale/unauthorized retries and exports/erases own history',async()=>{
  const f=await assessmentSetup();try {
    const s=new AssessmentService(f.app.db),r=s.recruitment;
    const d=s.create(f.employer.id,f.offer.id,{title:'Błąd testu',timeLimitMinutes:5,expectedMinutes:3,rubricVersion:'original-rubric',tasks:[{prompt:'Wybierz odpowiedź',options:['A','B'],answer:1,points:2}]});
    s.approve(f.employer.id,d.id,{version:1,action:'REVIEW'});s.approve(f.employer.id,d.id,{version:1,action:'APPROVE',confirmed:true});
    const a=s.assign(f.employer.id,f.interest.id,{assessmentId:d.id,version:1,deadline:new Date(Date.now()+86400000).toISOString(),expectedVersion:2,idempotencyKey:'invalid-assign'});
    const started=s.start(f.candidate.id,a.id);s.save(f.candidate.id,a.id,{expectedVersion:started.revision,answers:{'task-1':0}},true);
    const url='/api/faro/attempts/'+a.id+'/invalidate-result';
    const command=()=>({expectedVersion:s.row(a.id).revision,processVersion:r.row(f.interest.id).revision,reasonCode:'KEY_ERROR',reason:'Wykryto błąd klucza zadania; wynik nie jest podstawą decyzji.',confirmed:true,idempotencyKey:'invalid-once'});
    await f.request(url,f.employer.cookie,'POST',command(),409);
    s.finalize(f.employer.id,a.id,{expectedVersion:s.row(a.id).revision,processVersion:r.row(f.interest.id).revision,confirmed:true,note:'Pierwotny przegląd według rubryki',idempotencyKey:'invalid-finalize'});
    r.change(f.candidate.id,f.interest.id,{command:'WITHDRAW',expectedVersion:r.row(f.interest.id).revision,idempotencyKey:'invalid-withdraw'});
    const old=s.row(a.id),process=r.row(f.interest.id),body=command(),foreign=await f.user('InvalidForeign');
    assert.equal(process.status,'WITHDRAWN');
    await f.request(url,f.candidate.cookie,'POST',body,404);await f.request(url,f.admin.cookie,'POST',body,404);await f.request(url,foreign.cookie,'POST',body,404);
    await f.request(url,f.employer.cookie,'POST',{...body,confirmed:false},400);
    await f.request(url,f.employer.cookie,'POST',{...body,reason:''},400);
    await f.request(url,f.employer.cookie,'POST',{...body,reasonCode:'LOW_SCORE'},400);
    await f.request(url,f.employer.cookie,'POST',{...body,expectedVersion:old.revision-1},409);
    await f.request(url,f.employer.cookie,'POST',{...body,processVersion:process.revision-1},409);
    assert.equal(s.resultHistory(a.id).length,1);assert.deepEqual(s.row(a.id),old);
    const response=await f.request<{result:null;resultValidity:string;resultHistory:Array<{validity:string;result:{earned:number};reason:string}>}>(url,f.employer.cookie,'POST',body);
    assert.equal(response.result,null);assert.equal(response.resultValidity,'INVALIDATED');assert.equal(response.resultHistory.length,2);
    assert.equal(response.resultHistory[0]!.validity,'VALID');assert.equal(response.resultHistory[0]!.result.earned,0);
    assert.equal(response.resultHistory[1]!.reason,body.reason);assert.equal(s.row(a.id).result,old.result);assert.equal(s.row(a.id).answers,old.answers);
    assert.deepEqual(r.row(f.interest.id),process); // Both clocks, stage and recruitment decision stay untouched.
    assert.deepEqual(await f.request(url,f.employer.cookie,'POST',body),response);
    await f.request(url,f.employer.cookie,'POST',{...body,reason:'Zmiana przy tym samym kluczu'},409);
    await f.request(url,f.employer.cookie,'POST',{...command(),idempotencyKey:'invalid-twice'},409);
    const candidate=s.overview(f.candidate.id,a.id);assert.equal(candidate.result,null);assert.deepEqual(candidate.resultHistory,response.resultHistory);assert.equal(candidate.reviewTasks.length,0);
    assert.doesNotMatch(JSON.stringify(candidate),/correctOption|reviewer_id|password_hash/);
    const events=f.app.db.db.prepare("SELECT id FROM faro_events WHERE process_id=? AND kind='ASSESSMENT_RESULT_INVALIDATED'").all(process.id);assert.equal(events.length,1);
    const recipients=f.app.db.db.prepare('SELECT recipient_id FROM faro_outbox WHERE dedupe_key=?').all(String(events[0]!.id));assert.deepEqual(new Set(recipients.map(x=>x.recipient_id)),new Set([f.candidate.id,f.employer.id]));
    const exported=await f.request<{faro:{faro_result_history:unknown[]}}>('/api/export',f.candidate.cookie);assert.equal(exported.faro.faro_result_history.length,2);
    const otherExport=await f.request<{faro:{faro_result_history:unknown[]}}>('/api/export',foreign.cookie);assert.equal(otherExport.faro.faro_result_history.length,0);
    // Revocation must deny even an otherwise idempotent replay.
    f.app.db.db.prepare('DELETE FROM faro_assignments WHERE offer_id=? AND user_id=?').run(f.offer.id,f.employer.id);
    await f.request(url,f.employer.cookie,'POST',body,404);
    await f.request('/api/account',f.candidate.cookie,'DELETE',{confirmation:'USUŃ KONTO',password:'Bezpieczne123'});
    assert.equal(f.app.db.db.prepare('SELECT COUNT(*) n FROM faro_result_history WHERE attempt_id=?').get(a.id)!.n,0);
    assert.equal(f.app.db.db.prepare('PRAGMA foreign_key_check').all().length,0);
  }finally{await f.close();}
});


test('result-history migration preserves legacy result and actual review timestamp without inventing missing dates',async()=>{
  const {DatabaseSync}=await import('node:sqlite'),{readFileSync}=await import('node:fs');
  const db=new DatabaseSync(':memory:');try {
    db.exec('PRAGMA foreign_keys=ON; CREATE TABLE faro_attempts(id TEXT PRIMARY KEY,state TEXT,result TEXT,reviewed_at TEXT,deadline TEXT);');
    const result=JSON.stringify({earned:0,possible:2,review:'FINALIZED',reviewNote:'Zachowany przegląd'});
    db.prepare('INSERT INTO faro_attempts VALUES(?,?,?,?,?)').run('legacy','FINALIZED',result,'2026-09-17T10:00:00.000Z','2026-09-18T10:00:00.000Z');
    db.prepare('INSERT INTO faro_attempts VALUES(?,?,?,?,?)').run('unknown-date','FINALIZED',result,null,'2026-09-18T10:00:00.000Z');
    db.prepare('INSERT INTO faro_attempts VALUES(?,?,?,?,?)').run('pending','SCORED_PENDING_REVIEW',result,null,'2026-09-18T10:00:00.000Z');
    db.exec(readFileSync('migrations/0028_faro_result_validity.sql','utf8'));
    const rows=db.prepare('SELECT * FROM faro_result_history ORDER BY attempt_id').all();assert.equal(rows.length,2);
    assert.equal(rows[0]!.result,result);assert.equal(rows[0]!.created_at,'2026-09-17T10:00:00.000Z');assert.equal(rows[1]!.created_at,null);
    assert.equal(rows[0]!.validity,'VALID');assert.equal(rows[0]!.reason,null);
    db.exec(readFileSync('migrations/0033_faro_human_result_amendment.sql','utf8'));
    assert.deepEqual(db.prepare('SELECT * FROM faro_result_history ORDER BY attempt_id').all(),rows);
    db.prepare("INSERT INTO faro_result_history VALUES('legacy',2,'VALID',?,'HUMAN_AMENDMENT',?,?)").run(result,'Jawna korekta zachowuje poprzedni wynik.','2026-09-19T10:00:00.000Z');
    assert.throws(()=>db.prepare("INSERT INTO faro_result_history VALUES('legacy',3,'INVALIDATED',?,'HUMAN_AMENDMENT',?,?)").run(result,'Zła kombinacja stanu.','2026-09-19T10:00:00.000Z'));
    db.prepare('DELETE FROM faro_attempts WHERE id=?').run('legacy');assert.equal(db.prepare('SELECT COUNT(*) n FROM faro_result_history').get()!.n,1);
    assert.equal(db.prepare('PRAGMA foreign_key_check').all().length,0);
  }finally{db.close();}
});


test('assessment definition create and approval audit failures are atomic through real API including versioned edit',async()=>{
  const f=await assessmentSetup();try{
    const db=f.app.db.db,s=new AssessmentService(f.app.db),input={title:'Rubryka bez częściowego zapisu',type:'OPEN_ANSWER',scoringMode:'HUMAN',timeLimitMinutes:5,expectedMinutes:3,rubricVersion:'atomic-v1',tasks:[{prompt:'Opisz rozwiązanie',evaluationCriteria:'Jasne kroki z uzasadnieniem.',points:2}]},url=`/api/faro/offers/${f.offer.id}/assessments`;
    db.exec("CREATE TRIGGER fail_definition_create BEFORE INSERT ON audit_logs WHEN NEW.action='ASSESSMENT_DRAFT_CREATED' BEGIN SELECT RAISE(ABORT,'definition audit unavailable'); END");await f.request(url,f.employer.cookie,'POST',input,500);assert.equal(db.prepare('SELECT COUNT(*) n FROM faro_assessments WHERE offer_id=?').get(f.offer.id)!.n,0);db.exec('DROP TRIGGER fail_definition_create');
    const d=await f.request<{id:string}>(url,f.employer.cookie,'POST',input,201),versionUrl=`/api/faro/assessments/${d.id}/versions/1`;await f.request(versionUrl,f.employer.cookie,'POST',{action:'REVIEW'});const before={...s.definition(d.id,1)};
    db.exec("CREATE TRIGGER fail_definition_approve BEFORE INSERT ON audit_logs WHEN NEW.action='ASSESSMENT_APPROVE' BEGIN SELECT RAISE(ABORT,'approval audit unavailable'); END");await f.request(versionUrl,f.employer.cookie,'POST',{action:'APPROVE',confirmed:true},500);assert.deepEqual({...s.definition(d.id,1)},before);db.exec('DROP TRIGGER fail_definition_approve');await f.request(versionUrl,f.employer.cookie,'POST',{action:'APPROVE',confirmed:true});
    const pinned={...s.definition(d.id,1)};const edit={expectedVersion:1,idempotencyKey:'definition-edit-atomic',data:{...input,rubricVersion:'atomic-v2'}};db.exec("CREATE TRIGGER fail_definition_edit BEFORE INSERT ON audit_logs WHEN NEW.action='ASSESSMENT_DRAFT_CREATED' BEGIN SELECT RAISE(ABORT,'edit audit unavailable'); END");await f.request(versionUrl,f.employer.cookie,'PUT',edit,500);assert.equal(db.prepare('SELECT COUNT(*) n FROM faro_assessments WHERE id=?').get(d.id)!.n,1);assert.equal(db.prepare('SELECT COUNT(*) n FROM faro_commands WHERE user_id=? AND command_key=?').get(f.employer.id,edit.idempotencyKey)!.n,0);db.exec('DROP TRIGGER fail_definition_edit');const ack=await f.request(versionUrl,f.employer.cookie,'PUT',edit,201);assert.deepEqual(await f.request(versionUrl,f.employer.cookie,'PUT',edit,201),ack);assert.deepEqual({...s.definition(d.id,1)},pinned);assert.equal(s.definition(d.id,2).state,'DRAFT');await f.request(versionUrl,f.employer.cookie,'POST',{action:'APPROVE',confirmed:true},409);assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
  }finally{await f.close();}
});


test('assignment notification failure rolls back pinned attempt, process clock and journal at real API before retry and replay',async()=>{
  const f=await assessmentSetup();try{
    const db=f.app.db.db,s=new AssessmentService(f.app.db),d=s.create(f.employer.id,f.offer.id,{title:'Pinned assignment',type:'OPEN_ANSWER',scoringMode:'HUMAN',timeLimitMinutes:5,expectedMinutes:3,rubricVersion:'assignment-v1',tasks:[{prompt:'Opisz kolejny krok',evaluationCriteria:'Jasne i uzasadnione kroki.',points:2}]});s.approve(f.employer.id,d.id,{version:1,action:'REVIEW'});s.approve(f.employer.id,d.id,{version:1,action:'APPROVE',confirmed:true});
    const prior={...s.recruitment.row(f.interest.id)},url=`/api/faro/processes/${f.interest.id}/assessment`,body={assessmentId:d.id,version:1,expectedVersion:prior.revision,deadline:new Date(Date.now()+86400000).toISOString(),idempotencyKey:'atomic-assignment'};
    db.exec("CREATE TRIGGER fail_assignment_outbox BEFORE INSERT ON faro_outbox WHEN NEW.entity_type='process' BEGIN SELECT RAISE(ABORT,'assignment notification unavailable'); END");await f.request(url,f.employer.cookie,'POST',body,500);assert.deepEqual({...s.recruitment.row(f.interest.id)},prior);assert.equal(db.prepare('SELECT COUNT(*) n FROM faro_attempts WHERE process_id=?').get(f.interest.id)!.n,0);assert.equal(db.prepare('SELECT COUNT(*) n FROM faro_commands WHERE user_id=? AND command_key=?').get(f.employer.id,body.idempotencyKey)!.n,0);db.exec('DROP TRIGGER fail_assignment_outbox');
    const ack=await f.request<{id:string}>(url,f.employer.cookie,'POST',body,201);assert.deepEqual(await f.request(url,f.employer.cookie,'POST',body,201),ack);assert.equal(s.row(ack.id).assessment_version,1);assert.equal(s.row(ack.id).state,'INVITED');assert.equal(s.recruitment.row(f.interest.id).response_due_at,prior.response_due_at);assert.equal(s.recruitment.row(f.interest.id).first_response_at,prior.first_response_at);assert.equal(db.prepare("SELECT COUNT(*) n FROM faro_events WHERE process_id=? AND kind='ASSESSMENT_ASSIGNED'").get(f.interest.id)!.n,1);assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
  }finally{await f.close();}
});
