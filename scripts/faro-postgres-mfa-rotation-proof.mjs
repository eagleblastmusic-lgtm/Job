import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { importSnapshot,identifier,clientFromEnvironment } from './faro-postgres-rehearsal.mjs';
import { rotateMfaKey } from '../dist/server/faro/mfaRotationModel.js';
import { MfaCodec } from '../dist/server/faro/mfaCrypto.js';
export async function proveNativeMfaRotation(snapshot,candidate){
 const schema=`faro_rehearsal_${randomBytes(8).toString('hex')}`,db=clientFromEnvironment();let created=false;
 try{
  await db.connect();await importSnapshot(db,snapshot,schema);created=true;await db.query(`SET search_path TO ${identifier(schema)}`);
  const read=async()=>(await db.readBatch([{text:'SELECT active_cipher,last_counter,activated_at FROM faro_mfa WHERE user_id=$1',values:[candidate.id]}]))[0][0],before=await read(),oldKey='44'.repeat(32),nextKey='88'.repeat(32),old=new MfaCodec({faroMfaEncryptionKey:oldKey}),next=new MfaCodec({faroMfaEncryptionKey:nextKey}),secret=old.decrypt(candidate.id,before.active_cipher),asOf=new Date().toISOString();
  await assert.rejects(()=>rotateMfaKey(db,oldKey,nextKey,asOf,()=>{throw new Error('OPERATOR_REFUSED');}),/OPERATOR_REFUSED/);
  await db.query("ALTER TABLE audit_logs ADD CONSTRAINT rotation_audit_guard CHECK(action<>'MFA_KEY_ROTATED') NOT VALID");await assert.rejects(()=>rotateMfaKey(db,oldKey,nextKey,asOf,()=>{}),error=>error.code==='23514');assert.deepEqual(await read(),before);await db.query('ALTER TABLE audit_logs DROP CONSTRAINT rotation_audit_guard');
  const result=await rotateMfaKey(db,oldKey,nextKey,asOf,()=>{});assert.equal(result.rotatedAccounts,1);assert.equal(result.sessionStepUpInvalidated,true);const after=await read();assert.deepEqual(next.decrypt(candidate.id,after.active_cipher),secret);assert.equal(after.last_counter,before.last_counter);assert.equal(after.activated_at,before.activated_at);assert.throws(()=>old.decrypt(candidate.id,after.active_cipher),/chronionego/);
  assert.equal((await db.readBatch([{text:'SELECT COUNT(*) n FROM faro_mfa_sessions',values:[]}]))[0][0].n,0);assert.equal((await db.readBatch([{text:'SELECT COUNT(*) n FROM faro_mfa_recovery WHERE user_id=$1',values:[candidate.id]}]))[0][0].n,8);secret.fill(0);
 }finally{if(created)await db.query(`DROP SCHEMA ${identifier(schema)} CASCADE`);await db.end();}
}
