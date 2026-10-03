import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { faroFixture, offerInput } from './faro-fixture.js';
import { ProfileService } from '../server/faro/profileService.js';
import { OfferService } from '../server/faro/offerService.js';
import { RecruitmentService } from '../server/faro/recruitmentService.js';
import { AssessmentService } from '../server/faro/assessmentService.js';

async function setup() {
  const f=await faroFixture(), employer=await f.user('DataEmployer'),candidate=await f.user('DataCandidate'),other=await f.user('DataOther');
  const profiles=new ProfileService(f.app.db), offers=new OfferService(f.app.db), recruitment=new RecruitmentService(f.app.db);
  profiles.save(candidate.id,{firstName:'Anna',phone:'+48500200300',availability:{kind:'IMMEDIATE'},expectedVersion:0});
  profiles.activity(candidate.id,{description:'Prywatna czynność kandydata',source:'HOBBY'});
  profiles.activity(other.id,{description:'Cudza prywatna czynność',source:'WORK'});
  const org=profiles.organization(employer.id,{name:'Firma danych'});
  f.app.db.db.prepare("UPDATE faro_organizations SET verification='VERIFIED' WHERE id=?").run(org.id);
  const offer=offers.create(employer.id,org.id,offerInput(employer.id));
  offers.lifecycle(employer.id,offer.id,{action:'REVIEW',expectedVersion:1});
  offers.lifecycle(employer.id,offer.id,{action:'PUBLISH',expectedVersion:2,confirmed:true});
  recruitment.watch(candidate.id,offer.id,true);
  const process=recruitment.interest(candidate.id,offer.id,{offerVersion:1,projectionConfirmed:true,confirmationToken:profiles.previewConfirmation(candidate.id).confirmationToken,idempotencyKey:'privacy-interest'});
  recruitment.change(employer.id,process.id,{command:'ADVANCE',nextAction:'Sprawdź zadanie praktyczne',dueAt:new Date(Date.now()+86400000).toISOString(),expectedVersion:1,idempotencyKey:'privacy-advance'});
  recruitment.grant(candidate.id,process.id,true);
  const assessments=new AssessmentService(f.app.db);
  const definition=assessments.create(employer.id,offer.id,{title:'Prywatna próba',timeLimitMinutes:5,expectedMinutes:3,rubricVersion:'r1',tasks:[{prompt:'Pytanie',options:['A','B'],answer:1,points:2}]});
  assessments.approve(employer.id,definition.id,{version:1,action:'REVIEW'});
  assessments.approve(employer.id,definition.id,{version:1,action:'APPROVE',confirmed:true});
  const attempt=assessments.assign(employer.id,process.id,{assessmentId:definition.id,version:1,deadline:new Date(Date.now()+86400000).toISOString()});
  return {...f,employer,candidate,other,org,offer,process,attempt,profiles,recruitment};
}
test('data export contains own canonical records without other profiles or assessment answer keys; erasure removes derivatives',async()=>{
  const f=await setup();
  try {
    const exported=await f.request<{faro:Record<string,unknown[]>}>('/api/export',f.candidate.cookie);
    assert.equal(exported.faro.faro_interests!.length,1); assert.equal(exported.faro.faro_attempts!.length,1);
    assert.equal(exported.faro.faro_contact_grants!.length,1); assert.equal(exported.faro.faro_watches!.length,1);
    const serialized=JSON.stringify(exported);
    assert.ok(serialized.includes('Prywatna czynność kandydata'));
    assert.ok(!serialized.includes('Cudza prywatna czynność')); assert.ok(!serialized.includes('password_hash'));
    assert.ok(!serialized.includes('"answer":1')); assert.ok(!serialized.includes('"tasks"'));
    const employerExport=await f.request<{faro:{faro_interests:unknown[];faro_attempts:unknown[]}}>('/api/export',f.employer.cookie);
    assert.equal(employerExport.faro.faro_interests.length,0); assert.equal(employerExport.faro.faro_attempts.length,0);
    f.recruitment.deliverOutbox();
    await f.request('/api/account',f.candidate.cookie,'DELETE',{confirmation:'USUŃ KONTO',password:'Bezpieczne123'});
    for(const table of ['faro_interests','faro_attempts','faro_contact_grants','faro_watches','faro_profiles']) {
      const row=f.app.db.db.prepare(`SELECT COUNT(*) n FROM ${table}`).get() as {n:number}; assert.equal(row.n,0,table);
    }
    assert.equal(f.app.db.db.prepare('SELECT user_id FROM faro_commands WHERE user_id=?').get(f.candidate.id),undefined);
    assert.ok(f.app.db.db.prepare('SELECT user_id FROM faro_commands WHERE user_id=?').get(f.employer.id));
    assert.equal(f.app.db.db.prepare('SELECT id FROM faro_outbox WHERE entity_id=?').get(f.process.id),undefined);
    assert.equal(f.app.db.db.prepare('SELECT id FROM notifications WHERE entity_id=?').get(f.process.id),undefined);
    const hash=createHash('sha256').update(f.candidate.id).digest('hex');
    assert.ok(f.app.db.db.prepare('SELECT subject_hash FROM faro_erasure_log WHERE subject_hash=?').get(hash));
    assert.equal(f.profiles.profile(f.other.id).activities.length,1);
    assert.equal(f.app.db.db.prepare('PRAGMA foreign_key_check').all().length,0);
    await f.request('/api/me',f.candidate.cookie,'GET',undefined,401);
  }finally{await f.close();}
});
test('solo owner deletion closes intake and cancels existing process without removing candidate data',async()=>{
  const f=await setup();
  try{
    await f.request('/api/account',f.employer.cookie,'DELETE',{confirmation:'USUŃ KONTO',password:'Bezpieczne123'});
    assert.equal(new OfferService(f.app.db).get(f.offer.id).status,'CLOSED');
    const process=f.recruitment.view(f.candidate.id,f.process.id);
    assert.equal(process.status,'CANCELLED'); assert.equal(process.stageDueAt,null);
    assert.ok(process.contactGrant);
    assert.equal(new AssessmentService(f.app.db).row(f.attempt.id).state,'WITHDRAWN');
    assert.equal(f.profiles.profile(f.candidate.id).firstName,'Anna');
    assert.equal(f.app.db.db.prepare('PRAGMA foreign_key_check').all().length,0);
  }finally{await f.close();}
});
test('shared organization ownership is transferred with reauthentication before account erasure',async()=>{
  const f=await setup();
  try{
    const invitation=f.profiles.invite(f.employer.id,f.org.id,{email:f.other.email,role:'RECRUITER'});
    f.profiles.acceptInvite(f.other.id,f.other.email,invitation.token);
    await f.request('/api/account',f.employer.cookie,'DELETE',{confirmation:'USUŃ KONTO',password:'Bezpieczne123'},409);
    await f.request(`/api/faro/organizations/${f.org.id}/owner`,f.other.cookie,'POST',{successorId:f.employer.id,password:'Bezpieczne123'},404);
    await f.request(`/api/faro/organizations/${f.org.id}/owner`,f.employer.cookie,'POST',{successorId:f.other.id,password:'BledneHaslo123'},401);
    await f.request(`/api/faro/organizations/${f.org.id}/owner`,f.employer.cookie,'POST',{successorId:f.other.id,password:'Bezpieczne123'});
    assert.equal(f.profiles.member(f.other.id,f.org.id).role,'OWNER');
    await f.request('/api/account',f.employer.cookie,'DELETE',{confirmation:'USUŃ KONTO',password:'Bezpieczne123'});
    assert.equal(f.recruitment.view(f.candidate.id,f.process.id).status,'ACTIVE');
    assert.equal(new OfferService(f.app.db).get(f.offer.id).status,'PAUSED');
    assert.equal(f.profiles.member(f.other.id,f.org.id).role,'OWNER');
  }finally{await f.close();}
});
