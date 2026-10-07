import { mkdir,writeFile,stat } from 'node:fs/promises';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { createConnectedPgFaroApp } from '../dist/server/pgFaroApp.js';
import { offerInput } from '../dist/tests/faro-fixture.js';
import { hashSessionToken } from '../dist/server/auth.js';

/** Actual HTTP against the same disposable PostgreSQL schema, no SQLite facade. */
export async function proveNativeHttp(database,config){
 const app=createConnectedPgFaroApp(database,{...config,faroWorkerEnabled:false});
 await new Promise(done=>app.server.listen(0,'127.0.0.1',done));
 const base=`http://127.0.0.1:${app.server.address().port}`;
 async function request(path,cookie='',method='GET',body,status=200,headers={}){const response=await fetch(base+path,{method,headers:{cookie,'content-type':'application/json',...headers},...(body===undefined?{}:{body:JSON.stringify(body)})});const value=await response.json();if(response.status!==status)console.error(`FARO_HTTP_STATUS_FAILURE method=${method} route=${path.replace(/[a-f0-9]{8}-[a-f0-9-]{27}/g,':id')} expected=${status} actual=${response.status} code=${value.error?.code??'NONE'}`);assert.equal(response.status,status,'HTTP status contract');assert.equal(response.headers.get('cache-control'),'no-store');return {value,cookie:response.headers.get('set-cookie')?.split(';')[0]};}
 const json=async(...args)=>(await request(...args)).value;
 async function register(name){const response=await request('/api/auth/register','','POST',{name,email:`http-${name.toLowerCase()}@example.pl`,password:'Bezpieczne123',acceptTerms:true,acceptPrivacy:true,role:'ADMIN'},201);assert.equal(response.value.user.role,'USER');return {id:response.value.user.id,cookie:response.cookie};}
 try{
  assert.equal((await json('/api/health')).database,'ok');
  const retired=await json('/api/profile','','GET',undefined,410);assert.equal(retired.error.code,'RETIRED_FEATURE');
  await json('/api/faro/profile','','GET',undefined,401);
  const owner=await register('Owner'),candidate=await register('Candidate'),moderator=await register('Moderator');
  await json('/api/auth/register','','POST',{name:'Foreign',email:'foreign@example.pl',password:'Bezpieczne123',acceptTerms:true,acceptPrivacy:true},403,{origin:'https://foreign.invalid'});
  await json('/api/faro/profile',candidate.cookie,'PUT',{firstName:'Anna',expectedVersion:0,availability:{kind:'IMMEDIATE'}});
  const preview=await json('/api/faro/profile/preview-confirmation',candidate.cookie);
  const org=await json('/api/faro/organizations',owner.cookie,'POST',{name:'Native HTTP organization'},201);
  await json(`/api/faro/organizations/${org.id}/verify`,moderator.cookie,'POST',{note:'Synthetic independent verification'},403);
  await database.query("UPDATE users SET role='ADMIN' WHERE id=$1",[moderator.id]);
  await json(`/api/faro/organizations/${org.id}/verify`,moderator.cookie,'POST',{note:'Synthetic independent verification'});
  const offer=await json(`/api/faro/organizations/${org.id}/offers`,owner.cookie,'POST',offerInput(owner.id),201);
  await json(`/api/faro/offers/${offer.id}/lifecycle`,owner.cookie,'POST',{action:'REVIEW',expectedVersion:1});
  await json(`/api/faro/offers/${offer.id}/lifecycle`,owner.cookie,'POST',{action:'PUBLISH',expectedVersion:2,confirmed:true});
  const process=await json(`/api/faro/offers/${offer.id}/interest`,candidate.cookie,'POST',{offerVersion:1,projectionConfirmed:true,confirmationToken:preview.confirmationToken,idempotencyKey:'http-interest'},201);
  await json(`/api/faro/processes/${process.id}`,owner.cookie);
  await json(`/api/faro/offers/${offer.id}/watch`,candidate.cookie,'POST');assert.equal((await json('/api/faro/watches',candidate.cookie)).offers.some(row=>row.id===offer.id),true);
  const economy={salaryOptionIndex:0,netMin:400000,netMax:450000,commuteCost:10000,commuteMinutes:25,transport:'TRANSIT',source:'Synthetic private manual estimate',observedAt:new Date().toISOString(),assumptions:'Synthetic HTTP assumptions'};
  await json(`/api/faro/offers/${offer.id}/economics`,candidate.cookie,'PUT',economy);assert.equal(await json(`/api/faro/offers/${offer.id}/economics`,owner.cookie),null);
  const consent=await json('/api/consents/analytics',candidate.cookie,'PUT',{granted:true});assert.equal(consent.consent.granted,true);assert.equal((await json('/api/consents',candidate.cookie)).consents.find(row=>row.type==='ANALYTICS').granted,true);
  const me=await json('/api/me',candidate.cookie);assert.equal(me.user.id,candidate.id);assert.equal(Object.hasOwn(me.user,'passwordHash'),false);
  const exported=await json('/api/export',candidate.cookie);assert.equal(exported.user.id,candidate.id);assert.equal(exported.faro.exportVersion,'faro-data-rights-v1');assert.equal(JSON.stringify(exported).includes('__faro_source_rowid'),false);
  await json('/api/faro/attempts',candidate.cookie);await json(`/api/faro/processes/${process.id}/interviews`,candidate.cookie);
  await json('/api/faro/notifications',owner.cookie);
  await json('/api/faro/worker/tick',moderator.cookie,'POST',{});
  await json('/api/faro/worker/status',moderator.cookie);
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
