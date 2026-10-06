import { randomUUID } from 'node:crypto';
import { HttpError } from '../http.js';
import { text } from './validation.js';
import { affiliationReadQuery } from './organizationReadModel.js';
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
