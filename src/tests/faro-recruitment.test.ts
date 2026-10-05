import test from 'node:test';
import assert from 'node:assert/strict';
import { faroFixture, offerInput } from './faro-fixture.js';
import { ProfileService } from '../server/faro/profileService.js';
import { OfferService, type OfferRecord } from '../server/faro/offerService.js';
import { RecruitmentService } from '../server/faro/recruitmentService.js';
import { explainOffer, explainConditions, DEFAULT_CONSTRAINTS, sortOffers } from '../domain/faro/offers.js';
import { parseOffer } from '../server/faro/offerService.js';
import { TrustService } from '../server/faro/trustService.js';
import { EconomicsService } from '../server/faro/economicsService.js';

async function setup() {
  const f = await faroFixture(), employer = await f.user('Firma'), candidate = await f.user('Jan'), outsider = await f.user('Obcy');
  const org = await f.request<{ id: string }>('/api/faro/organizations', employer.cookie, 'POST', { name: 'Przykładowa organizacja' }, 201);
  f.app.db.db.prepare("UPDATE users SET role='ADMIN' WHERE id=?").run(outsider.id);
  await f.request(`/api/faro/organizations/${org.id}/verify`, outsider.cookie, 'POST', { note: 'Testowe sprawdzenie reprezentacji — fixture' });
  await f.request('/api/faro/profile', candidate.cookie, 'PUT', { firstName: 'Jan', expectedVersion: 0, phone: '+48500100200', availability: { kind: 'IMMEDIATE' } });
  const draft = await f.request<OfferRecord>(`/api/faro/organizations/${org.id}/offers`, employer.cookie, 'POST', offerInput(employer.id), 201);
  await f.request(`/api/faro/offers/${draft.id}/lifecycle`, employer.cookie, 'POST', { action: 'REVIEW', expectedVersion: 1 });
  const offer = await f.request<OfferRecord>(`/api/faro/offers/${draft.id}/lifecycle`, employer.cookie, 'POST', { action: 'PUBLISH', expectedVersion: 2, confirmed: true });
  return { ...f, employer, candidate, outsider, org, offer };
}

test('commute bound uses only current sourced daily round-trip minutes; missing, incompatible, future or stale evidence stays unknown',()=>{
  const data=parseOffer(offerInput('recruiter')),constraints={...DEFAULT_CONSTRAINTS,active:true,maxCommuteMinutes:45};
  const evidence={minutes:45,source:'Własny pomiar',observedAt:'2026-10-01T12:00:00Z',asOf:'2026-10-04T12:00:00Z',currentVersion:true,basis:'ROUND_TRIP_MINUTES_PER_WORK_DAY'};
  const state=(e:typeof evidence|undefined=evidence)=>explainConditions(data,constraints,e).find(row=>row.field==='commute')!.state;
  assert.equal(state(),'SATISFIED');assert.equal(state({...evidence,minutes:46}),'KNOWN_NOT_MET');
  assert.equal(explainConditions(data,constraints).find(r=>r.field==='commute')!.state,'UNKNOWN');
  for(const change of [{minutes:-1},{minutes:1.5},{source:''},{currentVersion:false},{basis:'ONE_WAY'},{observedAt:'2026-10-05T00:00:00Z'}])assert.equal(state({...evidence,...change}),'UNKNOWN');
  assert.equal(explainConditions(data,{...constraints,maxCommuteMinutes:0},{...evidence,minutes:0}).find(r=>r.field==='commute')!.state,'SATISFIED');
});

test('private commute bounds persist; explicit unknown listing never admits known failures and old estimates cannot pass a new offer version',async()=>{
  const f=await setup();try {
    const profiles=new ProfileService(f.app.db),offers=new OfferService(f.app.db),economics=new EconomicsService(f.app.db),r=new RecruitmentService(f.app.db);
    const projection=profiles.projection(f.candidate.id);
    const process=r.interest(f.candidate.id,f.offer.id,{offerVersion:1,projectionConfirmed:true,confirmationToken:profiles.previewConfirmation(f.candidate.id).confirmationToken,idempotencyKey:'commute-interest'});
    const original={...r.row(process.id)};
    const update=async(maxCommuteMinutes:unknown,status=200)=>f.request('/api/faro/profile/constraints',f.candidate.cookie,'PUT',{expectedVersion:profiles.profile(f.candidate.id).version,constraints:{...DEFAULT_CONSTRAINTS,active:true,maxCommuteMinutes}},status);
    await update(45);assert.deepEqual(offers.list(f.candidate.id),[]);
    const unknown=await f.request<{offers:Array<{id:string;hasUnknownConditions:boolean}>}>('/api/faro/offers?includeUnknown=true',f.candidate.cookie);assert.equal(unknown.offers[0]!.id,f.offer.id);assert.equal(unknown.offers[0]!.hasUnknownConditions,true);
    await f.request('/api/faro/offers?includeUnknown=1',f.candidate.cookie,'GET',undefined,400);
    const scenario={salaryOptionIndex:0,netMin:null,netMax:null,commuteCost:null,commuteMinutes:45,transport:'CAR',source:'Prywatny pomiar trasy — nie ujawniaj',observedAt:new Date(Date.now()-1000).toISOString(),assumptions:'Prywatna trasa codzienna — bez udostępniania firmie.'};
    economics.save(f.candidate.id,f.offer.id,scenario);assert.equal(offers.list(f.candidate.id).length,1);assert.equal(offers.detail(f.candidate.id,f.offer.id).conditionExplanation.find(c=>c.field==='commute')!.state,'SATISFIED');
    economics.save(f.candidate.id,f.offer.id,{...scenario,commuteMinutes:46});assert.deepEqual(offers.list(f.candidate.id,undefined,true),[]);
    economics.save(f.candidate.id,f.offer.id,{...scenario,observedAt:new Date(Date.now()+86400000).toISOString()});assert.equal(offers.list(f.candidate.id).length,0);assert.equal(offers.list(f.candidate.id,undefined,true).length,1);
    economics.save(f.candidate.id,f.offer.id,scenario);
    const current=offers.get(f.offer.id);offers.edit(f.employer.id,f.offer.id,{expectedVersion:current.revision,data:{...current.data,location:'Nowe miejsce wymagające sprawdzenia trasy'}});
    const draft=offers.get(f.offer.id);offers.lifecycle(f.employer.id,f.offer.id,{action:'REVIEW',expectedVersion:draft.revision});offers.lifecycle(f.employer.id,f.offer.id,{action:'PUBLISH',expectedVersion:offers.get(f.offer.id).revision,confirmed:true});
    assert.equal(offers.detail(f.candidate.id,f.offer.id).conditionExplanation.find(c=>c.field==='commute')!.state,'UNKNOWN');assert.equal(offers.list(f.candidate.id).length,0);
    assert.doesNotMatch(JSON.stringify(offers.list(f.candidate.id,undefined,true)),/Prywatny pomiar|Prywatna trasa/);assert.deepEqual(offers.detail(f.employer.id,f.offer.id).conditionExplanation,[]);
    assert.equal(offers.list(f.employer.id,f.org.id).length,1);assert.equal(profiles.constraints(f.outsider.id).maxCommuteMinutes,null);assert.deepEqual(profiles.projection(f.candidate.id),projection);assert.deepEqual({...r.row(process.id)},original);
    const omit={...DEFAULT_CONSTRAINTS,active:true};delete omit.maxCommuteMinutes;
    await f.request('/api/faro/profile/constraints',f.candidate.cookie,'PUT',{expectedVersion:profiles.profile(f.candidate.id).version,constraints:omit});assert.equal(profiles.constraints(f.candidate.id).maxCommuteMinutes,45);
    for(const invalid of [-1,1.5,1441,'45'])await update(invalid,400);
    await update(null);assert.equal(offers.list(f.candidate.id).length,1);
  }finally{await f.close();}
});

