import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {importSnapshot,identifier,clientFromEnvironment} from './faro-postgres-rehearsal.mjs';
import {enforceNativeRate,requestLimitPlan} from '../dist/server/faro/requestLimitModel.js';
export async function proveNativeRequestLimits(snapshot){
 const schema=`faro_rehearsal_${randomBytes(8).toString('hex')}`,one=clientFromEnvironment(),two=clientFromEnvironment(),restart=clientFromEnvironment(),key='65'.repeat(32),asOf=Date.now();let created=false;
 try{await one.connect();await two.connect();await importSnapshot(one,snapshot,schema);created=true;for(const db of [one,two])await db.query(`SET search_path TO ${identifier(schema)}`);
 await assert.rejects(()=>enforceNativeRate(one,null,'login:127.0.0.1',1,1000,asOf),error=>error.code==='RATE_LIMIT_UNAVAILABLE');
 const results=await Promise.allSettled([one,two].map(db=>enforceNativeRate(db,key,'login:127.0.0.1',1,1000,asOf)));assert.equal(results.filter(result=>result.status==='fulfilled').length,1);assert.equal(results.filter(result=>result.status==='rejected'&&result.reason.status===429).length,1);
 const row=(await one.readBatch([{text:'SELECT bucket_hash,request_count,expires_at FROM faro_request_limits',values:[]}]))[0][0];assert.equal(row.request_count,2);assert.equal(row.expires_at,asOf+1000);assert.equal(JSON.stringify(row).includes('127.0.0.1'),false);
 await restart.connect();await restart.query(`SET search_path TO ${identifier(schema)}`);await assert.rejects(()=>enforceNativeRate(restart,key,'login:127.0.0.1',1,1000,asOf+1),error=>error.status===429);await enforceNativeRate(restart,key,'login:127.0.0.1',1,1000,asOf+1000);assert.equal((await restart.readBatch([{text:'SELECT request_count FROM faro_request_limits',values:[]}]))[0][0].request_count,1);
 const before=(await one.readBatch([{text:'SELECT bucket_hash,request_count,expires_at FROM faro_request_limits',values:[]}]))[0],guarded=requestLimitPlan(key,'guarded-test',1,1000,asOf+2000).hash;await one.query(`ALTER TABLE faro_request_limits ADD CONSTRAINT rate_atomic_guard CHECK(bucket_hash<>'${guarded}') NOT VALID`);await assert.rejects(()=>enforceNativeRate(one,key,'guarded-test',1,1000,asOf+2000),error=>error.code==='RATE_LIMIT_UNAVAILABLE');assert.deepEqual((await one.readBatch([{text:'SELECT bucket_hash,request_count,expires_at FROM faro_request_limits',values:[]}]))[0],before);await one.query('ALTER TABLE faro_request_limits DROP CONSTRAINT rate_atomic_guard');
 }finally{if(created)await one.query(`DROP SCHEMA ${identifier(schema)} CASCADE`);await Promise.all([one.end(),two.end(),restart.end()]);}
}
