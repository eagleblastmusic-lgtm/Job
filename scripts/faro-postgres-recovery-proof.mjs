import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {writeProtectedBackup,readProtectedBackup} from './faro-backup-envelope.mjs';
import { sealBackup,openBackup } from './faro-backup-envelope.mjs';
import { captureNativeSnapshot } from './faro-postgres-backup.mjs';
import assert from 'node:assert/strict';
import { randomBytes,createHash } from 'node:crypto';
import { importSnapshot,identifier,clientFromEnvironment } from './faro-postgres-rehearsal.mjs';
import { readRecoveryLedger } from '../dist/server/faro/recoveryReadModel.js';
import { reconcileRecovery } from '../dist/server/faro/recoveryWriteModel.js';
import { removeProfileActivity,profileActivityQueries,profileClaimQueries,profileLearningQuery,revokeProfileClaim,removeProfileLearning } from '../dist/server/faro/profileWriteModel.js';
import { SKILL_CATALOG } from '../dist/domain/faro/skills.js';
import { eraseAccount } from '../dist/server/faro/privacyErasureModel.js';
import { hashSessionToken,hashPassword } from '../dist/server/auth.js';

/** Two isolated real PostgreSQL schemas: stale backup vs actual latest authority. */
export async function proveNativeRecovery(snapshot,candidate,employer,org,offer){
 const schemas=[`faro_rehearsal_${randomBytes(8).toString('hex')}`,`faro_rehearsal_${randomBytes(8).toString('hex')}`],authority=clientFromEnvironment(),target=clientFromEnvironment(),asOf=new Date().toISOString();let created=0;
 try{
  await authority.connect();await target.connect();await importSnapshot(authority,snapshot,schemas[0]);created=1;
  await authority.query(`SET search_path TO ${identifier(schemas[0])}`);
  for(const description of ['Syntetyczna obsługa klienta do usunięcia.','Syntetyczny zachowany opis.'])for(const query of profileActivityQueries(employer.id,{description,source:'HOBBY',practice:{quantity:2,unit:'TASKS',context:'Prywatny kontekst źródła.'}},asOf))await authority.query(query.text,query.values);
  const sourceActivities=(await authority.query('SELECT id,description FROM faro_activities WHERE user_id=$1',[employer.id])).rows,deletedActivity=sourceActivities.find(row=>row.description==='Syntetyczna obsługa klienta do usunięcia.').id,retainedActivity=sourceActivities.find(row=>row.description==='Syntetyczny zachowany opis.').id;
  assert.ok((await authority.query('SELECT id FROM faro_proposals WHERE activity_id=$1',[deletedActivity])).rowCount);
  const recoverySkill=SKILL_CATALOG[0].id,learningBody={skillId:recoverySkill,mode:'WANTS_TO_LEARN',practice:{quantity:2,unit:'TASKS',context:'Prywatny usuwany kierunek.'}};
  for(const query of profileClaimQueries(employer.id,{skillId:recoverySkill,level:'BASICS',source:'HOBBY',practice:{quantity:2,unit:'TASKS'},confirmed:true},asOf))await authority.query(query.text,query.values);
  const withdrawnClaim=(await authority.query('SELECT id FROM faro_claims WHERE user_id=$1 AND skill_id=$2 AND revoked_at IS NULL',[employer.id,recoverySkill])).rows[0].id,learningQuery=profileLearningQuery(employer.id,learningBody);await authority.query(learningQuery.text,learningQuery.values);
  const retainedLearning=profileLearningQuery(employer.id,{...learningBody,mode:'SELF_DEVELOPING'});await authority.query(retainedLearning.text,retainedLearning.values);
  const backup=await captureNativeSnapshot(authority,snapshot,schemas[0],()=>{});const key='99'.repeat(32),sealed=sealBackup(backup,key);assert.equal(sealed.includes(Buffer.from(candidate.id)),false);assert.throws(()=>openBackup(sealed,'98'.repeat(32)),/authentication/);const recoveredBackup=openBackup(sealed,key);assert.deepEqual(recoveredBackup,JSON.parse(JSON.stringify(backup)));await importSnapshot(target,recoveredBackup,schemas[1]);created=2;
  const artifactRoot=await mkdtemp(join(tmpdir(),'faro-native-artifact-'));
  try{const path=join(artifactRoot,'snapshot.backup'),result=await promisify(execFile)(process.execPath,['scripts/backup-faro-postgres.mjs','--output',path,'--operator-confirmed'],{env:{...process.env,FARO_PG_URL:process.env.FARO_PG_REHEARSAL_URL,FARO_PG_SCHEMA:schemas[0],FARO_BACKUP_ENCRYPTION_KEY:key}});assert.equal(JSON.parse(result.stdout).operation,'FARO_POSTGRES_ENCRYPTED_BACKUP');assert.deepEqual((await readProtectedBackup(path,key)).snapshot,JSON.parse(JSON.stringify(backup)));}
  finally{await rm(artifactRoot,{recursive:true,force:true});}

  await authority.query(`SET search_path TO ${identifier(schemas[0])}`);await target.query(`SET search_path TO ${identifier(schemas[1])}`);
  const initial=await readRecoveryLedger(authority,()=>{});assert.ok(initial.mfa.some(row=>row.user_id===candidate.id));
  await assert.rejects(()=>readRecoveryLedger(authority,()=>{throw new Error('OPERATOR_REFUSED');}),/OPERATOR_REFUSED/);
  await removeProfileActivity(authority,employer.id,deletedActivity,{confirmed:true},asOf);
  const currentLearning=profileLearningQuery(employer.id,{...learningBody,mode:'SELF_DEVELOPING',practice:{quantity:3,unit:'TASKS',context:'Bieżący prywatny kontekst.'}});await authority.query(currentLearning.text,currentLearning.values);
  await revokeProfileClaim(authority,employer.id,withdrawnClaim,asOf);await removeProfileLearning(authority,employer.id,{skillId:recoverySkill,mode:'WANTS_TO_LEARN',expectedPractice:learningBody.practice,confirmed:true},asOf);
  const password=hashPassword('NewSyntheticRecovery123');await authority.query("UPDATE users SET role='ADMIN',password_hash=$1 WHERE id=$2",[password,employer.id]);
  await eraseAccount(authority,hashSessionToken(candidate.cookie.split('=')[1]),{confirmation:'USUŃ KONTO',password:'Bezpieczne123'},asOf,false,true);
  const ledger=await readRecoveryLedger(authority,()=>{}),hash=createHash('sha256').update(candidate.id).digest('hex');assert.ok(ledger.erasures.some(row=>row.subject_hash===hash));assert.equal(ledger.accounts.some(row=>row.id===candidate.id),false);
  let currentArtifactLedger;const ledgerRoot=await mkdtemp(join(tmpdir(),'faro-authority-artifact-'));
  try{const path=join(ledgerRoot,'current.authority'),result=await promisify(execFile)(process.execPath,['scripts/backup-faro-postgres.mjs','--authority-only','--output',path,'--operator-confirmed'],{env:{...process.env,FARO_PG_URL:process.env.FARO_PG_REHEARSAL_URL,FARO_PG_SCHEMA:schemas[0],FARO_BACKUP_ENCRYPTION_KEY:'97'.repeat(32)}});assert.equal(JSON.parse(result.stdout).operation,'FARO_POSTGRES_ENCRYPTED_AUTHORITY');const payload=await readProtectedBackup(path,'97'.repeat(32));assert.equal(payload.format,'FARO_CURRENT_AUTHORITY_V1');currentArtifactLedger=payload.ledger;assert.deepEqual(currentArtifactLedger,ledger);}
  finally{await rm(ledgerRoot,{recursive:true,force:true});}

  const restoreRoot=await mkdtemp(join(tmpdir(),'faro-restore-artifact-')),restoreSchema=`faro_rehearsal_${randomBytes(8).toString('hex')}`;let restored=false;
  try{
   const source=join(restoreRoot,'stale.backup'),current=join(restoreRoot,'latest.authority');await writeProtectedBackup(source,{format:'FARO_LOGICAL_SNAPSHOT_V1',createdAt:asOf,snapshot:backup},'99'.repeat(32));await writeProtectedBackup(current,{format:'FARO_CURRENT_AUTHORITY_V1',createdAt:asOf,ledger:currentArtifactLedger},'97'.repeat(32));
   const args=['scripts/restore-faro-postgres.mjs','--source',source,'--authority-source',current,'--target-schema',restoreSchema,'--offline-confirmed','--authority-current-confirmed'],options={env:{...process.env,FARO_PG_URL:process.env.FARO_PG_REHEARSAL_URL,FARO_BACKUP_ENCRYPTION_KEY:'99'.repeat(32),FARO_AUTHORITY_ENCRYPTION_KEY:'97'.repeat(32)}};
   const invalid=join(restoreRoot,'incomplete.authority'),failedSchema=`faro_rehearsal_${randomBytes(8).toString('hex')}`;await writeProtectedBackup(invalid,{format:'FARO_CURRENT_AUTHORITY_V1',createdAt:asOf,ledger:{...currentArtifactLedger,erasures:[]}},'97'.repeat(32));const refused=[...args];refused[refused.indexOf('--authority-source')+1]=invalid;refused[refused.indexOf('--target-schema')+1]=failedSchema;await assert.rejects(()=>promisify(execFile)(process.execPath,refused,options),error=>error.code===1);assert.equal((await target.query('SELECT 1 FROM pg_namespace WHERE nspname=$1',[failedSchema])).rowCount,0);assert.deepEqual((await readProtectedBackup(source,'99'.repeat(32))).snapshot,JSON.parse(JSON.stringify(backup)));
   const result=await promisify(execFile)(process.execPath,args,options);restored=true;assert.equal(JSON.parse(result.stdout).operation,'FARO_POSTGRES_ISOLATED_RECOVERY');assert.equal((await target.query(`SELECT id FROM ${identifier(restoreSchema)}.users WHERE id=$1`,[candidate.id])).rowCount,0);assert.equal((await target.query(`SELECT password_hash FROM ${identifier(restoreSchema)}.users WHERE id=$1`,[employer.id])).rows[0].password_hash,password);
   assert.equal((await target.query(`SELECT id FROM ${identifier(restoreSchema)}.faro_activities WHERE id=$1`,[deletedActivity])).rowCount,0);assert.equal((await target.query(`SELECT id FROM ${identifier(restoreSchema)}.faro_proposals WHERE activity_id=$1`,[deletedActivity])).rowCount,0);assert.equal((await target.query(`SELECT id FROM ${identifier(restoreSchema)}.faro_activities WHERE id=$1`,[retainedActivity])).rowCount,1);
   assert.ok((await target.query(`SELECT revoked_at FROM ${identifier(restoreSchema)}.faro_claims WHERE id=$1`,[withdrawnClaim])).rows[0].revoked_at);assert.equal((await target.query(`SELECT skill_id FROM ${identifier(restoreSchema)}.faro_learning WHERE user_id=$1 AND skill_id=$2 AND mode='WANTS_TO_LEARN'`,[employer.id,recoverySkill])).rowCount,0);
   await assert.rejects(()=>promisify(execFile)(process.execPath,args,options),error=>error.code===1);assert.equal((await target.query(`SELECT COUNT(*) n FROM ${identifier(restoreSchema)}.sessions`)).rows[0].n,'0');
  }finally{if(restored)await authority.query(`DROP SCHEMA ${identifier(restoreSchema)} CASCADE`);await rm(restoreRoot,{recursive:true,force:true});}
  const before=(await target.readBatch([{text:'SELECT COUNT(*) n FROM users',values:[]}]))[0][0].n;
  await assert.rejects(()=>reconcileRecovery(target,{...ledger,erasures:[]},asOf,()=>{}),/does not resolve/);assert.equal((await target.readBatch([{text:'SELECT COUNT(*) n FROM users',values:[]}]))[0][0].n,before);
  await assert.rejects(()=>reconcileRecovery(target,ledger,asOf,()=>{throw new Error('OPERATOR_REFUSED');}),/OPERATOR_REFUSED/);
  await target.query("ALTER TABLE audit_logs ADD CONSTRAINT recovery_audit_guard CHECK(action<>'RECOVERY_ERASURE_REPLAY') NOT VALID");await assert.rejects(()=>reconcileRecovery(target,ledger,asOf,()=>{}),error=>error.code==='23514');assert.equal((await target.readBatch([{text:'SELECT id FROM users WHERE id=$1',values:[candidate.id]}]))[0].length,1);assert.equal((await target.query('SELECT id FROM faro_activities WHERE id=$1',[deletedActivity])).rowCount,1);await target.query('ALTER TABLE audit_logs DROP CONSTRAINT recovery_audit_guard');
  await assert.rejects(()=>reconcileRecovery(target,{...ledger,activities:undefined},asOf,()=>{}),/Missing current private activity/);
  await assert.rejects(()=>reconcileRecovery(target,{...ledger,activities:[...ledger.activities,...ledger.activities]},asOf,()=>{}),/Invalid current private activity/);
  await assert.rejects(()=>reconcileRecovery(target,{...ledger,activities:ledger.activities.map(row=>row.id===retainedActivity?{...row,user_id:candidate.id}:row)},asOf,()=>{}),/ownership mismatch/);
  assert.equal((await target.query('SELECT id FROM faro_activities WHERE id=$1',[deletedActivity])).rowCount,1);
  await assert.rejects(()=>reconcileRecovery(target,{...ledger,claims:undefined},asOf,()=>{}),/Missing current skill/);
  await assert.rejects(()=>reconcileRecovery(target,{...ledger,learning:undefined},asOf,()=>{}),/Missing current skill/);
  await assert.rejects(()=>reconcileRecovery(target,{...ledger,claims:[...ledger.claims,...ledger.claims]},asOf,()=>{}),/Invalid current skill/);
  const result=await reconcileRecovery(target,currentArtifactLedger,asOf,()=>{});assert.equal(result.erasedSubjects,1);assert.equal((await target.query('SELECT id FROM faro_activities WHERE id=$1',[deletedActivity])).rowCount,0);assert.equal((await target.query('SELECT id FROM faro_proposals WHERE activity_id=$1',[deletedActivity])).rowCount,0);assert.equal((await target.query('SELECT id FROM faro_activities WHERE id=$1',[retainedActivity])).rowCount,1);assert.ok(result.invalidatedSessions>=1);assert.ok(result.pausedOffers>=1);
  assert.equal((await target.readBatch([{text:'SELECT id FROM users WHERE id=$1',values:[candidate.id]}]))[0].length,0);
  assert.ok((await target.query('SELECT revoked_at FROM faro_claims WHERE id=$1',[withdrawnClaim])).rows[0].revoked_at);assert.equal((await target.query("SELECT skill_id FROM faro_learning WHERE user_id=$1 AND skill_id=$2 AND mode='WANTS_TO_LEARN'",[employer.id,recoverySkill])).rowCount,0);
  assert.equal(JSON.parse((await target.query("SELECT practice FROM faro_learning WHERE user_id=$1 AND skill_id=$2 AND mode='SELF_DEVELOPING'",[employer.id,recoverySkill])).rows[0].practice).context,'Bieżący prywatny kontekst.');
  await assert.rejects(()=>reconcileRecovery(target,{...ledger,learning:[...ledger.learning,...ledger.learning]},asOf,()=>{}),/Invalid current learning/);
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
