import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { importSnapshot,compare,identifier,clientFromEnvironment } from './faro-postgres-rehearsal.mjs';
import { createConnectedPgFaroApp } from '../dist/server/pgFaroApp.js';

/** Actual HTTP switch and rollback on isolated synthetic data; never redirects production traffic. */
export async function proveNativeCutover(snapshot,fixture,candidate,process){
 const schema=`faro_rehearsal_${randomBytes(8).toString('hex')}`,db=clientFromEnvironment();let created=false,app,front,target=fixture.base;
 try{
  await db.connect();await importSnapshot(db,snapshot,schema);created=true;await db.query(`SET search_path TO ${identifier(schema)}`);
  app=createConnectedPgFaroApp(db,{...fixture.app.config,faroWorkerEnabled:false,faroRateLimitKey:'61'.repeat(32)});await new Promise(done=>app.server.listen(0,'127.0.0.1',done));const native=`http://127.0.0.1:${app.server.address().port}`;
  front=createServer(async(req,res)=>{try{const response=await fetch(target+(req.url??'/'),{headers:{cookie:req.headers.cookie??''}});res.writeHead(response.status,{'content-type':'application/json'});res.end(Buffer.from(await response.arrayBuffer()));}catch{res.writeHead(503);res.end('{}');}});await new Promise(done=>front.listen(0,'127.0.0.1',done));const base=`http://127.0.0.1:${front.address().port}`;
  async function read(path){const response=await fetch(base+path,{headers:{cookie:candidate.cookie}});assert.equal(response.status,200,'cutover HTTP read');return response.json();}
  const paths=['/api/me','/api/faro/profile',`/api/faro/processes/${process.id}`],baseline=[];for(const path of paths)baseline.push(await read(path));
  await compare(db,snapshot,schema);target=native;
  for(let i=0;i<paths.length;i++)assert.deepEqual(await read(paths[i]),baseline[i]);
  const rollback=async()=>{await compare(db,snapshot,schema);target=fixture.base;};
  await rollback();for(let i=0;i<paths.length;i++)assert.deepEqual(await read(paths[i]),baseline[i]);
  target=native;const profile=await read('/api/faro/profile'),response=await fetch(native+'/api/faro/profile',{method:'PUT',headers:{cookie:candidate.cookie,'content-type':'application/json'},body:JSON.stringify({firstName:'Natalia',expectedVersion:profile.version,availability:{kind:'IMMEDIATE'}})});assert.equal(response.status,200);
  await assert.rejects(rollback,/row\/hash comparison failed/);assert.equal(target,native);assert.equal((await read('/api/faro/profile')).firstName,'Natalia');
  const original=await fixture.request('/api/faro/profile',candidate.cookie);assert.equal(original.firstName,profile.firstName);
  console.log('FARO_POSTGRES_CUTOVER_PASS read parity, read-only rollback, stale-source rollback refusal after native write; synthetic only.');
 }finally{
  if(front){const closing=new Promise(done=>front.close(done));front.closeAllConnections();await closing;}
  if(app){const closing=app.close();app.server.closeAllConnections();await closing;}
  if(created)await db.query(`DROP SCHEMA ${identifier(schema)} CASCADE`);await db.end();
 }
}