test('salary minimum compares range floors and identical units without net/FTE conversion or unrelated contract alternatives',()=>{
  const offer=parseOffer(offerInput('recruiter'));
  const salaryMinimum={amount:550000,currency:'PLN' as const,basis:'GROSS_EMPLOYMENT' as const,period:'MONTH' as const,hoursPerPeriod:168,ftePercent:100};
  const constraints={...DEFAULT_CONSTRAINTS,active:true,salaryMinimum};
  const state=(data=offer,c=constraints)=>explainConditions(data,c).find(row=>row.field==='salary')?.state;
  assert.equal(state(),'SATISFIED');
  assert.equal(state(offer,{...constraints,salaryMinimum:{...salaryMinimum,amount:550001}}),'KNOWN_NOT_MET');
  for(const changed of [{basis:'B2B_NET_INVOICE_EXCL_VAT' as const,contract:'B2B' as const},{period:'HOUR' as const},{hoursPerPeriod:160},{ftePercent:50}]) {
    assert.equal(state({...offer,salary:[{...offer.salary[0]!,...changed,min:9999999,max:9999999}]}),'UNKNOWN');
  }
  const mixed={...offer,salary:[{...offer.salary[0]!,min:540000},{...offer.salary[0]!,contract:'B2B' as const,basis:'B2B_NET_INVOICE_EXCL_VAT' as const,min:9999999,max:9999999}]};
  assert.equal(state(mixed),'UNKNOWN');
  assert.equal(state(mixed,{...constraints,contracts:['UOP']}),'KNOWN_NOT_MET');
  assert.equal(state(offer,{...constraints,contracts:['B2B']}),'UNKNOWN');
  assert.deepEqual(explainConditions(offer,{...constraints,active:false}),[]);
});

test('private salary filter is persisted, versioned and scoped while projections/history/order stay unchanged',async()=>{
  const f=await setup();try {
    const profiles=new ProfileService(f.app.db),offers=new OfferService(f.app.db),r=new RecruitmentService(f.app.db);
    const alternative=offers.create(f.employer.id,f.org.id,{...offerInput(f.employer.id),salary:[{...offerInput(f.employer.id).salary[0]!,period:'HOUR',min:10000,max:10000}]});
    offers.lifecycle(f.employer.id,alternative.id,{action:'REVIEW',expectedVersion:1});offers.lifecycle(f.employer.id,alternative.id,{action:'PUBLISH',expectedVersion:2,confirmed:true});
    const order=offers.list(f.candidate.id).map(o=>o.id),projection=profiles.projection(f.candidate.id);
    const preview=profiles.previewConfirmation(f.candidate.id);
    const process=r.interest(f.candidate.id,f.offer.id,{offerVersion:1,projectionConfirmed:true,confirmationToken:preview.confirmationToken,idempotencyKey:'salary-interest'});
    r.watch(f.candidate.id,alternative.id,true);
    const snapshot=r.row(process.id).snapshot,firstClock=r.row(process.id).response_due_at;
    const salaryMinimum={amount:550000,currency:'PLN',basis:'GROSS_EMPLOYMENT',period:'MONTH',hoursPerPeriod:168,ftePercent:100,privateNote:'Never share'};
    const constraints={...DEFAULT_CONSTRAINTS,active:true,salaryMinimum};
    const update=async(s:Record<string,unknown>)=>f.request('/api/faro/profile/constraints',f.candidate.cookie,'PUT',{expectedVersion:profiles.profile(f.candidate.id).version,constraints:s});
    const initialVersion=profiles.profile(f.candidate.id).version;
    await update(constraints);
    assert.deepEqual(offers.list(f.candidate.id).map(o=>o.id),[f.offer.id]);
    assert.equal(offers.detail(f.candidate.id,alternative.id).conditionExplanation.find(c=>c.field==='salary')!.state,'UNKNOWN');
    assert.deepEqual(profiles.projection(f.candidate.id),projection);assert.equal(r.row(process.id).snapshot,snapshot);assert.equal(r.row(process.id).response_due_at,firstClock);
    assert.deepEqual(offers.detail(f.employer.id,f.offer.id).conditionExplanation,[]);
    assert.equal(JSON.stringify(profiles.profile(f.candidate.id).preferences).includes('Never share'),false);
    assert.equal(profiles.constraints(f.outsider.id).salaryMinimum,null);
    const exportOwn=await f.request<{faro:{faro_profiles:Array<{preferences:string}>}}>('/api/export',f.candidate.cookie);
    assert.equal(JSON.parse(exportOwn.faro.faro_profiles[0]!.preferences).salaryMinimum.amount,550000);
    await f.request('/api/faro/profile/constraints',f.candidate.cookie,'PUT',{expectedVersion:initialVersion,constraints},409);
    const omit={active:true,workModels:[],contracts:[],noNights:false,noWeekends:false};
    await update(omit);assert.equal(profiles.constraints(f.candidate.id).salaryMinimum!.amount,550000);
    for(const changed of [{amount:1.5},{amount:0},{amount:Number.MAX_SAFE_INTEGER},{currency:'EUR'},{basis:'NET'},{hoursPerPeriod:0},{ftePercent:101},{period:'WEEK'}]) {
      const before=profiles.profile(f.candidate.id);
      await f.request('/api/faro/profile/constraints',f.candidate.cookie,'PUT',{expectedVersion:before.version,constraints:{...constraints,salaryMinimum:{...salaryMinimum,...changed}}},400);
      assert.deepEqual(profiles.profile(f.candidate.id),before);
    }
    await update({...constraints,salaryMinimum:{...salaryMinimum,amount:650000}});
    assert.equal(offers.list(f.candidate.id).length,0);assert.equal(offers.detail(f.candidate.id,f.offer.id).conditionExplanation.find(c=>c.field==='salary')!.state,'KNOWN_NOT_MET');
    assert.equal(r.watches(f.candidate.id).length,1);assert.deepEqual(offers.list(f.employer.id,f.org.id).map(o=>o.id),order);
    await update({...constraints,active:false});assert.deepEqual(offers.list(f.candidate.id).map(o=>o.id),order);
    await update({...constraints,salaryMinimum:null});assert.deepEqual(offers.list(f.candidate.id).map(o=>o.id),order);
  }finally{await f.close();}
});

