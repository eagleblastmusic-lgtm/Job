import {execFile,spawn} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,writeFile,rm,realpath} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname} from 'node:path';
import {randomBytes} from 'node:crypto';
import {createServer} from 'node:net';
import {Client} from 'pg';

// Disposable loopback PostgreSQL18 only; never reads any operator/Render database URL.
const bin=process.env.FARO_LOCAL_PG_BIN;
if(!bin)throw new Error('FARO_LOCAL_PG_BIN required. Build the app first.');
const executable=name=>join(resolve(bin),name+(process.platform==='win32'?'.exe':''));
const run=promisify(execFile);
function control(args){return new Promise((done,reject)=>{const child=spawn(executable('pg_ctl'),args,{windowsHide:true,stdio:'ignore'});child.once('error',reject);child.once('exit',code=>code===0?done():reject(Object.assign(new Error('Local cluster control failed.'),{code})));});}
const version=await run(executable('postgres'),['--version'],{windowsHide:true});
if(!/PostgreSQL\) 18\./.test(version.stdout))throw new Error('PostgreSQL18 required.');
const root=await mkdtemp(join(tmpdir(),'faro-local-pg18-')),cluster=join(root,'cluster'),passwordFile=join(root,'init-password');
const secret=randomBytes(32).toString('hex');
let started=false,stopped=true,phase='INIT';
try{
 await writeFile(passwordFile,secret+'\n',{flag:'wx',mode:0o600});
 phase='INITDB';await run(executable('initdb'),['-D',cluster,'-U','faro_local','--encoding=UTF8','--locale=C','--auth=scram-sha-256','--pwfile='+passwordFile],{windowsHide:true});
 await rm(passwordFile);
 const socket=createServer();await new Promise((done,reject)=>{socket.once('error',reject);socket.listen(0,'127.0.0.1',done);});
 const port=socket.address().port;await new Promise(done=>socket.close(done));
 // Binding only loopback and refusing other hosts avoids any production/network target.
 phase='START';started=true;stopped=false;await control(['-D',cluster,'-l',join(root,'postgres.log'),'-o',`-h 127.0.0.1 -p ${port}`,'-w','start']);
 const connection={host:'127.0.0.1',port,user:'faro_local',password:secret,database:'postgres',ssl:false,connectionTimeoutMillis:5000};
 phase='DATABASE';const client=new Client(connection);await client.connect();
 try{const row=(await client.query('SELECT current_setting(\'server_version_num\')::int AS version')).rows[0];if(row.version<180000||row.version>=190000)throw new Error('PostgreSQL18 required.');await client.query('CREATE DATABASE faro_local_test');}finally{await client.end();}
 const env={...process.env,FARO_PG_REHEARSAL_URL:`postgresql://faro_local:${secret}@127.0.0.1:${port}/faro_local_test`,FARO_PG_BROWSER:'1',PGSSLMODE:'disable'};
 console.log('FARO_LOCAL_POSTGRES18_READY loopback=true authentication=scram-sha-256');
 if(!process.argv.includes('--staging-start-only')) {phase='REHEARSAL';const exercise=await run(process.execPath,['scripts/faro-postgres-exercise.mjs'],{env,windowsHide:true,maxBuffer:4*1024*1024});process.stdout.write(exercise.stdout);}
 phase='STAGING_START';let staging;try{staging=await run(process.execPath,['scripts/verify-free-postgres-staging.mjs'],{env:{...env,FARO_PG_DISPOSABLE_BOOTSTRAP_TEST:'1'},windowsHide:true,maxBuffer:65536});}catch(error){console.error(error.stderr?.match(/FARO_FREE_POSTGRES_STAGING_PROOF_FAILED phase=[A-Z]+; records and credentials withheld\./)?.[0]??'Staging proof refused; records withheld.');throw error;}process.stdout.write(staging.stdout);
 if(!process.argv.includes('--staging-start-only')) {phase='BROWSER';const browser=await run(process.execPath,['node_modules/@playwright/test/cli.js','test','e2e/faro.spec.ts','e2e/faro-employment.spec.ts','e2e/faro-session.spec.ts','e2e/faro-mfa.spec.ts','e2e/faro-open-answer.spec.ts','e2e/faro-incidents.spec.ts','e2e/faro-restrictions.spec.ts','e2e/browser.spec.ts'],{env,windowsHide:true,maxBuffer:4*1024*1024});process.stdout.write(browser.stdout);}
 console.log(process.argv.includes('--staging-start-only')?'FARO_LOCAL_POSTGRES18_STAGING_START_PASS':'FARO_LOCAL_POSTGRES18_ACCEPTANCE_PASS');
}catch(error){console.error(`FARO_LOCAL_POSTGRES18_FAILURE phase=${phase} code=${typeof error.code==='number'?error.code:'LOCAL'}; no credentials or response records logged.`);if(phase==='REHEARSAL')console.error(error.stderr?.match(/FARO_POSTGRES_[A-Z_]+_FAILED [A-Z0-9]+[^\n]*/)?.[0]??'Native proof refused; records withheld.');process.exitCode=1;}
finally{
 await rm(passwordFile,{force:true});
 if(started){try{await control(['-D',cluster,'-m','fast','-w','stop']);stopped=true;console.log('FARO_LOCAL_POSTGRES18_STOPPED');}catch{console.error('FARO_LOCAL_POSTGRES18_STOP_FAILED; cluster retained.');process.exitCode=1;}}
 if(stopped){const actual=await realpath(root),parent=await realpath(tmpdir());if(dirname(actual).toLowerCase()!==parent.toLowerCase()||!actual.split(/[\\/]/).pop().startsWith('faro-local-pg18-'))throw new Error('Cleanup confinement refused.');await rm(actual,{recursive:true,force:true,maxRetries:5,retryDelay:200});console.log('FARO_LOCAL_POSTGRES18_CLEANUP_PASS');}
}
