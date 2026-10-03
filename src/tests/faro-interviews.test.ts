import test from 'node:test';
import assert from 'node:assert/strict';
import { faroFixture,offerInput } from './faro-fixture.js';
import { ProfileService } from '../server/faro/profileService.js';
import { OfferService } from '../server/faro/offerService.js';
import { RecruitmentService } from '../server/faro/recruitmentService.js';
import { InterviewService } from '../server/faro/interviewService.js';
import { HttpError } from '../server/http.js';

async function setup() {
  const f=await faroFixture(),employer=await f.user('MeetingEmployer'),candidate=await f.user('MeetingCandidate'),other=await f.user('MeetingOther');
  let now=new Date('2026-10-24T08:00:00Z');const clock=()=>now;
  const profiles=new ProfileService(f.app.db,clock),offers=new OfferService(f.app.db,clock),recruitment=new RecruitmentService(f.app.db,clock),interviews=new InterviewService(f.app.db,clock);
  profiles.save(candidate.id,{firstName:'Anna',expectedVersion:0,availability:{kind:'IMMEDIATE'}});
  profiles.save(other.id,{firstName:'Jan',expectedVersion:0,availability:{kind:'IMMEDIATE'}});
  const org=profiles.organization(employer.id,{name:'Rozmowy'});f.app.db.db.prepare("UPDATE faro_organizations SET verification='VERIFIED' WHERE id=?").run(org.id);
  const offer=offers.create(employer.id,org.id,{...offerInput(employer.id),closesAt:'2030-01-01T00:00:00Z'});
  offers.lifecycle(employer.id,offer.id,{action:'REVIEW',expectedVersion:1});offers.lifecycle(employer.id,offer.id,{action:'PUBLISH',expectedVersion:2,confirmed:true});
  const process=(userId:string,key:string)=>{
    const p=recruitment.interest(userId,offer.id,{offerVersion:1,projectionConfirmed:true,confirmationToken:profiles.previewConfirmation(userId).confirmationToken,idempotencyKey:key});
    recruitment.change(employer.id,p.id,{command:'ADVANCE',nextAction:'Uzgodnijmy rozmowę',dueAt:'2026-10-28T10:00:00Z',expectedVersion:1,idempotencyKey:`${key}-advance`});return p.id;
  };
  const first=process(candidate.id,'first'),second=process(other.id,'second');
  const proposal={startsAt:'2026-10-25T02:30:00+02:00',endsAt:'2026-10-25T02:30:00+01:00',confirmBy:'2026-10-24T21:00:00+02:00',timezone:'Europe/Warsaw',location:'Spotkanie online',meetingUrl:'https://example.pl/meeting',expectedVersion:2,confirmed:true,idempotencyKey:'proposal'};
  return {...f,employer,candidate,other,profiles,recruitment,interviews,org,first,second,proposal,setNow:(value:string)=>{now=new Date(value);}};
}
const code=(expected:string)=>(error:unknown)=>error instanceof HttpError&&error.code===expected;

test('interview confirmation reserves participants atomically, scopes API, freezes UTC across autumn DST, exports private ICS and requires both completion reports',async()=>{
  const f=await setup();try {
    const first=f.interviews.propose(f.employer.id,f.first,f.proposal);
    assert.equal(first.startsAt,'2026-10-25T00:30:00.000Z');assert.equal(first.endsAt,'2026-10-25T01:30:00.000Z');
    assert.equal(Date.parse(first.endsAt)-Date.parse(first.startsAt),3600000);
    assert.deepEqual(f.interviews.propose(f.employer.id,f.first,f.proposal),first);
    const second=f.interviews.propose(f.employer.id,f.second,{...f.proposal,idempotencyKey:'proposal-second'});
    const confirm={command:'CONFIRM',confirmed:true,expectedVersion:1,processVersion:3,idempotencyKey:'confirm'};
    await f.request(`/api/faro/processes/${f.first}/interviews`,f.other.cookie,'GET',undefined,404);
    assert.throws(()=>f.interviews.change(f.employer.id,first.id,confirm));
    const confirmed=f.interviews.change(f.candidate.id,first.id,confirm);assert.equal(confirmed.state,'CONFIRMED');
    assert.throws(()=>f.interviews.change(f.other.id,second.id,{...confirm,idempotencyKey:'second-confirm'}),code('SLOT_CONFLICT'));
    assert.equal(f.interviews.row(second.id).revision,1);assert.equal(f.recruitment.row(f.second).revision,3);
    const calendar=f.interviews.calendar(f.candidate.id,first.id).content;
    assert.match(calendar,/DTSTART:20261025T003000Z/);assert.match(calendar,/DTEND:20261025T013000Z/);
    assert.doesNotMatch(calendar,/Anna|Jan|MeetingCandidate|ATTENDEE|PHONE|recruiter_id/);
    assert.ok(calendar.split('\r\n').every(line=>Buffer.byteLength(line)<=75));
    assert.deepEqual(Object.keys(confirmed).sort(),['id','processId','state','revision','startsAt','endsAt','confirmBy','timezone','location','meetingUrl','candidateCompleted','employerCompleted'].sort());
    assert.throws(()=>f.interviews.change(f.candidate.id,first.id,{command:'COMPLETE',confirmed:true,expectedVersion:2,processVersion:4,idempotencyKey:'early'}));
    f.setNow('2026-10-25T02:00:00Z');
    const own=f.interviews.change(f.candidate.id,first.id,{command:'COMPLETE',confirmed:true,expectedVersion:2,processVersion:4,idempotencyKey:'candidate-complete'});
    assert.equal(own.state,'CONFIRMED');assert.equal(own.candidateCompleted,true);assert.equal(f.recruitment.row(f.first).stage,'INTERVIEW_CONFIRMED');
    const done=f.interviews.change(f.employer.id,first.id,{command:'COMPLETE',confirmed:true,expectedVersion:3,processVersion:5,idempotencyKey:'employer-complete'});
    assert.equal(done.state,'COMPLETED');assert.equal(f.recruitment.row(f.first).stage,'INTERVIEW_COMPLETED');
    assert.equal(f.recruitment.row(f.first).stage_due_at,'2026-10-28T02:00:00.000Z');
    assert.throws(()=>f.interviews.propose(f.employer.id,f.first,{...f.proposal,expectedVersion:6,idempotencyKey:'extra-interview'}),code('INTERVIEW_LIMIT'));
  }finally{await f.close();}
});

