import { randomUUID } from 'node:crypto';
import { HttpError } from '../http.js';
import { integer,choice,text } from './validation.js';
import { TERMINAL } from '../../domain/faro/recruitment.js';
import { pinnedAttemptOfferQuery } from './assessmentExpiryModel.js';
import { type IncidentRow,requireAttemptEmployerOwned,type AttemptRow,attemptReadQuery,attemptFromRows,attemptIncidentQuery,attemptViewOwned } from './assessmentAttemptReadModel.js';
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

export function otherActiveAttemptQuery(processId:string,id:string) {return {text:"SELECT id FROM faro_attempts WHERE process_id=$1 AND id<>$2 AND state IN ('INVITED','STARTED','SCORED_PENDING_REVIEW')",values:[processId,id]};}
export function incidentResolutionPlan(userId:string,row:AttemptRow,process:ProcessRow,incident:IncidentRow|undefined,anotherActive:boolean,decisionHours:number|null,body:Record<string,unknown>,asOf:string) {
      if(!incident)throw new HttpError(404,'Nie znaleziono zgłoszenia.');
      if(integer(body.expectedVersion,1)!==row.revision||integer(body.processVersion,1)!==process.revision||integer(body.incidentVersion,1)!==incident.revision)throw new HttpError(409,'Próba, proces lub zgłoszenie zmieniły się.','VERSION_CONFLICT');
      if(incident.state!=='OPEN')throw new HttpError(409,'Zgłoszenie ma już rozstrzygnięcie.','INCIDENT_RESOLVED');
      if(body.confirmed!==true)throw new HttpError(400,'Potwierdź ręczny przegląd zgłoszenia.','CONFIRMATION_REQUIRED');
      const resolution=choice(body.resolution,['ISSUE_CONFIRMED','NOT_ESTABLISHED'] as const),reason=text(body.reason,1000,10);
      const neutralize=resolution==='ISSUE_CONFIRMED'&&['INVITED','STARTED','EXPIRED','SCORED_PENDING_REVIEW'].includes(row.state);

 const queries:Array<{text:string;values:readonly (string|number|null)[]}>=[{text:"UPDATE faro_attempt_incidents SET state='RESOLVED',revision=2,resolution=$1,reason=$2,resolved_at=$3,reviewer_id=$4 WHERE attempt_id=$5",values:[resolution,reason,asOf,userId,row.id]},
 {text:'UPDATE faro_attempts SET state=$1,revision=revision+1 WHERE id=$2',values:[neutralize?'TECHNICAL_ISSUE':row.state,row.id]}];
 if(neutralize&&!TERMINAL.includes(process.status)&&!anotherActive&&['ASSESSMENT_REQUESTED','ASSESSMENT_COMPLETED'].includes(process.stage)){
  if(decisionHours===null)throw new HttpError(404,'Nie znaleziono wersji oferty.');
  queries.push({text:"UPDATE faro_interests SET stage='ACCEPTED_TO_NEXT_STAGE',stage_due_at=$1,next_action=$2,revision=revision+1 WHERE id=$3",values:[new Date(Date.parse(asOf)+decisionHours*3600000).toISOString(),'Problem techniczny potwierdzony. Ustal r\u0119cznie dalszy krok; brak automatycznej oceny lub odmowy.',process.id]});
 }
 return {event:{attemptId:row.id,resolution},queries};
}
export async function resolveAttemptIncident(database:IncidentDatabase,userId:string,id:string,body:Record<string,unknown>,asOf:string,authorize:()=>void|Promise<void>) {
 let row:AttemptRow,process:ProcessRow;
 const authorizeOwned=async()=>{await authorize();row=attemptFromRows((await database.readBatch([attemptReadQuery(id)]))[0]??[]);process=processFromRows((await database.readBatch([processReadQuery(row.process_id)]))[0]??[]);if(process.candidate_id===userId)throw new HttpError(404,'Nie znaleziono przegl\u0105du.');await requireAttemptEmployerOwned(database,userId,process);};
 await runCommandOnce(database,userId,body.idempotencyKey,{...body,id,operation:'ATTEMPT_INCIDENT_RESOLVE'},asOf,authorizeOwned,async()=>{
  const rows=await database.readBatch([attemptIncidentQuery(id),otherActiveAttemptQuery(process.id,id)]),incident=rows[0]?.[0] as unknown as IncidentRow|undefined,anotherActive=Boolean(rows[1]?.length);let decisionHours:number|null=null;
  if(incident&&body.resolution==='ISSUE_CONFIRMED'&&['INVITED','STARTED','EXPIRED','SCORED_PENDING_REVIEW'].includes(row.state)&&!TERMINAL.includes(process.status)&&!anotherActive&&['ASSESSMENT_REQUESTED','ASSESSMENT_COMPLETED'].includes(process.stage)){const pinned=(await database.readBatch([pinnedAttemptOfferQuery(process)]))[0]?.[0];if(pinned)decisionHours=(JSON.parse(pinned.content as string) as {decisionHours:number}).decisionHours;}
  const plan=incidentResolutionPlan(userId,row,process,incident,anotherActive,decisionHours,body,asOf);for(const query of plan.queries)await database.query(query.text,query.values);
  const recipients=(await database.readBatch([processRecruiterReadQuery(process.offer_id)]))[0]??[];for(const query of processEventQueries(process,userId,'ATTEMPT_INCIDENT_RESOLVED',plan.event,recipients,asOf))await database.query(query.text,query.values);
  return {id};
 });
 return database.transaction(async()=>{await authorizeOwned();return attemptViewOwned(database,userId,id,asOf);},{readOnly:true});
}
