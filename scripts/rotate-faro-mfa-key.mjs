import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { PgJobDatabase } from '../dist/server/postgresDb.js';
import { JobDatabase } from '../dist/server/db.js';
import { FaroStore } from '../dist/server/faro/base.js';
import { mfaRotationPlan,mfaRotationReadQuery,rotateMfaKey } from '../dist/server/faro/mfaRotationModel.js';
const arg=name=>{const index=process.argv.indexOf(name);return index>=0?process.argv[index+1]:undefined;};
let pg,sqlite;
try{
 if(!process.argv.includes('--offline-confirmed'))throw new Error('Stop all HTTP/worker instances and confirm offline maintenance with --offline-confirmed.');
 const current=process.env.FARO_MFA_ENCRYPTION_KEY,next=process.env.FARO_MFA_NEXT_ENCRYPTION_KEY;
 if(!current||!next)throw new Error('Protected current and next environment keys required.');
 let result;const engine=arg('--engine'),asOf=new Date().toISOString();
 if(engine==='postgresql'){
  const url=process.env.FARO_PG_URL,schema=process.env.FARO_PG_SCHEMA;if(!url||!schema||!/^[a-z][a-z0-9_]{0,62}$/.test(schema))throw new Error('Valid protected PostgreSQL configuration required.');
  pg=new PgJobDatabase({connectionString:url});await pg.connect();await pg.query(`SET search_path TO "${schema}"`);result=await rotateMfaKey(pg,current,next,asOf,()=>{});
 }else if(engine==='sqlite'){
  const path=resolve(arg('--database')??process.env.DATABASE_PATH??'');if(!arg('--database')&&!process.env.DATABASE_PATH)throw new Error('Existing database required.');if(!(await stat(path)).isFile())throw new Error('Existing database file required.');sqlite=new JobDatabase(path);result=new FaroStore(sqlite).transaction(()=>{const plan=mfaRotationPlan(sqlite.db.prepare(mfaRotationReadQuery.text).all(),current,next,asOf);for(const query of plan.queries)sqlite.db.prepare(query.text).run(Object.fromEntries(query.values.map((value,index)=>[`$${index+1}`,value])));return plan.ack;});
 }else throw new Error('Explicit supported --engine required.');
 console.log(JSON.stringify({operation:'MFA_KEY_ROTATION',...result,activation:'SWITCH_PROTECTED_RUNTIME_KEY_BEFORE_RESTART',historicalBackups:'RETAIN_PROTECTED_OLD_KEY_FOR_THEIR_LIFETIME'}));
}catch(error){console.error(`MFA_KEY_ROTATION_FAILED ${typeof error?.code==='string'&&/^[A-Z0-9_]{1,50}$/.test(error.code)?error.code:'VALIDATION'}; operation not confirmed; no keys or ciphertext logged.`);process.exitCode=1;}
finally{sqlite?.close();if(pg)await pg.end();}
