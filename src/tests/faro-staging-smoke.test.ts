import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execute=promisify(execFile);
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
