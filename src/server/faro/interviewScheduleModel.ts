import { HttpError } from '../http.js';
import { choice,integer } from './validation.js';
import { type InterviewRow,interviewReadQuery,interviewFromRows,interviewProcessOwned,interviewViewOwned,interviewSlotQuery,requireInterviewSlot } from './interviewReadModel.js';
import { type ProcessRow } from './processReadModel.js';
import { requireAttemptEmployerOwned } from './assessmentAttemptReadModel.js';
import { offerVersionReadQuery,offerVersionFromRows } from './offerReadModel.js';
import { processRecruiterReadQuery,processEventQueries } from './interestWriteModel.js';
import { runCommandOnce } from './commandJournal.js';
export function interviewChangeInput(row:InterviewRow,p:ProcessRow,body:Record<string,unknown>) {
      if(integer(body.expectedVersion,1)!==row.revision||integer(body.processVersion,1)!==p.revision)throw new HttpError(409,'Odśwież rozmowę i proces.','VERSION_CONFLICT');
      if(p.status!=='ACTIVE'||!['PROPOSED','CONFIRMED'].includes(row.state))throw new HttpError(409,'Rozmowa nie jest aktywna.','INVALID_TRANSITION');
      const command=choice(body.command,['CONFIRM','CANCEL','COMPLETE','DISPUTE'] as const);
      if(body.confirmed!==true)throw new HttpError(400,'Potwierdź działanie dotyczące rozmowy.','CONFIRMATION_REQUIRED');
 return command;
}
export function interviewSchedulePlan(userId:string,row:InterviewRow,p:ProcessRow,body:Record<string,unknown>,decisionHours:number,asOf:string) {
 const command=interviewChangeInput(row,p,body),candidate=p.candidate_id===userId;let state:InterviewRow['state'],stage=p.stage,due=p.stage_due_at,action=p.next_action;
 if(command==='CONFIRM') {
  if(!candidate||row.state!=='PROPOSED'||row.confirm_by<=asOf)throw new HttpError(409,'Potwierdzenie nie jest już dostępne.');
  if(!row.recruiter_id)throw new HttpError(409,'Rekruter nie jest dostępny.');state='CONFIRMED';stage='INTERVIEW_CONFIRMED';due=row.ends_at;action='Rozmowa potwierdzona przez obie strony.';
 }else if(command==='CANCEL') {
  choice(body.reason,['RESCHEDULE','UNAVAILABLE','TECHNICAL_ISSUE'] as const);state='CANCELLED';stage='ACCEPTED_TO_NEXT_STAGE';action='Uzgodnij nowy termin rozmowy.';due=new Date(Date.parse(asOf)+decisionHours*3600000).toISOString();
 }else throw new HttpError(400,'Wybierz potwierdzenie lub anulowanie terminu.');
 return {command,event:{interviewId:row.id,state,stage,stageDueAt:due,caseId:null,reason:command==='CANCEL'?body.reason:null},queries:[{text:'UPDATE faro_interviews SET state=$1,revision=revision+1 WHERE id=$2',values:[state,row.id]},{text:'UPDATE faro_interests SET stage=$1,stage_due_at=$2,next_action=$3,revision=revision+1 WHERE id=$4',values:[stage,due,action,p.id]}]};
}
interface InterviewScheduleDatabase {
 readBatch(queries:Array<{text:string;values:readonly unknown[]}>):Promise<Record<string,unknown>[][]>;
 query(text:string,values:readonly unknown[]):Promise<unknown>;
 transaction<T>(work:()=>T|Promise<T>,options?:{readOnly?:boolean}):Promise<T>;
}
export async function changeInterviewSchedule(database:InterviewScheduleDatabase,userId:string,id:string,body:Record<string,unknown>,asOf:string,authorize:()=>void|Promise<void>) {
 let row:InterviewRow,process:ProcessRow;
 return runCommandOnce(database,userId,body.idempotencyKey,{...body,id,operation:'INTERVIEW_CHANGE'},asOf,async()=>{
  await authorize();row=interviewFromRows((await database.readBatch([interviewReadQuery(id)]))[0]??[]);process=await interviewProcessOwned(database,userId,row.process_id);if(process.candidate_id!==userId){const role=await requireAttemptEmployerOwned(database,userId,process);if(!['OWNER','ADMIN','RECRUITER'].includes(role))throw new HttpError(404,'Nie znaleziono zasobu.','NOT_FOUND');}
 },async()=>{
  const version=offerVersionFromRows((await database.readBatch([offerVersionReadQuery(process.offer_id,process.offer_version)]))[0]??[]),plan=interviewSchedulePlan(userId,row,process,body,version.decisionHours,asOf);
  if(plan.command==='CONFIRM'){await requireAttemptEmployerOwned(database,row.recruiter_id!,process);requireInterviewSlot((await database.readBatch([interviewSlotQuery(process.candidate_id,row.recruiter_id!,row.starts_at,row.ends_at)]))[0]??[]);}
  for(const query of plan.queries)await database.query(query.text,query.values);const recipients=(await database.readBatch([processRecruiterReadQuery(process.offer_id)]))[0]??[];for(const query of processEventQueries(process,userId,`INTERVIEW_${plan.command}`,plan.event,recipients,asOf))await database.query(query.text,query.values);
  return interviewViewOwned(database,userId,id);
 });
}
