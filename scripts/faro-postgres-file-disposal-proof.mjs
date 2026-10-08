import { clientFromEnvironment,identifier } from './faro-postgres-rehearsal.mjs';
import assert from 'node:assert/strict';
import { mkdir,writeFile,rm,stat } from 'node:fs/promises';
import { join } from 'node:path';
import { fileDisposalPlan,disposeFiles,fileDisposalStatusQuery } from '../dist/server/faro/fileDisposalModel.js';
export async function proveNativeFileDisposal(db,dataDir,schema){
 const asOf=new Date().toISOString(),user='pg-disposal-synthetic',key=`uploads/${user}/private.txt`,path=join(dataDir,key),query=fileDisposalPlan(user,key,dataDir,asOf);
 const enqueue=()=>db.query(query.text,query.values);
 await mkdir(join(dataDir,'uploads',user),{recursive:true});await writeFile(path,'synthetic private file');
 try{
  await enqueue();await db.query('UPDATE faro_file_disposals SET claim_token=$1,lease_until=$2 WHERE storage_key=$3',['abandoned',new Date(Date.parse(asOf)-1000).toISOString(),key]);
  assert.deepEqual(await disposeFiles(db,dataDir,asOf,()=>{}),{disposed:1,pending:0});await assert.rejects(()=>stat(path),error=>error.code==='ENOENT');
  await mkdir(path);await enqueue();assert.deepEqual(await disposeFiles(db,dataDir,asOf,()=>{}),{disposed:0,pending:1});
  const pending=(await db.readBatch([{text:'SELECT attempts,error_code,claim_token FROM faro_file_disposals WHERE storage_key=$1',values:[key]}]))[0][0];assert.deepEqual(pending,{attempts:1,error_code:'FILE_DISPOSAL_FAILED',claim_token:null});
  const status=(await db.readBatch([fileDisposalStatusQuery(asOf)]))[0][0];assert.deepEqual(status,{pending:1,ready:0,retrying:1,leased:0,failed:1,oldestRequestedAt:asOf});assert.equal(JSON.stringify(status).includes(key),false);
  await rm(path,{recursive:true});assert.deepEqual(await disposeFiles(db,dataDir,new Date(Date.parse(asOf)+10000).toISOString(),()=>{}),{disposed:1,pending:0});
  await enqueue();await assert.rejects(()=>disposeFiles(db,dataDir,asOf,()=>{throw new Error('WORKER_AUTHORITY_REFUSED');}),/WORKER_AUTHORITY_REFUSED/);assert.equal((await db.readBatch([{text:'SELECT attempts FROM faro_file_disposals WHERE storage_key=$1',values:[key]}]))[0][0].attempts,0);await disposeFiles(db,dataDir,asOf,()=>{});
  const peer=clientFromEnvironment();await peer.connect();try{await peer.query(`SET search_path TO ${identifier(schema)}`);await enqueue();const results=await Promise.all([disposeFiles(db,dataDir,asOf,()=>{}),disposeFiles(peer,dataDir,asOf,()=>{})]);assert.equal(results.reduce((n,row)=>n+row.disposed,0),1);}finally{await peer.end();}
 }finally{await rm(join(dataDir,'uploads',user),{recursive:true,force:true});}
}
