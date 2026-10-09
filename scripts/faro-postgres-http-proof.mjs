import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import { mkdir,writeFile,stat,rename,rm,readdir } from 'node:fs/promises';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { createConnectedPgFaroApp } from '../dist/server/pgFaroApp.js';
import { offerInput } from '../dist/tests/faro-fixture.js';
import { hashSessionToken } from '../dist/server/auth.js';

/** Actual HTTP against the same disposable PostgreSQL schema, no SQLite facade. */
export async function proveNativeHttp(database,config){
 const app=createConnectedPgFaroApp(database,{...config,faroWorkerEnabled:false,faroRateLimitKey:'61'.repeat(32)});
 await new Promise(done=>app.server.listen(0,'127.0.0.1',done));
 const base=`http://127.0.0.1:${app.server.address().port}`;
 async function request(path,cookie='',method='GET',body,status=200,headers={}){const response=await fetch(base+path,{method,headers:{cookie,'content-type':'application/json',...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});const value=await response.json();if(response.status!==status)console.error(`FARO_HTTP_STATUS_FAILURE method=${method} route=${path.replace(/[a-f0-9]{8}-[a-f0-9-]{27}/g,':id')} expected=${status} actual=${response.status} code=${value.error?.code??'NONE'}`);assert.equal(response.status,status,'HTTP status contract');assert.equal(response.headers.get('cache-control'),'no-store');return {value,cookie:response.headers.get('set-cookie')?.split(';')[0]};}
 const json=async(...args)=>(await request(...args)).value;
 async function register(name){const response=await request('/api/auth/register','','POST',{name,email:`http-${name.toLowerCase()}@example.pl`,password:'Bezpieczne123',acceptTerms:true,acceptPrivacy:true,role:'ADMIN'},201);assert.equal(response.value.user.role,'USER');return {id:response.value.user.id,cookie:response.cookie};}
 try{
  const healthy=await json('/api/health');assert.equal(healthy.database,'ok');assert.equal(healthy.storage,'ok');
  assert.equal((await readdir(join(config.dataDir,'uploads'))).some(name=>name.startsWith('.faro-readiness-')),false);
  const uploads=join(config.dataDir,'uploads'),held=join(config.dataDir,'uploads-health-held');
  await rename(uploads,held);try{await writeFile(uploads,'synthetic storage obstruction');const blocked=await json('/api/health','','GET',undefined,503);assert.equal(blocked.database,'ok');assert.equal(blocked.storage,'unavailable');assert.equal(JSON.stringify(blocked).includes(config.dataDir),false);}finally{await rm(uploads,{force:true});await rename(held,uploads);}
  assert.equal((await json('/api/health')).storage,'ok');
  await database.query('ALTER TABLE users RENAME TO health_users_held');try{const blocked=await json('/api/health','','GET',undefined,503);assert.equal(blocked.database,'unavailable');assert.equal(blocked.storage,'ok');}finally{await database.query('ALTER TABLE health_users_held RENAME TO users');}
  assert.equal((await json('/api/health')).database,'ok');
  app.config.appOrigin=base;
  let smoke;try{smoke=await promisify(execFile)(process.execPath,['scripts/staging-smoke.mjs','--synthetic-account','--operator-confirmed','--expect-faro-open'],{env:{...process.env,STAGING_URL:base,STAGING_ALLOW_HTTP:'1'}});}catch(error){console.error(error.stderr?.match(/FARO_SMOKE_FAILURE step=[A-Z]+; no response records logged\./)?.[0]??'FARO_SMOKE_CHILD_FAILED');throw error;}assert.match(smoke.stdout,/ACCOUNT_CLEANUP_PASS/);
  const retired=await json('/api/profile','','GET',undefined,410);assert.equal(retired.error.code,'RETIRED_FEATURE');
  await json('/api/faro/profile','','GET',undefined,401);
  const owner=await register('Owner'),candidate=await register('Candidate'),moderator=await register('Moderator');
  await json('/api/auth/register','','POST',{name:'Foreign',email:'foreign@example.pl',password:'Bezpieczne123',acceptTerms:true,acceptPrivacy:true},403,{origin:'https://foreign.invalid'});
  await json('/api/faro/profile',candidate.cookie,'PUT',{firstName:'Anna',expectedVersion:0,availability:{kind:'IMMEDIATE'}});
  const sourcePractice={quantity:24,unit:'MONTHS',context:'PRIVATE_NATIVE_ACTIVITY_CONTEXT'};
  const sourceProfile=await json('/api/faro/activities',candidate.cookie,'POST',{description:'SQL Excel',source:'WORK',practice:sourcePractice},201);
  assert.deepEqual(sourceProfile.activities[0].practice,sourcePractice);assert.equal(sourceProfile.claims.length,0);
  assert.doesNotMatch(JSON.stringify(await json('/api/faro/profile/preview',candidate.cookie)),/PRIVATE_NATIVE_ACTIVITY_CONTEXT/);
  await json(`/api/faro/activities/${sourceProfile.activities[0].id}`,candidate.cookie,'DELETE',{confirmed:true});
  const escoId='esco:29c954f2-ed17-4900-bba5-4cfd294f3680';
  const catalog=await json('/api/faro/catalog',candidate.cookie);
  assert.equal(catalog.skills.length,13962);
  const esco=catalog.skills.find(skill=>skill.id===escoId);
  assert.equal(esco.canonicalURI,'http://data.europa.eu/esco/skill/29c954f2-ed17-4900-bba5-4cfd294f3680');
  assert.equal(esco.taxonomyVersion,'ESCO-v1.2.1');assert.equal(esco.licenseRef,'esco-skills-v1.2.1-cc-by-4.0');
  const escoLearning={skillId:escoId,mode:'WANTS_TO_LEARN',practice:{quantity:1,unit:'TASKS',context:'PRIVATE_NATIVE_PRACTICE_CONTEXT'}};
  await json('/api/faro/learning',candidate.cookie,'POST',escoLearning,201);
  assert.equal((await json('/api/faro/profile',candidate.cookie)).learning[0].skillId,escoId);
  assert.equal((await json('/api/faro/profile',candidate.cookie)).learning[0].practice.context,escoLearning.practice.context);
  assert.doesNotMatch(JSON.stringify(await json('/api/faro/profile/preview',candidate.cookie)),/PRIVATE_NATIVE_PRACTICE_CONTEXT/);
  await json('/api/faro/learning',candidate.cookie,'DELETE',{...escoLearning,expectedPractice:{quantity:1,unit:'TASKS'},confirmed:true},409);
  await json('/api/faro/learning',candidate.cookie,'DELETE',{...escoLearning,expectedPractice:escoLearning.practice,confirmed:true});
  assert.equal((await json('/api/faro/profile',candidate.cookie)).learning.length,0);
  const conflictBaseline=await json('/api/faro/profile',candidate.cookie),conflictAudit=(await database.query('SELECT COUNT(*) n FROM audit_logs')).rows[0].n;
  // Real driver failures verify HTTP classification AND transactional rollback.
  for(const code of ['40001','40P01']){
   await database.query('CREATE SEQUENCE http_profile_conflict_attempts');
   await database.query(`CREATE FUNCTION http_profile_conflict() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM nextval('http_profile_conflict_attempts'); RAISE EXCEPTION 'synthetic private database detail' USING ERRCODE = '${code}'; END $$`);
   await database.query('CREATE TRIGGER http_profile_conflict BEFORE UPDATE ON faro_profiles FOR EACH ROW EXECUTE FUNCTION http_profile_conflict()');
   try{
    const failed=await json('/api/faro/profile',candidate.cookie,'PUT',{firstName:'Natalia',expectedVersion:conflictBaseline.version,availability:{kind:'IMMEDIATE'}},409);
    assert.equal(failed.error.code,'VERSION_CONFLICT');assert.equal(JSON.stringify(failed).includes('synthetic private database detail'),false);
    assert.deepEqual(await json('/api/faro/profile',candidate.cookie),conflictBaseline);
    assert.equal((await database.query('SELECT COUNT(*) n FROM audit_logs')).rows[0].n,conflictAudit);
    const attempts=(await database.query('SELECT last_value,is_called FROM http_profile_conflict_attempts')).rows[0];assert.equal(attempts.last_value,'1');assert.equal(attempts.is_called,true);
   }finally{await database.query('DROP TRIGGER http_profile_conflict ON faro_profiles');await database.query('DROP FUNCTION http_profile_conflict()');await database.query('DROP SEQUENCE http_profile_conflict_attempts');}
  }
  const learning={skillId:'faro:legacy:4',mode:'SELF_DEVELOPING',practice:{quantity:3,unit:'PROJECTS'}};
  const removal={skillId:learning.skillId,mode:learning.mode,expectedPractice:learning.practice,confirmed:true};
  await json('/api/faro/learning',candidate.cookie,'POST',learning,201);
  await json('/api/faro/learning',candidate.cookie,'POST',{...learning,mode:'WANTS_TO_LEARN'},201);
  await json('/api/faro/learning',owner.cookie,'POST',{...learning,practice:{quantity:7,unit:'PROJECTS'}},201);
  await json('/api/faro/learning',candidate.cookie,'DELETE',{...removal,confirmed:false},400);
  await json('/api/faro/learning',owner.cookie,'DELETE',{...removal,userId:candidate.id},409);
  await json('/api/faro/learning',candidate.cookie,'POST',{...learning,practice:{quantity:5,unit:'PROJECTS'}},201);
  await json('/api/faro/learning',candidate.cookie,'DELETE',removal,409);
  const freshRemoval={...removal,expectedPractice:{quantity:5,unit:'PROJECTS'},userId:owner.id};
  const learningAudit=(await database.query("SELECT COUNT(*) n FROM audit_logs WHERE action='LEARNING_REMOVED'")).rows[0].n;
  await database.query("ALTER TABLE audit_logs ADD CONSTRAINT http_learning_audit_guard CHECK(action<>'LEARNING_REMOVED') NOT VALID");
  try{await json('/api/faro/learning',candidate.cookie,'DELETE',freshRemoval,500);assert.equal((await json('/api/faro/profile',candidate.cookie)).learning.length,2);}finally{await database.query('ALTER TABLE audit_logs DROP CONSTRAINT http_learning_audit_guard');}
  const removed=await json('/api/faro/learning',candidate.cookie,'DELETE',freshRemoval);
  assert.deepEqual(removed.learning.map(row=>row.mode),['WANTS_TO_LEARN']);
  assert.deepEqual(await json('/api/faro/learning',candidate.cookie,'DELETE',freshRemoval),removed);
  assert.equal(Number((await database.query("SELECT COUNT(*) n FROM audit_logs WHERE action='LEARNING_REMOVED'")).rows[0].n),Number(learningAudit)+1);
  assert.equal((await json('/api/faro/profile',owner.cookie)).learning.length,1);
  assert.deepEqual((await json('/api/export',candidate.cookie)).faro.faro_learning.map(row=>row.mode),['WANTS_TO_LEARN']);
  const preview=await json('/api/faro/profile/preview-confirmation',candidate.cookie);
  const org=await json('/api/faro/organizations',owner.cookie,'POST',{name:'Native HTTP organization'},201);
  await json(`/api/faro/organizations/${org.id}/verify`,moderator.cookie,'POST',{note:'Synthetic independent verification'},403);
  await database.query("UPDATE users SET role='ADMIN' WHERE id=$1",[moderator.id]);
  await json(`/api/faro/organizations/${org.id}/verify`,moderator.cookie,'POST',{note:'Synthetic independent verification'});
  const offer=await json(`/api/faro/organizations/${org.id}/offers`,owner.cookie,'POST',offerInput(owner.id),201);
  await json(`/api/faro/offers/${offer.id}/lifecycle`,owner.cookie,'POST',{action:'REVIEW',expectedVersion:1});
  await json(`/api/faro/offers/${offer.id}/lifecycle`,owner.cookie,'POST',{action:'PUBLISH',expectedVersion:2,confirmed:true});
  const recruitmentProcess=await json(`/api/faro/offers/${offer.id}/interest`,candidate.cookie,'POST',{offerVersion:1,projectionConfirmed:true,confirmationToken:preview.confirmationToken,idempotencyKey:'http-interest'},201);
  await json(`/api/faro/processes/${recruitmentProcess.id}`,owner.cookie);
  await json(`/api/faro/offers/${offer.id}/watch`,candidate.cookie,'POST');assert.equal((await json('/api/faro/watches',candidate.cookie)).offers.some(row=>row.id===offer.id),true);
  const economy={salaryOptionIndex:0,netMin:400000,netMax:450000,commuteCost:10000,commuteMinutes:25,transport:'TRANSIT',source:'Synthetic private manual estimate',observedAt:new Date().toISOString(),assumptions:'Synthetic HTTP assumptions'};
  await json(`/api/faro/offers/${offer.id}/economics`,candidate.cookie,'PUT',economy);assert.equal(await json(`/api/faro/offers/${offer.id}/economics`,owner.cookie),null);
  const consent=await json('/api/consents/analytics',candidate.cookie,'PUT',{granted:true});assert.equal(consent.consent.granted,true);assert.equal((await json('/api/consents',candidate.cookie)).consents.find(row=>row.type==='ANALYTICS').granted,true);
  const me=await json('/api/me',candidate.cookie);assert.equal(me.user.id,candidate.id);assert.equal(Object.hasOwn(me.user,'passwordHash'),false);
  const exported=await json('/api/export',candidate.cookie);assert.equal(exported.user.id,candidate.id);assert.equal(exported.faro.exportVersion,'faro-data-rights-v1');assert.equal(JSON.stringify(exported).includes('__faro_source_rowid'),false);
  await json('/api/faro/attempts',candidate.cookie);await json(`/api/faro/processes/${recruitmentProcess.id}/interviews`,candidate.cookie);
  await json('/api/faro/notifications',owner.cookie);
  await json('/api/faro/worker/tick',moderator.cookie,'POST',{});
  const workerStatus=await json('/api/faro/worker/status',moderator.cookie);assert.deepEqual(workerStatus.fileDisposals,{pending:0,ready:0,retrying:0,leased:0,failed:0,oldestRequestedAt:null});await json('/api/faro/worker/status',candidate.cookie,'GET',undefined,403);
  const token=hashSessionToken(candidate.cookie.split('=')[1]);await database.query('DELETE FROM sessions WHERE token_hash=$1',[token]);await json('/api/faro/profile',candidate.cookie,'PUT',{firstName:'Unauthorized',expectedVersion:1,availability:{kind:'IMMEDIATE'}},401);
  const login=await request('/api/auth/login','','POST',{email:'http-candidate@example.pl',password:'Bezpieczne123'});candidate.cookie=login.cookie;
  const uploadKey=`uploads/${candidate.id}/synthetic-private.txt`;await mkdir(join(config.dataDir,'uploads',candidate.id),{recursive:true});await writeFile(join(config.dataDir,uploadKey),'synthetic retained private file');await database.query("INSERT INTO uploaded_files(id,user_id,kind,original_name,mime_type,storage_key,size_bytes,sha256,created_at) VALUES($1,$2,'CV','synthetic.txt','text/plain',$3,31,'synthetic',$4)",['http-upload-'+candidate.id,candidate.id,uploadKey,new Date().toISOString()]);
  await json('/api/account',candidate.cookie,'DELETE',{confirmation:'USUŃ KONTO',password:'Wrong'},401);assert.ok(await stat(join(config.dataDir,uploadKey)));
  await database.query("ALTER TABLE faro_file_disposals ADD CONSTRAINT http_disposal_guard CHECK(storage_key<>'"+uploadKey+"') NOT VALID");await json('/api/account',candidate.cookie,'DELETE',{confirmation:'USUŃ KONTO',password:'Bezpieczne123'},500);assert.ok(await stat(join(config.dataDir,uploadKey)));assert.equal((await database.readBatch([{text:'SELECT id FROM users WHERE id=$1',values:[candidate.id]}]))[0].length,1);await database.query('ALTER TABLE faro_file_disposals DROP CONSTRAINT http_disposal_guard');
  await json('/api/account',candidate.cookie,'DELETE',{confirmation:'USUŃ KONTO',password:'Bezpieczne123'});await json('/api/me',candidate.cookie,'GET',undefined,401);await assert.rejects(()=>stat(join(config.dataDir,uploadKey)),error=>error.code==='ENOENT');
  await json('/api/faro/sessions/revoke-all',owner.cookie,'POST',{confirmed:true,password:'Bezpieczne123'});await json('/api/faro/profile',owner.cookie,'GET',undefined,401);
  await json('/api/auth/logout',moderator.cookie,'POST',{});await json('/api/me',moderator.cookie,'GET',undefined,401);
 }finally{const closing=app.close();app.server.closeAllConnections();await closing;}
}
