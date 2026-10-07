import { createHash,randomUUID } from 'node:crypto';
import { HttpError,boundedStringField,stringField } from '../http.js';
import { verifyPassword,MAX_PASSWORD_LENGTH } from '../auth.js';
import { requireIdentityOwned } from './identityAccessModel.js';
import { deletableOwnershipQuery,requireDeletableOwnership } from './privacyReadModel.js';
import { processCancelQueries } from './processWriteModel.js';
import { processReadQuery,processFromRows } from './processReadModel.js';
import { processRecruiterReadQuery,processEventQueries } from './interestWriteModel.js';
import { offerNotificationRecipientsQuery,offerNotificationQueries } from './offerWriteModel.js';

export function erasureAccountQueries(userId:string){return [
 {text:'SELECT email FROM users WHERE id=$1',values:[userId]},
 {text:"SELECT organization_id FROM faro_members WHERE user_id=$1 AND role='OWNER' AND active=1",values:[userId]}
];}
export function organizationErasureReadQueries(orgId:string){return [
 {text:"SELECT p.id FROM faro_interests p JOIN faro_offers o ON o.id=p.offer_id WHERE o.organization_id=$1 AND p.status IN ('INTERESTED','ACTIVE','OFFERED')",values:[orgId]},
 {text:"SELECT id,current_version FROM faro_offers WHERE organization_id=$1 AND status NOT IN ('CLOSED','ARCHIVED','REMOVED')",values:[orgId]}
];}
export function erasureProcessQuery(id:string,isolatedRecovery=false){return {text:"UPDATE faro_interests SET status='CANCELLED',stage='TERMINAL',stage_due_at=NULL,next_action=NULL,reason=$1,revision=revision+1 WHERE id=$2",values:[JSON.stringify({code:'RECRUITMENT_CANCELLED',explanation:isolatedRecovery?'Organizacja wymaga ponownej weryfikacji po odtworzeniu danych.':'Organizacja zakończyła rekrutację po usunięciu konta jedynego właściciela.'}),id]};}
export function organizationErasureQueries(orgId:string){return [
 {text:"UPDATE faro_organizations SET verification='RESTRICTED' WHERE id=$1",values:[orgId]},
 {text:"UPDATE faro_offers SET status='CLOSED',revision=revision+1 WHERE organization_id=$1 AND status NOT IN ('CLOSED','ARCHIVED','REMOVED')",values:[orgId]},
 {text:'DELETE FROM faro_invites WHERE organization_id=$1',values:[orgId]}
];}
export function recruiterErasureReadQuery(userId:string){return {text:"SELECT id,process_id FROM faro_interviews WHERE recruiter_id=$1 AND state IN ('PROPOSED','CONFIRMED')",values:[userId]};}
export function recruiterErasureQueries(id:string,processId:string){return [
 {text:"UPDATE faro_interviews SET state='CANCELLED',revision=revision+1 WHERE id=$1",values:[id]},
 {text:"UPDATE faro_interests SET stage='ACCEPTED_TO_NEXT_STAGE',stage_due_at=NULL,next_action='Firma musi wyznaczyć nowego rekrutera i termin.',revision=revision+1 WHERE id=$1 AND status='ACTIVE'",values:[processId]}
];}
export function personalErasureQueries(userId:string,email:string,asOf:string,postgres=false){
 // SQLite json_extract takes the first duplicate key. Preserve this for imported JSON text.
 const recruiter=postgres?"(SELECT value #>> '{}' FROM json_each(v.content::json) WITH ORDINALITY AS field(key,value,position) WHERE key='recruiterId' ORDER BY position LIMIT 1)":"json_extract(v.content,'$.recruiterId')";
 return [
 {text:'DELETE FROM faro_invites WHERE email=$1 OR created_by=$2',values:[email,userId]},
 {text:'DELETE FROM analytics_events WHERE user_id=$1',values:[userId]},
 {text:`UPDATE faro_offers SET status='PAUSED',revision=revision+1 WHERE status='PUBLISHED' AND id IN (SELECT v.offer_id FROM faro_offer_versions v JOIN faro_offers o ON o.id=v.offer_id AND o.current_version=v.version WHERE ${recruiter}=$1)`,values:[userId]},
 {text:'UPDATE faro_restrictions SET appeal=NULL,appealed_at=NULL WHERE appeal_by=$1',values:[userId]},
 {text:"UPDATE faro_cases SET statement='Treść usunięta w ramach realizacji prawa do danych.',appeal=NULL,decision=NULL WHERE reporter_id=$1 OR process_id IN (SELECT id FROM faro_interests WHERE candidate_id=$1)",values:[userId]},
 {text:"UPDATE faro_case_explanations SET statement='Treść usunięta w ramach realizacji prawa do danych.' WHERE case_id IN (SELECT id FROM faro_cases WHERE reporter_id=$1 OR process_id IN (SELECT id FROM faro_interests WHERE candidate_id=$1))",values:[userId]},
 {text:"DELETE FROM faro_outbox WHERE entity_type='process' AND entity_id IN (SELECT id FROM faro_interests WHERE candidate_id=$1)",values:[userId]},
 {text:"DELETE FROM notifications WHERE entity_type='process' AND entity_id IN (SELECT id FROM faro_interests WHERE candidate_id=$1)",values:[userId]},
 {text:"INSERT INTO faro_erasure_log(subject_hash,erased_at,policy_version) VALUES($1,$2,'local-erasure-v1') ON CONFLICT(subject_hash) DO UPDATE SET erased_at=excluded.erased_at",values:[createHash('sha256').update(userId).digest('hex'),asOf]}
 ];
}
interface ErasureDatabase {
 readBatch(queries:Array<{text:string;values:readonly unknown[]}>):Promise<Record<string,unknown>[][]>;
 query(text:string,values:readonly unknown[]):Promise<unknown>;
 transaction<T>(work:()=>T|Promise<T>):Promise<T>;
}
/** Caller owns the transaction; this also supports isolated restore replay. */
export async function eraseDerivativesOwned(database:ErasureDatabase,userId:string,asOf:string,isolatedRecovery=false){
 if(!isolatedRecovery)requireDeletableOwnership((await database.readBatch([deletableOwnershipQuery(userId)]))[0]??[]);
 const account=await database.readBatch(erasureAccountQueries(userId)),email=account[0]?.[0]?.email;
 if(typeof email!=='string')throw new HttpError(404,'Nie znaleziono konta.');
 const execute=async(queries:Array<{text:string;values:readonly unknown[]}>)=>{for(const query of queries)await database.query(query.text,query.values);};
 const event=async(id:string,kind:string,data:Record<string,unknown>)=>{const row=processFromRows((await database.readBatch([processReadQuery(id)]))[0]??[]),recipients=(await database.readBatch([processRecruiterReadQuery(row.offer_id)]))[0]??[];await execute(processEventQueries(row,userId,kind,data,recipients,asOf));};
 for(const org of account[1]??[]){
  const orgId=org.organization_id as string,rows=await database.readBatch(organizationErasureReadQueries(orgId));
  for(const process of rows[0]??[]){const id=process.id as string;await execute([erasureProcessQuery(id,isolatedRecovery),...processCancelQueries(id,asOf)]);await event(id,'CANCEL',{reason:{code:'RECRUITMENT_CANCELLED'},source:'ORGANIZATION_CLOSED'});}
  for(const offer of rows[1]??[]){const id=offer.id as string,recipients=(await database.readBatch([offerNotificationRecipientsQuery(id)]))[0]??[];await execute(offerNotificationQueries(id,offer.current_version as number,'CLOSE',recipients,asOf));}
  await execute(organizationErasureQueries(orgId));
 }
 for(const meeting of (await database.readBatch([recruiterErasureReadQuery(userId)]))[0]??[]){await execute(recruiterErasureQueries(meeting.id as string,meeting.process_id as string));await event(meeting.process_id as string,'INTERVIEW_CANCEL',{interviewId:meeting.id,reason:'RECRUITER_UNAVAILABLE'});}
 await execute(personalErasureQueries(userId,email,asOf,true));
}
export async function eraseAccount(database:ErasureDatabase,tokenHash:string,body:Record<string,unknown>,asOf:string,requirePrivileged:boolean,configured:boolean,beforeErasure?:(userId:string)=>void|Promise<void>){
 const result=await database.transaction(async()=>{
  const {user}=await requireIdentityOwned(database,tokenHash,asOf,requirePrivileged,configured);
  const confirmation=boundedStringField(body,'confirmation',32)??'';
  if(confirmation!=='USUŃ KONTO')throw new HttpError(400,'Wpisz dokładnie: USUŃ KONTO');
  const password=stringField(body,'password',false)??'';
  const valid=Boolean(password&&password.length<=MAX_PASSWORD_LENGTH&&verifyPassword(password,user.passwordHash));
  const audit={text:"INSERT INTO audit_logs(id,user_id,action,entity_type,entity_id,metadata,created_at) VALUES($1,$2,$3,'user',$2,'{}',$4)",values:[randomUUID(),user.id,valid?'ACCOUNT_DELETION_REQUESTED':'ACCOUNT_DELETION_REAUTH_FAILED',asOf]};
  if(!valid){await database.query(audit.text,audit.values);return false;}
  if(beforeErasure)await beforeErasure(user.id);await database.query(audit.text,audit.values);await eraseDerivativesOwned(database,user.id,asOf);await database.query('DELETE FROM users WHERE id=$1',[user.id]);return true;
 });
 if(!result)throw new HttpError(401,'Podaj poprawne aktualne hasło.','REAUTH_FAILED');
 return {ok:true};
}
