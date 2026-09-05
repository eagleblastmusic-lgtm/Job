import test from 'node:test';
import assert from 'node:assert/strict';
import { inferCareerFactsFromText } from '../domain/careerTruth.js';
import { parseJobText } from '../domain/jobParser.js';
import { decideJob } from '../domain/decisionEngine.js';
import { buildCvDocument } from '../domain/cvEngine.js';
import { canTransitionApplication } from '../domain/statusTransitions.js';
import type { CareerFact, CareerProfile } from '../domain/types.js';

const profile: CareerProfile = {
  desiredRoles: ['magazynier'], location: 'Gdynia', commuteKm: 20, remotePreferences: ['ONSITE'], salaryMin: 5500,
  contractPreferences: ['UOP'], shiftPreferences: { nights: false, weekends: true }, availability: 'od zaraz'
};

test('CV inference never confirms facts automatically', () => {
  const facts = inferCareerFactsFromText('Excel, UDT i WMS. Język angielski B1.', 'CV:test');
  assert.ok(facts.some(f => f.value === 'Excel'));
  assert.ok(facts.some(f => f.value === 'UDT'));
  assert.ok(facts.every(f => f.status === 'INFERRED'));
  assert.ok(facts.every(f => f.allowedForCv === false));
});

test('job parser extracts practical Polish offer data', () => {
  const job = parseJobText(`Magazynier\nFirma: Logistyka ABC\nMiejsce pracy: Gdynia\nUmowa o pracę\nWynagrodzenie: 6000 - 7200 PLN brutto\nWymagania: UDT, WMS\nPraca stacjonarna, możliwe weekendy.`);
  assert.equal(job.company, 'Logistyka ABC');
  assert.equal(job.location, 'Gdynia');
  assert.equal(job.contractType, 'UOP');
  assert.equal(job.salaryMin, 6000);
  assert.equal(job.salaryMax, 7200);
  assert.equal(job.grossNet, 'GROSS');
  assert.ok(job.requirements.some(r => r.canonicalRequirement === 'UDT'));
});

test('decision engine distinguishes confirmed, unknown and preference conflict', () => {
  const facts: CareerFact[] = [{ id: '1', type: 'CREDENTIAL', value: 'UDT', normalizedValue: 'udt', level: null, source: 'USER', status: 'CONFIRMED', confidence: 1, evidence: 'user', allowedForCv: true }];
  const job = parseJobText(`Magazynier\nFirma: ABC\nWynagrodzenie 6000 - 7000 PLN brutto\nWymagania: UDT, WMS\nPraca nocna. Umowa o pracę.`);
  const decision = decideJob(profile, facts, job);
  assert.ok(decision.explanation.why.some(x => x.includes('UDT')));
  assert.ok(decision.explanation.unknown.some(x => x.includes('WMS')));
  assert.ok(decision.explanation.hardConstraints.some(x => x.includes('nocnej')));
});

test('CV engine includes only confirmed facts explicitly allowed for CV', () => {
  const facts: CareerFact[] = [
    { id: '1', type: 'TOOL', value: 'Excel', normalizedValue: 'excel', level: null, source: 'USER', status: 'CONFIRMED', confidence: 1, evidence: null, allowedForCv: true },
    { id: '2', type: 'TOOL', value: 'SAP', normalizedValue: 'sap', level: null, source: 'CV', status: 'INFERRED', confidence: 0.7, evidence: null, allowedForCv: false }
  ];
  const cv = buildCvDocument({ name: 'Jan Kowalski', profile, facts, experiences: [], education: [] });
  assert.deepEqual(cv.facts.map(f => f.value), ['Excel']);
  assert.ok(!cv.summary.includes('SAP'));
});

test('application status transitions are constrained', () => {
  assert.equal(canTransitionApplication('SAVED', 'APPLIED'), true);
  assert.equal(canTransitionApplication('SAVED', 'OFFER'), false);
  assert.equal(canTransitionApplication('INTERVIEW', 'OFFER'), true);
});
