import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readProtectedBackup} from './faro-backup-envelope.mjs';
import { sealBackup,openBackup } from './faro-backup-envelope.mjs';
import { captureNativeSnapshot } from './faro-postgres-backup.mjs';
import assert from 'node:assert/strict';
import { randomBytes,createHash } from 'node:crypto';
import { importSnapshot,identifier,clientFromEnvironment } from './faro-postgres-rehearsal.mjs';
import { readRecoveryLedger } from '../dist/server/faro/recoveryReadModel.js';
import { reconcileRecovery } from '../dist/server/faro/recoveryWriteModel.js';
import { eraseAccount } from '../dist/server/faro/privacyErasureModel.js';
import { hashSessionToken,hashPassword } from '../dist/server/auth.js';

/** Two isolated real PostgreSQL schemas: stale backup vs actual latest authority. */
export async function proveNativeRecovery(snapshot,candidate,employer,org,offer){
 const schemas=[`faro_rehearsal_${randomBytes(8).toString('hex')}`,`faro_rehearsal_${randomBytes(8).toString('hex')}`],authority=clientFromEnvironment(),target=clientFromEnvironment(),asOf=new Date().toISOString();let created=0;
 try{
  await authority.connect();await target.connect();await importSnapshot(authority,snapshot,schemas[0]);created=1;const backup=await captureNativeSnapshot(authority,snapshot,schemas[0],()=>{});const key='99'.repeat(32),sealed=sealBackup(backup,key);assert.equal(sealed.includes(Buffer.from(candidate.id)),false);assert.throws(()=>openBackup(sealed,'98'.repeat(32)),/authentication/);const recoveredBackup=openBackup(sealed,key);assert.deepEqual(recoveredBackup,JSON.parse(JSON.stringify(backup)));await importSnapshot(target,recoveredBackup,schemas[1]);created=2;
  const artifactRoot=await mkdtemp(join(tmpdir(),'faro-native-artifact-'));
  try{const path=join(artifactRoot,'snapshot.backup'),result=await promisify(execFile)(process.execPath,['scripts/backup-faro-postgres.mjs','--output',path,'--operator-confirmed'],{env:{...process.env,FARO_PG_URL:process.env.FARO_PG_REHEARSAL_URL,FARO_PG_SCHEMA:schemas[0],FARO_BACKUP_ENCRYPTION_KEY:key}});assert.equal(JSON.parse(result.stdout).operation,'FARO_POSTGRES_ENCRYPTED_BACKUP');assert.deepEqual((await readProtectedBackup(path,key)).snapshot,JSON.parse(JSON.stringify(backup)));}
  finally{await rm(artifactRoot,{recursive:true,force:true});}

  await authority.query(`SET search_path TO ${identifier(schemas[0])}`);await target.query(`SET search_path TO ${identifier(schemas[1])}`);
  const initial=await readRecoveryLedger(authority,()=>{});assert.ok(initial.mfa.some(row=>row.user_id===candidate.id));
  await assert.rejects(()=>readRecoveryLedger(authority,()=>{throw new Error('OPERATOR_REFUSED');}),/OPERATOR_REFUSED/);
  const password=hashPassword('NewSyntheticRecovery123');await authority.query("UPDATE users SET role='ADMIN',password_hash=$1 WHERE id=$2",[password,employer.id]);
  await eraseAccount(authority,hashSessionToken(candidate.cookie.split('=')[1]),{confirmation:'USUŃ KONTO',password:'Bezpieczne123'},asOf,false,true);
  const ledger=await readRecoveryLedger(authority,()=>{}),hash=createHash('sha256').update(candidate.id).digest('hex');assert.ok(ledger.erasures.some(row=>row.subject_hash===hash));assert.equal(ledger.accounts.some(row=>row.id===candidate.id),false);
  let currentArtifactLedger;const ledgerRoot=await mkdtemp(join(tmpdir(),'faro-authority-artifact-'));
  try{const path=join(ledgerRoot,'current.authority'),result=await promisify(execFile)(process.execPath,['scripts/backup-faro-postgres.mjs','--authority-only','--output',path,'--operator-confirmed'],{env:{...process.env,FARO_PG_URL:process.env.FARO_PG_REHEARSAL_URL,FARO_PG_SCHEMA:schemas[0],FARO_BACKUP_ENCRYPTION_KEY:'97'.repeat(32)}});assert.equal(JSON.parse(result.stdout).operation,'FARO_POSTGRES_ENCRYPTED_AUTHORITY');const payload=await readProtectedBackup(path,'97'.repeat(32));assert.equal(payload.format,'FARO_CURRENT_AUTHORITY_V1');currentArtifactLedger=payload.ledger;assert.deepEqual(currentArtifactLedger,ledger);}
  finally{await rm(ledgerRoot,{recursive:true,force:true});}

  const before=(await target.readBatch([{text:'SELECT COUNT(*) n FROM users',values:[]}]))[0][0].n;
  await assert.rejects(()=>reconcileRecovery(target,{...ledger,erasures:[]},asOf,()=>{}),/does not resolve/);assert.equal((await target.readBatch([{text:'SELECT COUNT(*) n FROM users',values:[]}]))[0][0].n,before);
  await assert.rejects(()=>reconcileRecovery(target,ledger,asOf,()=>{throw new Error('OPERATOR_REFUSED');}),/OPERATOR_REFUSED/);
  await target.query("ALTER TABLE audit_logs ADD CONSTRAINT recovery_audit_guard CHECK(action<>'RECOVERY_ERASURE_REPLAY') NOT VALID");await assert.rejects(()=>reconcileRecovery(target,ledger,asOf,()=>{}),error=>error.code==='23514');assert.equal((await target.readBatch([{text:'SELECT id FROM users WHERE id=$1',values:[candidate.id]}]))[0].length,1);await target.query('ALTER TABLE audit_logs DROP CONSTRAINT recovery_audit_guard');
  const result=await reconcileRecovery(target,currentArtifactLedger,asOf,()=>{});assert.equal(result.erasedSubjects,1);assert.ok(result.invalidatedSessions>=1);assert.ok(result.pausedOffers>=1);
  assert.equal((await target.readBatch([{text:'SELECT id FROM users WHERE id=$1',values:[candidate.id]}]))[0].length,0);
  const current=(await target.readBatch([{text:'SELECT role,password_hash FROM users WHERE id=$1',values:[employer.id]}]))[0][0];assert.equal(current.role,'ADMIN');assert.equal(current.password_hash,password);
  assert.equal((await target.readBatch([{text:'SELECT COUNT(*) n FROM sessions',values:[]}]))[0][0].n,0);
  assert.equal((await target.readBatch([{text:'SELECT status FROM faro_offers WHERE id=$1',values:[offer.id]}]))[0][0].status,'PAUSED');
  assert.equal((await target.readBatch([{text:'SELECT user_id FROM faro_mfa WHERE user_id=$1',values:[candidate.id]}]))[0].length,0);
  assert.equal((await reconcileRecovery(target,ledger,asOf,()=>{})).erasedSubjects,0);
  await target.query('SET search_path TO public');await assert.rejects(()=>reconcileRecovery(target,ledger,asOf,()=>{}),/Isolated offline/);await target.query(`SET search_path TO ${identifier(schemas[1])}`);
  assert.ok((await target.readBatch([{text:'SELECT id FROM faro_organizations WHERE id=$1',values:[org.id]}]))[0].length);
 }finally{
  for(let i=0;i<created;i++)await authority.query(`DROP SCHEMA ${identifier(schemas[i])} CASCADE`);
  await Promise.all([authority.end(),target.end()]);
 }
}
