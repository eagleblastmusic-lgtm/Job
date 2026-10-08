import test from 'node:test';
import assert from 'node:assert/strict';
import {faroFixture} from './faro-fixture.js';

test('learning removal is confirmed, candidate-scoped, stale-safe, atomic and idempotent',async()=>{
 const f=await faroFixture();
 try{
  const candidate=await f.user('LearningCandidate'),other=await f.user('LearningOther'),skillId='faro:legacy:4',practice={quantity:3,unit:'PROJECTS'};
  await f.request('/api/faro/profile',candidate.cookie,'PUT',{firstName:'Anna',expectedVersion:0,availability:{kind:'IMMEDIATE'}});
  const entry={skillId,mode:'SELF_DEVELOPING',practice},remove={skillId,mode:entry.mode,expectedPractice:practice,confirmed:true};
  await f.request('/api/faro/learning',candidate.cookie,'POST',entry,201);
  await f.request('/api/faro/learning',candidate.cookie,'POST',{...entry,mode:'WANTS_TO_LEARN'},201);
  await f.request('/api/faro/learning',other.cookie,'POST',{...entry,practice:{quantity:7,unit:'PROJECTS'}},201);
  await f.request('/api/faro/learning','','DELETE',remove,401);
  await f.request('/api/faro/learning',candidate.cookie,'DELETE',{...remove,confirmed:false},400);
  await f.request('/api/faro/learning',candidate.cookie,'DELETE',{...remove,skillId:'unknown'},400);
  await f.request('/api/faro/learning',other.cookie,'DELETE',{...remove,userId:candidate.id},409);
  await f.request('/api/faro/learning',candidate.cookie,'POST',{...entry,practice:{quantity:5,unit:'PROJECTS'}},201);
  await f.request('/api/faro/learning',candidate.cookie,'DELETE',remove,409);
  const current={...remove,expectedPractice:{quantity:5,unit:'PROJECTS'},userId:other.id};
  f.app.db.db.exec("CREATE TRIGGER learning_audit_guard BEFORE INSERT ON audit_logs WHEN NEW.action='LEARNING_REMOVED' BEGIN SELECT RAISE(ABORT,'synthetic audit refusal'); END");
  await f.request('/api/faro/learning',candidate.cookie,'DELETE',current,500);
  const before=await f.request<{learning:unknown[]}>('/api/faro/profile',candidate.cookie);assert.equal(before.learning.length,2);
  f.app.db.db.exec('DROP TRIGGER learning_audit_guard');
  const result=await f.request<{learning:Array<{mode:string}>}>('/api/faro/learning',candidate.cookie,'DELETE',current);assert.deepEqual(result.learning.map(row=>row.mode),['WANTS_TO_LEARN']);
  assert.deepEqual(await f.request('/api/faro/learning',candidate.cookie,'DELETE',current),result);
  assert.equal(f.app.db.db.prepare("SELECT COUNT(*) n FROM audit_logs WHERE action='LEARNING_REMOVED'").get()!.n,1);
  assert.equal((await f.request<{learning:unknown[]}>('/api/faro/profile',other.cookie)).learning.length,1);
  const preview=await f.request<{learningIntents:Array<{mode:string}>}>('/api/faro/profile/preview',candidate.cookie);assert.deepEqual(preview.learningIntents.map(row=>row.mode),['WANTS_TO_LEARN']);
  const exported=await f.request<{faro:{faro_learning:Array<{mode:string}>}}>('/api/export',candidate.cookie);assert.deepEqual(exported.faro.faro_learning.map(row=>row.mode),['WANTS_TO_LEARN']);
 }finally{await f.close();}
});
