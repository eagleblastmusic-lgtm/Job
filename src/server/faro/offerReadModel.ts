import type { OfferData,OfferStatus } from '../../domain/faro/offers.js';
import { HttpError } from '../http.js';
export interface OfferRecord {id:string;organizationId:string;company:string;status:OfferStatus;version:number;revision:number;approvedVersion:number|null;confirmedUntil:string|null;createdAt:string;data:OfferData;publishedAt?:string|null;publicationSource?:string;}
export function offerReadQuery(id:string) {
  return {text:'SELECT o.id,o.organization_id,g.name company,o.status,o.current_version,o.revision,o.approved_version,o.confirmed_until,o.created_at,v.content FROM faro_offers o JOIN faro_organizations g ON g.id=o.organization_id JOIN faro_offer_versions v ON v.offer_id=o.id AND v.version=o.current_version WHERE o.id=$1',values:[id]};
}
export function offerFromRows(rows:Record<string,unknown>[]):OfferRecord {
  const row=rows[0] as {id:string;organization_id:string;company:string;status:OfferStatus;current_version:number;revision:number;approved_version:number|null;confirmed_until:string|null;created_at:string;content:string}|undefined;
  if(!row)throw new HttpError(404,'Nie znaleziono oferty.','NOT_FOUND');
  return {id:row.id,organizationId:row.organization_id,company:row.company,status:row.status,version:row.current_version,revision:row.revision,approvedVersion:row.approved_version,confirmedUntil:row.confirmed_until,createdAt:row.created_at,data:JSON.parse(row.content) as OfferData};
}
export function publishedReadQuery(id:string) {
  return {text:"SELECT version,content,published_at,publication_proof FROM faro_offer_versions WHERE offer_id=$1 AND publication_proof<>'NONE' ORDER BY version DESC LIMIT 1",values:[id]};
}
export function intakeReadQueries(offer:OfferRecord) {
  return [
    {text:'SELECT verification FROM faro_organizations WHERE id=$1',values:[offer.organizationId]},
    {text:"SELECT m.user_id FROM faro_members m JOIN faro_assignments a ON a.user_id=m.user_id AND a.offer_id=$1 WHERE m.organization_id=$2 AND m.user_id=$3 AND m.active=1 AND m.role IN ('OWNER','ADMIN','RECRUITER')",values:[offer.id,offer.organizationId,offer.data.recruiterId]},
    {text:"SELECT version FROM faro_offer_versions WHERE offer_id=$1 AND version=$2 AND publication_proof<>'NONE'",values:[offer.id,offer.version]}
  ];
}
export function intakeFromRows(offer:OfferRecord,rows:Record<string,unknown>[][],asOf:string):boolean {
  return offer.status==='PUBLISHED'&&offer.approvedVersion===offer.version&&rows[0]?.[0]?.verification==='VERIFIED'&&Boolean(rows[1]?.length&&rows[2]?.length)&&Boolean(offer.confirmedUntil&&offer.confirmedUntil>asOf)&&offer.data.closesAt>asOf;
}
export function publishedFromRows(offer:OfferRecord,rows:Record<string,unknown>[],accepting:boolean):OfferRecord {
  const version=rows[0] as {version:number;content:string;published_at:string|null;publication_proof:string}|undefined;
  if(!version)throw new HttpError(404,'Nie znaleziono potwierdzonej publikacji oferty.','PUBLICATION_NOT_FOUND');
  return {...offer,version:version.version,data:JSON.parse(version.content) as OfferData,publishedAt:version.published_at,publicationSource:version.publication_proof,status:['DRAFT','IN_REVIEW'].includes(offer.status)||(offer.status==='PUBLISHED'&&!accepting)?'PAUSED':offer.status};
}
interface OfferReadDatabase {
  readBatch(queries:Array<{text:string;values:readonly unknown[]}>):Promise<Record<string,unknown>[][]>;
  transaction<T>(work:()=>T|Promise<T>,options?:{readOnly?:boolean}):Promise<T>;
}
export async function readPublishedOffer(database:OfferReadDatabase,id:string,asOf:string) {
  return database.transaction(async()=>{
    const current=offerFromRows((await database.readBatch([offerReadQuery(id)]))[0]??[]);
    const rows=await database.readBatch([publishedReadQuery(id),...intakeReadQueries(current)]);
    const acceptingInterest=intakeFromRows(current,rows.slice(1),asOf);
    return {current,published:publishedFromRows(current,rows[0]??[],acceptingInterest),acceptingInterest};
  },{readOnly:true});
}