test('native process: private watch, identical preview, rejection requirement, clocks, tenant isolation, explicit phone grant and immutable diff', async () => {
  const f = await setup();
  try {
    const { candidate: c, employer: e, outsider: x, offer: o } = f;
    await f.request(`/api/faro/offers/${o.id}/watch`, c.cookie, 'POST');
    assert.equal((await f.request<{ processes: unknown[] }>(`/api/faro/processes?offerId=${o.id}`, e.cookie)).processes.length, 0);
    assert.equal((await f.request<{ offers: unknown[] }>('/api/faro/watches', e.cookie)).offers.length, 0);
    const preview = await f.request<Record<string, unknown>>('/api/faro/profile/preview', c.cookie);
    const confirmation = await f.request<{confirmationToken:string}>('/api/faro/profile/preview-confirmation', c.cookie);
    const interestBody = { offerVersion: 1, projectionConfirmed: true, confirmationToken:confirmation.confirmationToken, idempotencyKey: 'interest-1' };
    const interest = await f.request<{ id: string }>(`/api/faro/offers/${o.id}/interest`, c.cookie, 'POST', interestBody, 201);
    const replay = await f.request<{ id: string }>(`/api/faro/offers/${o.id}/interest`, c.cookie, 'POST', interestBody, 201);
    assert.equal(interest.id, replay.id);
    await f.request(`/api/faro/processes/${interest.id}`, x.cookie, 'GET', undefined, 404);
    const service = new RecruitmentService(f.app.db);
    let process = service.view(e.id, interest.id);
    assert.deepEqual(process.projection, { ...preview, processId: interest.id });
    assert.equal(process.firstResponseAt, null); assert.equal(process.stageDueAt, null);
    await f.request(`/api/faro/processes/${interest.id}/phone`, e.cookie, 'GET', undefined, 403);
    await f.request(`/api/faro/processes/${interest.id}/phone-grant`, c.cookie, 'POST', {}, 409);
    await f.request(`/api/faro/processes/${interest.id}/commands`, e.cookie, 'POST', { command: 'REJECT', reason: { code: 'OTHER_CANDIDATE_BETTER_MATCH' }, expectedVersion: 1, idempotencyKey: 'bad-reject' }, 400);
    await f.request(`/api/faro/processes/${interest.id}/commands`, e.cookie, 'POST', { command: 'REJECT', reason: { code: 'OTHER_CANDIDATE_BETTER_MATCH', requirementId: 'req-cash' }, expectedVersion: 1, idempotencyKey: 'bad-teach' }, 400);
    const dueAt = new Date(Date.now() + 96 * 3600000).toISOString();
    await f.request(`/api/faro/processes/${interest.id}/commands`, e.cookie, 'POST', { command: 'ADVANCE', nextAction: 'Uzgodnijmy termin rozmowy', dueAt, expectedVersion: 1, idempotencyKey: 'advance' });
    process = service.view(e.id, interest.id);
    assert.ok(process.firstResponseAt); assert.equal(process.stageDueAt, dueAt); assert.notEqual(process.responseDueAt, process.stageDueAt);
    await f.request(`/api/faro/processes/${interest.id}/phone`, e.cookie, 'GET', undefined, 403);
    const phonePreview=await f.request<{confirmationToken:string}>(`/api/faro/processes/${interest.id}/phone-preview`,c.cookie);
    await f.request(`/api/faro/processes/${interest.id}/phone-grant`, c.cookie, 'POST',{phoneConfirmed:true,confirmationToken:phonePreview.confirmationToken});
    assert.equal((await f.request<{ phone: string }>(`/api/faro/processes/${interest.id}/phone`, e.cookie)).phone, '+48500100200');
    await f.request(`/api/faro/processes/${interest.id}/phone-grant`, c.cookie, 'DELETE');
    await f.request(`/api/faro/processes/${interest.id}/phone`, e.cookie, 'GET', undefined, 403);
    const updated = { ...o.data, hours: '9:00–17:00' };
    const edited = await f.request<OfferRecord>(`/api/faro/offers/${o.id}`, e.cookie, 'PUT', { data: updated, expectedVersion: o.revision });
    assert.equal(edited.version, 2); assert.equal(edited.approvedVersion, null); assert.equal(edited.status, 'DRAFT');
    assert.equal(service.view(c.id, interest.id).changes.length,0);
    assert.equal(service.view(e.id, interest.id).changes[0]!.field,'hours');
    await f.request(`/api/faro/offers/${o.id}/lifecycle`,e.cookie,'POST',{action:'REVIEW',expectedVersion:edited.revision});
    await f.request(`/api/faro/offers/${o.id}/lifecycle`,e.cookie,'POST',{action:'PUBLISH',expectedVersion:edited.revision+1,confirmed:true});
    assert.equal(service.view(c.id, interest.id).changes[0]!.field, 'hours');
    assert.equal(service.row(interest.id).offer_version, 1);
    await f.request(`/api/faro/processes/${interest.id}/commands`, c.cookie, 'POST', { command: 'WITHDRAW', expectedVersion: 2, idempotencyKey: 'withdraw' });
    await f.request(`/api/faro/processes/${interest.id}/commands`, e.cookie, 'POST', { command: 'REJECT', reason: { code: 'POSITION_FILLED' }, expectedVersion: 2, idempotencyKey: 'race' }, 409);
    service.deliverOutbox(); service.deliverOutbox();
    const duplicates = f.app.db.db.prepare('SELECT COUNT(*) n FROM (SELECT dedupe_key,user_id FROM notifications GROUP BY dedupe_key,user_id HAVING COUNT(*)>1)').get() as { n: number };
    assert.equal(duplicates.n, 0);
  } finally { await f.close(); }
});

test('interest rejects absent or stale preview without side effects and freezes confirmed data', async () => {
  const f = await setup();
  try {
    const profiles = new ProfileService(f.app.db), service = new RecruitmentService(f.app.db);
    const url = `/api/faro/offers/${f.offer.id}/interest`;
    const body = { offerVersion:1, projectionConfirmed:true, idempotencyKey:'preview-race' };
    await f.request(url,f.candidate.cookie,'POST',body,409);
    const old = profiles.previewConfirmation(f.candidate.id);
    profiles.learn(f.candidate.id,{skillId:f.offer.data.requirements[0]!.skillId,mode:'WANTS_TO_LEARN',practice:{quantity:null,unit:'MONTHS'}});
    await f.request(url,f.candidate.cookie,'POST',{...body,confirmationToken:old.confirmationToken},409);
    assert.equal(service.list(f.candidate.id).length,0);
    assert.equal((f.app.db.db.prepare('SELECT COUNT(*) n FROM faro_events').get() as {n:number}).n,0);
    const current = profiles.previewConfirmation(f.candidate.id);
    const accepted = {...body,confirmationToken:current.confirmationToken};
    const result = await f.request<{id:string}>(url,f.candidate.cookie,'POST',accepted,201);
    profiles.save(f.candidate.id,{firstName:'Adam',expectedVersion:1,availability:{kind:'IMMEDIATE'}});
    assert.deepEqual(service.view(f.employer.id,result.id).projection,{...current.projection,processId:result.id});
    assert.deepEqual(await f.request(url,f.candidate.cookie,'POST',accepted,201),result);
  } finally { await f.close(); }
});

