import test from 'node:test';
import assert from 'node:assert/strict';
import { reliabilitySnapshot,type ReliabilityInterest } from '../domain/faro/reliability.js';
import { faroFixture,offerInput } from './faro-fixture.js';
import { ProfileService } from '../server/faro/profileService.js';
import { OfferService } from '../server/faro/offerService.js';
import { RecruitmentService } from '../server/faro/recruitmentService.js';
const from='2026-09-01T00:00:00.000Z',to='2026-09-10T00:00:00.000Z';
test('operational progression counts distinct mutually completed processes only, excluding invitations, unilateral completion and future or foreign evidence',()=>{
  const rows=['a','b'].map(id=>({id,createdAt:from,responseDueAt:to,firstResponseAt:null,status:'ACTIVE' as const,withdrawnAt:null}));
  const event=(processId:string,kind:string,mutuallyCompleted=false,createdAt=from)=>({processId,kind,mutuallyCompleted,createdAt});
  const r=reliabilitySnapshot(rows,[event('a','INTERVIEW_CONFIRM'),event('a','INTERVIEW_COMPLETE'),event('b','INTERVIEW_COMPLETE',true),event('b','INTERVIEW_COMPLETE',true),event('a','INTERVIEW_COMPLETE',true,'2026-09-11T00:00:00Z'),event('foreign','INTERVIEW_COMPLETE',true),event('a','REJECT')],from,to,to);
  assert.equal(r.progression.processesWithMutuallyCompletedInterview,1);assert.equal(r.progression.processesWithConfirmedInterview,1);assert.equal(r.progression.processesRejected,1);assert.equal(r.sampleSize,2);assert.equal(r.calculationVersion,'response-cohort-v2');
});
test('response reliability keeps original deadline denominator, early withdrawals and censored waits separate from median and progression',()=>{
  const row=(id:string,changes:Partial<ReliabilityInterest>={}):ReliabilityInterest=>({id,createdAt:from,responseDueAt:'2026-09-01T06:00:00Z',firstResponseAt:null,status:'INTERESTED',withdrawnAt:null,...changes});
  const rows=[row('a',{firstResponseAt:'2026-09-01T02:00:00Z',status:'ACTIVE'}),row('b',{firstResponseAt:'2026-09-01T05:00:00Z',status:'REJECTED'}),row('c',{firstResponseAt:from,status:'REJECTED'}),row('d',{firstResponseAt:'2026-09-01T08:00:00Z',status:'REJECTED'}),row('e',{responseDueAt:'2026-09-09T20:00:00Z'}),row('f',{status:'WITHDRAWN',withdrawnAt:'2026-09-09T23:00:00Z'}),row('g',{status:'WITHDRAWN',firstResponseAt:'2026-09-01T02:00:00Z',withdrawnAt:'2026-09-01T03:00:00Z'}),row('h',{responseDueAt:'2026-09-09T14:00:00Z'}),row('i',{responseDueAt:'2026-09-11T00:00:00Z'})];
  const events=[...['a','a'].map(processId=>({processId,kind:'ADVANCE',createdAt:from})),...['b','c','d'].map(processId=>({processId,kind:'REJECT',createdAt:from})),{processId:'foreign',kind:'INTERVIEW_CONFIRM',createdAt:from}];
  const result=reliabilitySnapshot(rows,events,from,to,to);
  assert.equal(result.sampleSize,9);assert.equal(result.maturedCohort,8);assert.equal(result.exclusions.withdrawnBeforeOriginalDeadline,1);
  assert.equal(result.firstResponse.denominator,7);assert.equal(result.firstResponse.numerator,3);assert.equal(result.firstResponse.onTimeRate,3/7);
  assert.equal(result.firstResponse.answered,4);assert.equal(result.firstResponse.late,1);assert.equal(result.firstResponse.unanswered,3);assert.equal(result.firstResponse.rightCensored,3);
  assert.equal(result.firstResponse.medianAnsweredHours,3.5);assert.equal(result.firstResponse.medianSampleSize,4);assert.equal(result.firstResponse.minAnsweredHours,0);assert.equal(result.firstResponse.maxAnsweredHours,8);
  assert.deepEqual(result.currentWaiting,{count:3,overdue:2,maxOverdueHours:10});
  assert.deepEqual(result.progression,{processesWithNextStage:1,processesWithAssessmentInvitation:0,processesWithConfirmedInterview:0,processesWithMutuallyCompletedInterview:0,processesRejected:3});
  assert.equal(result.window.deadline,'ORIGINAL_RESPONSE_DUE_AT');assert.equal('score' in result,false);assert.equal('restriction' in result,false);
  assert.throws(()=>reliabilitySnapshot([row('invalid',{firstResponseAt:'2026-08-31T00:00:00Z'})],[],from,to,to),/chronology/);
  const empty=reliabilitySnapshot([],[],from,to,to);assert.equal(empty.firstResponse.onTimeRate,null);assert.equal(empty.firstResponse.medianAnsweredHours,null);assert.equal(empty.interpretation,'NO_MATURED_DATA');
});

