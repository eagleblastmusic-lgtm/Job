import {watch,chmodSync,existsSync} from 'node:fs';
import {mkdtemp,mkdir,writeFile,readFile,rm,stat} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {randomBytes,createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import assert from 'node:assert/strict';
import {clientFromEnvironment,identifier,importSnapshot} from './faro-postgres-rehearsal.mjs';
import {readProtectedBackup,writeProtectedBackup} from './faro-backup-envelope.mjs';
import {eraseAccount} from '../dist/server/faro/privacyErasureModel.js';
import {hashSessionToken} from '../dist/server/auth.js';

/** Actual encrypted offline CLI backup and restore of retained vs erased/stale private files. */
export async function proveNativePrivateFileRecovery(snapshot,candidate,employer){
 const root=await mkdtemp(join(tmpdir(),'faro-pg-file-recovery-')),db=clientFromEnvironment(),source=`faro_rehearsal_${randomBytes(8).toString('hex')}`,target=`faro_rehearsal_${randomBytes(8).toString('hex')}`,failed=`faro_rehearsal_${randomBytes(8).toString('hex')}`;
 let sourceCreated=false,targetCreated=false;
 const env={...process.env,FARO_PG_URL:process.env.FARO_PG_REHEARSAL_URL,FARO_PG_SCHEMA:source,FARO_BACKUP_ENCRYPTION_KEY:'76'.repeat(32),FARO_AUTHORITY_ENCRYPTION_KEY:'77'.repeat(32)},run=(args,overrides={})=>promisify(execFile)(process.execPath,args,{env:{...env,...overrides},maxBuffer:1024*1024});
 try{
  await db.connect();await importSnapshot(db,snapshot,source);sourceCreated=true;await db.query(`SET search_path TO ${identifier(source)}`);
  const dataDir=join(root,'source-files'),backupPath=join(root,'private.backup'),authorityPath=join(root,'current.authority');await mkdir(dataDir);
  const retained=Buffer.from('synthetic retained physical evidence'),erased=Buffer.from('synthetic erased physical evidence'),obsolete=Buffer.from('synthetic obsolete physical evidence');
  const entries=[['retained-file',employer.id,retained],['erased-file',candidate.id,erased],['obsolete-file',employer.id,obsolete]];
  for(const [id,userId,bytes] of entries){const key=`uploads/${userId}/${id}.txt`;await mkdir(join(dataDir,'uploads',userId),{recursive:true});await writeFile(join(dataDir,key),bytes);await db.query("INSERT INTO uploaded_files(id,user_id,kind,original_name,mime_type,storage_key,size_bytes,sha256,created_at) VALUES($1,$2,'CV','synthetic.txt','text/plain',$3,$4,$5,$6)",[id,userId,key,bytes.length,createHash('sha256').update(bytes).digest('hex'),new Date().toISOString()]);}
  const backupArgs=['scripts/backup-faro-postgres.mjs','--output',backupPath,'--operator-confirmed','--with-private-files','--private-files-dir',dataDir];
  await assert.rejects(()=>run(backupArgs),error=>error.code===1);await assert.rejects(()=>stat(backupPath));
  const captured=JSON.parse((await run([...backupArgs,'--offline-confirmed'])).stdout);assert.equal(captured.physicalFiles,3);const cipher=await readFile(backupPath);assert.equal(cipher.includes(retained),false);assert.equal(cipher.includes(Buffer.from(employer.id)),false);
  await eraseAccount(db,hashSessionToken(candidate.cookie.split('=')[1]),{confirmation:'USUŃ KONTO',password:'Bezpieczne123'},new Date().toISOString(),false,true);
  await db.query("DELETE FROM uploaded_files WHERE id='obsolete-file'");
  await run(['scripts/backup-faro-postgres.mjs','--authority-only','--output',authorityPath,'--operator-confirmed'],{FARO_BACKUP_ENCRYPTION_KEY:env.FARO_AUTHORITY_ENCRYPTION_KEY});
  const current=await readProtectedBackup(authorityPath,env.FARO_AUTHORITY_ENCRYPTION_KEY);assert.equal(current.ledger.uploads.length,1);
  const badAuthority=join(root,'missing.authority');const missing={...current,ledger:{...current.ledger}};delete missing.ledger.uploads;await writeProtectedBackup(badAuthority,missing,env.FARO_AUTHORITY_ENCRYPTION_KEY);
  const failedFiles=join(root,'failed-files');const restoreArgs=(schema,files,authority=authorityPath)=>['scripts/restore-faro-postgres.mjs','--source',backupPath,'--authority-source',authority,'--target-schema',schema,'--files-target',files,'--offline-confirmed','--authority-current-confirmed'];
  await assert.rejects(()=>run(restoreArgs(failed,failedFiles,badAuthority)),error=>error.code===1);assert.equal((await db.readBatch([{text:'SELECT schema_name FROM information_schema.schemata WHERE schema_name=$1',values:[failed]}]))[0].length,0);await assert.rejects(()=>stat(failedFiles));
  if(process.platform!=='win32'){
   const blockedSchema=`faro_rehearsal_${randomBytes(8).toString('hex')}`,blockedFiles=join(root,'blocked-files');let blocked=false;
   const observer=watch(root,(_event,name)=>{if(String(name)==='blocked-files'&&existsSync(blockedFiles)){chmodSync(blockedFiles,0o500);blocked=true;}});
   try{await assert.rejects(()=>run(restoreArgs(blockedSchema,blockedFiles)),error=>error.code===1);assert.equal(blocked,true,'real destination write refusal applied');assert.equal((await db.readBatch([{text:'SELECT schema_name FROM information_schema.schemata WHERE schema_name=$1',values:[blockedSchema]}]))[0].length,0);await assert.rejects(()=>stat(blockedFiles));}
   finally{observer.close();if(existsSync(blockedFiles))chmodSync(blockedFiles,0o700);}
  }
  const filesTarget=join(root,'restored-files'),result=JSON.parse((await run(restoreArgs(target,filesTarget))).stdout);targetCreated=true;assert.equal(result.restoredFiles,1);assert.equal(result.verifiedFiles,1);assert.equal(result.erasedSubjects,1);
  assert.deepEqual(await readFile(join(filesTarget,`uploads/${employer.id}/retained-file.txt`)),retained);
  for(const [id,userId] of entries.slice(1))await assert.rejects(()=>stat(join(filesTarget,`uploads/${userId}/${id}.txt`)),error=>error.code==='ENOENT');
  assert.equal((await db.readBatch([{text:`SELECT id FROM ${identifier(target)}.uploaded_files`,values:[]}]))[0].length,1);assert.equal((await db.readBatch([{text:`SELECT id FROM ${identifier(target)}.users WHERE id=$1`,values:[candidate.id]}]))[0].length,0);
  await assert.rejects(()=>run(restoreArgs(target,filesTarget)),error=>error.code===1);assert.deepEqual(await readFile(join(filesTarget,`uploads/${employer.id}/retained-file.txt`)),retained);assert.deepEqual(await readFile(join(dataDir,`uploads/${candidate.id}/erased-file.txt`)),erased);
 }finally{
  if(targetCreated)await db.query(`DROP SCHEMA ${identifier(target)} CASCADE`);if(sourceCreated)await db.query(`DROP SCHEMA ${identifier(source)} CASCADE`);await db.end();await rm(root,{recursive:true,force:true});
 }
}
