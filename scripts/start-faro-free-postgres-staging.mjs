import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,rm,realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,dirname} from 'node:path';
import {Client} from 'pg';
import {JobDatabase} from '../dist/server/db.js';
import {loadConfig} from '../dist/server/config.js';
import {upgradeActivityPractice} from './upgrade-faro-free-activity-practice.mjs';

// Empty disposable staging only: never migrate source application/user data at startup.
const schema='faro_rehearsal_render_staging',service='srv-db3pb9rncjis73banf90';
let client,root,locked=false,phase='SCOPE';
try {
 if(process.env.RENDER_SERVICE_ID!==service||process.env.NODE_ENV!=='production'||process.env.FARO_DATABASE_ENGINE!=='postgresql'||process.env.FARO_PG_SCHEMA!==schema||process.env.FARO_STAGING_EMPTY_BOOTSTRAP!=='confirmed')throw new Error();
 const config=loadConfig();if(!config.faroMfaEncryptionKey||!config.faroRateLimitKey)throw new Error();
 const url=new URL(process.env.FARO_PG_URL??'');
 if(!['postgres:','postgresql:'].includes(url.protocol)||url.pathname!=='/faro_free_staging_pg18'||decodeURIComponent(url.username)!=='faro_free_staging_pg18_user')throw new Error();
 phase='TARGET';client=new Client({connectionString:url.href,connectionTimeoutMillis:10000});await client.connect();
 const version=(await client.query("SELECT current_setting('server_version_num')::int AS version")).rows[0].version;if(version<180000||version>=190000)throw new Error();
 await client.query('SELECT pg_advisory_lock(hashtext($1))',[schema]);locked=true;
 const exists=(await client.query('SELECT 1 FROM pg_namespace WHERE nspname=$1',[schema])).rows.length>0;
 if(!exists) {
  const other=(await client.query("SELECT nspname FROM pg_namespace WHERE nspname NOT LIKE 'pg_%' AND nspname NOT IN ('public','information_schema')")).rows;
  const publicData=(await client.query("SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','f','S') LIMIT 1")).rows;
  if(other.length||publicData.length)throw new Error();
  phase='EMPTY_SOURCE';root=await mkdtemp(join(tmpdir(),'faro-empty-staging-'));const source=join(root,'empty.sqlite'),db=new JobDatabase(source);db.close();
  phase='PREPARE';const proof=await promisify(execFile)(process.execPath,['scripts/prepare-faro-postgres.mjs','--source',source,'--target-schema',schema,'--operator-confirmed','--offline-confirmed'],{windowsHide:true,env:{...process.env,FARO_PG_REHEARSAL_URL:url.href},maxBuffer:65536});
  if(JSON.parse(proof.stdout).result!=='PASS')throw new Error();
  console.log('FARO_FREE_STAGING_EMPTY_SCHEMA_PREPARED; no application source data migrated.');
 }else {
  phase='ACTIVITY_PRACTICE_UPGRADE';const result=await upgradeActivityPractice(client,{allowUpgrade:process.env.FARO_STAGING_ACTIVITY_PRACTICE_UPGRADE==='confirmed'});
  console.log(`FARO_FREE_STAGING_ACTIVITY_PRACTICE_${result}; additive nullable column only.`);
  console.log('FARO_FREE_STAGING_EXISTING_SCHEMA_RETAINED; no data migration or reset.');
 }
}catch {
 console.error(`FARO_FREE_STAGING_START_REFUSED phase=${phase}; no credentials or records logged.`);process.exitCode=1;
}finally {
 if(client){try{if(locked)await client.query('SELECT pg_advisory_unlock(hashtext($1))',[schema]);}finally{await client.end();}}
 if(root){const actual=await realpath(root),parent=await realpath(tmpdir());if(dirname(actual).toLowerCase()!==parent.toLowerCase()||!actual.split(/[\\/]/).pop().startsWith('faro-empty-staging-'))throw new Error('Staging cleanup confinement refused.');await rm(actual,{recursive:true,force:true});}
}
if(!process.exitCode&&!process.argv.includes('--prepare-only')) {
 try{await import('../dist/server/index.js');}catch{console.error('FARO_FREE_STAGING_HTTP_START_REFUSED; no credentials or records logged.');process.exitCode=1;}
}
