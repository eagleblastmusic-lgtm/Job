import { createHash,randomUUID } from 'node:crypto';
import { deleteStoredFile,resolveStoredFilePath } from '../files.js';
import { integer } from './validation.js';
export function fileDisposalReadQuery(userId:string){return {text:'SELECT storage_key FROM uploaded_files WHERE user_id=$1',values:[userId]};}
export function fileDisposalPlan(userId:string,storageKey:string,dataDir:string,asOf:string){resolveStoredFilePath(dataDir,storageKey);const normalized=storageKey.replace(/\\/g,'/');if(normalized.split('/')[1]!==userId)throw new Error('Upload disposal owner mismatch.');return {text:'INSERT INTO faro_file_disposals(storage_key,subject_hash,requested_at,next_attempt_at) VALUES($1,$2,$3,$3) ON CONFLICT(storage_key) DO NOTHING',values:[storageKey,createHash('sha256').update(userId).digest('hex'),asOf]};}
interface DisposalDatabase {
 readBatch(queries:Array<{text:string;values:readonly unknown[]}>):Promise<Record<string,unknown>[][]>;
 query(text:string,values:readonly unknown[]):Promise<unknown>;
 transaction<T>(work:()=>T|Promise<T>):Promise<T>;
}
async function disposalTransaction<T>(database:DisposalDatabase,work:()=>Promise<T>):Promise<T>{for(let attempt=0;;attempt++){try{return await database.transaction(work);}catch(error){if(attempt>=2||!['40001','40P01'].includes((error as {code?:string}).code??''))throw error;}}}
/** Caller owns the account-erasure transaction. Queue survives account cascade. */
export async function enqueueFileDisposalsOwned(database:DisposalDatabase,userId:string,dataDir:string,asOf:string){for(const row of (await database.readBatch([fileDisposalReadQuery(userId)]))[0]??[]){const query=fileDisposalPlan(userId,row.storage_key as string,dataDir,asOf);await database.query(query.text,query.values);}}
/** Unlink is idempotent. Database leases fence acknowledgments across restart/parallel workers. */
export async function disposeFiles(database:DisposalDatabase,dataDir:string,asOf:string,authorize:()=>void|Promise<void>,limit=100){
 integer(limit,1,100);
 const claims=await disposalTransaction(database,async()=>{await authorize();const rows=(await database.readBatch([{text:'SELECT storage_key FROM faro_file_disposals WHERE next_attempt_at<=$1 AND (lease_until IS NULL OR lease_until<=$1) ORDER BY next_attempt_at,storage_key LIMIT $2 FOR UPDATE SKIP LOCKED',values:[asOf,limit]}]))[0]??[],claims=[];for(const row of rows){const token=randomUUID(),key=row.storage_key as string;await database.query('UPDATE faro_file_disposals SET claim_token=$1,lease_until=$2,attempts=attempts+1 WHERE storage_key=$3',[token,new Date(Date.parse(asOf)+30000).toISOString(),key]);claims.push({key,token});}return claims;});
 let disposed=0;
 for(const claim of claims){
  let success=false;try{await deleteStoredFile(dataDir,claim.key);success=true;}catch{/* Retain safe durable retry metadata; never log paths or filesystem details. */}
  await disposalTransaction(database,async()=>{await authorize();const row=(await database.readBatch([{text:'SELECT attempts FROM faro_file_disposals WHERE storage_key=$1 AND claim_token=$2',values:[claim.key,claim.token]}]))[0]?.[0];if(!row)return;if(success){await database.query('DELETE FROM faro_file_disposals WHERE storage_key=$1 AND claim_token=$2',[claim.key,claim.token]);disposed++;}else{await database.query("UPDATE faro_file_disposals SET claim_token=NULL,lease_until=NULL,error_code='FILE_DISPOSAL_FAILED',next_attempt_at=$1 WHERE storage_key=$2 AND claim_token=$3",[new Date(Date.parse(asOf)+Math.min(3600000,1000*2**Math.min(Number(row.attempts),12))).toISOString(),claim.key,claim.token]);}});
 }
 return {disposed,pending:claims.length-disposed};
}
