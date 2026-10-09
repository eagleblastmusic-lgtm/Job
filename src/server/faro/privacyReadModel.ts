import { membershipReadQuery,membershipFromRows } from './organizationReadModel.js';
import { randomUUID } from 'node:crypto';
import { HttpError } from '../http.js';
export function ownExportQueries(userId:string){return [
 {key:'faro_mfa_security',text:'SELECT activated_at,pending_until FROM faro_mfa WHERE user_id=$1',values:[userId]},
 {key:'faro_mfa_recovery_uses',text:'SELECT used_at FROM faro_mfa_recovery WHERE user_id=$1 ORDER BY used_at',values:[userId]},
 {key:'faro_profiles',text:'SELECT user_id,first_name,availability,preferences,phone,version,updated_at FROM faro_profiles WHERE user_id=$1',values:[userId]},
 {key:'faro_activities',text:'SELECT id,user_id,description,source,created_at,practice FROM faro_activities WHERE user_id=$1',values:[userId]},
 {key:'faro_proposals',text:'SELECT id,user_id,activity_id,skill_id,rationale,model_version,status,created_at,decided_at FROM faro_proposals WHERE user_id=$1',values:[userId]},
 {key:'faro_claims',text:'SELECT id,user_id,skill_id,level,source,practice,verification,version,confirmed_at,revoked_at FROM faro_claims WHERE user_id=$1',values:[userId]},
 {key:'faro_learning',text:'SELECT user_id,skill_id,mode,practice FROM faro_learning WHERE user_id=$1',values:[userId]},
 {key:'faro_members',text:'SELECT organization_id,user_id,role,active FROM faro_members WHERE user_id=$1',values:[userId]},
 {key:'faro_interests',text:'SELECT id,candidate_id,offer_id,offer_version,snapshot,status,stage,revision,response_due_at,first_response_at,stage_due_at,next_action,reason,created_at,previous_interest_id FROM faro_interests WHERE candidate_id=$1',values:[userId]},
 {key:'faro_watches',text:'SELECT candidate_id,offer_id,alerts,created_at FROM faro_watches WHERE candidate_id=$1',values:[userId]},
 {key:'faro_contact_grants',text:'SELECT process_id,candidate_id,organization_id,granted_at,revoked_at FROM faro_contact_grants WHERE candidate_id=$1',values:[userId]},
 {key:'faro_economics',text:'SELECT candidate_id,offer_id,offer_version,scenario,result,updated_at FROM faro_economics WHERE candidate_id=$1',values:[userId]},
 {key:'faro_events',text:'SELECT e.kind,e.data,e.occurred_at,e.process_id FROM faro_events e JOIN faro_interests p ON p.id=e.process_id WHERE p.candidate_id=$1',values:[userId]},
 {key:'faro_restriction_appeals',text:'SELECT id,organization_id,appeal,appealed_at FROM faro_restrictions WHERE appeal_by=$1',values:[userId]},
 {key:'faro_interviews',text:'SELECT i.id,i.process_id,i.state,i.revision,i.starts_at,i.ends_at,i.confirm_by,i.timezone,i.location,i.meeting_url,i.candidate_completed,i.employer_completed FROM faro_interviews i JOIN faro_interests p ON p.id=i.process_id WHERE p.candidate_id=$1 OR i.recruiter_id=$1',values:[userId]},
 {key:'faro_attempts',text:'SELECT a.id,a.process_id,a.assessment_id,a.assessment_version,a.state,a.deadline,a.started_at,a.expires_at,a.answers,a.result,a.revision,a.reviewed_at,a.attempt_number,a.retry_of,a.retry_reason,a.retry_authorized_at FROM faro_attempts a JOIN faro_interests p ON p.id=a.process_id WHERE p.candidate_id=$1',values:[userId]},
 {key:'faro_result_history',text:'SELECT h.attempt_id,h.revision,h.validity,h.result,h.reason_code,h.reason,h.created_at FROM faro_result_history h JOIN faro_attempts a ON a.id=h.attempt_id JOIN faro_interests p ON p.id=a.process_id WHERE p.candidate_id=$1',values:[userId]},
 {key:'faro_attempt_incidents',text:'SELECT i.id,i.attempt_id,i.category,i.statement,i.reported_at,i.observed_state,i.observed_revision,i.original_deadline,i.original_started_at,i.original_expires_at,i.state,i.revision,i.resolution,i.reason,i.resolved_at FROM faro_attempt_incidents i JOIN faro_attempts a ON a.id=i.attempt_id JOIN faro_interests p ON p.id=a.process_id WHERE p.candidate_id=$1',values:[userId]},
 {key:'faro_cases',text:'SELECT c.id,c.kind,c.state,CASE WHEN c.reporter_id=$1 THEN c.statement ELSE NULL END statement,c.public_reason decision,c.review_at,CASE WHEN c.appeal_by=$1 THEN c.appeal ELSE NULL END appeal,c.created_at FROM faro_cases c LEFT JOIN faro_interests p ON p.id=c.process_id WHERE c.reporter_id=$1 OR p.candidate_id=$1',values:[userId]},
 {key:'faro_case_explanations',text:'SELECT case_id,participant,statement,created_at FROM faro_case_explanations WHERE user_id=$1',values:[userId]},
 {key:'notifications',text:'SELECT id,entity_type,entity_id,message,read_at,created_at FROM notifications WHERE user_id=$1',values:[userId]},
 {key:'faro_outbox',text:'SELECT entity_type,entity_id,message,status FROM faro_outbox WHERE recipient_id=$1',values:[userId]},
 {key:'faro_organizations',text:'SELECT o.id,o.name,o.verification,m.role,m.active FROM faro_organizations o JOIN faro_members m ON m.organization_id=o.id WHERE m.user_id=$1',values:[userId]},
];}
export function ownExportFromRows(rows:Record<string,unknown>[][],asOf:string){return Object.fromEntries([['exportVersion','faro-data-rights-v1'],['exportedAt',asOf],...ownExportQueries('').map((query,index)=>[query.key,rows[index]??[]])]);}
export function deletableOwnershipQuery(userId:string){return {text:"SELECT m.organization_id FROM faro_members m WHERE m.user_id=$1 AND m.active=1 AND m.role='OWNER' AND EXISTS(SELECT 1 FROM faro_members other WHERE other.organization_id=m.organization_id AND other.user_id<>m.user_id AND other.active=1) LIMIT 1",values:[userId]};}
export function requireDeletableOwnership(rows:Record<string,unknown>[]){if(rows.length)throw new HttpError(409,'Przenieś własność organizacji na aktywnego członka przed usunięciem konta.','OWNERSHIP_TRANSFER_REQUIRED');}
export function transferOwnerQueries(userId:string,orgId:string,successorId:string,asOf:string){if(userId===successorId)throw new HttpError(400,'Wybierz innego aktywnego członka.');return [{text:"UPDATE faro_members SET role='ADMIN' WHERE organization_id=$1 AND user_id=$2",values:[orgId,userId]},{text:"UPDATE faro_members SET role='OWNER' WHERE organization_id=$1 AND user_id=$2",values:[orgId,successorId]},{text:"INSERT INTO audit_logs(id,user_id,action,entity_type,entity_id,metadata,created_at) VALUES($1,$2,'ORGANIZATION_OWNERSHIP_TRANSFERRED','faro',$3,'{}',$4)",values:[randomUUID(),userId,orgId,asOf]}];}
interface PrivacyDatabase {
 readBatch(queries:Array<{text:string;values:readonly unknown[]}>):Promise<Record<string,unknown>[][]>;
 query(text:string,values:readonly unknown[]):Promise<unknown>;
 transaction<T>(work:()=>T|Promise<T>,options?:{readOnly?:boolean}):Promise<T>;
}
export async function exportOwnData(database:PrivacyDatabase,userId:string,asOf:string,authorize:()=>void|Promise<void>){return database.transaction(async()=>{await authorize();return ownExportFromRows(await database.readBatch(ownExportQueries(userId)),asOf);},{readOnly:true});}
export async function transferOrganizationOwner(database:PrivacyDatabase,userId:string,orgId:string,successorId:string,asOf:string,authorize:()=>void|Promise<void>){return database.transaction(async()=>{await authorize();const rows=await database.readBatch([membershipReadQuery(userId,orgId),membershipReadQuery(successorId,orgId)]);membershipFromRows(rows[0]??[],['OWNER']);membershipFromRows(rows[1]??[]);for(const query of transferOwnerQueries(userId,orgId,successorId,asOf))await database.query(query.text,query.values);return {ok:true};});}
