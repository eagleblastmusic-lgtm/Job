import assert from 'node:assert/strict';
import {execFile,spawn} from 'node:child_process';
import {promisify} from 'node:util';
import {randomBytes} from 'node:crypto';
import {mkdtemp,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:net';
import {Client} from 'pg';

const url=new URL(process.env.FARO_PG_REHEARSAL_URL??'');
if(process.env.FARO_PG_DISPOSABLE_BOOTSTRAP_TEST!=='1'||!['127.0.0.1','localhost'].includes(url.hostname))throw new Error('Disposable loopback staging test confirmation required.');
const admin=new Client({connectionString:url.href}),name='faro_free_staging_pg18',role='faro_free_staging_pg18_user',schema='faro_rehearsal_render_staging',run=promisify(execFile);
let roleCreated=false,databaseCreated=false,target,root,child,phase='CONNECT';
try {
 await admin.connect();
 assert.equal((await admin.query('SELECT 1 FROM pg_database WHERE datname=$1',[name])).rows.length,0);
 assert.equal((await admin.query('SELECT 1 FROM pg_roles WHERE rolname=$1',[role])).rows.length,0);
 const secret=randomBytes(32).toString('hex'),statement=(await admin.query("SELECT format('CREATE ROLE faro_free_staging_pg18_user LOGIN PASSWORD %L',$1::text) AS command",[secret])).rows[0].command;
 await admin.query(statement);roleCreated=true;await admin.query(`CREATE DATABASE ${name} OWNER ${role}`);databaseCreated=true;
 url.username=role;url.password=secret;url.pathname='/'+name;
 root=await mkdtemp(join(tmpdir(),'faro-staging-proof-'));await mkdir(join(root,'uploads'));
 const env={...process.env,NODE_ENV:'production',RENDER_SERVICE_ID:'srv-db3pb9rncjis73banf90',FARO_DATABASE_ENGINE:'postgresql',FARO_PG_URL:url.href,FARO_PG_SCHEMA:schema,FARO_STAGING_EMPTY_BOOTSTRAP:'confirmed',FARO_MFA_ENCRYPTION_KEY_BASE64:randomBytes(32).toString('base64'),FARO_RATE_LIMIT_KEY_BASE64:randomBytes(32).toString('base64'),DATA_DIR:root};delete env.FARO_MFA_ENCRYPTION_KEY;delete env.FARO_RATE_LIMIT_KEY;
 const args=['scripts/start-faro-free-postgres-staging.mjs','--prepare-only'];
 await assert.rejects(()=>run(process.execPath,args,{env:{...env,RENDER_SERVICE_ID:'other-service'},windowsHide:true}));
 target=new Client({connectionString:url.href});await target.connect();
 await target.query('CREATE TABLE public.private_sentinel(value TEXT)');await target.query("INSERT INTO public.private_sentinel VALUES ('synthetic preserved')");
 await assert.rejects(()=>run(process.execPath,args,{env,windowsHide:true}));
 assert.equal((await target.query('SELECT value FROM public.private_sentinel')).rows[0].value,'synthetic preserved');
 assert.equal((await target.query('SELECT 1 FROM pg_namespace WHERE nspname=$1',[schema])).rows.length,0);await target.query('DROP TABLE public.private_sentinel');
 phase='PREPARE';const prepared=await run(process.execPath,args,{env,windowsHide:true});assert.match(prepared.stdout,/EMPTY_SCHEMA_PREPARED/);
 assert.equal(Number((await target.query(`SELECT count(*) FROM ${schema}.schema_migrations`)).rows[0].count),37);
 assert.equal(Number((await target.query(`SELECT count(*) FROM ${schema}.users`)).rows[0].count),0);
 await target.query(`UPDATE ${schema}.schema_migrations SET applied_at='2000-01-01T00:00:00.000Z' WHERE version='0001_init'`);
 phase='RESTART';const again=await run(process.execPath,args,{env,windowsHide:true});assert.match(again.stdout,/EXISTING_SCHEMA_RETAINED/);
 assert.equal((await target.query(`SELECT applied_at FROM ${schema}.schema_migrations WHERE version='0001_init'`)).rows[0].applied_at,'2000-01-01T00:00:00.000Z');
 phase='HTTP';const socket=createServer();await new Promise(done=>socket.listen(0,'127.0.0.1',done));const port=socket.address().port;await new Promise(done=>socket.close(done));
 child=spawn(process.execPath,['scripts/start-faro-free-postgres-staging.mjs'],{env:{...env,PORT:String(port),APP_ORIGIN:`http://127.0.0.1:${port}`},windowsHide:true,stdio:['ignore','pipe','ignore']});
 await new Promise((done,reject)=>{const timer=setTimeout(()=>reject(new Error('Staging HTTP timeout')),15000);child.once('error',error=>{clearTimeout(timer);reject(error);});child.once('exit',()=>{clearTimeout(timer);reject(new Error('Staging HTTP exited'));});child.stdout.on('data',data=>{if(data.toString().includes('Job działa')){clearTimeout(timer);done();}});});
 phase='HEALTH';const health=await fetch(`http://127.0.0.1:${port}/api/health`);assert.equal(health.status,200);assert.equal((await health.json()).database,'ok');
 phase='GATE';const origin=`http://127.0.0.1:${port}`;
 const registration=await fetch(`${origin}/api/auth/register`,{method:'POST',headers:{'content-type':'application/json',origin},body:JSON.stringify({name:'StagingFixture',email:'staging-fixture@example.pl',password:'SyntheticStaging123',acceptTerms:true,acceptPrivacy:true})});assert.equal(registration.status,201);
 const cookie=registration.headers.get('set-cookie')?.split(';')[0];assert.ok(cookie);
 const gate=await fetch(`${origin}/api/faro/profile`,{headers:{cookie,origin}});assert.equal(gate.status,503);assert.equal((await gate.json()).error.code,'RELEASE_GATES_OPEN');
 console.log('FARO_FREE_POSTGRES_STAGING_PROOF_PASS scope/nonempty-target-refusal/37-migrations/empty-users/restart-preservation/actual-HTTP/closed-release; synthetic disposable loopback only.');
}catch {console.error('FARO_FREE_POSTGRES_STAGING_PROOF_FAILED phase='+phase+'; records and credentials withheld.');process.exitCode=1;}
finally {
 if(child&&child.exitCode===null){await new Promise(done=>{child.once('exit',done);child.kill('SIGTERM');});}
 if(target)await target.end();
 if(databaseCreated)await admin.query(`DROP DATABASE ${name} WITH (FORCE)`);
 if(roleCreated)await admin.query(`DROP ROLE ${role}`);
 await admin.end();if(root)await rm(root,{recursive:true,force:true});
}