test('clarification cannot close the first clock with an empty acknowledgment or leak free text; typed answer resumes employer clock without changing profile facts',async()=>{
  const f=await setup();try {
    const service=new RecruitmentService(f.app.db),profiles=new ProfileService(f.app.db);
    const p=service.interest(f.candidate.id,f.offer.id,{offerVersion:1,projectionConfirmed:true,confirmationToken:profiles.previewConfirmation(f.candidate.id).confirmationToken,idempotencyKey:'clarification-interest'});
    const url=`/api/faro/processes/${p.id}/commands`,dueAt=new Date(Date.now()+86400000).toISOString();
    await f.request(url,f.employer.cookie,'POST',{command:'CLARIFY',nextAction:'Dziękujemy za zgłoszenie',dueAt,expectedVersion:1,idempotencyKey:'empty-ack'},400);
    assert.equal(service.row(p.id).first_response_at,null);
    await f.request(url,f.employer.cookie,'POST',{command:'CLARIFY',question:{topic:'REQUIREMENT',requirementId:'unknown'},dueAt,expectedVersion:1,idempotencyKey:'wrong-requirement'},400);
    await f.request(url,f.employer.cookie,'POST',{command:'CLARIFY',question:{topic:'REQUIREMENT',requirementId:'req-customer'},dueAt,expectedVersion:1,idempotencyKey:'skill-question'});
    const first=service.row(p.id).first_response_at;assert.ok(first);
    await f.request(url,f.candidate.cookie,'POST',{command:'ANSWER',answer:'Nazwisko Sekret, +48500100200, poprzednia firma',expectedVersion:2,idempotencyKey:'raw-answer',confirmed:true},400);
    const answer={command:'ANSWER',response:{kind:'DECLARE_SKILL',level:'INDEPENDENT',source:'WORK',practice:{quantity:12,unit:'MONTHS'},surname:'Sekret',photo:'private.png',verification:'FARO_ASSESSMENT'},answer:'Poprzednia firma i stanowisko',confirmed:true,expectedVersion:2,idempotencyKey:'typed-answer'};
    await f.request(url,f.candidate.cookie,'POST',answer);
    const view=service.view(f.employer.id,p.id),serialized=JSON.stringify(view);
    assert.doesNotMatch(serialized,/Sekret|private\.png|Poprzednia firma|48500100200|FARO_ASSESSMENT/);
    assert.equal(view.firstResponseAt,first);assert.ok(view.stageDueAt);assert.equal(view.stage,'AWAITING_EMPLOYER');
    assert.equal(profiles.profile(f.candidate.id).claims.length,0);assert.equal(view.projection.skillClaims.length,0);
    const event=JSON.parse(view.events.find(e=>e.kind==='ANSWER')!.data) as {response:{verification:string}};
    assert.equal(event.response.verification,'DECLARED');
    // A pre-upgrade free-form answer stays private even when it already exists in history.
    f.app.db.db.prepare("UPDATE faro_events SET data=? WHERE process_id=? AND kind='ANSWER'").run(JSON.stringify({action:'Sekret +48500100200 poprzednia firma'}),p.id);
    f.app.db.db.prepare('UPDATE faro_interests SET next_action=? WHERE id=?').run('Sekret +48500100200',p.id);
    assert.doesNotMatch(JSON.stringify(service.view(f.employer.id,p.id)),/Sekret|48500100200|poprzednia firma/);
    await f.request(url,f.employer.cookie,'POST',{command:'CLARIFY',question:{topic:'AVAILABILITY'},dueAt,expectedVersion:3,idempotencyKey:'availability-question'});
    await f.request(url,f.candidate.cookie,'POST',{command:'ANSWER',confirmed:true,response:{availability:{kind:'ON_DATE',value:'2027-02-31'}},expectedVersion:4,idempotencyKey:'invalid-date'},400);
    await f.request(url,f.candidate.cookie,'POST',{command:'ANSWER',confirmed:true,response:{availability:{kind:'AFTER_PERIOD',value:7,surname:'Sekret'}},expectedVersion:4,idempotencyKey:'availability-answer'});
    const available=service.view(f.employer.id,p.id);assert.doesNotMatch(JSON.stringify(available),/Sekret/);
    const last=JSON.parse(available.events.at(-1)!.data) as {response:{availability:{kind:string;value:string}}};
    assert.equal(last.response.availability.kind,'AFTER_PERIOD');assert.equal(last.response.availability.value,'7');
    assert.equal(profiles.profile(f.candidate.id).availability.kind,'IMMEDIATE');
    f.app.db.db.prepare("UPDATE faro_events SET data='{}' WHERE process_id=? AND kind='CLARIFY'").run(p.id);
    f.app.db.db.prepare("UPDATE faro_interests SET stage='CLARIFICATION_REQUESTED' WHERE id=?").run(p.id);
    assert.ok(service.view(f.employer.id,p.id).availableCommands.includes('CLARIFY'));
    await f.request(url,f.employer.cookie,'POST',{command:'CLARIFY',question:{topic:'REQUIREMENT',requirementId:'req-customer'},dueAt,expectedVersion:5,idempotencyKey:'replace-legacy-question'});
    assert.equal(service.row(p.id).first_response_at,first);
  }finally{await f.close();}
});

test('renewed interest requires conscious link to latest own terminal history and does not reset previous clocks or events',async()=>{
  const f=await setup();try {
    const service=new RecruitmentService(f.app.db),profiles=new ProfileService(f.app.db);
    const body={offerVersion:1,projectionConfirmed:true,confirmationToken:profiles.previewConfirmation(f.candidate.id).confirmationToken,idempotencyKey:'original'};
    const original=service.interest(f.candidate.id,f.offer.id,body),due=service.row(original.id).response_due_at;
    service.change(f.candidate.id,original.id,{command:'WITHDRAW',expectedVersion:1,idempotencyKey:'original-withdraw'});
    const url=`/api/faro/offers/${f.offer.id}/interest`,renew={...body,idempotencyKey:'renew'};
    await f.request(url,f.candidate.cookie,'POST',renew,409);
    await f.request(url,f.candidate.cookie,'POST',{...renew,previousInterestId:'another-candidates-id',renewalConfirmed:true},409);
    const newBody={...renew,previousInterestId:original.id,renewalConfirmed:true};
    const next=await f.request<{id:string}>(url,f.candidate.cookie,'POST',newBody,201);
    assert.notEqual(next.id,original.id);assert.equal(service.view(f.employer.id,next.id).previousInterestId,original.id);
    assert.equal(service.row(original.id).status,'WITHDRAWN');assert.equal(service.row(original.id).response_due_at,due);
    assert.equal(service.view(f.employer.id,original.id).events.length,2);
    assert.deepEqual(await f.request(url,f.candidate.cookie,'POST',newBody,201),next);
    const detail=await f.request<{ownInterest:{id:string;status:string}}>(`/api/faro/offers/${f.offer.id}`,f.candidate.cookie);assert.equal(detail.ownInterest.id,next.id);
    assert.equal((await f.request<{ownInterest:unknown}>(`/api/faro/offers/${f.offer.id}`,f.employer.cookie)).ownInterest,null);
  }finally{await f.close();}
});

