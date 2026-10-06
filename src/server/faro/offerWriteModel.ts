import { HttpError } from '../http.js';
import { object,integer } from './validation.js';
import { randomUUID } from 'node:crypto';
import { materialDiff,type OfferData } from '../../domain/faro/offers.js';
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