test('reliability API is organization-owner scoped, aggregate only, and read does not change moderation or ranking',async()=>{
  const f=await faroFixture();try {
    const owner=await f.user('MetricOwner'),candidate=await f.user('MetricCandidate'),other=await f.user('MetricOther'),staff=await f.user('MetricStaff');
    const profiles=new ProfileService(f.app.db),offers=new OfferService(f.app.db),r=new RecruitmentService(f.app.db);
    const org=profiles.organization(owner.id,{name:'Firma metryk'}),foreign=profiles.organization(other.id,{name:'Inna firma'});
    f.app.db.db.prepare("UPDATE faro_organizations SET verification='VERIFIED' WHERE id=?").run(org.id);
    profiles.save(candidate.id,{firstName:'Anna',phone:'+48500100200',expectedVersion:0,availability:{kind:'IMMEDIATE'}});
    const offer=offers.create(owner.id,org.id,offerInput(owner.id));offers.lifecycle(owner.id,offer.id,{action:'REVIEW',expectedVersion:1});offers.lifecycle(owner.id,offer.id,{action:'PUBLISH',expectedVersion:2,confirmed:true});
    const interest=r.interest(candidate.id,offer.id,{offerVersion:1,projectionConfirmed:true,confirmationToken:profiles.previewConfirmation(candidate.id).confirmationToken,idempotencyKey:'metrics-interest'});
    f.app.db.db.prepare('UPDATE faro_interests SET created_at=?,response_due_at=? WHERE id=?').run('2026-09-02T00:00:00Z','2026-09-03T00:00:00Z',interest.id);
    const invite=profiles.invite(owner.id,org.id,{email:staff.email,role:'RECRUITER'});profiles.acceptInvite(staff.id,staff.email,invite.token);
    const url=(id:string)=>`/api/faro/organizations/${id}/reliability?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    await f.request(url(org.id),candidate.cookie,'GET',undefined,404);await f.request(url(org.id),other.cookie,'GET',undefined,404);
    await f.request(url(org.id),staff.cookie,'GET',undefined,404);
    const before=JSON.stringify(f.app.db.db.prepare('SELECT * FROM faro_offers WHERE id=?').get(offer.id));
    const result=await f.request<ReturnType<typeof reliabilitySnapshot>>(url(org.id),owner.cookie);
    assert.equal(result.sampleSize,1);assert.equal(result.firstResponse.denominator,1);assert.equal(result.firstResponse.unanswered,1);assert.equal(result.firstResponse.medianAnsweredHours,null);
    for(const secret of [candidate.id,interest.id,candidate.email,'48500100200','Anna'])assert.ok(!JSON.stringify(result).includes(secret));
    const unrelated=await f.request<ReturnType<typeof reliabilitySnapshot>>(url(foreign.id),other.cookie);assert.equal(unrelated.sampleSize,0);
    await f.request(`/api/faro/organizations/${org.id}/reliability?from=${to}&to=${from}`,owner.cookie,'GET',undefined,400);
    await f.request(`/api/faro/organizations/${org.id}/reliability?from=${from}&to=2099-01-01T00:00:00Z`,owner.cookie,'GET',undefined,400);
    assert.equal(JSON.stringify(f.app.db.db.prepare('SELECT * FROM faro_offers WHERE id=?').get(offer.id)),before);
    assert.equal(f.app.db.db.prepare('SELECT COUNT(*) n FROM faro_cases').get()!.n,0);
  }finally{await f.close();}
});