test('unpublished material changes stay in employer scope until publication; watches and applicant diff retain last published facts; revoked recruiter closes intake',async()=>{
  const f=await setup();try {
    const offers=new OfferService(f.app.db),recruitment=new RecruitmentService(f.app.db),profiles=new ProfileService(f.app.db);
    recruitment.watch(f.candidate.id,f.offer.id,true);
    const p=recruitment.interest(f.candidate.id,f.offer.id,{offerVersion:1,projectionConfirmed:true,confirmationToken:profiles.previewConfirmation(f.candidate.id).confirmationToken,idempotencyKey:'publication-interest'});
    const draft=offers.edit(f.employer.id,f.offer.id,{data:{...f.offer.data,role:'NIEPUBLIKOWANY SZKIC',salary:[{...f.offer.data.salary[0]!,min:900000,max:950000}]},expectedVersion:f.offer.revision});
    assert.equal(offers.detail(f.employer.id,f.offer.id).version,2);
    const visible=offers.detail(f.candidate.id,f.offer.id);assert.equal(visible.version,1);assert.equal(visible.status,'PAUSED');assert.equal(visible.acceptingInterest,false);
    assert.doesNotMatch(JSON.stringify(visible),/NIEPUBLIKOWANY|900000/);
    assert.doesNotMatch(JSON.stringify(recruitment.watches(f.candidate.id)),/NIEPUBLIKOWANY|900000/);
    assert.equal(recruitment.view(f.candidate.id,p.id).changes.length,0);
    await f.request(`/api/faro/offers/${f.offer.id}`,f.outsider.cookie,'GET',undefined,404);
    offers.lifecycle(f.employer.id,f.offer.id,{action:'REVIEW',expectedVersion:draft.revision});
    assert.equal(offers.detail(f.candidate.id,f.offer.id).version,1);
    offers.lifecycle(f.employer.id,f.offer.id,{action:'PUBLISH',expectedVersion:draft.revision+1,confirmed:true});
    const published=offers.detail(f.candidate.id,f.offer.id);assert.equal(published.version,2);assert.equal(published.publicationSource,'EXPLICIT');assert.ok(published.publishedAt);
    assert.equal(recruitment.view(f.candidate.id,p.id).changes.find(c=>c.field==='role')?.after,'NIEPUBLIKOWANY SZKIC');
    assert.equal(recruitment.row(p.id).offer_version,1);
    f.app.db.db.prepare('UPDATE faro_members SET active=0 WHERE user_id=? AND organization_id=?').run(f.employer.id,f.org.id);
    assert.equal(offers.intake(offers.get(f.offer.id)),false);assert.equal(offers.list(f.candidate.id).length,0);
    await f.request(`/api/faro/offers/${f.offer.id}/interest`,f.outsider.cookie,'POST',{offerVersion:2,projectionConfirmed:true,idempotencyKey:'revoked-recruiter'},409);
  }finally{await f.close();}
});

test('offer salary validation and stale/paused intake preserve access to existing processes', async () => {
  const f = await setup();
  try {
    await f.request(`/api/faro/organizations/${f.org.id}/offers`, f.employer.cookie, 'POST', { ...offerInput(f.employer.id), salary: [] }, 400);
    const service = new RecruitmentService(f.app.db), offerService = new OfferService(f.app.db);
    const interest = service.interest(f.candidate.id, f.offer.id, { offerVersion: 1, projectionConfirmed: true, confirmationToken:new ProfileService(f.app.db).previewConfirmation(f.candidate.id).confirmationToken, idempotencyKey: 'one' });
    offerService.lifecycle(f.employer.id, f.offer.id, { action: 'PAUSE', expectedVersion: f.offer.revision });
    assert.equal(service.view(f.employer.id, interest.id).status, 'INTERESTED');
    await f.request(`/api/faro/offers/${f.offer.id}/interest`, f.outsider.cookie, 'POST', { offerVersion: 1, projectionConfirmed: true, idempotencyKey: 'paused' }, 409);
    f.app.db.db.prepare("UPDATE faro_offers SET status='PUBLISHED',confirmed_until='2000-01-01T00:00:00.000Z' WHERE id=?").run(f.offer.id);
    assert.equal(offerService.list(f.candidate.id).length, 0);
    await f.request(`/api/faro/offers/${f.offer.id}/interest`, f.outsider.cookie, 'POST', { offerVersion: 1, projectionConfirmed: true, idempotencyKey: 'stale' }, 409);
  } finally { await f.close(); }
});

test('worker closing uses published deadline rather than paused unpublished draft',async()=>{
  const f=await setup();try {
    const offers=new OfferService(f.app.db);
    offers.edit(f.employer.id,f.offer.id,{data:{...f.offer.data,closesAt:new Date(Date.now()+86400000).toISOString()},expectedVersion:f.offer.revision});
    f.app.db.db.prepare("UPDATE faro_offers SET status='PAUSED' WHERE id=?").run(f.offer.id);
    new TrustService(f.app.db,()=>new Date(Date.now()+2*86400000)).tick();
    assert.equal(offers.get(f.offer.id).status,'PAUSED');
    new TrustService(f.app.db,()=>new Date(Date.now()+31*86400000)).tick();
    assert.equal(offers.get(f.offer.id).status,'CLOSED');
  }finally{await f.close();}
});

test('matching is requirement-specific and billing-independent; pending suggestions cannot satisfy MUST', async () => {
  const f = await setup();
  try {
    const p = new ProfileService(f.app.db);
    p.activity(f.candidate.id, { description: 'Praca na stacji', source: 'WORK' });
    const data = p.profile(f.candidate.id);
    const explained = explainOffer(f.offer.data, data.claims, data.learning);
    assert.equal(explained[0]!.state, 'NOT_DEMONSTRATED'); assert.equal(explained[1]!.state, 'NOT_APPLICABLE');
    const before = sortOffers([{ ...f.offer, billingPlan: 'FREE' }]).map(o => o.id);
    const after = sortOffers([{ ...f.offer, billingPlan: 'ENTERPRISE' }]).map(o => o.id);
    assert.deepEqual(before, after);
    f.app.db.db.prepare("UPDATE subscriptions SET plan='PRO_MONTHLY' WHERE user_id=?").run(f.candidate.id);
    assert.deepEqual(new OfferService(f.app.db).detail(f.candidate.id, f.offer.id).explanation, explained);
    assert.equal('score' in explained[0]!, false);
  } finally { await f.close(); }
});

