import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {performanceSignals,provePerformance} from './faro-performance-proof.mjs';

test('K063: real bounded read probe emits safe OK and alert signals without claiming notification delivery',async()=>{
 const lines=[],original=console.log;console.log=line=>lines.push(line);
 let fail=false;const server=createServer((_req,res)=>{res.writeHead(fail?503:200,{'cache-control':'no-store'});res.end(fail?'PRIVATE_PROVIDER_SECRET_SENTINEL':'{}');});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try{
  const evidence=await provePerformance(`http://127.0.0.1:${server.address().port}`,'SYNTHETIC_COOKIE_SENTINEL','sqlite');
  assert.equal(performanceSignals(evidence).state,'OK');assert.equal(performanceSignals(evidence).delivery,'NOT_CONFIGURED');assert.equal(performanceSignals(evidence).owner,'UNASSIGNED');
  assert.equal(performanceSignals({...evidence,policy:Object.fromEntries(Object.entries(evidence.policy).reverse())}).state,'OK');
  const slow=structuredClone(evidence);slow.measurements[0].p95Ms=2000;slow.measurements[0].maxMs=2000;assert.equal(performanceSignals(slow).state,'OK');slow.measurements[0].p95Ms=2001;slow.measurements[0].maxMs=2001;assert.deepEqual(performanceSignals(slow).codes,['READ_P95_BUDGET']);
  assert.deepEqual(performanceSignals(evidence,Date.parse(evidence.observedAt)+300001).codes,['EVIDENCE_STALE']);
  const invalid=structuredClone(evidence);invalid.measurements[0].route='/private/subject-id';assert.equal(performanceSignals(invalid).state,'UNKNOWN');
  for(const bad of [null,{}, {...evidence,policy:{...evidence.policy,p95BudgetMs:999999}}, {...evidence,errors:-1}, {...evidence,measurements:evidence.measurements.slice(1)}, {...evidence,measurements:[null,...evidence.measurements.slice(1)]}, {...evidence,observedAt:'invalid'}])assert.equal(performanceSignals(bad).state,'UNKNOWN');
  const nan=structuredClone(evidence);nan.measurements[0].p95Ms=NaN;assert.equal(performanceSignals(nan).state,'UNKNOWN');
  fail=true;await assert.rejects(()=>provePerformance(`http://127.0.0.1:${server.address().port}`,'SYNTHETIC_COOKIE_SENTINEL','postgresql'),/BUDGET_FAILED/);
  const failure=lines.map(line=>JSON.parse(line)).find(row=>row.state==='ALERT');assert.ok(failure.codes.includes('REQUEST_FAILURE'));
  assert.ok(!JSON.stringify(lines).includes('PRIVATE_PROVIDER_SECRET_SENTINEL'));assert.ok(!JSON.stringify(lines).includes('SYNTHETIC_COOKIE_SENTINEL'));
  await assert.rejects(()=>provePerformance('https://public.invalid','cookie','sqlite'),/scope required/);
 }finally{console.log=original;server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
