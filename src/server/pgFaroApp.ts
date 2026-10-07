import { enqueueFileDisposalsOwned,disposeFiles } from './faro/fileDisposalModel.js';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ClientConfig } from 'pg';
import { PgJobDatabase } from './postgresDb.js';
import { loadConfig,type AppConfig } from './config.js';
import { securityHeaders,clientIp,enforceRate,cookieForSession,clearSessionCookie,LEGAL_VERSION } from './app.js';
import { enforceExtendedOrigin } from './extendedAuth.js';
import { HttpError,sendJson,readJson,serveStatic,sendText } from './http.js';
import { hashSessionToken,parseCookies } from './auth.js';
import { profileFromRow,type ProfileRow } from './store.js';
import { readIdentity,requireIdentityOwned } from './faro/identityAccessModel.js';
import { registerAccount,loginAccount,logoutAccount,changeAnalyticsConsent,consentReadQuery,consentsFromRows } from './faro/authWriteModel.js';
import { ownExportQueries,ownExportFromRows } from './faro/privacyReadModel.js';
import { eraseAccount } from './faro/privacyErasureModel.js';
import { accountDataColumns } from './faro/accountDataColumns.js';
import { createPgFaroApi } from './faro/pgApi.js';
import { FaroWorker } from './faro/worker.js';
import { tickNativeWorker } from './faro/trustTickModel.js';

