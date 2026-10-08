import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createInterface} from 'node:readline';
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
const restartProof=process.argv.includes('--restart-proof');
if(restartProof&&!synthetic)throw new Error('Restart proof requires confirmed synthetic account mode.');
let cookie='',created=false,step='HEALTH';
const password=`SyntheticSmoke${randomUUID()}9`,email=`faro-smoke-${randomUUID()}@example.pl`;
// Retry only the initial public readiness read; never replay account mutations.
async function readiness(){
 const deadline=Date.now()+90000;
 while(true){
  let response;
  try{response=await fetch(new URL('/api/health',base),{redirect:'error',signal:AbortSignal.timeout(Math.max(1,Math.min(60000,deadline-Date.now())))});}catch(error){
   if(Date.now()>=deadline)throw error;
   await new Promise(resolve=>setTimeout(resolve,1000));continue;
  }
  if([502,503,504].includes(response.status)){
   await response.body?.cancel();
   if(Date.now()>=deadline)throw new Error('Staging readiness deadline exceeded.');
   await new Promise(resolve=>setTimeout(resolve,1000));continue;
  }
  assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
  return response.json();
 }
}
async function request(path,method='GET',body,status=200){
 const response=await fetch(new URL(path,base),{method,redirect:'error',signal:AbortSignal.timeout(10000),headers:{origin:base.origin,...(body===undefined?{}:{'content-type':'application/json'}),...(cookie?{cookie}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
 assert.equal(response.status,status,`Smoke status ${method} ${path}`);
 assert.equal(response.headers.get('cache-control'),'no-store');
 const payload=await response.json();const token=response.headers.get('set-cookie')?.split(';')[0];if(token)cookie=token;return payload;
}
async function restartConfirmation(){
 const input=createInterface({input:process.stdin});
 try{
  await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(new Error('Restart confirmation timeout')),180000);
   input.once('line',line=>{clearTimeout(timer);line==='RESTARTED'?resolve():reject(new Error('Restart confirmation required'));});
   input.once('close',()=>{clearTimeout(timer);reject(new Error('Restart confirmation missing'));});
   console.log('FARO_SMOKE_RESTART_READY; restart only the confirmed staging service, observe its new listener, then send RESTARTED on stdin; credentials retained in memory only.');
  });
 }finally{input.close();}
}
try{
 const health=await readiness();assert.equal(health.ok,true);assert.equal(health.database,'ok');assert.equal(health.storage,'ok');
 step='LEGAL';const legal=await request('/api/legal');assert.ok(legal.legalVersion);assert.equal(legal.termsUrl,'/terms.html');assert.equal(legal.privacyUrl,'/privacy.html');
 if(synthetic){
  step='REGISTER';const registered=await request('/api/auth/register','POST',{name:'SmokeFixture',email,password,acceptTerms:true,acceptPrivacy:true,analyticsConsent:false},201);created=true;assert.equal(registered.user.role,'USER');assert.ok(cookie.startsWith('job_session='));
  step='ME';const me=await request('/api/me');assert.equal(me.user.id,registered.user.id);assert.equal(me.subscription.plan,'FREE');
  step='CONSENTS';const consents=await request('/api/consents');assert.equal(consents.consents.find(row=>row.type==='ANALYTICS').granted,false);
  step='PROFILE';const profile=await request('/api/faro/profile','GET',undefined,expectOpen?200:503);if(!expectOpen)assert.equal(profile.error.code,'RELEASE_GATES_OPEN');
  step='RETIREMENT';await request('/api/profile','GET',undefined,410);
  step='EXPORT';const exported=await request('/api/export');assert.equal(exported.user.id,registered.user.id);assert.equal(exported.faro.exportVersion,'faro-data-rights-v1');
  if(restartProof){
   step='RESTART_CONSENT_WRITE';await request('/api/consents/analytics','PUT',{granted:true});
   const before=await request('/api/consents');assert.equal(before.consents.find(row=>row.type==='ANALYTICS').granted,true);
   step='RESTART_WAIT';await restartConfirmation();
   step='RESTART_HEALTH';const restarted=await readiness();assert.equal(restarted.ok,true);assert.equal(restarted.database,'ok');assert.equal(restarted.storage,'ok');
   step='RESTART_SESSION';const retained=await request('/api/me');assert.equal(retained.user.id,registered.user.id);assert.equal(retained.subscription.plan,'FREE');
   step='RESTART_CONSENTS';const after=await request('/api/consents');assert.deepEqual(after.consents,before.consents);
   step='RESTART_LOGIN';cookie='';const login=await request('/api/auth/login','POST',{email,password});assert.equal(login.user.id,registered.user.id);assert.ok(cookie.startsWith('job_session='));
   step='RESTART_EXPORT';const recovered=await request('/api/export');assert.equal(recovered.user.id,exported.user.id);assert.equal(recovered.user.name,exported.user.name);assert.equal(recovered.user.email,exported.user.email);assert.equal(recovered.faro.exportVersion,exported.faro.exportVersion);
   step='RESTART_GATE';const gate=await request('/api/faro/profile','GET',undefined,expectOpen?200:503);if(!expectOpen)assert.equal(gate.error.code,'RELEASE_GATES_OPEN');
   console.log('FARO_SMOKE_RESTART_PERSISTENCE_PASS account/original-session/changed-consent/fresh-login/own-export/release-boundary; external restart confirmation required.');
  }
 }
 console.log(JSON.stringify({operation:'FARO_STAGING_SMOKE',mode:synthetic?'SYNTHETIC_ACCOUNT':'PUBLIC_READ_ONLY',result:'PASS',release:'NOT_ACCEPTED'}));
}catch{console.error(`FARO_SMOKE_FAILURE step=${step}; no response records logged.`);process.exitCode=1;}finally{
 if(created){try{if(restartProof){cookie='';await request('/api/auth/login','POST',{email,password});}await request('/api/account','DELETE',{confirmation:'USUŃ KONTO',password});await request('/api/me','GET',undefined,401);console.log('FARO_SMOKE_ACCOUNT_CLEANUP_PASS');}catch{console.error('FARO_SMOKE_ACCOUNT_CLEANUP_FAILED; operator review required.');process.exitCode=1;}}
}
