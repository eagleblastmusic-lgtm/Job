import { randomUUID } from 'node:crypto';
import { HttpError } from '../http.js';
import { integer,text,date } from './validation.js';
import { type DefinitionRow,assessmentDefinitionQuery,assessmentDefinitionFromRows } from './assessmentDefinitionModel.js';
import { type AttemptRow,type IncidentRow,attemptReadQuery,attemptFromRows,attemptIncidentQuery,attemptViewOwned,requireAttemptEmployerOwned } from './assessmentAttemptReadModel.js';
import { type ProcessRow,processReadQuery,processFromRows } from './processReadModel.js';
import { runCommandOnce } from './commandJournal.js';
import { processRecruiterReadQuery,processEventQueries } from './interestWriteModel.js';
import { assignmentCorrectionQuery } from './assessmentAssignmentModel.js';
export function attemptRetryContextQueries(row:AttemptRow) {return [attemptIncidentQuery(row.id),
 {text:'SELECT id FROM faro_attempts WHERE retry_of=$1',values:[row.id]},
 {text:"SELECT id FROM faro_attempts WHERE process_id=$1 AND state IN ('INVITED','STARTED','SCORED_PENDING_REVIEW')",values:[row.process_id]},
 assignmentCorrectionQuery(row.assessment_id,row.assessment_version)];}
export function assessmentRetryPlan(userId:string,row:AttemptRow,process:ProcessRow,definition:DefinitionRow,incident:IncidentRow|undefined,existingRetry:boolean,active:boolean,corrected:boolean,body:Record<string,unknown>,asOf:string) {
      if(integer(body.expectedVersion,1)!==row.revision||integer(body.processVersion,1)!==process.revision)throw new HttpError(409,'Próba lub proces zmieniły się.','VERSION_CONFLICT');
      if(row.state!=='TECHNICAL_ISSUE'||incident?.state!=='RESOLVED'||incident.resolution!=='ISSUE_CONFIRMED')throw new HttpError(409,'Ponowienie wymaga potwierdzonego problemu technicznego.','RETRY_NOT_ELIGIBLE');
      if(process.status!=='ACTIVE'||process.stage!=='ACCEPTED_TO_NEXT_STAGE')throw new HttpError(409,'Proces nie pozwala teraz na ponowienie.');
      if(existingRetry||active)throw new HttpError(409,'Istnieje już ponowienie lub aktywna próba.','RETRY_ALREADY_EXISTS');
      if(definition.state!=='APPROVED')throw new HttpError(409,'Wersja próby nie jest zatwierdzona.');
      if(corrected)throw new HttpError(409,'Skorygowana wersja nie przyjmuje nowych prób. Przygotuj nową zatwierdzoną wersję.','CORRECTED_VERSION_CLOSED');
      if(body.confirmed!==true)throw new HttpError(400,'Potwierdź ponowienie tej samej wersji.','CONFIRMATION_REQUIRED');
      const reason=text(body.reason,1000,10),deadline=date(body.deadline);
      if(deadline<=asOf)throw new HttpError(400,'Deadline musi być w przyszłości.');
 const nextId=randomUUID();return {ack:{id:nextId},event:{attemptId:nextId,previousAttemptId:row.id},queries:[
 {text:"INSERT INTO faro_attempts(id,process_id,assessment_id,assessment_version,state,deadline,attempt_number,retry_of,retry_reason,retry_authorized_at,retry_authorized_by) VALUES($1,$2,$3,$4,'INVITED',$5,$6,$7,$8,$9,$10)",values:[nextId,process.id,row.assessment_id,row.assessment_version,deadline,row.attempt_number+1,row.id,reason,asOf,userId]},
 {text:"UPDATE faro_interests SET stage='ASSESSMENT_REQUESTED',stage_due_at=$1,revision=revision+1 WHERE id=$2",values:[deadline,process.id]}]};
}
interface RetryDatabase {
 readBatch(queries:Array<{text:string;values:readonly unknown[]}>):Promise<Record<string,unknown>[][]>;
 query(text:string,values:readonly unknown[]):Promise<unknown>;
 transaction<T>(work:()=>T|Promise<T>,options?:{readOnly?:boolean}):Promise<T>;
}
export async function retryAssessment(database:RetryDatabase,userId:string,id:string,body:Record<string,unknown>,asOf:string,authorize:()=>void|Promise<void>) {
 let row:AttemptRow,process:ProcessRow;
 const authorizeOwned=async()=>{await authorize();row=attemptFromRows((await database.readBatch([attemptReadQuery(id)]))[0]??[]);process=processFromRows((await database.readBatch([processReadQuery(row.process_id)]))[0]??[]);if(process.candidate_id===userId)throw new HttpError(404,'Nie znaleziono pr\u00f3by do ponowienia.');const role=await requireAttemptEmployerOwned(database,userId,process);if(!['OWNER','ADMIN','RECRUITER'].includes(role))throw new HttpError(404,'Nie znaleziono pr\u00f3by do ponowienia.','NOT_FOUND');};
 const ack=await runCommandOnce(database,userId,body.idempotencyKey,{...body,id,operation:'ATTEMPT_RETRY'},asOf,authorizeOwned,async()=>{
  const rows=await database.readBatch([...attemptRetryContextQueries(row),assessmentDefinitionQuery(row.assessment_id,row.assessment_version)]),plan=assessmentRetryPlan(userId,row,process,assessmentDefinitionFromRows(rows[4]??[]),rows[0]?.[0] as unknown as IncidentRow|undefined,Boolean(rows[1]?.length),Boolean(rows[2]?.length),Boolean(rows[3]?.length),body,asOf);
  for(const query of plan.queries)await database.query(query.text,query.values);
  const recipients=(await database.readBatch([processRecruiterReadQuery(process.offer_id)]))[0]??[];for(const query of processEventQueries(process,userId,'ATTEMPT_RETRY_AUTHORIZED',plan.event,recipients,asOf))await database.query(query.text,query.values);
  return plan.ack;
 });
 return database.transaction(async()=>{await authorizeOwned();return attemptViewOwned(database,userId,ack.id,asOf);},{readOnly:true});
}
