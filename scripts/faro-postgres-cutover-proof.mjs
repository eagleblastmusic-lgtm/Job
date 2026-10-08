import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { importSnapshot,compare,identifier,clientFromEnvironment } from './faro-postgres-rehearsal.mjs';
import { createConnectedPgFaroApp } from '../dist/server/pgFaroApp.js';

/** Actual HTTP switch and rollback on isolated synthetic data; never redirects production traffic. */
export async function proveNativeCutover(snapshot,fixture,candidate,process){
 const schema=`faro_rehearsal_${randomBytes(8).toString('hex')}`,db=clientFromEnvironment();let created=false,app,reopened,front,target=fixture.base;
 try{
  await db.connect();await importSnapshot(db,snapshot,schema);created=true;await db.query(`SET search_path TO ${identifier(schema)}`);
  app=createConnectedPgFaroApp(db,{...fixture.app.config,faroWorkerEnabled:false,faroRateLimitKey:'61'.repeat(32)});await new Promise(done=>app.server.listen(0,'127.0.0.1',done));const native=`http://127.0.0.1:${app.server.address().port}`;
  front=createServer(async(req,res)=>{try{
   const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>65536){res.writeHead(413);res.end('{}');return;}chunks.push(chunk);}
   const response=await fetch(target+(req.url??'/'),{method:req.method,redirect:'error',signal:AbortSignal.timeout(10000),headers:{cookie:req.headers.cookie??'',...(req.headers.origin?{origin:req.headers.origin}:{}),...(req.headers['sec-fetch-site']?{'sec-fetch-site':req.headers['sec-fetch-site']}:{}) ,...(req.headers['content-type']?{'content-type':req.headers['content-type']}:{})},...(size?{body:Buffer.concat(chunks)}:{})});
   res.writeHead(response.status,{'content-type':response.headers.get('content-type')??'application/json','cache-control':response.headers.get('cache-control')??'no-store',...(response.headers.get('set-cookie')?{'set-cookie':response.headers.get('set-cookie')}:{})});res.end(Buffer.from(await response.arrayBuffer()));
  }catch{res.writeHead(503);res.end('{}');}});await new Promise(done=>front.listen(0,'127.0.0.1',done));const base=`http://127.0.0.1:${front.address().port}`;
  app.config.appOrigin=base;
  async function read(path){const response=await fetch(base+path,{headers:{cookie:candidate.cookie}});assert.equal(response.status,200,'cutover HTTP read');return response.json();}
  const paths=['/api/me','/api/faro/profile',`/api/faro/processes/${process.id}`],baseline=[];for(const path of paths)baseline.push(await read(path));
  await compare(db,snapshot,schema);target=native;
  for(let i=0;i<paths.length;i++)assert.deepEqual(await read(paths[i]),baseline[i]);
  const rollback=async()=>{await compare(db,snapshot,schema);target=fixture.base;};
  await rollback();for(let i=0;i<paths.length;i++)assert.deepEqual(await read(paths[i]),baseline[i]);
  target=native;const profile=await read('/api/faro/profile');
  const write=(origin=base,site='same-origin')=>fetch(base+'/api/faro/profile',{method:'PUT',headers:{cookie:candidate.cookie,origin,'sec-fetch-site':site,'content-type':'application/json'},body:JSON.stringify({firstName:'Natalia',expectedVersion:profile.version,availability:{kind:'IMMEDIATE'}})});
  assert.equal((await write('https://foreign.invalid')).status,403,'cutover listener preserves origin rejection');
  assert.equal((await write(base,'cross-site')).status,403,'cutover listener preserves browser cross-site rejection');
  assert.equal((await write()).status,200,'native write through cutover listener');
  await assert.rejects(rollback,/row\/hash comparison failed/);assert.equal(target,native);assert.equal((await read('/api/faro/profile')).firstName,'Natalia');
  const original=await fixture.request('/api/faro/profile',candidate.cookie);assert.equal(original.firstName,profile.firstName);
  const beforeRestart=[];for(const path of paths)beforeRestart.push(await read(path));
  const closing=app.close();app.server.closeAllConnections();await closing;app=undefined;
  reopened=clientFromEnvironment();await reopened.connect();await reopened.query(`SET search_path TO ${identifier(schema)}`);
  app=createConnectedPgFaroApp(reopened,{...fixture.app.config,appOrigin:base,faroWorkerEnabled:false,faroRateLimitKey:'61'.repeat(32)});
  await new Promise(done=>app.server.listen(0,'127.0.0.1',done));target=`http://127.0.0.1:${app.server.address().port}`;
  for(let i=0;i<paths.length;i++)assert.deepEqual(await read(paths[i]),beforeRestart[i],'native session/data survive listener restart and fresh database connection');
  await assert.rejects(rollback,/row\/hash comparison failed/);assert.equal((await read('/api/faro/profile')).firstName,'Natalia');
  console.log('FARO_POSTGRES_CUTOVER_PASS read/write listener, origin protection, read-only rollback, stale-source refusal, session/data after native restart; synthetic only.');
 }finally{
  if(front){const closing=new Promise(done=>front.close(done));front.closeAllConnections();await closing;}
  if(app){const closing=app.close();app.server.closeAllConnections();await closing;}
  if(reopened)await reopened.end();
  if(created)await db.query(`DROP SCHEMA ${identifier(schema)} CASCADE`);await db.end();
 }
}
