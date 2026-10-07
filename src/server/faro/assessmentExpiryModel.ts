import { TERMINAL } from '../../domain/faro/recruitment.js';
import { type OfferData } from '../../domain/faro/offers.js';
import { HttpError } from '../http.js';
import { type AttemptRow,attemptReadQuery,attemptFromRows } from './assessmentAttemptReadModel.js';
import { type ProcessRow,processReadQuery,processFromRows } from './processReadModel.js';
import { processRecruiterReadQuery,processEventQueries } from './interestWriteModel.js';
export function dueAttemptsQuery(asOf:string,id?:string,postgres=false) {return {text:"SELECT id FROM faro_attempts WHERE state IN ('INVITED','STARTED') AND (deadline<=$1 OR (state='STARTED' AND expires_at<=$1))"+(id?' AND id=$2':'')+` ORDER BY ${postgres?'__faro_source_rowid':'rowid'}`,values:id?[asOf,id]:[asOf]};}
export function pinnedAttemptOfferQuery(process:ProcessRow) {return {text:'SELECT content FROM faro_offer_versions WHERE offer_id=$1 AND version=$2',values:[process.offer_id,process.offer_version]};}
export function attemptExpiryQueries(row:AttemptRow,process:ProcessRow,decisionHours:number|null,asOf:string) {
 const queries:Array<{text:string;values:readonly string[]}>=[{text:"UPDATE faro_attempts SET state='EXPIRED',revision=revision+1 WHERE id=$1",values:[row.id]}];
 if(!TERMINAL.includes(process.status)&&process.stage==='ASSESSMENT_REQUESTED'){
  if(decisionHours===null)throw new HttpError(404,'Nie znaleziono wersji oferty.');
  const dueAt=new Date(Date.parse(asOf)+decisionHours*3600000).toISOString();queries.push({text:"UPDATE faro_interests SET stage='ACCEPTED_TO_NEXT_STAGE',stage_due_at=$1,next_action=$2,revision=revision+1 WHERE id=$3",values:[dueAt,'Termin assessmentu upłynął. Ustal kolejny krok; brak automatycznej odmowy.',process.id]});
 }
 return queries;
}
interface ExpiryDatabase {
 readBatch(queries:Array<{text:string;values:readonly unknown[]}>):Promise<Record<string,unknown>[][]>;
 query(text:string,values:readonly unknown[]):Promise<unknown>;
 transaction<T>(work:()=>T|Promise<T>):Promise<T>;
}
export async function expireAttempts(database:ExpiryDatabase,asOf:string,authorizeWorker:()=>void|Promise<void>,id?:string) {
 return database.transaction(async()=>{
  await authorizeWorker();const due=(await database.readBatch([dueAttemptsQuery(asOf,id,true)]))[0]??[];
  for(const item of due){const row=attemptFromRows((await database.readBatch([attemptReadQuery(item.id as string)]))[0]??[]),process=processFromRows((await database.readBatch([processReadQuery(row.process_id)]))[0]??[]);let decisionHours:number|null=null;
   if(!TERMINAL.includes(process.status)&&process.stage==='ASSESSMENT_REQUESTED'){const pinned=(await database.readBatch([pinnedAttemptOfferQuery(process)]))[0]?.[0];if(pinned)decisionHours=(JSON.parse(pinned.content as string) as OfferData).decisionHours;}
   for(const query of attemptExpiryQueries(row,process,decisionHours,asOf))await database.query(query.text,query.values);
   const recipients=(await database.readBatch([processRecruiterReadQuery(process.offer_id)]))[0]??[];for(const query of processEventQueries(process,null,'ATTEMPT_EXPIRED',{attemptId:row.id},recipients,asOf))await database.query(query.text,query.values);
  }
  return {expired:due.length};
 });
}
