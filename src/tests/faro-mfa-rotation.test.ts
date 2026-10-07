import test from 'node:test';
import assert from 'node:assert/strict';
import { faroFixture } from './faro-fixture.js';
import { mfaRotationPlan,mfaRotationReadQuery } from '../server/faro/mfaRotationModel.js';
import { MfaCodec } from '../server/faro/mfaCrypto.js';
import { MfaService,totp } from '../server/faro/mfaService.js';
import { hashSessionToken } from '../server/auth.js';
import { FaroStore } from '../server/faro/base.js';

test('offline MFA rewrap preserves active/pending secrets and counters, invalidates step-up and rolls back audit failure',async()=>{
 const oldKey='66'.repeat(32),nextKey='77'.repeat(32),f=await faroFixture({faroMfaEncryptionKey:oldKey});try{
  const user=await f.user('RotationUser'),actor=f.app.store.getUserById(user.id)!,token=hashSessionToken(user.cookie.split('=')[1]!),mfa=new MfaService(f.app.db,f.app.config),old=new MfaCodec({faroMfaEncryptionKey:oldKey}),next=new MfaCodec({faroMfaEncryptionKey:nextKey}),setup=mfa.setup(actor,token,{password:'Bezpieczne123'});
  const pending=mfa.row(user.id)!.pending_cipher!,secret=old.decrypt(user.id,pending);mfa.confirm(actor,token,{code:totp(secret,Math.floor(Date.now()/30000))});
  const before=mfa.row(user.id)!,read=()=>f.app.db.db.prepare(mfaRotationReadQuery.text).all(),plan=mfaRotationPlan(read(),oldKey,nextKey,new Date().toISOString()),write=()=>new FaroStore(f.app.db).transaction(()=>{for(const query of plan.queries)f.app.db.db.prepare(query.text).run(Object.fromEntries(query.values.map((value,index)=>[`$${index+1}`,value])));});
  assert.throws(()=>mfaRotationPlan(read(),nextKey,oldKey,new Date().toISOString()),/chronionego/);assert.throws(()=>mfaRotationPlan(read(),oldKey,oldKey,new Date().toISOString()),/różne/);
  f.app.db.db.exec("CREATE TRIGGER rotation_guard BEFORE INSERT ON audit_logs WHEN NEW.action='MFA_KEY_ROTATED' BEGIN SELECT RAISE(ABORT,'rotation audit failed'); END;");assert.throws(write,/rotation audit/);assert.deepEqual(mfa.row(user.id),before);assert.equal(mfa.verified(token),true);f.app.db.db.exec('DROP TRIGGER rotation_guard');
  write();const after=mfa.row(user.id)!;assert.deepEqual(next.decrypt(user.id,after.active_cipher!),secret);assert.throws(()=>old.decrypt(user.id,after.active_cipher!),/chronionego/);assert.equal(after.last_counter,before.last_counter);assert.equal(after.activated_at,before.activated_at);assert.equal(mfa.verified(token),false);assert.equal(mfa.status(actor,token).recoveryRemaining,8);
  const pendingRow={user_id:'pending-user',active_cipher:null,pending_cipher:old.encrypt('pending-user',Buffer.from('synthetic-pending-secret'))},pendingPlan=mfaRotationPlan([pendingRow],oldKey,nextKey,new Date().toISOString());assert.deepEqual(next.decrypt('pending-user',pendingPlan.queries[0]!.values[1] as string),Buffer.from('synthetic-pending-secret'));
  assert.equal(setup.digits,6);secret.fill(0);
 }finally{await f.close();}
});
