import { randomUUID } from 'node:crypto';
import type { JobDatabase } from '../db.js';
import { deleteStoredFile } from '../files.js';
import { FaroStore } from './base.js';
/** Durable SQLite counterpart using the same private storage boundary. */
export class FileDisposalService extends FaroStore {
 constructor(database:JobDatabase,readonly dataDir:string){super(database);}
 async run(){
  const asOf=this.now(),claims=this.transaction(()=>{const rows=this.db.prepare('SELECT storage_key FROM faro_file_disposals WHERE next_attempt_at<=? AND (lease_until IS NULL OR lease_until<=?) ORDER BY next_attempt_at,storage_key LIMIT 100').all(asOf,asOf);return rows.map(row=>{const key=row.storage_key as string,token=randomUUID();this.db.prepare('UPDATE faro_file_disposals SET claim_token=?,lease_until=?,attempts=attempts+1 WHERE storage_key=?').run(token,new Date(Date.parse(asOf)+30000).toISOString(),key);return {key,token};});});
  for(const claim of claims){let success=false;try{await deleteStoredFile(this.dataDir,claim.key);success=true;}catch{/* Durable retry keeps only a neutral error code. */}this.transaction(()=>{const row=this.db.prepare('SELECT attempts FROM faro_file_disposals WHERE storage_key=? AND claim_token=?').get(claim.key,claim.token);if(!row)return;if(success)this.db.prepare('DELETE FROM faro_file_disposals WHERE storage_key=? AND claim_token=?').run(claim.key,claim.token);else this.db.prepare("UPDATE faro_file_disposals SET claim_token=NULL,lease_until=NULL,error_code='FILE_DISPOSAL_FAILED',next_attempt_at=? WHERE storage_key=? AND claim_token=?").run(new Date(Date.parse(asOf)+Math.min(3600000,1000*2**Math.min(Number(row.attempts),12))).toISOString(),claim.key,claim.token);});}
 }
}
