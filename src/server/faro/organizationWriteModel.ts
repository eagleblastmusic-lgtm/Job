import { randomUUID,createHash } from 'node:crypto';
import { HttpError } from '../http.js';
import { text,choice } from './validation.js';
import { affiliationReadQuery,membershipReadQuery,membershipFromRows } from './organizationReadModel.js';
interface OrganizationWriteDatabase {
  readBatch(queries:Array<{text:string;values:readonly unknown[]}>):Promise<Record<string,unknown>[][]>;
  query(text:string,values:readonly unknown[]):Promise<unknown>;
  transaction<T>(work:()=>T|Promise<T>):Promise<T>;
}
function organizationAuditQuery(userId:string,action:string,id:string,asOf:string) {return {text:'INSERT INTO audit_logs(id,user_id,action,entity_type,entity_id,metadata,created_at) VALUES($1,$2,$3,$4,$5,$6,$7)',values:[randomUUID(),userId,action,'faro',id,'{}',asOf]};}
export function organizationCreatePlan(userId:string,body:Record<string,unknown>,asOf:string) {
  const id=randomUUID(),name=text(body.name,150);
  return {record:{id,name,verification:'PENDING'},queries:[
    {text:'INSERT INTO faro_organizations(id,name,created_at) VALUES($1,$2,$3)',values:[id,name,asOf]},
    {text:"INSERT INTO faro_members(organization_id,user_id,role) VALUES($1,$2,'OWNER')",values:[id,userId]},
    organizationAuditQuery(userId,'ORGANIZATION_CREATED',id,asOf)
  ]};
}
export function organizationVerificationReadQueries(adminId:string,organizationId:string) {return [
  {text:"SELECT id FROM users WHERE id=$1 AND role='ADMIN'",values:[adminId]},
  {text:'SELECT verification FROM faro_organizations WHERE id=$1',values:[organizationId]},
  affiliationReadQuery(adminId,organizationId)
];}
export function organizationVerifyQueries(adminId:string,organizationId:string,note:string,rows:Record<string,unknown>[][],asOf:string) {
  if(!rows[0]?.length)throw new HttpError(403,'Wymagany moderator.');
  const org=rows[1]?.[0];if(!org)throw new HttpError(404,'Nie znaleziono organizacji.');
  if(rows[2]?.length)throw new HttpError(409,'Organizację musi zweryfikować moderator bez powiązania z nią.','VERIFICATION_CONFLICT');
  if(org.verification==='RESTRICTED')throw new HttpError(409,'Ograniczenie wymaga odrębnego rozstrzygnięcia moderacyjnego.','RESTRICTION_REVIEW_REQUIRED');
  return [{text:"UPDATE faro_organizations SET verification='VERIFIED',verified_at=$1,verification_note=$2 WHERE id=$3",values:[asOf,text(note,1000,10),organizationId]},organizationAuditQuery(adminId,'ORGANIZATION_VERIFIED',organizationId,asOf)];
}
export async function createOrganization(database:OrganizationWriteDatabase,userId:string,body:Record<string,unknown>,asOf:string) {
  const plan=organizationCreatePlan(userId,body,asOf);
  return database.transaction(async()=>{for(const query of plan.queries)await database.query(query.text,query.values);return plan.record;});
}
export async function verifyOrganization(database:OrganizationWriteDatabase,adminId:string,organizationId:string,note:string,asOf:string) {
  return database.transaction(async()=>{const rows=await database.readBatch(organizationVerificationReadQueries(adminId,organizationId));for(const query of organizationVerifyQueries(adminId,organizationId,note,rows,asOf))await database.query(query.text,query.values);});
}

