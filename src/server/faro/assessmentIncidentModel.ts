import { randomUUID } from 'node:crypto';
import { HttpError } from '../http.js';
import { integer,choice,text } from './validation.js';
import { type AttemptRow,attemptReadQuery,attemptFromRows,attemptIncidentQuery,attemptViewOwned } from './assessmentAttemptReadModel.js';
import { type ProcessRow,processReadQuery,processFromRows } from './processReadModel.js';
import { runCommandOnce } from './commandJournal.js';
import { processRecruiterReadQuery,processEventQueries } from './interestWriteModel.js';
export function requireIncidentCandidate(userId:string,process:ProcessRow) {if(process.candidate_id!==userId)throw new HttpError(404,'Nie znaleziono pr\u00f3by.');}
export function incidentReportPlan(userId:string,row:AttemptRow,process:ProcessRow,incident:unknown,body:Record<string,unknown>,asOf:string) {
      if(integer(body.expectedVersion,1)!==row.revision||integer(body.processVersion,1)!==process.revision)throw new HttpError(409,'Próba lub proces zmieniły się.','VERSION_CONFLICT');
      if(!['INVITED','STARTED','EXPIRED','SCORED_PENDING_REVIEW'].includes(row.state)||incident)throw new HttpError(409,'Ta próba nie przyjmuje nowego zgłoszenia technicznego.','INCIDENT_NOT_AVAILABLE');
      if(body.confirmed!==true)throw new HttpError(400,'Potwierdź zakres udostępnienia zgłoszenia.','CONFIRMATION_REQUIRED');
      const category=choice(body.category,['ACCESS','CONNECTION','ANSWER_SAVE','OTHER_TECHNICAL'] as const),statement=text(body.statement,1000,10);
 return {event:{attemptId:row.id,category},queries:[{text:'INSERT INTO faro_attempt_incidents(id,attempt_id,reporter_id,category,statement,reported_at,observed_state,observed_revision,original_deadline,original_started_at,original_expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',values:[randomUUID(),row.id,userId,category,statement,asOf,row.state,row.revision,row.deadline,row.started_at,row.expires_at]},
 {text:'UPDATE faro_attempts SET revision=revision+1 WHERE id=$1',values:[row.id]}]};
}
interface IncidentDatabase {
 readBatch(queries:Array<{text:string;values:readonly unknown[]}>):Promise<Record<string,unknown>[][]>;
 query(text:string,values:readonly unknown[]):Promise<unknown>;
 transaction<T>(work:()=>T|Promise<T>,options?:{readOnly?:boolean}):Promise<T>;
}
export async function reportAttemptIncident(database:IncidentDatabase,userId:string,id:string,body:Record<string,unknown>,asOf:string,authorize:()=>void|Promise<void>) {
 let row:AttemptRow,process:ProcessRow;
 const authorizeOwned=async()=>{await authorize();row=attemptFromRows((await database.readBatch([attemptReadQuery(id)]))[0]??[]);process=processFromRows((await database.readBatch([processReadQuery(row.process_id)]))[0]??[]);requireIncidentCandidate(userId,process);};
 await runCommandOnce(database,userId,body.idempotencyKey,{...body,id,operation:'ATTEMPT_INCIDENT_REPORT'},asOf,authorizeOwned,async()=>{
  const incident=(await database.readBatch([attemptIncidentQuery(id)]))[0]?.[0],plan=incidentReportPlan(userId,row,process,incident,body,asOf);
  for(const query of plan.queries)await database.query(query.text,query.values);
  const recipients=(await database.readBatch([processRecruiterReadQuery(process.offer_id)]))[0]??[];for(const query of processEventQueries(process,userId,'ATTEMPT_INCIDENT_REPORTED',plan.event,recipients,asOf))await database.query(query.text,query.values);
  return {id};
 });
 return database.transaction(async()=>{await authorizeOwned();return attemptViewOwned(database,userId,id,asOf);},{readOnly:true});
}
