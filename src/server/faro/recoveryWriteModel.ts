import { createHash,randomUUID } from 'node:crypto';
import type { RecoveryLedger } from './recoveryService.js';
import { eraseDerivativesOwned } from './privacyErasureModel.js';
import { currentActivityAuthority } from './recoveryReadModel.js';
interface RecoveryDatabase {readBatch(queries:Array<{text:string;values:readonly unknown[]}>):Promise<Record<string,unknown>[][]>;query(text:string,values:readonly unknown[]):Promise<unknown>;transaction<T>(work:()=>T|Promise<T>):Promise<T>;}
/** Offline reconciliation is confined to a new recovery/rehearsal schema, never the live runtime. */
export async function reconcileRecovery(database:RecoveryDatabase,ledger:RecoveryLedger,asOf:string,authorizeOperator:()=>void|Promise<void>,privateFilesVerified=false){
 return database.transaction(async()=>{
  await authorizeOperator();
  const read=async(text:string,values:readonly unknown[]=[])=>((await database.readBatch([{text,values}]))[0]??[]);
  const get=async(text:string,values:readonly unknown[]=[])=>((await read(text,values))[0]);
  const write=(text:string,values:readonly unknown[]=[])=>database.query(text,values);
  const schema=(await get('SELECT current_schema() schema'))?.schema;
  if(typeof schema!=='string'||!/^faro_(recovery|rehearsal)_[a-z0-9_]{1,40}$/.test(schema))throw new Error('Isolated offline recovery schema required.');
  const uploaded=await read('SELECT id,user_id,storage_key,size_bytes,sha256 FROM uploaded_files');
  if(uploaded.length){
   if(!privateFilesVerified)throw new Error('Retained upload recovery requires a reviewed physical-file procedure.');
   if(!Array.isArray(ledger.uploads))throw new Error('Missing current private file authority.');
   if(ledger.uploads.some(file=>typeof file.id!=='string'||typeof file.user_id!=='string'||typeof file.storage_key!=='string'||file.storage_key.split('/')[1]!==file.user_id||!/^[a-f0-9]{64}$/.test(file.sha256)||!Number.isSafeInteger(file.size_bytes)||file.size_bytes<0))throw new Error('Invalid current private file authority.');
   const currentFiles=new Map(ledger.uploads.map(file=>[file.id,file]));
   if(currentFiles.size!==ledger.uploads.length)throw new Error('Ambiguous current private file authority.');
   for(const file of uploaded){const current=currentFiles.get(file.id as string);if(!current||current.user_id!==file.user_id||current.storage_key!==file.storage_key||current.size_bytes!==file.size_bytes||current.sha256!==file.sha256)await write('DELETE FROM uploaded_files WHERE id=$1',[file.id]);}
  }
  if(!Number.isFinite(Date.parse(asOf)))throw new Error('Invalid recovery time.');
  const hashes=new Set<string>(),erasedAt=new Map<string,string>();
  for(const item of ledger.erasures){if(!/^[a-f0-9]{64}$/.test(item.subject_hash)||item.policy_version!=='local-erasure-v1'||!Number.isFinite(Date.parse(item.erased_at))||hashes.has(item.subject_hash))throw new Error('Invalid current erasure ledger.');hashes.add(item.subject_hash);erasedAt.set(item.subject_hash,item.erased_at);}
  const users=await read('SELECT id FROM users'),erased=users.filter(u=>hashes.has(createHash('sha256').update(u.id as string).digest('hex'))),erasedIds=new Set(erased.map(u=>u.id as string)),accounts=new Map(ledger.accounts.map(a=>[a.id,a]));
  if(accounts.size!==ledger.accounts.length)throw new Error('Ambiguous current account ledger.');
  for(const user of users)if(!erasedIds.has(user.id as string)&&!accounts.has(user.id as string))throw new Error('Current ledger does not resolve a restored account.');
  if((!ledger.mfa||!ledger.mfaRecovery||!ledger.mfaLimits)&&(await read('SELECT 1 FROM faro_mfa WHERE active_cipher IS NOT NULL LIMIT 1')).length)throw new Error('Missing current MFA authority.');
  if(!Array.isArray(ledger.restrictions))throw new Error('Missing current restriction authority.');
  const activities=currentActivityAuthority(ledger);
  for(const old of await read('SELECT id,user_id FROM faro_activities')){
   if(activities.has(old.id as string)&&activities.get(old.id as string)!==old.user_id)throw new Error('Private activity authority ownership mismatch.');
   if(!activities.has(old.id as string))await write('DELETE FROM faro_activities WHERE id=$1',[old.id]);
  }
  const owners=new Map<string,string>();for(const item of ledger.owners){if(owners.has(item.organization_id)&&owners.get(item.organization_id)!==item.user_id)throw new Error('Ambiguous current ownership ledger.');owners.set(item.organization_id,item.user_id);}
  const members=new Map(ledger.members.map(m=>[JSON.stringify([m.organization_id,m.user_id]),m])),assignments=new Set(ledger.assignments.map(a=>JSON.stringify([a.offer_id,a.user_id]))),closedIds=new Set<string>();
  let restoredOwnerships=0,closedOrganizations=0;
  const audit=(action:string,id:string)=>write("INSERT INTO audit_logs(id,user_id,action,entity_type,entity_id,metadata,created_at) VALUES($1,NULL,$2,'faro',$3,'{}',$4)",[randomUUID(),action,id,asOf]);
  for(const user of erased){const id=user.id as string;
   for(const org of await read("SELECT organization_id FROM faro_members WHERE user_id=$1 AND role='OWNER' AND active=1",[id])){const orgId=org.organization_id as string,successor=owners.get(orgId);if(successor&&!erasedIds.has(successor)&&await get('SELECT user_id FROM faro_members WHERE organization_id=$1 AND user_id=$2 AND active=1',[orgId,successor])){await write("UPDATE faro_members SET role='ADMIN' WHERE organization_id=$1 AND user_id=$2",[orgId,id]);await write("UPDATE faro_members SET role='OWNER' WHERE organization_id=$1 AND user_id=$2",[orgId,successor]);restoredOwnerships++;}else{closedOrganizations++;closedIds.add(orgId);}}
   const hash=createHash('sha256').update(id).digest('hex');await eraseDerivativesOwned(database,id,erasedAt.get(hash)!,true);await write('DELETE FROM users WHERE id=$1',[id]);await audit('RECOVERY_ERASURE_REPLAY',hash);
  }
  for(const item of ledger.erasures)await write('INSERT INTO faro_erasure_log(subject_hash,erased_at,policy_version) VALUES($1,$2,$3) ON CONFLICT(subject_hash) DO UPDATE SET erased_at=GREATEST(faro_erasure_log.erased_at,excluded.erased_at),policy_version=excluded.policy_version',[item.subject_hash,item.erased_at,item.policy_version]);
  for(const user of users)if(!erasedIds.has(user.id as string)){const current=accounts.get(user.id as string)!;await write('UPDATE users SET role=$1,password_hash=$2,email=$3,name=$4 WHERE id=$5',[current.role,current.password_hash,current.email,current.name,user.id]);}
  for(const old of await read('SELECT organization_id,user_id FROM faro_members')){const current=members.get(JSON.stringify([old.organization_id,old.user_id]));if(current)await write('UPDATE faro_members SET role=$1,active=1 WHERE organization_id=$2 AND user_id=$3',[current.role,old.organization_id,old.user_id]);else await write('UPDATE faro_members SET active=0 WHERE organization_id=$1 AND user_id=$2',[old.organization_id,old.user_id]);}
  for(const old of await read('SELECT offer_id,user_id FROM faro_assignments'))if(!assignments.has(JSON.stringify([old.offer_id,old.user_id])))await write('DELETE FROM faro_assignments WHERE offer_id=$1 AND user_id=$2',[old.offer_id,old.user_id]);
  const invalidatedSessions=Number((await get('SELECT COUNT(*) n FROM sessions'))?.n??0);await write('DELETE FROM faro_request_limits');await write('DELETE FROM sessions');await write('DELETE FROM faro_mfa');await write('DELETE FROM faro_mfa_limits');
  const survivingIds=new Set((await read('SELECT id FROM users')).map(u=>u.id));
  for(const m of ledger.mfa??[])if(survivingIds.has(m.user_id))await write('INSERT INTO faro_mfa(user_id,active_cipher,last_counter,activated_at) VALUES($1,$2,$3,$4)',[m.user_id,m.active_cipher,m.last_counter,m.activated_at]);
  const mfaIds=new Set((await read('SELECT user_id FROM faro_mfa')).map(row=>row.user_id));
  for(const r of ledger.mfaRecovery??[])if(mfaIds.has(r.user_id))await write('INSERT INTO faro_mfa_recovery(user_id,code_hash,used_at) VALUES($1,$2,$3)',[r.user_id,r.code_hash,r.used_at]);
  for(const l of ledger.mfaLimits??[])if(survivingIds.has(l.user_id))await write('INSERT INTO faro_mfa_limits(user_id,failures,window_start) VALUES($1,$2,$3)',[l.user_id,l.failures,l.window_start]);
  await write('UPDATE faro_outbox SET claim_token=NULL,lease_until=NULL WHERE claim_token IS NOT NULL');await write('UPDATE faro_file_disposals SET claim_token=NULL,lease_until=NULL WHERE claim_token IS NOT NULL');await write('DELETE FROM faro_invites');await write("DELETE FROM analytics_events WHERE event_name='FARO_MUTUAL_STAGE_COMPLETED'");
  const revokedPhoneGrants=Number((await get('SELECT COUNT(*) n FROM faro_contact_grants WHERE revoked_at IS NULL'))?.n??0);await write('UPDATE faro_contact_grants SET revoked_at=$1 WHERE revoked_at IS NULL',[asOf]);
  for(const user of users)if(!erasedIds.has(user.id as string)&&(await get("SELECT granted FROM consents WHERE user_id=$1 AND consent_type='ANALYTICS' ORDER BY created_at DESC,__faro_source_rowid DESC LIMIT 1",[user.id]))?.granted===1)await write("INSERT INTO consents(id,user_id,consent_type,granted,version,created_at) VALUES($1,$2,'ANALYTICS',0,'recovery-default-off-v1',$3)",[randomUUID(),user.id,asOf]);
  const orgStates=new Map(ledger.organizations.map(o=>[o.id,o.verification])),orgIds=new Set((await read('SELECT id FROM faro_organizations')).map(o=>o.id)),caseIds=new Set((await read('SELECT id FROM faro_cases')).map(c=>c.id)),actor=(id:string|null)=>id&&survivingIds.has(id)?id:null;
  await write('DELETE FROM faro_restrictions');
  for(const r of ledger.restrictions)if(orgIds.has(r.organization_id))await write('INSERT INTO faro_restrictions(id,organization_id,source_case_id,source_reporter_id,source_candidate_id,scope,state,reason_code,restoration_condition,created_at,review_at,revision,appeal,appealed_at,appeal_by,restoration_reason,restored_at,restored_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)',[r.id,r.organization_id,r.source_case_id&&caseIds.has(r.source_case_id)?r.source_case_id:null,actor(r.source_reporter_id),actor(r.source_candidate_id),r.scope,r.state,r.reason_code,r.restoration_condition,r.created_at,r.review_at,r.revision,actor(r.appeal_by)?r.appeal:null,actor(r.appeal_by)?r.appealed_at:null,actor(r.appeal_by),r.restoration_reason,r.restored_at,actor(r.restored_by)]);
  for(const id of orgIds)await write('UPDATE faro_organizations SET verification=$1 WHERE id=$2',[closedIds.has(id as string)?'RESTRICTED':orgStates.get(id as string)??'RESTRICTED',id]);
  await write("UPDATE faro_organizations SET verification='RESTRICTED' WHERE EXISTS(SELECT 1 FROM faro_restrictions r WHERE r.organization_id=faro_organizations.id AND r.state='ACTIVE')");
  const published=await read("SELECT id FROM faro_offers WHERE status='PUBLISHED'");for(const offer of published)await audit('RECOVERY_INTAKE_PAUSED',offer.id as string);await write("UPDATE faro_offers SET status='PAUSED',revision=revision+1 WHERE status='PUBLISHED'");
  await write('SET CONSTRAINTS ALL IMMEDIATE');
  return {erasedSubjects:erased.length,restoredOwnerships,closedOrganizations,pausedOffers:published.length,invalidatedSessions,revokedPhoneGrants};
 });
}
