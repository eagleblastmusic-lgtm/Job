import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createServer} from 'node:http';
import {PgJobDatabase} from '../dist/server/postgresDb.js';
import {postgresAiAdmission} from '../dist/server/faro/aiAdmissionModel.js';
import {AiGateway} from '../dist/server/aiGateway.js';

/** Synthetic loopback provider only, on the existing disposable native exercise schema. */
export async function proveNativeAi(database,config){
 const second=new PgJobDatabase({connectionString:process.env.FARO_PG_REHEARSAL_URL});
 let hits=0;const server=createServer((_req,res)=>{hits++;res.end(JSON.stringify({choices:[{message:{content:'{"skillIds":["faro:legacy:4"]}'}}],usage:{total_tokens:12}}));});
 await second.connect();
 const schema=(await database.query('SELECT current_schema() AS name')).rows[0].name;
 if(!/^faro_[a-z0-9_]+$/.test(schema))throw new Error('Synthetic native schema required.');
 await second.query(`SET search_path TO "${schema}"`);
 await new Promise(done=>server.listen(0,'127.0.0.1',done));
 const task='FARO_SYNTHETIC_BUDGET_PROOF',createdAt=new Date().toISOString(),start=createdAt.slice(0,10)+'T00:00:00.000Z';
 const count=Number((await database.query('SELECT COUNT(*) AS n FROM ai_requests WHERE created_at>=$1',[start])).rows[0].n);
 const admission=id=>({id,userId:null,taskType:task,model:'TEST_ONLY',promptVersion:'TEST_ONLY',inputHash:'0'.repeat(64),outputSchema:'TEST_ONLY',createdAt,maxDailyRequests:count+1});
 let phase='CONCURRENT_RESERVATION';
 try{
  const store=postgresAiAdmission(database),other=postgresAiAdmission(second);
  const results=await Promise.all([store.reserve(admission(randomUUID())),other.reserve(admission(randomUUID()))]);
  assert.equal(results.filter(Boolean).length,1);
  assert.equal(await postgresAiAdmission(second).reserve(admission(randomUUID())),false);
  const row=(await database.query('SELECT id,error_code FROM ai_requests WHERE task_type=$1',[task])).rows[0];
  assert.equal(row.error_code,'AI_IN_FLIGHT');
  await store.finish(row.id,1,null,0,'AI_TIMEOUT');
  assert.equal(await other.reserve(admission(randomUUID())),false);
  phase='SYNTHETIC_GATEWAY';
  const gateway=new AiGateway(store,{...config,aiBaseUrl:`http://127.0.0.1:${server.address().port}`,aiApiKey:'TEST_ONLY',aiModel:'TEST_ONLY',aiTimeoutMs:1000,aiMaxDailyRequests:count+2});
  const request={userId:null,taskType:task,promptVersion:'TEST_ONLY',outputSchemaName:'TEST_ONLY',system:'Synthetic catalog only.',input:'PRIVATE_SENTINEL synthetic SQL',validate:value=>{assert.deepEqual(value,{skillIds:['faro:legacy:4']});return value;}};
  assert.deepEqual(await gateway.structured(request),{skillIds:['faro:legacy:4']});assert.equal(hits,1);
  await assert.rejects(gateway.structured(request),/^Error: AI_DAILY_BUDGET$/);assert.equal(hits,1);
  phase='AUDIT_READBACK';
  const audit=(await database.readBatch([{text:'SELECT * FROM ai_requests WHERE task_type=$1 ORDER BY success',values:[task]}]))[0];
  assert.equal(audit.length,2);assert.equal(audit[1].token_usage,12);assert.doesNotMatch(JSON.stringify(audit),/PRIVATE_SENTINEL/);
  phase='AUDIT_REFUSAL';
  await database.query("ALTER TABLE ai_requests ADD CONSTRAINT native_ai_admission_guard CHECK(task_type<>'FARO_SYNTHETIC_ADMISSION_FAILURE') NOT VALID");
  try{
   const refusing=new AiGateway(other,{...config,aiBaseUrl:`http://127.0.0.1:${server.address().port}`,aiApiKey:'TEST_ONLY',aiModel:'TEST_ONLY',aiTimeoutMs:1000,aiMaxDailyRequests:count+3});
   await assert.rejects(refusing.structured({...request,taskType:'FARO_SYNTHETIC_ADMISSION_FAILURE'}),/^Error: AI_AUDIT_UNAVAILABLE$/);assert.equal(hits,1);
  }finally{await database.query('ALTER TABLE ai_requests DROP CONSTRAINT native_ai_admission_guard');}
 }catch(error){console.error(`FARO_POSTGRES_AI_ADMISSION_FAILED phase=${phase}; response records withheld.`);throw error;}
 finally{
  server.closeAllConnections();await new Promise(done=>server.close(done));
  await database.query('DELETE FROM ai_requests WHERE task_type=$1',[task]);await second.end();
 }
 console.log('FARO_POSTGRES_AI_ADMISSION_PASS serializable competing connections, reconstruction, failed/inflight budget, actual synthetic gateway, audit refusal before egress; no live provider.');
}
