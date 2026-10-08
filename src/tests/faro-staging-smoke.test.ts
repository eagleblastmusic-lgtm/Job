import test from 'node:test';
import assert from 'node:assert/strict';
import {execFile,spawn} from 'node:child_process';
import {promisify} from 'node:util';
import {createServer} from 'node:http';
import type {AddressInfo} from 'node:net';
import {faroFixture} from './faro-fixture.js';

test('canonical smoke defaults to public reads and confirmed synthetic mode erases account and derivatives',async()=>{
 const f=await faroFixture();f.app.config.appOrigin=f.base;
 try{
  const options={env:{...process.env,STAGING_URL:f.base,STAGING_ALLOW_HTTP:'1'}};
  const count=()=>f.app.db.db.prepare('SELECT COUNT(*) n FROM users').get()!.n;
  const before=count();
  const read=await promisify(execFile)(process.execPath,['scripts/staging-smoke.mjs'],options);assert.match(read.stdout,/PUBLIC_READ_ONLY/);assert.equal(count(),before);
  await assert.rejects(()=>promisify(execFile)(process.execPath,['scripts/staging-smoke.mjs','--synthetic-account'],options));assert.equal(count(),before);
  const result=await promisify(execFile)(process.execPath,['scripts/staging-smoke.mjs','--synthetic-account','--operator-confirmed','--expect-faro-open'],options);
  assert.match(result.stdout,/ACCOUNT_CLEANUP_PASS/);assert.equal(count(),before);assert.equal(f.app.db.db.prepare('SELECT COUNT(*) n FROM sessions').get()!.n,0);
  await assert.rejects(()=>promisify(execFile)(process.execPath,['scripts/staging-smoke.mjs','--synthetic-account','--operator-confirmed'],options),error=>{const failure=error as Error & {stderr:string;stdout:string};assert.match(failure.stderr,/FARO_SMOKE_FAILURE step=PROFILE/);assert.match(failure.stdout,/ACCOUNT_CLEANUP_PASS/);return true;});assert.equal(count(),before);
 }finally{await f.close();}
});


test('synthetic staging smoke verifies the closed production boundary and removes its account',async()=>{
 const f=await faroFixture({nodeEnv:'production',appOrigin:'http://127.0.0.1'});f.app.config.appOrigin=f.base;
 try{
  const result=await promisify(execFile)(process.execPath,['scripts/staging-smoke.mjs','--synthetic-account','--operator-confirmed'],{env:{...process.env,STAGING_URL:f.base,STAGING_ALLOW_HTTP:'1'}});
  assert.match(result.stdout,/ACCOUNT_CLEANUP_PASS/);
  assert.equal(f.app.db.db.prepare('SELECT COUNT(*) n FROM users').get()!.n,0);
 }finally{await f.close();}
});

const execute=promisify(execFile);
for(const failure of ['none','consent','session','confirmation'])test(`restart smoke checks retained state and cleans up after ${failure}`,async()=>{
 const f=await faroFixture({nodeEnv:'production',appOrigin:'http://127.0.0.1'});f.app.config.appOrigin=f.base;
 const child=spawn(process.execPath,['scripts/staging-smoke.mjs','--synthetic-account','--operator-confirmed','--restart-proof'],{env:{...process.env,STAGING_URL:f.base,STAGING_ALLOW_HTTP:'1'},windowsHide:true,stdio:['pipe','pipe','pipe']});
 let stdout='',stderr='';child.stdout.on('data',data=>{stdout+=String(data);});child.stderr.on('data',data=>{stderr+=String(data);});
 const completed=new Promise<number|null>((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});
 try{
  await new Promise<void>((resolve,reject)=>{
   const timer=setTimeout(()=>reject(new Error('Smoke readiness marker timeout')),10000);
   child.stdout.on('data',()=>{if(stdout.includes('FARO_SMOKE_RESTART_READY')){clearTimeout(timer);resolve();}});
   child.once('exit',()=>{clearTimeout(timer);reject(new Error('Smoke exited before marker: '+stderr));});
  });
  assert.equal(f.app.db.db.prepare('SELECT COUNT(*) n FROM users').get()!.n,1);
  if(failure==='consent')f.app.db.db.exec("UPDATE consents SET granted=0 WHERE consent_type='ANALYTICS'");
  if(failure==='session')f.app.db.db.exec('DELETE FROM sessions');
  if(failure==='confirmation')child.stdin.end();else child.stdin.write('RESTARTED\n');
  assert.equal(await completed,failure==='none'?0:1);
  if(failure==='none')assert.match(stdout,/RESTART_PERSISTENCE_PASS/);
  else{assert.doesNotMatch(stdout,/RESTART_PERSISTENCE_PASS/);assert.match(stderr,new RegExp('step='+({consent:'RESTART_CONSENTS',session:'RESTART_SESSION',confirmation:'RESTART_WAIT'}[failure as 'consent'|'session'|'confirmation'])));}
  assert.match(stdout,/ACCOUNT_CLEANUP_PASS/);
  assert.equal(f.app.db.db.prepare('SELECT COUNT(*) n FROM users').get()!.n,0);
  assert.equal(f.app.db.db.prepare('SELECT COUNT(*) n FROM sessions').get()!.n,0);
  assert.equal(f.app.db.db.prepare('SELECT COUNT(*) n FROM consents').get()!.n,0);
  assert.doesNotMatch(stdout+stderr,/job_session=|faro-smoke-[a-f0-9]|SyntheticSmoke[a-f0-9]/);
 }finally{if(child.exitCode===null){child.kill();await completed;}await f.close();}
});

for(const legalStatus of [200,503])test(`staging smoke waits for readiness but does not retry later responses (${legalStatus})`,async()=>{
 let healthReads=0,legalReads=0,writes=0;
 const server=createServer((request,response)=>{
  if(request.method!=='GET')writes++;
  response.setHeader('cache-control','no-store');response.setHeader('content-type','application/json');
  if(request.url==='/api/health'){
   response.statusCode=++healthReads===1?503:200;
   response.end(JSON.stringify({ok:true,database:'ok',storage:'ok'}));
  }else{
   legalReads++;response.statusCode=legalStatus;
   response.end(JSON.stringify({legalVersion:'test',termsUrl:'/terms.html',privacyUrl:'/privacy.html'}));
  }
 });
 await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin=`http://127.0.0.1:${(server.address() as AddressInfo).port}`;
 try{
  const operation=execute(process.execPath,['scripts/staging-smoke.mjs'],{env:{...process.env,STAGING_URL:origin,STAGING_ALLOW_HTTP:'1'},timeout:15000});
  if(legalStatus===200){const result=await operation;assert.match(result.stdout,/PUBLIC_READ_ONLY.*PASS/);}
  else await assert.rejects(operation,(error:unknown)=>{assert.match((error as {stderr:string}).stderr,/FARO_SMOKE_FAILURE step=LEGAL/);return true;});
  assert.equal(healthReads,2);assert.equal(legalReads,1);assert.equal(writes,0);
 }finally{server.closeAllConnections();await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}
});