test('watch alerts remain private, mute removes pending optional alerts, closing reminder is deduplicated and process updates stay independent',async()=>{
  const f=await setup();try {
    const r=new RecruitmentService(f.app.db),url=`/api/faro/offers/${f.offer.id}/watch`;
    r.watch(f.candidate.id,f.offer.id,true);
    assert.equal(r.watches(f.candidate.id)[0]!.watchAlerts,true);
    await f.request(url,f.employer.cookie,'PUT',{alerts:false,candidateId:f.candidate.id},404);
    r.enqueue(f.candidate.id,'offer',f.offer.id,'Opcjonalna zmiana oferty','watch-pending');
    const claimed=r.claimOutbox();assert.equal(claimed.length,1);
    r.enqueue(f.candidate.id,'offer',f.offer.id,'Historyczna opcjonalna zmiana','watch-dead');
    const dead=f.app.db.db.prepare("SELECT id FROM faro_outbox WHERE dedupe_key='watch-dead'").get()!.id as string;
    f.app.db.db.prepare("UPDATE faro_outbox SET status='DEAD_LETTER',attempts=5 WHERE id=?").run(dead);
    await f.request(url,f.candidate.cookie,'PUT',{alerts:false});
    assert.equal(r.watches(f.candidate.id).length,1);assert.equal(r.watches(f.candidate.id)[0]!.watchAlerts,false);
    assert.equal(f.app.db.db.prepare("SELECT COUNT(*) n FROM faro_outbox WHERE dedupe_key='watch-pending'").get()!.n,0);
    assert.equal(r.deliverClaimedOutbox(claimed[0]!.id,claimed[0]!.claimToken),false);
    const retry={expectedAttempts:5,confirmed:true,reasonCode:'TRANSIENT_FAILURE_RESOLVED',idempotencyKey:'muted-dead-retry'};
    const rejected=await f.request<{error:{code:string}}>(`/api/faro/worker/outbox/${dead}/retry`,f.outsider.cookie,'POST',retry,409);
    assert.equal(rejected.error.code,'OUTBOX_NO_LONGER_ELIGIBLE');
    assert.equal(f.app.db.db.prepare('SELECT status FROM faro_outbox WHERE id=?').get(dead)!.status,'DEAD_LETTER');
    assert.equal(r.watches(f.employer.id).length,0);
    const future=new Date(Date.parse(f.offer.data.closesAt)-12*3600000);
    new TrustService(f.app.db,()=>future).tick();
    assert.equal(f.app.db.db.prepare("SELECT COUNT(*) n FROM notifications WHERE user_id=? AND dedupe_key LIKE '%:closing-soon'").get(f.candidate.id)!.n,0);
    await f.request(url,f.candidate.cookie,'PUT',{alerts:true});
    await f.request(`/api/faro/worker/outbox/${dead}/retry`,f.outsider.cookie,'POST',retry);
    const revived=r.claimOutbox().find(c=>c.id===dead)!;assert.ok(revived);
    // Simulate a preference change before delivery, independently of pending-row cancellation.
    f.app.db.db.prepare('UPDATE faro_watches SET alerts=0 WHERE candidate_id=? AND offer_id=?').run(f.candidate.id,f.offer.id);
    assert.equal(r.deliverClaimedOutbox(revived.id,revived.claimToken),false);
    assert.equal(f.app.db.db.prepare("SELECT id FROM notifications WHERE dedupe_key='faro:watch-dead'").get(),undefined);
    await f.request(url,f.candidate.cookie,'PUT',{alerts:true});
    new TrustService(f.app.db,()=>future).tick();new TrustService(f.app.db,()=>future).tick();
    assert.equal(f.app.db.db.prepare("SELECT COUNT(*) n FROM notifications WHERE user_id=? AND dedupe_key LIKE '%:closing-soon'").get(f.candidate.id)!.n,1);
    // Resume synthetic offer intake before testing independent applicant notifications.
    f.app.db.db.prepare("UPDATE faro_offers SET status='PUBLISHED',confirmed_until=? WHERE id=?").run(new Date(Date.now()+86400000).toISOString(),f.offer.id);
    r.interest(f.candidate.id,f.offer.id,{offerVersion:1,projectionConfirmed:true,confirmationToken:new ProfileService(f.app.db).previewConfirmation(f.candidate.id).confirmationToken,idempotencyKey:'watch-applicant'});
    r.enqueue(f.candidate.id,'offer',f.offer.id,'Warunki istotne dla zgłoszenia','applicant-pending');
    r.enqueue(f.candidate.id,'offer',f.offer.id,'Opcjonalne zamknięcie','offer:fixture:closing-soon');
    r.enqueue(f.candidate.id,'offer',f.offer.id,'Historyczne opcjonalne zamknięcie','offer:dead:closing-soon');
    const closingDead=f.app.db.db.prepare("SELECT id FROM faro_outbox WHERE dedupe_key='offer:dead:closing-soon'").get()!.id as string;
    f.app.db.db.prepare("UPDATE faro_outbox SET status='DEAD_LETTER',attempts=5 WHERE id=?").run(closingDead);
    await f.request(url,f.candidate.cookie,'PUT',{alerts:false});
    assert.equal(f.app.db.db.prepare("SELECT COUNT(*) n FROM faro_outbox WHERE dedupe_key='applicant-pending'").get()!.n,1);
    assert.equal(f.app.db.db.prepare("SELECT COUNT(*) n FROM faro_outbox WHERE dedupe_key='offer:fixture:closing-soon'").get()!.n,0);
    await f.request(`/api/faro/worker/outbox/${closingDead}/retry`,f.outsider.cookie,'POST',{...retry,idempotencyKey:'applicant-optional-retry'},409);
    r.deliverOutbox();assert.ok(f.app.db.db.prepare("SELECT id FROM notifications WHERE user_id=? AND dedupe_key='faro:applicant-pending'").get(f.candidate.id));
    await f.request(url,f.candidate.cookie,'PUT',{alerts:'false'},400);
    await f.request(url,f.candidate.cookie,'DELETE');assert.equal(r.watches(f.candidate.id).length,0);
  }finally{await f.close();}
});

