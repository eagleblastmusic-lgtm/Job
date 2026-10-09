import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type RequestListener } from 'node:http';
import type { AddressInfo } from 'node:net';
import { createHash } from 'node:crypto';
import { AiGateway } from '../server/aiGateway.js';
import { faroFixture } from './faro-fixture.js';
import { validateSkillProposalResponse, SKILL_PROPOSAL_SCHEMA_VERSION } from '../domain/faro/skills.js';

async function fixture(handler:RequestListener,timeout=1000,dailyBudget=100){
  const f=await faroFixture(),server=createServer(handler);
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  const newGateway=()=>new AiGateway(f.app.db,{...f.app.config,aiBaseUrl:`http://127.0.0.1:${(server.address() as AddressInfo).port}`,aiApiKey:'synthetic-key',aiModel:'synthetic-model',aiTimeoutMs:timeout,aiMaxDailyRequests:dailyBudget});
  return {gateway:newGateway(),newGateway,db:f.app.db.db,close:async()=>{server.closeAllConnections();await new Promise<void>(resolve=>server.close(()=>resolve()));await f.close();}};
}
const request=()=>({userId:null,taskType:'FARO_SKILL_PROPOSALS',promptVersion:'synthetic-prompt-v1',outputSchemaName:SKILL_PROPOSAL_SCHEMA_VERSION,system:'Return catalog IDs only.',input:'PRIVATE_SENTINEL synthetic SQL',validate:(value:unknown)=>validateSkillProposalResponse(value).map(s=>s.skillId)});

test('AI gateway validates catalog semantics and records hashes and bounded token metadata',async()=>{
  let body='';const f=await fixture((req,res)=>{req.on('data',chunk=>{body+=String(chunk);});req.on('end',()=>res.end(JSON.stringify({choices:[{message:{content:JSON.stringify({skillIds:['faro:legacy:4']})}}],usage:{total_tokens:17}})));});
  try{
    assert.deepEqual(await f.gateway.structured({...request(),maxOutputTokens:64}),['faro:legacy:4']);
    assert.equal(JSON.parse(body).max_tokens,64);
    const audit=f.db.prepare('SELECT * FROM ai_requests').get() as Record<string,unknown>;
    assert.equal(audit.success,1);assert.equal(audit.token_usage,17);assert.equal(audit.prompt_version,'synthetic-prompt-v1');assert.equal(audit.output_schema,SKILL_PROPOSAL_SCHEMA_VERSION);
    assert.equal(audit.input_hash,createHash('sha256').update(request().input).digest('hex'));assert.doesNotMatch(JSON.stringify(audit),/PRIVATE_SENTINEL|synthetic-key/);
  }finally{await f.close();}
});

test('AI gateway deadline covers a response stalled after headers',async()=>{
  const f=await fixture((_req,res)=>{res.writeHead(200,{'content-type':'application/json'});res.flushHeaders();res.write('{');},100);
  try{await assert.rejects(f.gateway.structured(request()),/^Error: AI_TIMEOUT$/);assert.equal((f.db.prepare('SELECT error_code FROM ai_requests').get() as {error_code:string}).error_code,'AI_TIMEOUT');}finally{await f.close();}
});

test('AI gateway bounds response bytes and redacts malformed and semantic failures',async()=>{
  for(const [body,code] of [['x'.repeat(128*1024+1),'AI_RESPONSE_TOO_LARGE'],['PRIVATE_SENTINEL','AI_INVALID_RESPONSE'],[JSON.stringify({choices:[{message:{content:'{"skillIds":["forged"]}'}}]}),'AI_INVALID_OUTPUT']] as const){
    const f=await fixture((_req,res)=>res.end(body));
    try{await assert.rejects(f.gateway.structured(request()),new RegExp(`^Error: ${code}$`));const audit=f.db.prepare('SELECT * FROM ai_requests').get() as Record<string,unknown>;assert.equal(audit.success,0);assert.equal(audit.error_code,code);assert.doesNotMatch(JSON.stringify(audit),/PRIVATE_SENTINEL|forged|synthetic-key/);}finally{await f.close();}
  }
  const f=await fixture((_req,res)=>res.end(JSON.stringify({choices:[{message:{content:'{}'}}]})));
  try{await assert.rejects(f.gateway.structured({...request(),validate:()=>{throw new Error('PRIVATE_SENTINEL');}}),/^Error: AI_INVALID_OUTPUT$/);}finally{await f.close();}
});

test('AI gateway does not follow redirects or send requests exceeding the token budget',async()=>{
  let hits=0;const f=await fixture((_req,res)=>{hits++;res.writeHead(307,{location:'/redirect-target'});res.end();});
  try{await assert.rejects(f.gateway.structured(request()),/^Error: AI_TRANSPORT$/);assert.equal(hits,1);await assert.rejects(f.gateway.structured({...request(),maxOutputTokens:4097}),/^Error: AI_REQUEST_LIMIT$/);assert.equal(hits,1);assert.equal((f.db.prepare('SELECT count(*) AS n FROM ai_requests').get() as {n:number}).n,1);}finally{await f.close();}
});

test('durable AI admission limits competing gateways, survives reconstruction and counts failures',async()=>{
  let hits=0;const f=await fixture((_req,res)=>{hits++;setTimeout(()=>{res.writeHead(503);res.end();},100);},1000,1);
  try{
    const first=assert.rejects(f.gateway.structured(request()),/^Error: AI_HTTP_503$/);
    await assert.rejects(f.newGateway().structured(request()),/^Error: AI_DAILY_BUDGET$/);
    await first;assert.equal(hits,1);
    await assert.rejects(f.newGateway().structured(request()),/^Error: AI_DAILY_BUDGET$/);
    const audit=f.db.prepare('SELECT COUNT(*) n FROM ai_requests').get() as {n:number};assert.equal(audit.n,1);
    f.db.prepare("UPDATE ai_requests SET created_at='2000-01-01T00:00:00.000Z'").run();
    await assert.rejects(f.newGateway().structured(request()),/^Error: AI_HTTP_503$/);assert.equal(hits,2);
  }finally{await f.close();}
});

test('AI refuses unsafe provenance and unavailable admission audit before network access',async()=>{
  let hits=0;const f=await fixture((_req,res)=>{hits++;res.end('{}');});
  try{
    await assert.rejects(f.gateway.structured({...request(),promptVersion:'PRIVATE SENTINEL'}),/^Error: AI_REQUEST_LIMIT$/);
    f.db.exec("CREATE TRIGGER refuse_ai BEFORE INSERT ON ai_requests BEGIN SELECT RAISE(ABORT,'PRIVATE_SENTINEL'); END;");
    await assert.rejects(f.gateway.structured(request()),/^Error: AI_AUDIT_UNAVAILABLE$/);
    assert.equal(hits,0);assert.equal((f.db.prepare('SELECT COUNT(*) n FROM ai_requests').get() as {n:number}).n,0);
  }finally{await f.close();}
});
