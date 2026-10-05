import test from 'node:test';
import assert from 'node:assert/strict';
import { faroFixture,offerInput } from './faro-fixture.js';
import { ProfileService } from '../server/faro/profileService.js';
import { OfferService } from '../server/faro/offerService.js';
import { RecruitmentService } from '../server/faro/recruitmentService.js';
import { InterviewService } from '../server/faro/interviewService.js';
import { HttpError } from '../server/http.js';
import { TrustService } from '../server/faro/trustService.js';
import { PrivacyService } from '../server/faro/privacyService.js';

async function setup(interviewCount=1) {
  const f=await faroFixture(),employer=await f.user('MeetingEmployer'),candidate=await f.user('MeetingCandidate'),other=await f.user('MeetingOther');
  let now=new Date('2026-10-24T08:00:00Z');const clock=()=>now;
  const profiles=new ProfileService(f.app.db,clock),offers=new OfferService(f.app.db,clock),recruitment=new RecruitmentService(f.app.db,clock),interviews=new InterviewService(f.app.db,clock);
  profiles.save(candidate.id,{firstName:'Anna',expectedVersion:0,availability:{kind:'IMMEDIATE'}});
  profiles.save(other.id,{firstName:'Jan',expectedVersion:0,availability:{kind:'IMMEDIATE'}});
  const org=profiles.organization(employer.id,{name:'Rozmowy'});f.app.db.db.prepare("UPDATE faro_organizations SET verification='VERIFIED' WHERE id=?").run(org.id);
  const offer=offers.create(employer.id,org.id,{...offerInput(employer.id),interviewCount,closesAt:'2030-01-01T00:00:00Z'});
  offers.lifecycle(employer.id,offer.id,{action:'REVIEW',expectedVersion:1});offers.lifecycle(employer.id,offer.id,{action:'PUBLISH',expectedVersion:2,confirmed:true});
  const process=(userId:string,key:string)=>{
    const p=recruitment.interest(userId,offer.id,{offerVersion:1,projectionConfirmed:true,confirmationToken:profiles.previewConfirmation(userId).confirmationToken,idempotencyKey:key});
    recruitment.change(employer.id,p.id,{command:'ADVANCE',nextAction:'Uzgodnijmy rozmowę',dueAt:'2026-10-28T10:00:00Z',expectedVersion:1,idempotencyKey:`${key}-advance`});return p.id;
  };
  const first=process(candidate.id,'first'),second=process(other.id,'second');
  const proposal={startsAt:'2026-10-25T02:30:00+02:00',endsAt:'2026-10-25T02:30:00+01:00',confirmBy:'2026-10-24T21:00:00+02:00',timezone:'Europe/Warsaw',location:'Spotkanie online',meetingUrl:'https://example.pl/meeting',expectedVersion:2,confirmed:true,idempotencyKey:'proposal'};
  return {...f,employer,candidate,other,profiles,recruitment,interviews,org,first,second,proposal,clock,setNow:(value:string)=>{now=new Date(value);}};
}
const code=(expected:string)=>(error:unknown)=>error instanceof HttpError&&error.code===expected;

