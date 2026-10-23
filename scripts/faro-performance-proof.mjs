import assert from 'node:assert/strict';
import {performance,monitorEventLoopDelay} from 'node:perf_hooks';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createFaroApp} from '../dist/server/faroApp.js';

const policy=Object.freeze({version:'synthetic-read-load-v1',concurrency:4,requests:80,warmup:8,p95BudgetMs:2000,deadlineMs:10000});
const routes=['/api/health','/api/me','/api/faro/profile','/api/faro/offers'];
/** Local evaluation only: no delivery, credentials, identities, raw errors or production SLA. */
export function performanceSignals(evidence,now=Date.now()){
 const unknown=()=>({schema:'faro-performance-signals-v1',scope:'SYNTHETIC_DISPOSABLE_LOOPBACK_ONLY',state:'UNKNOWN',codes:['EVIDENCE_INVALID'],delivery:'NOT_CONFIGURED',owner:'UNASSIGNED'});
 if(!evidence||evidence.schema!=='faro-performance-evidence-v1'||evidence.scope!=='SYNTHETIC_DISPOSABLE_LOOPBACK_ONLY'||!['sqlite','postgresql'].includes(evidence.backend)||!Number.isFinite(now)||!Number.isFinite(Date.parse(evidence.observedAt))||Date.parse(evidence.observedAt)>now+1000||!evidence.policy||JSON.stringify(Object.keys(evidence.policy).sort())!==JSON.stringify(Object.keys(policy).sort())||Object.entries(policy).some(([key,value])=>evidence.policy[key]!==value)||!Number.isSafeInteger(evidence.errors)||evidence.errors<0||!Array.isArray(evidence.measurements)||evidence.measurements.length!==routes.length)return unknown();
 if(evidence.measurements.some(row=>!row||typeof row!=='object'||Array.isArray(row))||new Set(evidence.measurements.map(row=>row.route)).size!==routes.length||evidence.measurements.some(row=>!routes.includes(row.route)||row.n!==20||!['p50Ms','p95Ms','maxMs'].every(key=>Number.isFinite(row[key])&&row[key]>=0)||row.p50Ms>row.p95Ms||row.p95Ms>row.maxMs))return unknown();
 const codes=[];
 if(now-Date.parse(evidence.observedAt)>300000)codes.push('EVIDENCE_STALE');
 if(evidence.errors>0)codes.push('REQUEST_FAILURE');
 if(evidence.measurements.some(row=>row.p95Ms>policy.p95BudgetMs))codes.push('READ_P95_BUDGET');
 return {schema:'faro-performance-signals-v1',scope:'SYNTHETIC_DISPOSABLE_LOOPBACK_ONLY',backend:evidence.backend,state:codes.length?'ALERT':'OK',codes,delivery:'NOT_CONFIGURED',owner:'UNASSIGNED'};
}
/** Synthetic engineering threshold, never a production capacity/SLA or population measurement. */
export async function provePerformance(base,cookie,backend){
 const origin=new URL(base);
 if(origin.protocol!=='http:'||origin.hostname!=='127.0.0.1'||!['sqlite','postgresql'].includes(backend))throw new Error('Disposable loopback performance scope required.');
 const samples=new Map(routes.map(route=>[route,[]]));
 let errors=0,next=0;
 async function call(route,measured){
  const started=performance.now();
  try{const response=await fetch(new URL(route,origin),{headers:{cookie},redirect:'error',signal:AbortSignal.timeout(policy.deadlineMs)});assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');await response.arrayBuffer();}
  catch{errors++;}
  finally{if(measured)samples.get(route).push(performance.now()-started);}
 }
 for(let i=0;i<policy.warmup;i++)await call(routes[i%routes.length],false);
 const lag=monitorEventLoopDelay({resolution:10});lag.enable();const started=performance.now();
 try{await Promise.all(Array.from({length:policy.concurrency},async()=>{for(;;){const index=next++;if(index>=policy.requests)return;await call(routes[index%routes.length],true);}}));}
 finally{lag.disable();}
 const elapsed=performance.now()-started,percentile=(values,p)=>{const sorted=[...values].sort((a,b)=>a-b);return Number(sorted[Math.ceil(sorted.length*p)-1].toFixed(3));};
 const measurements=[...samples].map(([route,values])=>({route,n:values.length,p50Ms:percentile(values,0.5),p95Ms:percentile(values,0.95),maxMs:percentile(values,1)}));
 const passed=errors===0&&measurements.every(row=>row.n===20&&row.p95Ms<=policy.p95BudgetMs);
 const evidence={schema:'faro-performance-evidence-v1',scope:'SYNTHETIC_DISPOSABLE_LOOPBACK_ONLY',backend,observedAt:new Date().toISOString(),node:process.version,
  policy,errors,elapsedMs:Number(elapsed.toFixed(3)),requestsPerSecond:Number((policy.requests*1000/elapsed).toFixed(3)),eventLoopP95Ms:Number((lag.percentile(95)/1000000).toFixed(3)),measurements,result:passed?'PASS':'FAIL'};
 console.log(JSON.stringify(evidence));console.log(JSON.stringify(performanceSignals(evidence)));
 if(!passed)throw new Error('FARO_SYNTHETIC_PERFORMANCE_BUDGET_FAILED');
 return evidence;
}
async function standalone(){
 const dir=await mkdtemp(join(tmpdir(),'faro-perf-')),app=createFaroApp({nodeEnv:'test',dataDir:dir,databasePath:join(dir,'db.sqlite'),faroWorkerEnabled:false});
 await new Promise(done=>app.server.listen(0,'127.0.0.1',done));const base=`http://127.0.0.1:${app.server.address().port}`;
 try{
  const response=await fetch(base+'/api/auth/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'SyntheticPerformance',email:'synthetic-perf@example.pl',password:'SyntheticOnly123!',acceptTerms:true,acceptPrivacy:true})});assert.equal(response.status,201);await response.arrayBuffer();
  await provePerformance(base,response.headers.get('set-cookie').split(';')[0],'sqlite');
 }finally{const closing=app.close();app.server.closeAllConnections();await closing;await rm(dir,{recursive:true,force:true});}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await standalone();