/** Explicit opt-in to a prepared PostgreSQL schema. This never creates or migrates production data. */
export async function createPgFaroApp(options:{connection:ClientConfig;schema:string;overrides?:Partial<AppConfig>}){
 if(!/^[a-z][a-z0-9_]{0,62}$/.test(options.schema))throw new Error('Nieprawidłowy schemat PostgreSQL.');
 const database=new PgJobDatabase(options.connection);
 await database.connect();
 try {await database.query(`SET search_path TO "${options.schema}"`);const rows=await database.readBatch([{text:'SELECT version FROM schema_migrations ORDER BY version',values:[]}]),expected=readdirSync(resolve(process.cwd(),'migrations')).filter(name=>/^\d+_[a-zA-Z0-9_-]+\.sql$/.test(name)).sort().map(name=>name.slice(0,-4));if(JSON.stringify(rows[0]?.map(row=>row.version))!==JSON.stringify(expected))throw new Error('Wymagany zgodny, przygotowany schemat PostgreSQL.');const app=createConnectedPgFaroApp(database,options.overrides);return {...app,close:async()=>{await app.close();await database.end();}};}
 catch(error){await database.end();throw error;}
}
/** Injected connection is already scoped to the validated schema; caller owns its lifecycle. */
export function createConnectedPgFaroApp(database:PgJobDatabase,overrides:Partial<AppConfig>={}){
 const config=loadConfig(overrides),rates=new Map<string,{count:number;resetAt:number}>();
 const worker=new FaroWorker(async()=>{await tickNativeWorker(database,new Date().toISOString(),()=>{});await disposeFiles(database,config.dataDir,new Date().toISOString(),()=>{});},config.faroWorkerEnabled,config.faroWorkerIntervalMs);
 const handleFaro=createPgFaroApi(database,config,worker),publicDir=resolve(process.cwd(),'dist/public');
 const server=createServer(async(req,res)=>{
  securityHeaders(res,config);res.setHeader('x-request-id',randomUUID());res.setHeader('cache-control','no-store');
  const ok=(data:unknown,status=200)=>sendJson(res,status,data);
  try{
   let path:string;try{path=new URL(req.url??'/',config.appOrigin).pathname;}catch{throw new HttpError(400,'Nieprawidłowy adres żądania.','INVALID_URL');}
   const method=req.method??'GET';
   if(!path.startsWith('/api/')){if(await serveStatic(res,publicDir,path))return;if(!path.includes('.')&&await serveStatic(res,publicDir,'/index.html'))return;sendText(res,404,'Nie znaleziono strony.');return;}
   enforceExtendedOrigin(req,config);
   const now=()=>new Date().toISOString(),tokenHash=hashSessionToken(parseCookies(req.headers.cookie).job_session??''),configured=Boolean(config.faroMfaEncryptionKey);
   if(path==='/api/health'&&method==='GET'){try{await database.query('SELECT 1');ok({ok:true,service:'job',version:'0.1.0',database:'ok',now:now()});}catch{ok({ok:false,service:'job',version:'0.1.0',database:'unavailable',now:now()},503);}return;}
   if(path==='/api/legal'&&method==='GET'){ok({legalVersion:LEGAL_VERSION,termsUrl:'/terms.html',privacyUrl:'/privacy.html'});return;}
   if(/^\/api\/auth\/(register|login)$/.test(path)&&method==='POST'){
    const registering=path.endsWith('/register');enforceRate(rates,`${registering?'register':'login'}:${clientIp(req,config)}`,registering?15:20,15*60000);
    const body=await readJson(req),result=registering?await registerAccount(database,body,config,LEGAL_VERSION,now()):await loginAccount(database,body,config.sessionDays,now());
    res.setHeader('set-cookie',cookieForSession(result.token.raw,config));const {user}=result;ok({user:{id:user.id,email:user.email,name:user.name,role:user.role}},registering?201:200);return;
   }
   if(path==='/api/auth/logout'&&method==='POST'){await logoutAccount(database,tokenHash);res.setHeader('set-cookie',clearSessionCookie(config));ok({ok:true});return;}
   if(path.startsWith('/api/faro/')){await handleFaro(req,res,path);return;}
   const allowed=['/api/me','/api/consents','/api/consents/analytics','/api/export','/api/account','/api/admin/diagnostics'];
   if(!allowed.includes(path))throw new HttpError(410,'Ta funkcja nie należy do aktualnego Faro.','RETIRED_FEATURE');
   const identity=await readIdentity(database,tokenHash,now(),config.faroRequirePrivilegedMfa,configured,path!=='/api/me'),user=identity.user;
   const authority=()=>requireIdentityOwned(database,tokenHash,now(),config.faroRequirePrivilegedMfa,configured);
   if(path==='/api/me'&&method==='GET'){
    const result=await database.transaction(async()=>{const current=await requireIdentityOwned(database,tokenHash,now(),config.faroRequirePrivilegedMfa,configured,false),u=current.user,safe={id:u.id,email:u.email,name:u.name,role:u.role,locale:u.locale,timezone:u.timezone};if(current.mfa.required&&!current.mfa.verified)return {user:safe,mfaRequired:true};const rows=await database.readBatch([{text:'SELECT user_id,desired_roles,location,commute_km,remote_preferences,salary_min,salary_mode,contract_preferences,shift_preferences,availability FROM career_profiles WHERE user_id=$1',values:[u.id]},{text:'SELECT plan,status,trial_ends_at,current_period_ends_at,provider,created_at,updated_at FROM subscriptions WHERE user_id=$1',values:[u.id]}]);return {user:safe,profile:profileFromRow(rows[0]?.[0] as unknown as ProfileRow|undefined),subscription:rows[1]?.[0]??null};},{readOnly:true});ok(result);return;
   }
   if(path==='/api/consents'&&method==='GET'){const consents=await database.transaction(async()=>{await authority();return consentsFromRows((await database.readBatch([consentReadQuery(user.id,true)]))[0]??[]);},{readOnly:true});ok({legalVersion:LEGAL_VERSION,consents});return;}
   if(path==='/api/consents/analytics'&&method==='PUT'){const body=await readJson(req);ok({consent:await changeAnalyticsConsent(database,tokenHash,body,LEGAL_VERSION,now(),config.faroRequirePrivilegedMfa,configured)});return;}
   if(path==='/api/export'&&method==='GET'){
    const result=await database.transaction(async()=>{const {user:u}=await authority(),asOf=now();await database.query("INSERT INTO audit_logs(id,user_id,action,entity_type,entity_id,metadata,created_at) VALUES($1,$2,'DATA_EXPORTED','user',$2,'{}',$3)",[randomUUID(),u.id,asOf]);const safe={id:u.id,email:u.email,name:u.name,locale:u.locale,timezone:u.timezone,role:u.role,createdAt:u.createdAt,updatedAt:u.updatedAt},queries=Object.entries(accountDataColumns).map(([table,columns])=>({text:table==='job_requirements'?`SELECT ${columns.map(c=>'r.'+c).join(',')} FROM job_requirements r JOIN jobs j ON j.id=r.job_id WHERE j.user_id=$1`:table==='outcomes'?`SELECT ${columns.map(c=>'o.'+c).join(',')} FROM outcomes o JOIN applications a ON a.id=o.application_id WHERE a.user_id=$1`:`SELECT ${columns.join(',')} FROM ${table} WHERE user_id=$1`,values:[u.id]})),rows=await database.readBatch(queries),faro=ownExportFromRows(await database.readBatch(ownExportQueries(u.id)),asOf);return {user:safe,...Object.fromEntries(Object.keys(accountDataColumns).map((table,index)=>[table,rows[index]??[]])),faro};});ok(result);return;
   }
   if(path==='/api/account'&&method==='DELETE'){
    enforceRate(rates,`account-delete:${user.id}`,5,15*60000);const body=await readJson(req);
    const erased=await eraseAccount(database,tokenHash,body,now(),config.faroRequirePrivilegedMfa,configured,id=>enqueueFileDisposalsOwned(database,id,config.dataDir,now()));
    // Durable queue exists before account removal; a failed unlink stays pending for restart.
    try{await disposeFiles(database,config.dataDir,now(),()=>{});}catch{/* Account erasure committed; durable disposal retries after worker restart. */}res.setHeader('set-cookie',clearSessionCookie(config));ok(erased);return;
   }
   if(path==='/api/admin/diagnostics'&&method==='GET'){
    const result=await database.transaction(async()=>{const current=await authority();if(current.user.role!=='ADMIN')throw new HttpError(403,'Wymagany administrator.','FORBIDDEN');const rows=await database.readBatch([{text:'SELECT COUNT(*) users FROM users',values:[]},{text:'SELECT COUNT(*) completed FROM analytics_events WHERE event_name=$1',values:['FARO_MUTUAL_STAGE_COMPLETED']}]);return {users:rows[0]?.[0]?.users,databaseEngine:'postgresql',worker:worker.status(),completedPairs:rows[1]?.[0]?.completed,generatedAt:now()};},{readOnly:true});ok(result);return;
   }
   throw new HttpError(404,'Nie znaleziono endpointu.','NOT_FOUND');
  }catch(error){const failure=error instanceof HttpError?error:new HttpError(500,'Nie udało się obsłużyć żądania.');if(!res.headersSent)sendJson(res,failure.status,{error:{code:failure.code,message:failure.message}});else res.end();}
 });
 worker.start();
 return {server,db:database,config,worker,close:async()=>{worker.stop();await worker.idle();if(server.listening)await new Promise<void>((done,reject)=>server.close(error=>error?reject(error):done()));}};
}
