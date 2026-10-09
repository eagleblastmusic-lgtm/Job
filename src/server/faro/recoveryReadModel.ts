import type { RecoveryLedger } from './recoveryService.js';
import { profilePractice } from './profileWriteModel.js';
/** Sensitive operational authority only. Never mount as a public export or diagnostic. */
export const recoveryLedgerQueries=[
 {key:'claims',text:'SELECT id,user_id,revoked_at FROM faro_claims'},
 {key:'learning',text:'SELECT user_id,skill_id,mode,practice FROM faro_learning'},
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
export function currentSkillAuthority(ledger:RecoveryLedger){
 if(!Array.isArray(ledger.claims)||!Array.isArray(ledger.learning))throw new Error('Missing current skill withdrawal authority.');
 const claims=new Map<string,RecoveryLedger['claims'][number]>(),learning=new Map<string,RecoveryLedger['learning'][number]>();
 for(const row of ledger.claims){if(typeof row?.id!=='string'||!row.id||typeof row.user_id!=='string'||!row.user_id||claims.has(row.id)||(row.revoked_at!==null&&(typeof row.revoked_at!=='string'||!Number.isFinite(Date.parse(row.revoked_at)))))throw new Error('Invalid current skill withdrawal authority.');claims.set(row.id,row);}
 for(const row of ledger.learning){if(typeof row?.user_id!=='string'||!row.user_id||typeof row.skill_id!=='string'||!row.skill_id||!['SELF_DEVELOPING','WANTS_TO_LEARN'].includes(row.mode)||typeof row.practice!=='string')throw new Error('Invalid current learning authority.');profilePractice(JSON.parse(row.practice),true);const key=JSON.stringify([row.user_id,row.skill_id,row.mode]);if(learning.has(key))throw new Error('Invalid current learning authority.');learning.set(key,row);}
 return {claims,learning};
}
interface RecoveryReadDatabase {readBatch(queries:Array<{text:string;values:readonly unknown[]}>):Promise<Record<string,unknown>[][]>;transaction<T>(work:()=>T|Promise<T>,options?:{readOnly?:boolean}):Promise<T>;}
export async function readRecoveryLedger(database:RecoveryReadDatabase,authorizeOperator:()=>void|Promise<void>){return database.transaction(async()=>{await authorizeOperator();return recoveryLedgerFromRows(await database.readBatch(recoveryLedgerQueries.map(query=>({text:query.text,values:[]}))));},{readOnly:true});}