test('Canonical optional progression derives mutual completion, dedupes pair/week, excludes invitations and revocation backfill, and erases telemetry',async()=>{
  const f=await setup(5);try {
    const events=()=>f.app.db.db.prepare("SELECT * FROM analytics_events WHERE event_name='FARO_MUTUAL_STAGE_COMPLETED'").all();
    const consent=(granted:boolean)=>{f.app.store.recordConsent(f.candidate.id,'ANALYTICS',granted,'synthetic-product-test');f.app.db.db.prepare("UPDATE consents SET created_at=? WHERE id=(SELECT id FROM consents WHERE user_id=? AND consent_type='ANALYTICS' ORDER BY rowid DESC LIMIT 1)").run(f.clock().toISOString(),f.candidate.id);};
    const complete=(key:string,startsAt:string,endsAt:string,confirmBy:string,completedAt:string)=>{
      const p=f.recruitment.row(f.first),meeting=f.interviews.propose(f.employer.id,f.first,{...f.proposal,startsAt,endsAt,confirmBy,expectedVersion:p.revision,idempotencyKey:`${key}-propose`});
      assert.equal(events().length,key==='fourth'?1:key==='third'?1:0);
      f.interviews.change(f.candidate.id,meeting.id,{command:'CONFIRM',confirmed:true,expectedVersion:1,processVersion:f.recruitment.row(f.first).revision,idempotencyKey:`${key}-confirm`});
      f.setNow(completedAt);f.interviews.change(f.candidate.id,meeting.id,{command:'COMPLETE',confirmed:true,expectedVersion:2,processVersion:f.recruitment.row(f.first).revision,idempotencyKey:`${key}-candidate`});
      assert.equal(f.app.store.faroMutualStageCompleted(meeting.id),false);
      const body={command:'COMPLETE',confirmed:true,expectedVersion:3,processVersion:f.recruitment.row(f.first).revision,idempotencyKey:`${key}-employer`};
      f.interviews.change(f.employer.id,meeting.id,body);f.interviews.change(f.employer.id,meeting.id,body);
      return meeting;
    };
    assert.equal(f.app.store.faroMutualStageCompleted('not-an-interview'),false);
    assert.throws(()=>f.app.store.analytics(f.candidate.id,'FARO_MUTUAL_STAGE_COMPLETED',{phone:'private',answers:'private'}),/verified event producer/);
    const first=complete('first','2026-10-25T00:30:00Z','2026-10-25T01:30:00Z','2026-10-24T19:00:00Z','2026-10-25T02:00:00Z');assert.equal(events().length,0);
    f.setNow('2026-10-25T03:00:00Z');consent(true);assert.equal(f.app.store.faroMutualStageCompleted(first.id),false);
    const second=complete('second','2026-10-25T04:00:00Z','2026-10-25T05:00:00Z','2026-10-25T03:30:00Z','2026-10-25T06:00:00Z');assert.equal(events().length,1);assert.equal(f.app.store.faroMutualStageCompleted(second.id),false);
    complete('third','2026-10-25T07:00:00Z','2026-10-25T08:00:00Z','2026-10-25T06:30:00Z','2026-10-25T09:00:00Z');assert.equal(events().length,1);
    complete('fourth','2026-10-26T10:00:00Z','2026-10-26T11:00:00Z','2026-10-26T09:00:00Z','2026-10-26T12:00:00Z');assert.equal(events().length,2);
    const properties=events().map(e=>JSON.parse(String(e.properties)) as Record<string,string>);assert.deepEqual(properties.map(p=>p.weekStart).sort(),['2026-10-19T00:00:00.000Z','2026-10-26T00:00:00.000Z']);
    properties.forEach(p=>assert.deepEqual(Object.keys(p).sort(),['definitionVersion','stage','weekStart']));assert.doesNotMatch(JSON.stringify(properties),new RegExp(`${f.candidate.id}|${f.employer.id}|${f.first}|MeetingCandidate|phone|answers|salary|watch`));
    const own=await f.request<{analytics_events:unknown[]}>('/api/export',f.candidate.cookie);assert.equal(own.analytics_events.length,2);
    const other=await f.request<{analytics_events:unknown[]}>('/api/export',f.other.cookie);assert.equal(other.analytics_events.length,0);
    f.setNow('2026-10-26T13:00:00Z');consent(false);assert.equal(events().length,0);assert.equal(f.app.store.faroMutualStageCompleted(second.id),false);
    f.setNow('2026-10-26T14:00:00Z');consent(true);assert.equal(f.app.store.faroMutualStageCompleted(second.id),false);
    complete('fifth','2026-10-27T10:00:00Z','2026-10-27T11:00:00Z','2026-10-27T09:00:00Z','2026-10-27T12:00:00Z');assert.equal(events().length,1);
    assert.equal(f.app.db.db.prepare("SELECT COUNT(*) n FROM faro_events WHERE kind='INTERVIEW_COMPLETE'").get()!.n,10); // Operational facts are separate and not lost without product consent.
    await f.request('/api/account',f.candidate.cookie,'DELETE',{confirmation:'USUŃ KONTO',password:'Bezpieczne123'});assert.equal(events().length,0);assert.equal(f.app.db.db.prepare('PRAGMA foreign_key_check').all().length,0);
  }finally{await f.close();}
});