test('explicit private constraints filter strictly without relaxing unknown; saved history and direct explanations stay available',async()=>{
  const f=await setup();try {
    const offers=new OfferService(f.app.db),profiles=new ProfileService(f.app.db),r=new RecruitmentService(f.app.db);
    for(const [title,nights,model] of [['Brak informacji',null,'REMOTE'],['Nocna praca',true,'REMOTE'],['Na miejscu',false,'ONSITE']] as const) {
      const draft=offers.create(f.employer.id,f.org.id,{...offerInput(f.employer.id),role:title,nights,workModel:model});
      offers.lifecycle(f.employer.id,draft.id,{action:'REVIEW',expectedVersion:1});offers.lifecycle(f.employer.id,draft.id,{action:'PUBLISH',expectedVersion:2,confirmed:true});
    }
    const all=offers.list(f.candidate.id);assert.equal(all.length,4);
    const unknown=all.find(o=>o.data.role==='Brak informacji')!;r.watch(f.candidate.id,unknown.id,true);
    const before=profiles.projection(f.candidate.id),version=profiles.profile(f.candidate.id).version;
    const constraints={active:true,workModels:['REMOTE'],contracts:['UOP'],noNights:true,noWeekends:true,privateNote:'Nie ujawniaj',candidateId:f.outsider.id};
    const body={expectedVersion:version,constraints};
    await f.request('/api/faro/profile/constraints',f.candidate.cookie,'PUT',body);
    assert.deepEqual(offers.list(f.candidate.id).map(o=>o.id),[f.offer.id]);
    assert.deepEqual(profiles.projection(f.candidate.id),before);
    assert.equal(JSON.stringify(profiles.constraints(f.candidate.id)).includes('Nie ujawniaj'),false);
    assert.equal(profiles.profile(f.outsider.id).preferences.active,undefined);
    const explanation=offers.detail(f.candidate.id,unknown.id).conditionExplanation;
    assert.equal(explanation.find(c=>c.field==='nights')!.state,'UNKNOWN');
    assert.equal(r.watches(f.candidate.id).length,1);
    assert.equal(offers.list(f.employer.id,f.org.id).length,4);
    assert.deepEqual(offers.detail(f.employer.id,unknown.id).conditionExplanation,[]);
    await f.request('/api/faro/profile/constraints',f.candidate.cookie,'PUT',body,409);
    const latest=profiles.profile(f.candidate.id).version;
    await f.request('/api/faro/profile/constraints',f.candidate.cookie,'PUT',{expectedVersion:latest,constraints:{...constraints,workModels:['HYBRID']}});
    assert.equal(offers.list(f.candidate.id).length,0);assert.equal(offers.list(f.candidate.id).length,0);
    assert.equal(profiles.constraints(f.candidate.id).active,true);
    await f.request('/api/faro/profile/constraints',f.candidate.cookie,'PUT',{expectedVersion:latest+1,constraints:{...constraints,active:false}});
    assert.equal(offers.list(f.candidate.id).length,4);
    await f.request('/api/faro/profile/constraints',f.candidate.cookie,'PUT',{expectedVersion:latest+2,constraints:{...constraints,noNights:'false'}},400);
  }finally{await f.close();}
});

test('phone consent binds exact number and process; profile changes atomically revoke every old grant',async()=>{
  const f=await setup();try {
    const r=new RecruitmentService(f.app.db),profiles=new ProfileService(f.app.db),offers=new OfferService(f.app.db);
    const body={offerVersion:1,projectionConfirmed:true,confirmationToken:profiles.previewConfirmation(f.candidate.id).confirmationToken,idempotencyKey:'phone-first'};
    const p=r.interest(f.candidate.id,f.offer.id,body);
    await f.request(`/api/faro/processes/${p.id}/phone-preview`,f.candidate.cookie,'GET',undefined,409);
    r.change(f.employer.id,p.id,{command:'ADVANCE',expectedVersion:1,idempotencyKey:'phone-advance',nextAction:'Uzgodnienie rozmowy',dueAt:new Date(Date.now()+86400000).toISOString()});
    const previewUrl=`/api/faro/processes/${p.id}/phone-preview`,grantUrl=`/api/faro/processes/${p.id}/phone-grant`;
    await f.request(previewUrl,f.employer.cookie,'GET',undefined,404);
    await f.request(previewUrl,f.outsider.cookie,'GET',undefined,404);
    const old=await f.request<{phone:string;confirmationToken:string}>(previewUrl,f.candidate.cookie);
    assert.equal(old.phone,'+48500100200');
    await f.request(grantUrl,f.candidate.cookie,'POST',{},400);
    await f.request(grantUrl,f.candidate.cookie,'POST',{phoneConfirmed:true},409);
    await f.request(grantUrl,f.employer.cookie,'POST',{phoneConfirmed:true,confirmationToken:old.confirmationToken},404);
    assert.equal(r.view(f.candidate.id,p.id).contactGrant,null);
    await f.request(grantUrl,f.candidate.cookie,'POST',{phoneConfirmed:true,confirmationToken:old.confirmationToken});
    const draft=offers.create(f.employer.id,f.org.id,offerInput(f.employer.id));
    offers.lifecycle(f.employer.id,draft.id,{action:'REVIEW',expectedVersion:1});
    offers.lifecycle(f.employer.id,draft.id,{action:'PUBLISH',expectedVersion:2,confirmed:true});
    const second=r.interest(f.candidate.id,draft.id,{...body,idempotencyKey:'phone-second'});
    r.change(f.employer.id,second.id,{command:'ADVANCE',expectedVersion:1,idempotencyKey:'phone-second-advance',nextAction:'Uzgodnienie rozmowy',dueAt:new Date(Date.now()+86400000).toISOString()});
    await f.request(`/api/faro/processes/${second.id}/phone-grant`,f.candidate.cookie,'POST',{phoneConfirmed:true,confirmationToken:old.confirmationToken},409);
    r.grant(f.candidate.id,second.id,true,{phoneConfirmed:true,confirmationToken:r.phonePreview(f.candidate.id,second.id).confirmationToken});
    profiles.save(f.candidate.id,{firstName:'Jan',expectedVersion:1,phone:old.phone,availability:{kind:'IMMEDIATE'}});
    assert.equal(r.phone(f.employer.id,p.id).phone,old.phone); // Other edits preserve consent to the same number.
    profiles.save(f.candidate.id,{firstName:'Jan',expectedVersion:2,phone:'+48600200300',availability:{kind:'IMMEDIATE'}});
    for(const id of [p.id,second.id])await f.request(`/api/faro/processes/${id}/phone`,f.employer.cookie,'GET',undefined,403);
    await f.request(grantUrl,f.candidate.cookie,'POST',{phoneConfirmed:true,confirmationToken:old.confirmationToken},409);
    const current=r.phonePreview(f.candidate.id,p.id);
    await f.request(grantUrl,f.candidate.cookie,'POST',{phoneConfirmed:true,confirmationToken:current.confirmationToken});
    assert.equal(r.phone(f.employer.id,p.id).phone,'+48600200300');
    profiles.save(f.candidate.id,{firstName:'Jan',expectedVersion:3,phone:null,availability:{kind:'IMMEDIATE'}});
    await f.request(`/api/faro/processes/${p.id}/phone`,f.employer.cookie,'GET',undefined,403);
    await f.request(previewUrl,f.candidate.cookie,'GET',undefined,400);
    const audit=JSON.stringify(f.app.db.db.prepare("SELECT * FROM audit_logs WHERE action LIKE 'PHONE_%'").all());
    assert.doesNotMatch(audit,/48500100200|48600200300/);
  }finally{await f.close();}
});


