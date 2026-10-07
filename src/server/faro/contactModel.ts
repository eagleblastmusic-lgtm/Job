import { createHash,randomUUID } from 'node:crypto';
import { HttpError } from '../http.js';
import { processReadQuery,processFromRows,type ProcessRow } from './processReadModel.js';
import { offerReadQuery,offerFromRows } from './offerReadModel.js';
import { membershipReadQuery,membershipFromRows } from './organizationReadModel.js';
import { offerAssignedReadQuery,requireOfferAssignment } from './offerWriteModel.js';
export function contactPhoneQuery(userId:string) {return {text:'SELECT phone FROM faro_profiles WHERE user_id=$1',values:[userId]};}
export function contactGrantQuery(id:string) {return {text:'SELECT process_id FROM faro_contact_grants WHERE process_id=$1 AND revoked_at IS NULL',values:[id]};}
export function requireContactOwner(row:ProcessRow,userId:string) {if(row.candidate_id!==userId)throw new HttpError(404,'Nie znaleziono procesu.');}
export function contactPreview(row:ProcessRow,userId:string,phone:string|null) {
  requireContactOwner(row,userId);
  if(!['ACTIVE','OFFERED'].includes(row.status))throw new HttpError(409,'Telefon udostępnisz dopiero po przyjęciu do kolejnego etapu.');
  if(!phone)throw new HttpError(400,'Najpierw zapisz prywatny numer w profilu.');
  return {phone,confirmationToken:createHash('sha256').update(JSON.stringify([userId,row.id,phone])).digest('hex')};
}
export function requireContactConfirmation(body:Record<string,unknown>,preview:ReturnType<typeof contactPreview>) {
  if(body.phoneConfirmed!==true)throw new HttpError(400,'Potwierdź udostępnienie wyświetlonego numeru.','CONFIRMATION_REQUIRED');
  if(body.confirmationToken!==preview.confirmationToken)throw new HttpError(409,'Numer zmienił się. Otwórz aktualny podgląd.','PHONE_PREVIEW_STALE');
}
export function contactAuditQuery(userId:string,id:string,action:'PHONE_GRANTED'|'PHONE_REVOKED'|'GRANTED_PHONE_READ',asOf:string) {return {text:'INSERT INTO audit_logs(id,user_id,action,entity_type,entity_id,metadata,created_at) VALUES($1,$2,$3,$4,$5,$6,$7)',values:[randomUUID(),userId,action,'faro',id,'{}',asOf]};}
export function contactWriteQueries(userId:string,id:string,organizationId:string|null,grant:boolean,asOf:string) {
  return [grant?{text:'INSERT INTO faro_contact_grants(process_id,candidate_id,organization_id,granted_at) VALUES($1,$2,$3,$4) ON CONFLICT(process_id) DO UPDATE SET granted_at=excluded.granted_at,revoked_at=NULL',values:[id,userId,organizationId,asOf]}:{text:'UPDATE faro_contact_grants SET revoked_at=$1 WHERE process_id=$2 AND candidate_id=$3',values:[asOf,id,userId]},contactAuditQuery(userId,id,grant?'PHONE_GRANTED':'PHONE_REVOKED',asOf)];
}
export function requireContactGrant(row:ProcessRow,grant:Record<string,unknown>|undefined) {if(!grant||!['ACTIVE','OFFERED'].includes(row.status))throw new HttpError(403,'Kandydat nie udostępnia teraz numeru.','CONTACT_NOT_GRANTED');}
interface ContactDatabase {
  readBatch(queries:Array<{text:string;values:readonly unknown[]}>):Promise<Record<string,unknown>[][]>;
  query(text:string,values:readonly unknown[]):Promise<unknown>;
  transaction<T>(work:()=>T|Promise<T>,options?:{readOnly?:boolean}):Promise<T>;
}
async function phoneOwned(database:ContactDatabase,userId:string) {return (await database.readBatch([contactPhoneQuery(userId)]))[0]?.[0]?.phone as string|null??null;}
export async function readContactPreview(database:ContactDatabase,userId:string,id:string,authorize:()=>void|Promise<void>) {
  return database.transaction(async()=>{await authorize();const row=processFromRows((await database.readBatch([processReadQuery(id)]))[0]??[]);requireContactOwner(row,userId);return contactPreview(row,userId,await phoneOwned(database,userId));},{readOnly:true});
}
export async function setContactGrant(database:ContactDatabase,userId:string,id:string,grant:boolean,body:Record<string,unknown>,asOf:string,authorize:()=>void|Promise<void>) {
  return database.transaction(async()=>{
    await authorize();const row=processFromRows((await database.readBatch([processReadQuery(id)]))[0]??[]);requireContactOwner(row,userId);let organizationId:string|null=null;
    if(grant){requireContactConfirmation(body,contactPreview(row,userId,await phoneOwned(database,userId)));organizationId=offerFromRows((await database.readBatch([offerReadQuery(row.offer_id)]))[0]??[]).organizationId;}
    for(const query of contactWriteQueries(userId,id,organizationId,grant,asOf))await database.query(query.text,query.values);
    return {granted:grant};
  });
}
export async function readGrantedContact(database:ContactDatabase,userId:string,id:string,asOf:string,currentSessionAndMfa:()=>void|Promise<void>) {
  return database.transaction(async()=>{
    await currentSessionAndMfa();const row=processFromRows((await database.readBatch([processReadQuery(id)]))[0]??[]),offer=offerFromRows((await database.readBatch([offerReadQuery(row.offer_id)]))[0]??[]),access=await database.readBatch([membershipReadQuery(userId,offer.organizationId),offerAssignedReadQuery(userId,row.offer_id),contactGrantQuery(id)]);membershipFromRows(access[0]??[]);requireOfferAssignment(access[1]??[]);requireContactGrant(row,access[2]?.[0]);
    const phone=await phoneOwned(database,row.candidate_id),audit=contactAuditQuery(userId,id,'GRANTED_PHONE_READ',asOf);await database.query(audit.text,audit.values);return {phone};
  });
}