test('appointment case gives both parties private explanations, guards grace and stale revisions, supports candidate appeal and cannot punish wrong subject',async()=>{
  const f=await setup();try {
    const admin=await f.user('CaseModerator');f.app.db.db.prepare("UPDATE users SET role='ADMIN' WHERE id=?").run(admin.id);
    const meeting=f.interviews.propose(f.employer.id,f.first,f.proposal);
    f.interviews.change(f.candidate.id,meeting.id,{command:'CONFIRM',confirmed:true,expectedVersion:1,processVersion:3,idempotencyKey:'case-confirm'});
    f.setNow('2026-10-25T03:00:00Z');
    f.interviews.change(f.employer.id,meeting.id,{command:'DISPUTE',reason:'NO_SHOW',confirmed:true,expectedVersion:2,processVersion:4,idempotencyKey:'case-report'});
    const row=f.app.db.db.prepare('SELECT id FROM faro_cases').get() as {id:string},trust=new TrustService(f.app.db,f.clock);
    assert.equal(trust.list(f.candidate.id).length,1);assert.equal(trust.list(f.employer.id).length,1);assert.equal(trust.list(f.other.id).length,0);
    const reply={statement:'Prywatne wyjaśnienie: choroba i dane medyczne kandydata.',expectedVersion:1,idempotencyKey:'candidate-explanation'};
    const result=trust.explain(f.candidate.id,row.id,reply);assert.deepEqual(trust.explain(f.candidate.id,row.id,reply),result);
    assert.throws(()=>trust.explain(f.other.id,row.id,{...reply,idempotencyKey:'outsider'}));
    assert.throws(()=>trust.explain(f.employer.id,row.id,{statement:'Wyjaśnienie pracodawcy.',expectedVersion:1,idempotencyKey:'stale'}),code('VERSION_CONFLICT'));
    const decision={decision:'Prywatna notatka moderatora: dane medyczne kandydata.',reviewAt:'2026-10-28T00:00:00Z',decisionCode:'INSUFFICIENT_EVIDENCE'};
    f.app.db.db.prepare("UPDATE users SET role='ADMIN' WHERE id=?").run(f.employer.id);
    assert.doesNotMatch(JSON.stringify(trust.list(f.employer.id)),/dane medyczne/);
    assert.throws(()=>trust.review(f.employer.id,row.id,{...decision,state:'EVIDENCE_REVIEW',explanationDueAt:'2026-10-26T03:00:00Z',expectedVersion:2,idempotencyKey:'own-case'}),code('MODERATION_CONFLICT'));
    f.app.db.db.prepare("UPDATE users SET role='USER' WHERE id=?").run(f.employer.id);
    trust.review(admin.id,row.id,{...decision,state:'EVIDENCE_REVIEW',explanationDueAt:'2026-10-26T03:00:00Z',expectedVersion:2,idempotencyKey:'open-window'});
    assert.throws(()=>trust.review(admin.id,row.id,{...decision,state:'NO_ACTION',expectedVersion:3,idempotencyKey:'too-soon'}),code('EXPLANATION_WINDOW_OPEN'));
    trust.explain(f.employer.id,row.id,{statement:'Prywatne wyjaśnienie pracodawcy o połączeniu.',expectedVersion:3,idempotencyKey:'employer-explanation'});
    assert.throws(()=>trust.review(admin.id,row.id,{...decision,state:'ACTION',restrict:true,expectedVersion:4,idempotencyKey:'wrong-subject'}),code('RESTRICTION_SCOPE'));
    trust.review(admin.id,row.id,{...decision,state:'NO_ACTION',expectedVersion:4,idempotencyKey:'review-no-action'});
    trust.appeal(f.candidate.id,row.id,{statement:'Prywatne odwołanie: dane medyczne kandydata.',expectedVersion:5,idempotencyKey:'candidate-appeal'});
    assert.doesNotMatch(JSON.stringify(trust.list(f.employer.id)),/choroba|dane medyczne|Prywatne odwołanie/);
    assert.match(JSON.stringify(trust.list(admin.id)),/dane medyczne/);
    assert.doesNotMatch(JSON.stringify(new PrivacyService(f.app.db).exportOwn(f.employer.id)),/dane medyczne/);
    const resolve={...decision,state:'RESOLVED',decisionCode:'CASE_RESOLVED',expectedVersion:6,idempotencyKey:'resolve-appeal'};
    const resolved=trust.review(admin.id,row.id,resolve);assert.equal(resolved.state,'RESOLVED');assert.deepEqual(trust.review(admin.id,row.id,resolve),resolved);
    assert.equal((f.app.db.db.prepare('SELECT verification FROM faro_organizations WHERE id=?').get(f.org.id) as {verification:string}).verification,'VERIFIED');
    assert.ok(f.app.db.db.prepare("SELECT id FROM audit_logs WHERE user_id=? AND action='MODERATION_CASES_READ'").get(admin.id));
  }finally{await f.close();}
});

test('moderator can close appointment evidence review after the explicit explanation deadline without an automatic sanction',async()=>{
  const f=await setup();try {
    const admin=await f.user('GraceModerator');f.app.db.db.prepare("UPDATE users SET role='ADMIN' WHERE id=?").run(admin.id);
    const meeting=f.interviews.propose(f.employer.id,f.first,f.proposal);
    f.interviews.change(f.candidate.id,meeting.id,{command:'CONFIRM',confirmed:true,expectedVersion:1,processVersion:3,idempotencyKey:'grace-confirm'});
    f.setNow('2026-10-25T03:00:00Z');f.interviews.change(f.candidate.id,meeting.id,{command:'DISPUTE',reason:'TECHNICAL_ISSUE',confirmed:true,expectedVersion:2,processVersion:4,idempotencyKey:'grace-report'});
    const row=f.app.db.db.prepare('SELECT id FROM faro_cases').get() as {id:string},trust=new TrustService(f.app.db,f.clock);
    trust.review(admin.id,row.id,{state:'EVIDENCE_REVIEW',decision:'Sprawdzamy problem połączenia.',reviewAt:'2026-10-28T03:00:00Z',explanationDueAt:'2026-10-26T03:00:00Z',expectedVersion:1,idempotencyKey:'grace-open'});
    f.setNow('2026-10-26T03:00:00Z');f.interviews.tick();assert.equal(trust.caseRow(row.id).state,'EVIDENCE_REVIEW');
    trust.review(admin.id,row.id,{state:'NO_ACTION',decision:'Problem techniczny, bez naruszenia.',decisionCode:'TECHNICAL_ISSUE',reviewAt:'2026-10-28T03:00:00Z',expectedVersion:2,idempotencyKey:'grace-close'});
    assert.equal(trust.caseRow(row.id).state,'NO_ACTION');
  }finally{await f.close();}
});

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
