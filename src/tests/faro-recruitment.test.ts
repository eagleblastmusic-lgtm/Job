import test from 'node:test';
import assert from 'node:assert/strict';
import { faroFixture, offerInput } from './faro-fixture.js';
import { ProfileService } from '../server/faro/profileService.js';
import { OfferService, type OfferRecord } from '../server/faro/offerService.js';
import { RecruitmentService } from '../server/faro/recruitmentService.js';
import { explainOffer, sortOffers } from '../domain/faro/offers.js';
import { TrustService } from '../server/faro/trustService.js';

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
    await f.request(url,f.candidate.cookie,'PUT',{alerts:false});
    assert.equal(r.watches(f.candidate.id).length,1);assert.equal(r.watches(f.candidate.id)[0]!.watchAlerts,false);
    assert.equal(f.app.db.db.prepare("SELECT COUNT(*) n FROM faro_outbox WHERE dedupe_key='watch-pending'").get()!.n,0);
    assert.equal(r.watches(f.employer.id).length,0);
    const future=new Date(Date.parse(f.offer.data.closesAt)-12*3600000);
    new TrustService(f.app.db,()=>future).tick();
    assert.equal(f.app.db.db.prepare("SELECT COUNT(*) n FROM notifications WHERE user_id=? AND dedupe_key LIKE '%:closing-soon'").get(f.candidate.id)!.n,0);
    await f.request(url,f.candidate.cookie,'PUT',{alerts:true});
    new TrustService(f.app.db,()=>future).tick();new TrustService(f.app.db,()=>future).tick();
    assert.equal(f.app.db.db.prepare("SELECT COUNT(*) n FROM notifications WHERE user_id=? AND dedupe_key LIKE '%:closing-soon'").get(f.candidate.id)!.n,1);
    // Resume synthetic offer intake before testing independent applicant notifications.
    f.app.db.db.prepare("UPDATE faro_offers SET status='PUBLISHED',confirmed_until=? WHERE id=?").run(new Date(Date.now()+86400000).toISOString(),f.offer.id);
    r.interest(f.candidate.id,f.offer.id,{offerVersion:1,projectionConfirmed:true,confirmationToken:new ProfileService(f.app.db).previewConfirmation(f.candidate.id).confirmationToken,idempotencyKey:'watch-applicant'});
    r.enqueue(f.candidate.id,'offer',f.offer.id,'Warunki istotne dla zgłoszenia','applicant-pending');
    r.enqueue(f.candidate.id,'offer',f.offer.id,'Opcjonalne zamknięcie','offer:fixture:closing-soon');
    await f.request(url,f.candidate.cookie,'PUT',{alerts:false});
    assert.equal(f.app.db.db.prepare("SELECT COUNT(*) n FROM faro_outbox WHERE dedupe_key='applicant-pending'").get()!.n,1);
    assert.equal(f.app.db.db.prepare("SELECT COUNT(*) n FROM faro_outbox WHERE dedupe_key='offer:fixture:closing-soon'").get()!.n,0);
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
