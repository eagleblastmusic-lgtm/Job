import { HttpError } from '../http.js';
import { offerReadQuery,offerFromRows,publishedReadQuery,publishedFromRows,intakeReadQueries,intakeFromRows } from './offerReadModel.js';
export function watchReadQuery(userId:string,offerId:string) {return {text:'SELECT alerts FROM faro_watches WHERE candidate_id=$1 AND offer_id=$2',values:[userId,offerId]};}
export function watchApplicantQuery(userId:string,offerId:string) {return {text:'SELECT id FROM faro_interests WHERE candidate_id=$1 AND offer_id=$2',values:[userId,offerId]};}
export function watchListQuery(userId:string) {return {text:'SELECT offer_id,alerts FROM faro_watches WHERE candidate_id=$1 ORDER BY created_at DESC,offer_id ASC',values:[userId]};}
export function watchStateQuery(userId:string,offerId:string,watching:boolean,asOf:string) {
  return watching?{text:'INSERT INTO faro_watches(candidate_id,offer_id,created_at) VALUES($1,$2,$3) ON CONFLICT(candidate_id,offer_id) DO NOTHING',values:[userId,offerId,asOf]}:{text:'DELETE FROM faro_watches WHERE candidate_id=$1 AND offer_id=$2',values:[userId,offerId]};
}
export function watchAlertPlan(userId:string,offerId:string,body:Record<string,unknown>,watch:Record<string,unknown>|undefined) {
  if(typeof body.alerts!=='boolean')throw new HttpError(400,'Wybierz, czy chcesz otrzymywać alerty.');
  if(!watch)throw new HttpError(404,'Nie znaleziono obserwowanej oferty.');
  return {query:{text:'UPDATE faro_watches SET alerts=$1 WHERE candidate_id=$2 AND offer_id=$3',values:[body.alerts?1:0,userId,offerId]},alerts:body.alerts};
}
export function watchCancelQueries(userId:string,offerId:string,applicant:boolean) {
  const base="DELETE FROM faro_outbox WHERE recipient_id=$1 AND entity_type='offer' AND entity_id=$2 AND status='PENDING'";
  return [{text:base+" AND dedupe_key LIKE '%:closing-soon'",values:[userId,offerId]},...(!applicant?[{text:base,values:[userId,offerId]}]:[])];
}
interface WatchDatabase {
  readBatch(queries:Array<{text:string;values:readonly unknown[]}>):Promise<Record<string,unknown>[][]>;
  query(text:string,values:readonly unknown[]):Promise<unknown>;
  transaction<T>(work:()=>T|Promise<T>,options?:{readOnly?:boolean}):Promise<T>;
}
async function cancelOwned(database:WatchDatabase,userId:string,offerId:string) {
  const applicant=Boolean((await database.readBatch([watchApplicantQuery(userId,offerId)]))[0]?.length);
  for(const query of watchCancelQueries(userId,offerId,applicant))await database.query(query.text,query.values);
}
export async function setWatch(database:WatchDatabase,userId:string,offerId:string,watching:boolean,asOf:string,authorize:()=>void|Promise<void>) {
  return database.transaction(async()=>{
    await authorize();
    if(watching){const offer=offerFromRows((await database.readBatch([offerReadQuery(offerId)]))[0]??[]),intake=intakeFromRows(offer,await database.readBatch(intakeReadQueries(offer)),asOf);if(!intake)throw new HttpError(409,'Możesz obserwować aktywną ofertę.');}
    const query=watchStateQuery(userId,offerId,watching,asOf);await database.query(query.text,query.values);
    if(!watching)await cancelOwned(database,userId,offerId);
    return {watching};
  });
}
export async function setWatchAlerts(database:WatchDatabase,userId:string,offerId:string,body:Record<string,unknown>,authorize:()=>void|Promise<void>) {
  return database.transaction(async()=>{
    await authorize();const watch=(await database.readBatch([watchReadQuery(userId,offerId)]))[0]?.[0],plan=watchAlertPlan(userId,offerId,body,watch);
    await database.query(plan.query.text,plan.query.values);if(!plan.alerts)await cancelOwned(database,userId,offerId);
    return {watching:true,alerts:plan.alerts};
  });
}
export async function readWatches(database:WatchDatabase,userId:string,asOf:string) {
  return database.transaction(async()=>{
    const rows=(await database.readBatch([watchListQuery(userId)]))[0]??[],result=[];
    for(const row of rows){
      const id=row.offer_id as string,current=offerFromRows((await database.readBatch([offerReadQuery(id)]))[0]??[]),data=await database.readBatch([publishedReadQuery(id),...intakeReadQueries(current)]);
      try{result.push({...publishedFromRows(current,data[0]??[],intakeFromRows(current,data.slice(1),asOf)),watchAlerts:row.alerts===1});}
      catch(error){if(!(error instanceof HttpError&&error.code==='PUBLICATION_NOT_FOUND'))throw error;}
    }
    return result;
  },{readOnly:true});
}
