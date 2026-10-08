import test from 'node:test';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
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
