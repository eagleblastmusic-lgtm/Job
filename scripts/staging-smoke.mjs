import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const raw=process.env.STAGING_URL?.trim();
let base;
try{base=new URL(raw);}catch{throw new Error('Required valid STAGING_URL.');}
if(base.username||base.password||base.search||base.hash||base.pathname!=='/'||!['https:','http:'].includes(base.protocol))throw new Error('Invalid staging origin.');
const local=['127.0.0.1','localhost','[::1]'].includes(base.hostname);
if(base.protocol!=='https:'&&(!local||process.env.STAGING_ALLOW_HTTP!=='1'))throw new Error('HTTPS required except explicitly allowed local rehearsal.');
const synthetic=process.argv.includes('--synthetic-account');
if(synthetic&&!process.argv.includes('--operator-confirmed'))throw new Error('Synthetic account requires explicit operator confirmation.');
const expectOpen=process.argv.includes('--expect-faro-open');
if(expectOpen&&!synthetic)throw new Error('Open Faro probe requires synthetic account mode.');
let cookie='',created=false;
const password=`SyntheticSmoke${randomUUID()}9`,email=`faro-smoke-${randomUUID()}@example.pl`;
async function request(path,method='GET',body,status=200){
 const response=await fetch(new URL(path,base),{method,redirect:'error',signal:AbortSignal.timeout(10000),headers:{origin:base.origin,...(body===undefined?{}:{'content-type':'application/json'}),...(cookie?{cookie}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 assert.equal(response.status,status,`Smoke status ${method} ${path}`);
 assert.equal(response.headers.get('cache-control'),'no-store');
 const payload=await response.json();const token=response.headers.get('set-cookie')?.split(';')[0];if(token)cookie=token;return payload;
}
try{
 const health=await request('/api/health');assert.equal(health.ok,true);assert.equal(health.database,'ok');assert.equal(health.storage,'ok');
 const legal=await request('/api/legal');assert.ok(legal.legalVersion);assert.equal(legal.termsUrl,'/terms.html');assert.equal(legal.privacyUrl,'/privacy.html');
 if(synthetic){
  const registered=await request('/api/auth/register','POST',{name:'SmokeFixture',email,password,acceptTerms:true,acceptPrivacy:true,analyticsConsent:false},201);created=true;assert.equal(registered.user.role,'USER');assert.ok(cookie.startsWith('job_session='));
  const me=await request('/api/me');assert.equal(me.user.id,registered.user.id);assert.equal(me.subscription.plan,'FREE');
  const consents=await request('/api/consents');assert.equal(consents.consents.find(row=>row.type==='ANALYTICS').granted,false);
  const profile=await request('/api/faro/profile','GET',undefined,expectOpen?200:503);if(!expectOpen)assert.equal(profile.error.code,'RELEASE_GATES_OPEN');
  await request('/api/profile','GET',undefined,410);
  const exported=await request('/api/export');assert.equal(exported.user.id,registered.user.id);assert.equal(exported.faro.exportVersion,'faro-data-rights-v1');
 }
 console.log(JSON.stringify({operation:'FARO_STAGING_SMOKE',mode:synthetic?'SYNTHETIC_ACCOUNT':'PUBLIC_READ_ONLY',result:'PASS',release:'NOT_ACCEPTED'}));
}finally{
 if(created){try{await request('/api/account','DELETE',{confirmation:'USUŃ KONTO',password});await request('/api/me','GET',undefined,401);console.log('FARO_SMOKE_ACCOUNT_CLEANUP_PASS');}catch{console.error('FARO_SMOKE_ACCOUNT_CLEANUP_FAILED; operator review required.');process.exitCode=1;}}
}
