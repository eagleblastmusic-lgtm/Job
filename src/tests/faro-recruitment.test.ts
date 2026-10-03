import test from 'node:test';
import assert from 'node:assert/strict';
import { faroFixture, offerInput } from './faro-fixture.js';
import { ProfileService } from '../server/faro/profileService.js';
import { OfferService, type OfferRecord } from '../server/faro/offerService.js';
import { RecruitmentService } from '../server/faro/recruitmentService.js';
import { explainOffer, sortOffers } from '../domain/faro/offers.js';

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
    await f.request(`/api/faro/processes/${interest.id}/phone-grant`, c.cookie, 'POST');
    assert.equal((await f.request<{ phone: string }>(`/api/faro/processes/${interest.id}/phone`, e.cookie)).phone, '+48500100200');
    await f.request(`/api/faro/processes/${interest.id}/phone-grant`, c.cookie, 'DELETE');
    await f.request(`/api/faro/processes/${interest.id}/phone`, e.cookie, 'GET', undefined, 403);
    const updated = { ...o.data, hours: '9:00–17:00' };
    const edited = await f.request<OfferRecord>(`/api/faro/offers/${o.id}`, e.cookie, 'PUT', { data: updated, expectedVersion: o.revision });
    assert.equal(edited.version, 2); assert.equal(edited.approvedVersion, null); assert.equal(edited.status, 'DRAFT');
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
