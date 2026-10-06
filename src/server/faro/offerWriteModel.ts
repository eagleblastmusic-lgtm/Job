import { HttpError } from '../http.js';
import { object,integer,choice } from './validation.js';
import { randomUUID } from 'node:crypto';
import { materialDiff,type OfferData,type OfferStatus } from '../../domain/faro/offers.js';
import { membershipReadQuery,membershipFromRows } from './organizationReadModel.js';
import { offerReadQuery,offerFromRows,type OfferRecord } from './offerReadModel.js';
export function offerCreateQueries(userId:string,organizationId:string,id:string,data:OfferData,asOf:string) {
  return [
    {text:'INSERT INTO faro_offers(id,organization_id,created_at) VALUES($1,$2,$3)',values:[id,organizationId,asOf]},
    {text:'INSERT INTO faro_offer_versions(offer_id,version,content,author_id,created_at) VALUES($1,1,$2,$3,$4)',values:[id,JSON.stringify(data),userId,asOf]},
    ...[...new Set([userId,data.recruiterId])].map(member=>({text:'INSERT INTO faro_assignments(offer_id,user_id) VALUES($1,$2)',values:[id,member]})),
    {text:'INSERT INTO audit_logs(id,user_id,action,entity_type,entity_id,metadata,created_at) VALUES($1,$2,$3,$4,$5,$6,$7)',values:[randomUUID(),userId,'OFFER_DRAFT_CREATED','faro',id,'{}',asOf]}
  ];
}
interface OfferWriteDatabase {
  readBatch(queries:Array<{text:string;values:readonly unknown[]}>):Promise<Record<string,unknown>[][]>;
  query(text:string,values:readonly unknown[]):Promise<unknown>;
  transaction<T>(work:()=>T|Promise<T>):Promise<T>;
}
export async function createOfferDraft(database:OfferWriteDatabase,userId:string,organizationId:string,raw:Record<string,unknown>,asOf:string,parse:(body:Record<string,unknown>)=>OfferData) {
  return database.transaction(async()=>{
    membershipFromRows((await database.readBatch([membershipReadQuery(userId,organizationId)]))[0]??[],['OWNER','ADMIN','RECRUITER']);
    const data=parse(raw);
    membershipFromRows((await database.readBatch([membershipReadQuery(data.recruiterId,organizationId)]))[0]??[],['OWNER','ADMIN','RECRUITER']);
    const id=randomUUID();for(const query of offerCreateQueries(userId,organizationId,id,data,asOf))await database.query(query.text,query.values);
    return offerFromRows((await database.readBatch([offerReadQuery(id)]))[0]??[]);
  });
}

export function offerAssignedReadQuery(userId:string,id:string) {return {text:'SELECT user_id FROM faro_assignments WHERE user_id=$1 AND offer_id=$2',values:[userId,id]};}
export function requireOfferAssignment(rows:Record<string,unknown>[]) {if(!rows.length)throw new HttpError(404,'Nie znaleziono rekrutacji.','NOT_FOUND');}
export function offerEditQueries(userId:string,offer:OfferRecord,body:Record<string,unknown>,data:OfferData,asOf:string) {
  if(integer(body.expectedVersion,1)!==offer.revision)throw new HttpError(409,'Oferta zmieniła się.','VERSION_CONFLICT');
  if(['CLOSED','ARCHIVED','REMOVED'].includes(offer.status))throw new HttpError(409,'Ta oferta jest zakończona.');
  if(!materialDiff(offer.data,data).length)return [];
  return [
    {text:'INSERT INTO faro_offer_versions(offer_id,version,content,author_id,created_at) VALUES($1,$2,$3,$4,$5)',values:[offer.id,offer.version+1,JSON.stringify(data),userId,asOf]},
    {text:"UPDATE faro_offers SET current_version=current_version+1,revision=revision+1,approved_version=NULL,status='DRAFT' WHERE id=$1",values:[offer.id]},
    {text:'INSERT INTO faro_assignments(offer_id,user_id) VALUES($1,$2) ON CONFLICT(offer_id,user_id) DO NOTHING',values:[offer.id,data.recruiterId]},
    {text:'INSERT INTO audit_logs(id,user_id,action,entity_type,entity_id,metadata,created_at) VALUES($1,$2,$3,$4,$5,$6,$7)',values:[randomUUID(),userId,'OFFER_VERSION_CREATED','faro',offer.id,'{}',asOf]}
  ];
}
export async function editOfferDraft(database:OfferWriteDatabase,userId:string,id:string,body:Record<string,unknown>,asOf:string,parse:(body:Record<string,unknown>)=>OfferData) {
  return database.transaction(async()=>{
    const offer=offerFromRows((await database.readBatch([offerReadQuery(id)]))[0]??[]);
    const access=await database.readBatch([membershipReadQuery(userId,offer.organizationId),offerAssignedReadQuery(userId,id)]);
    membershipFromRows(access[0]??[]);requireOfferAssignment(access[1]??[]);membershipFromRows(access[0]??[],['OWNER','ADMIN','RECRUITER']);
    const data=parse(object(body.data));membershipFromRows((await database.readBatch([membershipReadQuery(data.recruiterId,offer.organizationId)]))[0]??[],['OWNER','ADMIN','RECRUITER']);
    for(const query of offerEditQueries(userId,offer,body,data,asOf))await database.query(query.text,query.values);
    return offerFromRows((await database.readBatch([offerReadQuery(id)]))[0]??[]);
  });
}