test('unconfirmed expiry is neutral; confirmed no-show opens review; withdrawal cancels obligations; spring DST rejects nonexistent local times',async()=>{
  const f=await setup();try {
    const expired=f.interviews.propose(f.employer.id,f.first,f.proposal);
    f.interviews.tick();f.interviews.tick();
    assert.equal((f.app.db.db.prepare("SELECT COUNT(*) n FROM faro_outbox WHERE dedupe_key LIKE 'interview:%'").get() as {n:number}).n,1);
    f.setNow('2026-10-24T20:00:00Z');f.interviews.tick();
    assert.equal(f.interviews.row(expired.id).state,'CANCELLED');assert.equal((f.app.db.db.prepare('SELECT COUNT(*) n FROM faro_cases').get() as {n:number}).n,0);
    const meeting=f.interviews.propose(f.employer.id,f.first,{...f.proposal,confirmBy:'2026-10-24T22:30:00Z',expectedVersion:4,idempotencyKey:'replacement'});
    f.interviews.change(f.candidate.id,meeting.id,{command:'CONFIRM',confirmed:true,expectedVersion:1,processVersion:5,idempotencyKey:'confirm-replacement'});
    f.setNow('2026-10-25T03:00:00Z');
    f.interviews.change(f.employer.id,meeting.id,{command:'DISPUTE',reason:'NO_SHOW',confirmed:true,expectedVersion:2,processVersion:6,idempotencyKey:'no-show'});
    const review=f.app.db.db.prepare('SELECT kind,state FROM faro_cases').get() as {kind:string;state:string};assert.deepEqual({...review},{kind:'NO_SHOW_CASE',state:'OPEN'});
    assert.equal((f.app.db.db.prepare('SELECT verification FROM faro_organizations WHERE id=?').get(f.org.id) as {verification:string}).verification,'VERIFIED');
    f.setNow('2027-03-27T08:00:00Z');
    const spring={...f.proposal,startsAt:'2027-03-28T01:30:00+01:00',endsAt:'2027-03-28T03:30:00+02:00',confirmBy:'2027-03-27T20:00:00+01:00',expectedVersion:7,idempotencyKey:'spring'};
    assert.throws(()=>f.interviews.propose(f.employer.id,f.first,{...spring,startsAt:'2027-03-28T02:30:00+01:00'}),code('TIMEZONE_MISMATCH'));
    const valid=f.interviews.propose(f.employer.id,f.first,spring);assert.equal(Date.parse(valid.endsAt)-Date.parse(valid.startsAt),3600000);
    f.recruitment.change(f.candidate.id,f.first,{command:'WITHDRAW',expectedVersion:8,idempotencyKey:'withdraw-meeting'});
    assert.equal(f.interviews.row(valid.id).state,'CANCELLED');
    assert.throws(()=>f.interviews.change(f.candidate.id,valid.id,{command:'CONFIRM',confirmed:true,expectedVersion:2,processVersion:9,idempotencyKey:'resurrect'}),code('INVALID_TRANSITION'));
  }finally{await f.close();}
});
