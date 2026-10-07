import { randomUUID } from 'node:crypto';
import { HttpError } from '../http.js';
import { membershipReadQuery,membershipFromRows,affiliationReadQuery } from './organizationReadModel.js';
import { offerReadQuery,offerFromRows } from './offerReadModel.js';
import { offerAssignedReadQuery,requireOfferAssignment } from './offerWriteModel.js';
import { processReadQuery,processFromRows } from './processReadModel.js';
export interface CaseRow {id:string;organization_id:string;process_id:string|null;reporter_id:string|null;kind:string;state:string;revision:number;explanation_due_at:string|null;public_reason:string|null;statement:string;decision:string|null;review_at:string|null;created_at:string;appeal:string|null;dedupe_key:string|null;appeal_by:string|null;}
export interface RestrictionRow {id:string;organization_id:string;source_case_id:string|null;source_reporter_id:string|null;source_candidate_id:string|null;state:string;scope:string;reason_code:string;restoration_condition:string|null;created_at:string|null;review_at:string|null;revision:number;appeal:string|null;appealed_at:string|null;appeal_by:string|null;restoration_reason:string|null;restored_at:string|null;restored_by:string|null;}
const caseColumns='id,organization_id,process_id,reporter_id,kind,state,statement,decision,review_at,appeal,dedupe_key,created_at,revision,explanation_due_at,public_reason,appeal_by';
const restrictionColumns='id,organization_id,source_case_id,source_reporter_id,source_candidate_id,scope,state,reason_code,restoration_condition,created_at,review_at,revision,appeal,appealed_at,appeal_by,restoration_reason,restored_at,restored_by';
export function caseReadQuery(id:string){return {text:`SELECT ${caseColumns} FROM faro_cases WHERE id=$1`,values:[id]};}
export function caseFromRows(rows:Record<string,unknown>[]):CaseRow{if(!rows[0])throw new HttpError(404,'Nie znaleziono sprawy.');return rows[0] as unknown as CaseRow;}
export function restrictionReadQuery(id:string){return {text:`SELECT ${restrictionColumns} FROM faro_restrictions WHERE id=$1`,values:[id]};}
export function restrictionFromRows(rows:Record<string,unknown>[]):RestrictionRow{if(!rows[0])throw new HttpError(404,'Nie znaleziono ograniczenia.');return rows[0] as unknown as RestrictionRow;}
export function moderatorRoleQuery(userId:string){return {text:"SELECT id FROM users WHERE id=$1 AND role='ADMIN'",values:[userId]};}
export function caseListQuery(userId:string,admin:boolean,postgres=false){const columns=caseColumns.split(',').map(column=>`c.${column}`).join(',');return {text:`SELECT ${columns} FROM faro_cases c ${admin?'':"LEFT JOIN faro_interests p ON p.id=c.process_id WHERE c.reporter_id=$1 OR (c.kind IN ('NO_SHOW_CASE','INTERVIEW_DISCREPANCY') AND (p.candidate_id=$1 OR EXISTS(SELECT 1 FROM faro_assignments a JOIN faro_members m ON m.user_id=a.user_id AND m.organization_id=c.organization_id AND m.active=1 WHERE a.offer_id=p.offer_id AND a.user_id=$1))) OR (c.kind='STALE_OFFER' AND EXISTS(SELECT 1 FROM faro_members m WHERE m.organization_id=c.organization_id AND m.user_id=$1 AND m.active=1 AND m.role IN ('OWNER','ADMIN')))"} ORDER BY c.created_at DESC,c.${postgres?'__faro_source_rowid':'rowid'} LIMIT 200`,values:admin?[]:[userId]};}
export function caseExplanationsQuery(id:string,userId:string|null,postgres=false){return {text:`SELECT participant,statement,created_at FROM faro_case_explanations WHERE case_id=$1${userId?' AND user_id=$2':''} ORDER BY created_at,${postgres?'__faro_source_rowid':'rowid'}`,values:userId?[id,userId]:[id]};}
export function caseVisible(row:CaseRow,userId:string,moderator:boolean,participant:'CANDIDATE'|'EMPLOYER'|null){return moderator||row.reporter_id===userId||(participant!==null&&['NO_SHOW_CASE','INTERVIEW_DISCREPANCY','STALE_OFFER'].includes(row.kind));}
export function caseView(row:CaseRow,userId:string,moderator:boolean,participant:'CANDIDATE'|'EMPLOYER'|null,explanations:Record<string,unknown>[]){return moderator?{...row,canModerate:true,explanations}:{id:row.id,kind:row.kind,state:row.state,revision:row.revision,explanation_due_at:row.explanation_due_at,review_at:row.review_at,created_at:row.created_at,participant,canModerate:false,statement:row.reporter_id===userId?row.statement:null,decision:row.public_reason,explanations};}
export function restrictionsReadQuery(orgId:string,postgres=false){return {text:`SELECT ${restrictionColumns} FROM faro_restrictions WHERE organization_id=$1 ORDER BY ${postgres?'__faro_source_rowid':'rowid'} DESC`,values:[orgId]};}
export function restrictionView(row:RestrictionRow,own:boolean,moderator:boolean){return {id:row.id,scope:row.scope,state:row.state,reasonCode:row.reason_code,restorationCondition:row.restoration_condition,createdAt:row.created_at,reviewAt:row.review_at,revision:row.revision,appeal:row.appeal,appealedAt:row.appealed_at,restorationReason:row.restoration_reason,restoredAt:row.restored_at,canAppeal:own&&row.state==='ACTIVE'&&!row.appeal,canReview:row.state==='ACTIVE'&&moderator};}
export function moderationReadAudit(userId:string,action:string,id:string,asOf:string){return {text:"INSERT INTO audit_logs(id,user_id,action,entity_type,entity_id,metadata,created_at) VALUES($1,$2,$3,'faro',$4,'{}',$5)",values:[randomUUID(),userId,action,id,asOf]};}
export interface TrustReadDatabase {
 readBatch(queries:Array<{text:string;values:readonly unknown[]}>):Promise<Record<string,unknown>[][]>;
 query(text:string,values:readonly unknown[]):Promise<unknown>;
 transaction<T>(work:()=>T|Promise<T>,options?:{readOnly?:boolean}):Promise<T>;
}
export async function caseInvolvedOwned(database:TrustReadDatabase,userId:string,row:CaseRow){if(row.reporter_id===userId)return true;if((await database.readBatch([affiliationReadQuery(userId,row.organization_id)]))[0]?.length)return true;return Boolean(row.process_id&&processFromRows((await database.readBatch([processReadQuery(row.process_id)]))[0]??[]).candidate_id===userId);}
export async function caseParticipantOwned(database:TrustReadDatabase,userId:string,row:CaseRow):Promise<'CANDIDATE'|'EMPLOYER'>{
 if(!row.process_id){membershipFromRows((await database.readBatch([membershipReadQuery(userId,row.organization_id)]))[0]??[],['OWNER','ADMIN']);return 'EMPLOYER';}
 const process=processFromRows((await database.readBatch([processReadQuery(row.process_id)]))[0]??[]);if(process.candidate_id===userId)return 'CANDIDATE';
 const offer=offerFromRows((await database.readBatch([offerReadQuery(process.offer_id)]))[0]??[]);
 const access=await database.readBatch([membershipReadQuery(userId,offer.organizationId),offerAssignedReadQuery(userId,process.offer_id)]);membershipFromRows(access[0]??[]);requireOfferAssignment(access[1]??[]);return 'EMPLOYER';
}
export async function restrictionModeratorOwned(database:TrustReadDatabase,userId:string,row:RestrictionRow){if(!(await database.readBatch([moderatorRoleQuery(userId)]))[0]?.length||row.source_reporter_id===userId||row.source_candidate_id===userId||(await database.readBatch([affiliationReadQuery(userId,row.organization_id)]))[0]?.length)return false;return !row.source_case_id||!await caseInvolvedOwned(database,userId,caseFromRows((await database.readBatch([caseReadQuery(row.source_case_id)]))[0]??[]));}
export async function readModerationCases(database:TrustReadDatabase,userId:string,asOf:string,authorize:()=>void|Promise<void>){return database.transaction(async()=>{
 await authorize();const admin=Boolean((await database.readBatch([moderatorRoleQuery(userId)]))[0]?.length),rows=(await database.readBatch([caseListQuery(userId,admin,true)]))[0]??[];
 if(admin){const audit=moderationReadAudit(userId,'MODERATION_CASES_READ','cases',asOf);await database.query(audit.text,audit.values);}
 const result=[];for(const raw of rows){const row=raw as unknown as CaseRow,moderator=admin&&!await caseInvolvedOwned(database,userId,row);let participant:'CANDIDATE'|'EMPLOYER'|null=null;
  if(!moderator)try{participant=await caseParticipantOwned(database,userId,row);}catch(error){if(!(error instanceof HttpError)||error.status!==404)throw error;if(row.reporter_id!==userId)continue;}
  if(!caseVisible(row,userId,moderator,participant))continue;
  const explanations=(await database.readBatch([caseExplanationsQuery(row.id,moderator?null:userId,true)]))[0]??[];result.push(caseView(row,userId,moderator,participant,explanations));
 }return result.slice(0,200);
});}
export async function readRestrictions(database:TrustReadDatabase,userId:string,orgId:string,asOf:string,authorize:()=>void|Promise<void>){return database.transaction(async()=>{
 await authorize();const access=await database.readBatch([membershipReadQuery(userId,orgId),moderatorRoleQuery(userId),affiliationReadQuery(userId,orgId)]),own=['OWNER','ADMIN'].includes(access[0]?.[0]?.role as string);
 if(!own&&(!access[1]?.length||access[2]?.length))throw new HttpError(404,'Nie znaleziono organizacji.');
 const rows=(await database.readBatch([restrictionsReadQuery(orgId,true)]))[0]??[],result=[];
 for(const raw of rows){const row=raw as unknown as RestrictionRow,moderator=await restrictionModeratorOwned(database,userId,row);if(!own&&!moderator)throw new HttpError(404,'Nie znaleziono niezależnego przeglądu.');result.push(restrictionView(row,own,moderator));}
 if(!own){const audit=moderationReadAudit(userId,'MODERATION_RESTRICTIONS_READ',orgId,asOf);await database.query(audit.text,audit.values);}return result;
});}
