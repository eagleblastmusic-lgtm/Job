import { randomUUID } from 'node:crypto';
import type { OfferData } from '../../domain/faro/offers.js';
import { membershipReadQuery,membershipFromRows } from './organizationReadModel.js';
import { offerReadQuery,offerFromRows } from './offerReadModel.js';
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