test('concrete employment terms pin published conditions and require owning candidate confirmation of exact unexpired revision',async()=>{
  const f=await setup();
  try {
    const r=new RecruitmentService(f.app.db),profile=new ProfileService(f.app.db),preview=profile.previewConfirmation(f.candidate.id);
    const p=r.interest(f.candidate.id,f.offer.id,{offerVersion:1,projectionConfirmed:true,confirmationToken:preview.confirmationToken,idempotencyKey:'employment-interest'});
    const dueAt=new Date(Date.now()+86400000).toISOString(),startsAt=new Date(Date.now()+7*86400000).toISOString();
    r.change(f.employer.id,p.id,{command:'ADVANCE',expectedVersion:1,idempotencyKey:'employment-advance',nextAction:'Uzgodnienie warunków pracy',dueAt});
    const body={command:'OFFER',expectedVersion:2,idempotencyKey:'employment-offer',nextAction:'Potwierdź pokazane warunki współpracy',dueAt,offerVersion:1,salaryIndex:0,amount:600000,startsAt,confirmed:true};
    assert.throws(()=>r.change(f.outsider.id,p.id,body),e=>(e as {status:number}).status===404);
    assert.throws(()=>r.change(f.employer.id,p.id,{...body,confirmed:false}),e=>(e as {code:string}).code==='CONFIRMATION_REQUIRED');
    assert.throws(()=>r.change(f.employer.id,p.id,{...body,amount:900000}),e=>(e as {code:string}).code==='SALARY_RANGE');
    assert.throws(()=>r.change(f.employer.id,p.id,{...body,offerVersion:99}),e=>(e as {code:string}).code==='PUBLICATION_NOT_FOUND');
    const result=r.change(f.employer.id,p.id,body);assert.deepEqual(r.change(f.employer.id,p.id,body),result);
    const terms=r.view(f.candidate.id,p.id).employmentOffer!;assert.equal(terms.amount,600000);assert.equal(terms.revision,3);assert.equal(terms.conditions.salary[0]!.min,550000);
    const original=r.row(p.id);assert.equal(original.status,'OFFERED');
    // An unpublished new draft cannot replace either participant's promised source or pinned conditions.
    const offers=new OfferService(f.app.db);offers.edit(f.employer.id,f.offer.id,{data:{...offerInput(f.employer.id),salary:[{...offerInput(f.employer.id).salary[0]!,min:850000,max:900000}]},expectedVersion:f.offer.revision});
    assert.equal(r.view(f.candidate.id,p.id).employmentSource.version,1);assert.equal(r.view(f.candidate.id,p.id).employmentOffer!.amount,600000);
    assert.equal(f.app.store.faroOfferAccepted(p.id),false);f.app.store.recordConsent(f.candidate.id,'ANALYTICS',true,'synthetic-offer-stage');
    const accept={command:'ACCEPT_OFFER',expectedVersion:3,idempotencyKey:'employment-accept',employmentOfferRevision:3,confirmed:true};
    assert.throws(()=>r.change(f.employer.id,p.id,accept),e=>(e as {code:string}).code==='INVALID_TRANSITION');
    assert.throws(()=>r.change(f.candidate.id,p.id,{...accept,confirmed:false}),e=>(e as {code:string}).code==='CONFIRMATION_REQUIRED');
    assert.throws(()=>r.change(f.candidate.id,p.id,{...accept,employmentOfferRevision:2}),e=>(e as {code:string}).code==='VERSION_CONFLICT');
    const late=new RecruitmentService(f.app.db,()=>new Date(Date.parse(dueAt)+1));assert.throws(()=>late.change(f.candidate.id,p.id,accept),e=>(e as {code:string}).code==='EMPLOYMENT_OFFER_EXPIRED');
    await f.request(`/api/faro/processes/${p.id}/commands`,f.candidate.cookie,'POST',accept);
    assert.equal(f.app.store.faroOfferAccepted(p.id),false);
    const stageEvents=f.app.db.db.prepare("SELECT properties FROM analytics_events WHERE event_name='FARO_MUTUAL_STAGE_COMPLETED' AND user_id=?").all(f.candidate.id);assert.equal(stageEvents.length,1);assert.equal(JSON.parse(String(stageEvents[0]!.properties)).stage,'OFFER_ACCEPTED');assert.doesNotMatch(String(stageEvents[0]!.properties),/600000|employmentOffer|conditions|salary|Anna|Jan/);
    assert.equal(r.row(p.id).status,'HIRED');assert.equal(r.row(p.id).first_response_at,original.first_response_at);assert.equal(r.row(p.id).response_due_at,original.response_due_at);
    assert.deepEqual(r.change(f.candidate.id,p.id,accept),{id:p.id,revision:4});
    assert.throws(()=>r.change(f.candidate.id,p.id,{...accept,idempotencyKey:'employment-after-terminal',expectedVersion:4}),e=>(e as {code:string}).code==='INVALID_TRANSITION');
    const exported=await f.request<{canonical:{faro_events:Array<{kind:string;data:string}>}}>('/api/export',f.candidate.cookie);
    // Export shape is tested through serialized output as well as private process scope.
    assert.ok(JSON.stringify(exported).includes('employmentOffer'));assert.ok(JSON.stringify(exported).includes('600000'));
    f.app.db.db.prepare("UPDATE faro_events SET data='{}' WHERE process_id=? AND kind='OFFER'").run(p.id);
    f.app.db.db.prepare("UPDATE faro_interests SET status='OFFERED',stage='OFFERED' WHERE id=?").run(p.id);
    assert.throws(()=>r.change(f.candidate.id,p.id,{...accept,idempotencyKey:'employment-legacy',expectedVersion:4}),e=>(e as {code:string}).code==='EMPLOYMENT_TERMS_REQUIRED');
    await f.request('/api/account',f.candidate.cookie,'DELETE',{password:'Bezpieczne123',confirmation:'USUŃ KONTO'});
    assert.equal(f.app.db.db.prepare("SELECT COUNT(*) n FROM analytics_events WHERE event_name='FARO_MUTUAL_STAGE_COMPLETED'").get()!.n,0);
    assert.equal(f.app.db.db.prepare('SELECT COUNT(*) n FROM faro_events WHERE process_id=?').get(p.id)!.n,0);assert.equal(f.app.db.db.prepare('SELECT COUNT(*) n FROM faro_interests WHERE id=?').get(p.id)!.n,0);assert.deepEqual(f.app.db.db.prepare('PRAGMA foreign_key_check').all(),[]);
  } finally {await f.close();}
});