export function offerLifecycleAction(offer:OfferRecord,body:Record<string,unknown>) {
  if(integer(body.expectedVersion,1)!==offer.revision)throw new HttpError(409,'Oferta zmieniła się.','VERSION_CONFLICT');
  const action=choice(body.action,['REVIEW','PUBLISH','PAUSE','CLOSE','ARCHIVE','RECONFIRM'] as const);
  const allowed:Record<typeof action,OfferStatus[]>={REVIEW:['DRAFT'],PUBLISH:['IN_REVIEW','PAUSED'],PAUSE:['PUBLISHED'],CLOSE:['DRAFT','IN_REVIEW','PUBLISHED','PAUSED'],ARCHIVE:['CLOSED'],RECONFIRM:['PUBLISHED','PAUSED']};
  if(!allowed[action].includes(offer.status))throw new HttpError(409,'Niedozwolona zmiana stanu.','INVALID_TRANSITION');
  return action;
}
export function offerPublicationOrganizationQuery(organizationId:string) {return {text:'SELECT verification FROM faro_organizations WHERE id=$1',values:[organizationId]};}
export function requireOfferPublication(offer:OfferRecord,body:Record<string,unknown>,organization:Record<string,unknown>|undefined,asOf:string) {
  if(organization?.verification!=='VERIFIED')throw new HttpError(409,'Organizacja oczekuje na weryfikację.','ORGANIZATION_NOT_VERIFIED');
  if(offer.data.closesAt<=asOf||body.confirmed!==true)throw new HttpError(400,'Potwierdź aktualną wersję i przyszłą datę zamknięcia.');
}
export function offerLifecycleQueries(userId:string,offer:OfferRecord,action:ReturnType<typeof offerLifecycleAction>,asOf:string) {
  const publish=action==='PUBLISH'||action==='RECONFIRM',status:OfferStatus=({REVIEW:'IN_REVIEW',PUBLISH:'PUBLISHED',PAUSE:'PAUSED',CLOSE:'CLOSED',ARCHIVE:'ARCHIVED',RECONFIRM:'PUBLISHED'} as const)[action];
  return [
    {text:'UPDATE faro_offers SET status=$1,revision=revision+1,approved_version=$2,confirmed_until=$3 WHERE id=$4',values:[status,publish?offer.version:offer.approvedVersion,publish?new Date(Math.min(Date.parse(offer.data.closesAt),Date.parse(asOf)+14*86400000)).toISOString():offer.confirmedUntil,offer.id]},
    ...(publish?[
      {text:"UPDATE faro_offer_versions SET publication_proof='EXPLICIT',published_at=COALESCE(published_at,$1),published_by=COALESCE(published_by,$2) WHERE offer_id=$3 AND version=$4",values:[asOf,userId,offer.id,offer.version]},
      {text:'UPDATE faro_offers SET confirmed_at=$1 WHERE id=$2',values:[asOf,offer.id]}
    ]:[]),
    {text:'INSERT INTO audit_logs(id,user_id,action,entity_type,entity_id,metadata,created_at) VALUES($1,$2,$3,$4,$5,$6,$7)',values:[randomUUID(),userId,`OFFER_${action}`,'faro',offer.id,'{}',asOf]}
  ];
}
export function offerNotificationRecipientsQuery(id:string) {return {text:'SELECT candidate_id FROM faro_watches WHERE offer_id=$1 AND alerts=1 UNION SELECT candidate_id FROM faro_interests WHERE offer_id=$1',values:[id]};}
export function offerNotificationQueries(id:string,version:number,action:string,recipients:Record<string,unknown>[],asOf:string) {
  return recipients.map(recipient=>({text:'INSERT INTO faro_outbox(id,recipient_id,entity_type,entity_id,message,dedupe_key,next_attempt_at) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(recipient_id,dedupe_key) DO NOTHING',values:[randomUUID(),recipient.candidate_id,'offer',id,action==='CLOSE'?'Obserwowana oferta została zamknięta. Sprawdź swój proces.':'Opublikowano warunki oferty. Sprawdź, co się zmieniło.',`offer:${id}:${version}:${action}`,asOf]}));
}
export async function changeOfferLifecycle(database:OfferWriteDatabase,userId:string,id:string,body:Record<string,unknown>,asOf:string) {
  return database.transaction(async()=>{
    const offer=offerFromRows((await database.readBatch([offerReadQuery(id)]))[0]??[]),access=await database.readBatch([membershipReadQuery(userId,offer.organizationId),offerAssignedReadQuery(userId,id)]);
    membershipFromRows(access[0]??[]);requireOfferAssignment(access[1]??[]);membershipFromRows(access[0]??[],['OWNER','ADMIN','RECRUITER']);
    const action=offerLifecycleAction(offer,body),publish=action==='PUBLISH'||action==='RECONFIRM';
    if(publish){const organization=(await database.readBatch([offerPublicationOrganizationQuery(offer.organizationId)]))[0]?.[0];requireOfferPublication(offer,body,organization,asOf);membershipFromRows((await database.readBatch([membershipReadQuery(offer.data.recruiterId,offer.organizationId)]))[0]??[],['OWNER','ADMIN','RECRUITER']);}
    for(const query of offerLifecycleQueries(userId,offer,action,asOf))await database.query(query.text,query.values);
    if(publish||action==='CLOSE'){const recipients=(await database.readBatch([offerNotificationRecipientsQuery(id)]))[0]??[];for(const query of offerNotificationQueries(id,offer.version,action,recipients,asOf))await database.query(query.text,query.values);}
    return offerFromRows((await database.readBatch([offerReadQuery(id)]))[0]??[]);
  });
}
