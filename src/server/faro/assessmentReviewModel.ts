import { randomUUID } from 'node:crypto';
import { HttpError } from '../http.js';
import { integer,text,object } from './validation.js';
import { TERMINAL } from '../../domain/faro/recruitment.js';
import { type Definition,assessmentDefinitionQuery,assessmentDefinitionFromRows } from './assessmentDefinitionModel.js';
import { type ProcessRow,processReadQuery,processFromRows } from './processReadModel.js';
import { type AttemptRow,attemptReadQuery,attemptFromRows,attemptContextQueries,attemptViewOwned,requireAttemptEmployerOwned } from './assessmentAttemptReadModel.js';
import { processRecruiterReadQuery,processEventQueries } from './interestWriteModel.js';
import { runCommandOnce } from './commandJournal.js';
export function assessmentFinalizeQueries(userId:string,row:AttemptRow,process:ProcessRow,definition:Definition,incident:{state:string}|undefined,body:Record<string,unknown>,asOf:string) {
      if(integer(body.expectedVersion,1)!==row.revision||integer(body.processVersion,1)!==process.revision)throw new HttpError(409,'Próba lub proces zmieniły się. Odśwież wynik.','VERSION_CONFLICT');
      if(TERMINAL.includes(process.status))throw new HttpError(409,'Proces został zakończony.','PROCESS_TERMINAL');
      if(incident?.state==='OPEN')throw new HttpError(409,'Najpierw rozpatrz zgłoszenie techniczne.','INCIDENT_REVIEW_REQUIRED');
      if(row.state!=='SCORED_PENDING_REVIEW'||!row.result||body.confirmed!==true)throw new HttpError(409,'Wynik wymaga świadomego review.');
      const note=text(body.note,1000,10),result={...JSON.parse(row.result) as Record<string,unknown>,review:'FINALIZED',reviewNote:note};
      if(definition.type==='OPEN_ANSWER') {
        const scores=object(body.scores),answers=JSON.parse(row.answers) as Record<string,string>;
        if(Object.keys(scores).length!==definition.tasks.length||Object.keys(scores).some(k=>!definition.tasks.some(t=>t.id===k)))throw new HttpError(400,'Oceń każde zadanie przypisanej rubryki.');
        const breakdown=definition.tasks.map(t=>{if(answers[t.id]===undefined){if(scores[t.id]!==null)throw new HttpError(400,'Brak odpowiedzi pozostaje odrębny od zera.');return {taskId:t.id,earned:null,possible:t.points};}return {taskId:t.id,earned:integer(scores[t.id],0,t.points),possible:t.points};});
        Object.assign(result,{breakdown,earned:breakdown.reduce((sum,t)=>sum+(t.earned??0),0),comparisonStatus:'HUMAN_RUBRIC_REVIEW'});
      }
 return [
  {text:"UPDATE faro_attempts SET state='FINALIZED',result=$1,reviewer_id=$2,reviewed_at=$3,revision=revision+1 WHERE id=$4",values:[JSON.stringify(result),userId,asOf,row.id]},
  {text:"INSERT INTO faro_result_history(attempt_id,revision,validity,result,created_at) VALUES($1,1,'VALID',$2,$3)",values:[row.id,JSON.stringify(result),asOf]},
  {text:'INSERT INTO audit_logs(id,user_id,action,entity_type,entity_id,metadata,created_at) VALUES($1,$2,$3,$4,$5,$6,$7)',values:[randomUUID(),userId,'ASSESSMENT_RESULT_REVIEWED','faro',row.id,'{}',asOf]}
 ];
}
interface ReviewDatabase {
 readBatch(queries:Array<{text:string;values:readonly unknown[]}>):Promise<Record<string,unknown>[][]>;
 query(text:string,values:readonly unknown[]):Promise<unknown>;
 transaction<T>(work:()=>T|Promise<T>,options?:{readOnly?:boolean}):Promise<T>;
}
export async function finalizeAssessment(database:ReviewDatabase,userId:string,id:string,body:Record<string,unknown>,asOf:string,authorize:()=>void|Promise<void>) {
 let row:AttemptRow,process:ProcessRow;
 return runCommandOnce(database,userId,body.idempotencyKey,{...body,id,operation:'ASSESSMENT_FINALIZE'},asOf,async()=>{
  await authorize();row=attemptFromRows((await database.readBatch([attemptReadQuery(id)]))[0]??[]);process=processFromRows((await database.readBatch([processReadQuery(row.process_id)]))[0]??[]);await requireAttemptEmployerOwned(database,userId,process);
 },async()=>{
  const definition=assessmentDefinitionFromRows((await database.readBatch([assessmentDefinitionQuery(row.assessment_id,row.assessment_version)]))[0]??[]),incident=(await database.readBatch(attemptContextQueries(row).slice(1,2)))[0]?.[0] as {state:string}|undefined;
  for(const query of assessmentFinalizeQueries(userId,row,process,JSON.parse(definition.content) as Definition,incident,body,asOf))await database.query(query.text,query.values);
  const recipients=(await database.readBatch([processRecruiterReadQuery(process.offer_id)]))[0]??[];for(const query of processEventQueries(process,userId,'ASSESSMENT_FINALIZED',{attemptId:id},recipients,asOf))await database.query(query.text,query.values);
  return attemptViewOwned(database,userId,id,asOf);
 });
}
