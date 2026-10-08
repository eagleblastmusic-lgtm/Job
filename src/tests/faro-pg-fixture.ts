import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import type { AppConfig } from '../server/config.js';
import type { AddressInfo } from 'node:net';
import { PgJobDatabase } from '../server/postgresDb.js';
import { createConnectedPgFaroApp } from '../server/pgFaroApp.js';

/** PostgreSQL fixture boots the real HTTP adapter. SQLite is used only to prepare an empty reviewed schema. */
export async function faroPgFixture(overrides:Partial<AppConfig>={}){
 const connectionString=process.env.FARO_PG_REHEARSAL_URL;if(!connectionString)throw new Error('Real PostgreSQL test connection required.');
 const schema=`faro_rehearsal_${randomBytes(8).toString('hex')}`;
 await promisify(execFile)(process.execPath,['scripts/faro-postgres-browser-prepare.mjs',schema]);
 const database=new PgJobDatabase({connectionString});await database.connect();
 await database.query(`SET search_path TO "${schema}"`);
 const app=createConnectedPgFaroApp(database,{nodeEnv:'test',faroWorkerEnabled:false,faroMfaEncryptionKey:'55'.repeat(32),faroRateLimitKey:'61'.repeat(32),...overrides});
 await new Promise<void>(done=>app.server.listen(0,'127.0.0.1',done));
 const base=`http://127.0.0.1:${(app.server.address() as AddressInfo).port}`;app.config.appOrigin=base;
 async function request<T=Record<string,unknown>>(path:string,cookie='',method='GET',body?:unknown,status=200):Promise<T>{const response=await fetch(base+path,{method,headers:{cookie,'content-type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});const result=await response.json() as T;assert.equal(response.status,status,`${method} ${path}: controlled HTTP status`);return result;}
 async function user(name:string){const email=`${name.toLowerCase()}@example.pl`,response=await fetch(base+'/api/auth/register',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name,email,password:'Bezpieczne123',acceptTerms:true,acceptPrivacy:true})});assert.equal(response.status,201);const value=await response.json() as {user:{id:string}};return {id:value.user.id,email,cookie:response.headers.get('set-cookie')!.split(';')[0]!};}
 return {app,base,request,user,close:async()=>{const closing=app.close();app.server.closeAllConnections();await closing;try{await database.query(`DROP SCHEMA "${schema}" CASCADE`);}finally{await database.end();}}};
}
