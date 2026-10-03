import test from 'node:test';
import assert from 'node:assert/strict';
import { faroFixture, offerInput } from './faro-fixture.js';
import { AssessmentService } from '../server/faro/assessmentService.js';
import { TrustService } from '../server/faro/trustService.js';

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
    const assignment = { assessmentId: draft.id, version: draft.version, deadline: new Date(Date.now() + 86_400_000).toISOString() };
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
    const attempt = await f.request<{ id: string }>(`/api/faro/processes/${f.interest.id}/assessment`, f.employer.cookie, 'POST', assignment, 201);
    const before = await f.request<{ state: string; taskCount: number; tasks: unknown[]; revision: number }>(`/api/faro/attempts/${attempt.id}`, f.candidate.cookie);
    assert.equal(before.state, 'INVITED'); assert.equal(before.taskCount, 1); assert.equal(before.tasks.length, 0);
    const started = await f.request<{ state: string; startedAt: string; expiresAt: string; revision: number; tasks: Array<{ options: string[] }> }>(`/api/faro/attempts/${attempt.id}`, f.candidate.cookie, 'POST', {});
    assert.equal(started.state, 'STARTED'); assert.ok(started.startedAt); assert.ok(started.expiresAt); assert.equal(started.tasks[0]!.options.length, 2);
    const replay = await f.request<{ startedAt: string; expiresAt: string }>(`/api/faro/attempts/${attempt.id}`, f.candidate.cookie, 'POST', {});
    assert.equal(replay.startedAt, started.startedAt); assert.equal(replay.expiresAt, started.expiresAt);
    const saved = await f.request<{ state: string; revision: number }>(`/api/faro/attempts/${attempt.id}/answers`, f.candidate.cookie, 'PUT', { expectedVersion: started.revision, answers: { 'task-1': 1 } });
    assert.equal(saved.state, 'STARTED');
    const submitted = await f.request<{ state: string; result: unknown }>(`/api/faro/attempts/${attempt.id}/submit`, f.candidate.cookie, 'POST', { expectedVersion: saved.revision, answers: { 'task-1': 1 } });
    assert.equal(submitted.state, 'SCORED_PENDING_REVIEW'); assert.equal(submitted.result, null);
    const employerPending = await f.request<{ result: { earned: number; possible: number; unanswered: number; review: string } }>(`/api/faro/attempts/${attempt.id}`, f.employer.cookie);
    assert.equal(employerPending.result.earned, 2); assert.equal(employerPending.result.possible, 2); assert.equal(employerPending.result.unanswered, 0); assert.equal(employerPending.result.review, 'PENDING');
    await f.request(`/api/faro/attempts/${attempt.id}/review`, f.employer.cookie, 'POST', { confirmed: true, note: 'Sprawdzono według rubric-1' });
    const final = await f.request<{ state: string; result: { review: string } }>(`/api/faro/attempts/${attempt.id}`, f.employer.cookie);
    assert.equal(final.state, 'FINALIZED'); assert.equal(final.result.review, 'FINALIZED');
    const old = definition.row(attempt.id);
    f.app.db.db.prepare("UPDATE faro_attempts SET state='STARTED',expires_at=? WHERE id=?").run(new Date(Date.now() - 1000).toISOString(), attempt.id);
    await f.request(`/api/faro/attempts/${attempt.id}/answers`, f.candidate.cookie, 'PUT', { expectedVersion: old.revision, answers: { 'task-1': 0 } }, 409);
    assert.equal(definition.row(attempt.id).state, 'EXPIRED');
    assert.equal('ranking' in final.result, false);
  } finally { await f.close(); }
});

test('economics is private, versioned and honest about unsupported automatic tax rules', async () => {
  const f = await assessmentSetup();
  try {
    const result = await f.request<{ result: { estimatedNetRange: { min: number; max: number }; netAfterCommute: { min: number; max: number }; automaticTax: { supported: boolean }; calculationVersion: string }; offerVersion: number }>(`/api/faro/offers/${f.offer.id}/economics`, f.candidate.cookie, 'PUT', {
      salaryOptionIndex: 0, netMin: 420000, netMax: 470000, commuteCost: 30000, commuteMinutes: 45, transport: 'CAR', source: 'candidate-scenario', observedAt: new Date().toISOString(), assumptions: 'Ręcznie podany miesięczny koszt paliwa w groszach'
    });
    assert.equal(result.result.estimatedNetRange.min, 420000); assert.equal(result.result.netAfterCommute.max, 440000); assert.equal(result.result.automaticTax.supported, false); assert.equal(result.result.calculationVersion, 'manual-scenario-v1');
    const employerView = await f.request<Record<string, unknown>>(`/api/faro/offers/${f.offer.id}/economics`, f.employer.cookie, 'GET', undefined, 200);
    assert.equal(employerView, null);
    const text = JSON.stringify(result);
    assert.equal(/effective.?hourly|life.?score/i.test(text), false);
  } finally { await f.close(); }
});

test('trust report and stale-offer worker create reviewable signals, proportional restrictions and appeals', async () => {
  const f = await assessmentSetup();
  try {
    const report = await f.request<{ id: string; state: string }>(`/api/faro/processes/${f.interest.id}/reports`, f.candidate.cookie, 'POST', { kind: 'CV_REQUEST', statement: 'Pracodawca poprosił o dokument poza natywnym procesem.' }, 201);
    assert.equal(report.state, 'OPEN');
    assert.equal((await f.request<{ cases: unknown[] }>('/api/faro/cases', f.candidate.cookie)).cases.length, 1);
    await f.request(`/api/faro/cases/${report.id}/review`, f.candidate.cookie, 'POST', { state: 'ACTION', decision: 'Wstrzymano ofertę do sprawdzenia.', reviewAt: new Date().toISOString(), restrict: true }, 403);
    await f.request(`/api/faro/cases/${report.id}/review`, f.admin.cookie, 'POST', { state: 'EVIDENCE_REVIEW', decision: 'Sprawdzamy dowody.', reviewAt: new Date().toISOString() });
    await f.request(`/api/faro/cases/${report.id}/review`, f.admin.cookie, 'POST', { state: 'ACTION', decision: 'Wstrzymano ofertę do sprawdzenia.', reviewAt: new Date().toISOString(), restrict: true });
    await f.request(`/api/faro/cases/${report.id}/appeal`, f.candidate.cookie, 'POST', { statement: 'Proszę o ponowne sprawdzenie.' });
    const appeal = await f.request<{ state: string }>(`/api/faro/cases/${report.id}/review`, f.admin.cookie, 'POST', { state: 'RESOLVED', decision: 'Rozstrzygnięcie po odwołaniu.', reviewAt: new Date().toISOString() });
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
