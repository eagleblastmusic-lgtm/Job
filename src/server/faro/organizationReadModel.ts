import { HttpError } from '../http.js';
export const ORGANIZATION_ROLES=['OWNER','ADMIN','RECRUITER','HIRING_MANAGER'] as const;
export function membershipReadQuery(userId:string,organizationId:string) {return {text:'SELECT role FROM faro_members WHERE user_id=$1 AND organization_id=$2 AND active=1',values:[userId,organizationId]};}
export function membershipFromRows(rows:Record<string,unknown>[],roles:readonly string[]=ORGANIZATION_ROLES):{role:string} {
  const row=rows[0] as {role:string}|undefined;
  if(!row||!roles.includes(row.role))throw new HttpError(404,'Nie znaleziono zasobu.','NOT_FOUND');
  return {role:row.role};
}
export function affiliationReadQuery(userId:string,organizationId:string) {return {text:'SELECT user_id FROM faro_members WHERE user_id=$1 AND organization_id=$2',values:[userId,organizationId]};}
export function organizationsReadQuery(userId:string) {return {text:'SELECT o.id,o.name,o.verification,o.verified_at,m.role FROM faro_organizations o JOIN faro_members m ON m.organization_id=o.id WHERE m.user_id=$1 AND m.active=1 ORDER BY o.created_at,o.id',values:[userId]};}
interface OrganizationReadDatabase {readBatch(queries:Array<{text:string;values:readonly unknown[]}>):Promise<Record<string,unknown>[][]>;}
export async function readMembership(database:OrganizationReadDatabase,userId:string,organizationId:string,roles:readonly string[]=ORGANIZATION_ROLES) {return membershipFromRows((await database.readBatch([membershipReadQuery(userId,organizationId)]))[0]??[],roles);}
export async function readAffiliation(database:OrganizationReadDatabase,userId:string,organizationId:string) {return Boolean((await database.readBatch([affiliationReadQuery(userId,organizationId)]))[0]?.length);}
export async function readOrganizations(database:OrganizationReadDatabase,userId:string) {return (await database.readBatch([organizationsReadQuery(userId)]))[0]??[];}