export function organizationInvitePlan(userId:string,organizationId:string,body:Record<string,unknown>,asOf:string) {
  const token=randomUUID()+randomUUID(),hash=createHash('sha256').update(token).digest('hex'),email=text(body.email,254).toLowerCase();
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new HttpError(400,'Nieprawidłowy e-mail.');
  return {record:{token,expiresInHours:72},query:{text:'INSERT INTO faro_invites(token_hash,organization_id,role,email,expires_at,created_by) VALUES($1,$2,$3,$4,$5,$6)',values:[hash,organizationId,choice(body.role,['ADMIN','RECRUITER','HIRING_MANAGER'] as const),email,new Date(Date.parse(asOf)+72*3600000).toISOString(),userId]}};
}
export function organizationInviteReadQuery(email:string,token:string,asOf:string) {
  return {text:'SELECT organization_id,role FROM faro_invites WHERE token_hash=$1 AND email=$2 AND expires_at>$3 AND accepted_at IS NULL',values:[createHash('sha256').update(token).digest('hex'),email,asOf]};
}
export function organizationInviteFromRows(rows:Record<string,unknown>[]) {
  const row=rows[0] as {organization_id:string;role:string}|undefined;if(!row)throw new HttpError(404,'Zaproszenie jest niedostępne.');return row;
}
export function organizationExistingMemberQuery(userId:string,organizationId:string) {return {text:'SELECT role FROM faro_members WHERE organization_id=$1 AND user_id=$2',values:[organizationId,userId]};}
export function organizationInviteAcceptPlan(userId:string,hash:string,row:{organization_id:string;role:string},existing:Record<string,unknown>|undefined,asOf:string) {
  if(existing?.role==='OWNER')throw new HttpError(409,'Właściciel ma już dostęp.');
  return {record:{organizationId:row.organization_id},queries:[
    {text:'INSERT INTO faro_members(organization_id,user_id,role) VALUES($1,$2,$3) ON CONFLICT(organization_id,user_id) DO UPDATE SET role=excluded.role,active=1',values:[row.organization_id,userId,row.role]},
    {text:'UPDATE faro_invites SET accepted_at=$1 WHERE token_hash=$2',values:[asOf,hash]},
    organizationAuditQuery(userId,'MEMBERSHIP_ACCEPTED',row.organization_id,asOf)
  ]};
}
export function organizationRevokeQueries(userId:string,organizationId:string,memberId:string,member:{role:string},asOf:string) {
  if(member.role==='OWNER')throw new HttpError(409,'Najpierw przenieś własność organizacji.');
  return [{text:'UPDATE faro_members SET active=0 WHERE organization_id=$1 AND user_id=$2',values:[organizationId,memberId]},organizationAuditQuery(userId,'MEMBERSHIP_REVOKED',organizationId,asOf)];
}
export async function inviteOrganizationMember(database:OrganizationWriteDatabase,userId:string,organizationId:string,body:Record<string,unknown>,asOf:string) {
  return database.transaction(async()=>{
    membershipFromRows((await database.readBatch([membershipReadQuery(userId,organizationId)]))[0]??[],['OWNER','ADMIN']);
    const plan=organizationInvitePlan(userId,organizationId,body,asOf);await database.query(plan.query.text,plan.query.values);return plan.record;
  });
}
export async function acceptOrganizationInvite(database:OrganizationWriteDatabase,userId:string,email:string,token:string,asOf:string) {
  return database.transaction(async()=>{
    const query=organizationInviteReadQuery(email,token,asOf),row=organizationInviteFromRows((await database.readBatch([query]))[0]??[]),existing=(await database.readBatch([organizationExistingMemberQuery(userId,row.organization_id)]))[0]?.[0];
    const plan=organizationInviteAcceptPlan(userId,query.values[0]!,row,existing,asOf);
    for(const command of plan.queries)await database.query(command.text,command.values);return plan.record;
  });
}
export async function revokeOrganizationMember(database:OrganizationWriteDatabase,userId:string,organizationId:string,memberId:string,asOf:string) {
  return database.transaction(async()=>{
    const rows=await database.readBatch([membershipReadQuery(userId,organizationId),membershipReadQuery(memberId,organizationId)]);
    membershipFromRows(rows[0]??[],['OWNER','ADMIN']);const member=membershipFromRows(rows[1]??[]);
    for(const query of organizationRevokeQueries(userId,organizationId,memberId,member,asOf))await database.query(query.text,query.values);
  });
}
