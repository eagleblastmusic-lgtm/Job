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
    const interestBody = { offerVersion: 1, projectionConfirmed: true, idempotencyKey: 'interest-1' };
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

test('offer salary validation and stale/paused intake preserve access to existing processes', async () => {
  const f = await setup();
  try {
    await f.request(`/api/faro/organizations/${f.org.id}/offers`, f.employer.cookie, 'POST', { ...offerInput(f.employer.id), salary: [] }, 400);
    const service = new RecruitmentService(f.app.db), offerService = new OfferService(f.app.db);
    const interest = service.interest(f.candidate.id, f.offer.id, { offerVersion: 1, projectionConfirmed: true, idempotencyKey: 'one' });
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
