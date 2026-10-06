import { DEFAULT_CONSTRAINTS,explainOffer,explainConditions,sortOffers,type CandidateConstraints,type OfferData,type OfferStatus } from '../../domain/faro/offers.js';
import { profileReadQueries,profileFromRows } from './profileReadModel.js';
import { membershipReadQuery,membershipFromRows } from './organizationReadModel.js';
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

export function offerListReadQuery(organizationId?:string) {
  return organizationId?{text:'SELECT id FROM faro_offers WHERE organization_id=$1',values:[organizationId]}:{text:"SELECT id FROM faro_offers WHERE status='PUBLISHED'",values:[]};
}
export function offerConditionsReadQueries(userId:string,id:string) {
  return [
    {text:'SELECT preferences FROM faro_profiles WHERE user_id=$1',values:[userId]},
    {text:'SELECT result,offer_version FROM faro_economics WHERE candidate_id=$1 AND offer_id=$2',values:[userId,id]}
  ];
}
export function offerConditionsFromRows(offer:OfferRecord,rows:Record<string,unknown>[][],asOf:string) {
  const preferences=rows[0]?.[0]?.preferences as string|undefined,constraints={...DEFAULT_CONSTRAINTS,...(preferences?JSON.parse(preferences) as Partial<CandidateConstraints>:{})};
  const saved=rows[1]?.[0] as {result:string;offer_version:number}|undefined;
  const estimate=saved?JSON.parse(saved.result) as {commuteTimeMinutes:number|null;source:string;sourceDate:string;units?:{commuteTime:string}}:null;
  return explainConditions(offer.data,constraints,estimate&&saved?{minutes:estimate.commuteTimeMinutes,source:estimate.source,observedAt:estimate.sourceDate,asOf,currentVersion:saved.offer_version===offer.version,basis:estimate.units?.commuteTime??''}:undefined);
}
export function offerConditionsAllow(conditions:ReturnType<typeof offerConditionsFromRows>,includeUnknown:boolean) {
  return conditions.every(condition=>condition.state==='SATISFIED'||includeUnknown&&condition.state==='UNKNOWN');
}
export async function readOfferList(database:OfferReadDatabase,userId:string,asOf:string,organizationId?:string,includeUnknown=false) {
  return database.transaction(async()=>{
    if(organizationId)membershipFromRows((await database.readBatch([membershipReadQuery(userId,organizationId)]))[0]??[]);
    const ids=(await database.readBatch([offerListReadQuery(organizationId)]))[0]??[],result:Array<OfferRecord & {hasUnknownConditions?:boolean}>=[];
    for(const row of ids){
      const current=offerFromRows((await database.readBatch([offerReadQuery(row.id as string)]))[0]??[]);
      if(organizationId){result.push(current);continue;}
      const publication=await database.readBatch([publishedReadQuery(current.id),...intakeReadQueries(current)]);
      if(!intakeFromRows(current,publication.slice(1),asOf))continue;
      const published=publishedFromRows(current,publication[0]??[],true),conditions=offerConditionsFromRows(published,await database.readBatch(offerConditionsReadQueries(userId,current.id)),asOf);
      if(offerConditionsAllow(conditions,includeUnknown))result.push({...published,hasUnknownConditions:conditions.some(condition=>condition.state==='UNKNOWN')});
    }
    return sortOffers(result);
  },{readOnly:true});
}

export function offerDetailReadQueries(userId:string,offer:OfferRecord,postgres=false) {
  // Preserve insertion order, including equal/backdated clocks; the reviewed importer initializes this identity.
  const insertionOrder=postgres?'__faro_source_rowid':'rowid';
  return [
    {text:'SELECT a.user_id,m.role FROM faro_assignments a JOIN faro_members m ON m.user_id=a.user_id AND m.organization_id=$1 AND m.active=1 WHERE a.offer_id=$2 AND a.user_id=$3',values:[offer.organizationId,offer.id,userId]},
    {text:`SELECT id,status FROM faro_interests WHERE candidate_id=$1 AND offer_id=$2 ORDER BY ${insertionOrder} DESC LIMIT 1`,values:[userId,offer.id]},
    {text:'SELECT offer_id FROM faro_watches WHERE candidate_id=$1 AND offer_id=$2',values:[userId,offer.id]}
  ];
}
export function requireOfferDetailAccess(rows:Record<string,unknown>[][],accepting:boolean) {
  if(!accepting&&!rows[1]?.length&&!rows[2]?.length)membershipFromRows(rows[0]??[]);
}
export function offerDetailFromRows(offer:OfferRecord,rows:Record<string,unknown>[][],accepting:boolean,profile:ReturnType<typeof profileFromRows>,conditions:ReturnType<typeof offerConditionsFromRows>) {
  return {...offer,ownInterest:rows[1]?.[0]??null,acceptingInterest:accepting,explanation:explainOffer(offer.data,profile.claims,profile.learning),conditionExplanation:rows[0]?.length?[]:conditions};
}
export async function readOfferDetail(database:OfferReadDatabase,userId:string,id:string,asOf:string) {
  return database.transaction(async()=>{
    const current=offerFromRows((await database.readBatch([offerReadQuery(id)]))[0]??[]),intake=intakeFromRows(current,await database.readBatch(intakeReadQueries(current)),asOf);
    const access=await database.readBatch(offerDetailReadQueries(userId,current,true));requireOfferDetailAccess(access,intake);
    const offer=access[0]?.length?current:publishedFromRows(current,(await database.readBatch([publishedReadQuery(id)]))[0]??[],intake);
    const profile=profileFromRows(await database.readBatch(profileReadQueries(userId)),asOf),conditions=access[0]?.length?[]:offerConditionsFromRows(offer,await database.readBatch(offerConditionsReadQueries(userId,id)),asOf);
    return offerDetailFromRows(offer,access,intake,profile,conditions);
  },{readOnly:true});
}
