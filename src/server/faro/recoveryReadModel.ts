import type { RecoveryLedger } from './recoveryService.js';
/** Sensitive operational authority only. Never mount as a public export or diagnostic. */
export const recoveryLedgerQueries=[
 {key:'activities',text:'SELECT id,user_id FROM faro_activities'},
 {key:'uploads',text:'SELECT id,user_id,storage_key,size_bytes,sha256 FROM uploaded_files'},
 {key:'erasures',text:'SELECT subject_hash,erased_at,policy_version FROM faro_erasure_log'},
 {key:'owners',text:"SELECT organization_id,user_id FROM faro_members WHERE role='OWNER' AND active=1"},
 {key:'members',text:'SELECT organization_id,user_id,role FROM faro_members WHERE active=1'},
 {key:'assignments',text:'SELECT a.offer_id,a.user_id FROM faro_assignments a JOIN faro_offers o ON o.id=a.offer_id JOIN faro_members m ON m.organization_id=o.organization_id AND m.user_id=a.user_id AND m.active=1'},
 {key:'accounts',text:'SELECT id,role,password_hash,email,name FROM users'},
 {key:'mfa',text:'SELECT user_id,active_cipher,last_counter,activated_at FROM faro_mfa WHERE active_cipher IS NOT NULL'},
 {key:'mfaRecovery',text:'SELECT user_id,code_hash,used_at FROM faro_mfa_recovery'},
 {key:'mfaLimits',text:'SELECT user_id,failures,window_start FROM faro_mfa_limits'},
 {key:'organizations',text:'SELECT id,verification FROM faro_organizations'},
 {key:'restrictions',text:'SELECT id,organization_id,source_case_id,source_reporter_id,source_candidate_id,scope,state,reason_code,restoration_condition,created_at,review_at,revision,appeal,appealed_at,appeal_by,restoration_reason,restored_at,restored_by FROM faro_restrictions'}
] as const;
/** Immutable source identities only: current absence must erase stale private content. */
export function currentActivityAuthority(ledger:RecoveryLedger):Map<string,string>{
 if(!Array.isArray(ledger.activities))throw new Error('Missing current private activity authority.');
 const activities=new Map<string,string>();
 for(const item of ledger.activities){
  if(typeof item?.id!=='string'||!item.id||typeof item.user_id!=='string'||!item.user_id||activities.has(item.id))throw new Error('Invalid current private activity authority.');
  activities.set(item.id,item.user_id);
 }
 return activities;
}
export function recoveryLedgerFromRows(rows:Record<string,unknown>[][]):RecoveryLedger{if(rows.length!==recoveryLedgerQueries.length)throw new Error('Incomplete current authority snapshot.');return Object.fromEntries(recoveryLedgerQueries.map((query,index)=>[query.key,rows[index]??[]])) as unknown as RecoveryLedger;}
interface RecoveryReadDatabase {readBatch(queries:Array<{text:string;values:readonly unknown[]}>):Promise<Record<string,unknown>[][]>;transaction<T>(work:()=>T|Promise<T>,options?:{readOnly?:boolean}):Promise<T>;}
export async function readRecoveryLedger(database:RecoveryReadDatabase,authorizeOperator:()=>void|Promise<void>){return database.transaction(async()=>{await authorizeOperator();return recoveryLedgerFromRows(await database.readBatch(recoveryLedgerQueries.map(query=>({text:query.text,values:[]}))));},{readOnly:true});}
