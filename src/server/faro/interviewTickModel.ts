import { randomUUID } from 'node:crypto';
import { type InterviewRow,interviewReadQuery,interviewFromRows } from './interviewReadModel.js';
import { type ProcessRow,processReadQuery,processFromRows } from './processReadModel.js';
import { offerVersionReadQuery,offerVersionFromRows } from './offerReadModel.js';
import { processRecruiterReadQuery,processEventQueries } from './interestWriteModel.js';

export function pendingInterviewsQuery(postgres=false) {return {text:`SELECT id FROM faro_interviews WHERE state IN ('PROPOSED','CONFIRMED') ORDER BY ${postgres?'__faro_source_rowid':'rowid'}`,values:[]};}
export function interviewExpiryQueries(row:InterviewRow,p:ProcessRow,decisionHours:number,asOf:string) {
 const due=new Date(Date.parse(asOf)+decisionHours*3600000).toISOString();
 return [{text:"UPDATE faro_interviews SET state='CANCELLED',revision=revision+1 WHERE id=$1",values:[row.id]},
 {text:"UPDATE faro_interests SET stage='ACCEPTED_TO_NEXT_STAGE',stage_due_at=$1,next_action=$2,revision=revision+1 WHERE id=$3",values:[due,'Propozycja terminu wygasła. Uzgodnijcie nowy termin.',p.id]}];
}
export function interviewReminderQueries(row:InterviewRow,p:ProcessRow,assigned:Record<string,unknown>[],asOf:string) {
 const deadline=row.state==='PROPOSED'?row.confirm_by:row.starts_at,outcome=row.state==='CONFIRMED'&&row.ends_at<=asOf;
 if(p.status!=='ACTIVE'||!['PROPOSED','CONFIRMED'].includes(row.state)||(!outcome&&(deadline<=asOf||Date.parse(deadline)>Date.parse(asOf)+24*3600000)))return [];
 const recipients=[p.candidate_id,...(row.state==='CONFIRMED'&&row.recruiter_id&&assigned.some(item=>item.user_id===row.recruiter_id)?[row.recruiter_id]:[])];
 return recipients.map(recipient=>({text:'INSERT INTO faro_outbox(id,recipient_id,entity_type,entity_id,message,dedupe_key,next_attempt_at) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(recipient_id,dedupe_key) DO NOTHING',values:[randomUUID(),recipient,'process',p.id,outcome?'Potwierdź odbycie rozmowy lub zgłoś rozbieżność.':row.state==='PROPOSED'?'Zbliża się termin potwierdzenia propozycji rozmowy.':'Zbliża się potwierdzona rozmowa.',`interview:${row.id}:${outcome?'outcome':row.state}:${deadline}`,asOf]}));
}
interface TickDatabase {
 readBatch(queries:Array<{text:string;values:readonly unknown[]}>):Promise<Record<string,unknown>[][]>;
 query(text:string,values:readonly unknown[]):Promise<unknown>;
 transaction<T>(work:()=>T|Promise<T>):Promise<T>;
}
export async function tickInterviews(database:TickDatabase,asOf:string,authorizeWorker:()=>void|Promise<void>) {
 return database.transaction(async()=>{
  await authorizeWorker();const pending=(await database.readBatch([pendingInterviewsQuery(true)]))[0]??[];let expired=0;
  for(const item of pending){const row=interviewFromRows((await database.readBatch([interviewReadQuery(item.id as string)]))[0]??[]),p=processFromRows((await database.readBatch([processReadQuery(row.process_id)]))[0]??[]);if(p.status!=='ACTIVE')continue;
   const assigned=(await database.readBatch([processRecruiterReadQuery(p.offer_id)]))[0]??[];
   if(row.state==='PROPOSED'&&row.confirm_by<=asOf){const version=offerVersionFromRows((await database.readBatch([offerVersionReadQuery(p.offer_id,p.offer_version)]))[0]??[]);
    for(const query of [...interviewExpiryQueries(row,p,version.decisionHours,asOf),...processEventQueries(p,null,'INTERVIEW_PROPOSAL_EXPIRED',{interviewId:row.id},assigned,asOf)])await database.query(query.text,query.values);expired++;
   }else for(const query of interviewReminderQueries(row,p,assigned,asOf))await database.query(query.text,query.values);
  }
  return {expired};
 });
}
