import { HttpError } from '../http.js';
import { integer,text,object } from './validation.js';
import { type Definition,assessmentDefinitionQuery,assessmentDefinitionFromRows } from './assessmentDefinitionModel.js';
import { type AttemptRow,attemptReadQuery,attemptFromRows,attemptHistoryQuery,attemptHistoryFromRows,attemptViewOwned,requireAttemptEmployerOwned } from './assessmentAttemptReadModel.js';
import { type ProcessRow,processReadQuery,processFromRows } from './processReadModel.js';
import { processRecruiterReadQuery,processEventQueries } from './interestWriteModel.js';
import { runCommandOnce } from './commandJournal.js';
type ResultHistory=ReturnType<typeof attemptHistoryFromRows>[number];
export function assessmentAmendmentPlan(row:AttemptRow,process:ProcessRow,definition:Definition,previous:ResultHistory|undefined,body:Record<string,unknown>,asOf:string) {
      if(integer(body.expectedVersion,1)!==row.revision||integer(body.processVersion,1)!==process.revision)throw new HttpError(409,'Próba lub proces zmieniły się.','VERSION_CONFLICT');
      if(row.state!=='FINALIZED'||previous?.validity!=='VALID')throw new HttpError(409,'Korekta wymaga aktualnego zatwierdzonego wyniku.','RESULT_NOT_VALID');
      if(body.confirmed!==true)throw new HttpError(400,'Potwierdź indywidualną korektę z zachowaniem historii.','CONFIRMATION_REQUIRED');
      const reason=text(body.reason,1000,10),answers=JSON.parse(row.answers) as Record<string,number>,scores=object(body.scores);
      if(Object.keys(scores).length!==definition.tasks.length||Object.keys(scores).some(key=>!definition.tasks.some(t=>t.id===key)))throw new HttpError(400,'Podaj ocenę każdego zadania przypisanej wersji.');
      const breakdown=definition.tasks.map(task=>{
        if(answers[task.id]===undefined) {if(scores[task.id]!==null)throw new HttpError(400,'Brak odpowiedzi pozostaje odrębny od zera punktów.');return {taskId:task.id,earned:null,possible:task.points};}
        return {taskId:task.id,earned:integer(scores[task.id],0,task.points),possible:task.points};
      });
      const result={...previous.result,breakdown,earned:breakdown.reduce((sum,t)=>sum+(t.earned??0),0),possible:breakdown.reduce((sum,t)=>sum+t.possible,0),unanswered:breakdown.filter(t=>t.earned===null).length,assessmentVersion:row.assessment_version,rubricVersion:definition.rubricVersion,review:'AMENDED',reviewNote:reason,comparisonStatus:'INDIVIDUAL_HUMAN_AMENDMENT',scoringRevision:null};
      if(JSON.stringify(previous.result.breakdown)===JSON.stringify(breakdown))throw new HttpError(409,'Punkty nie zmieniły się.');
 return {event:{attemptId:row.id,resultRevision:previous.revision+1},queries:[
 {text:"INSERT INTO faro_result_history(attempt_id,revision,validity,result,reason_code,reason,created_at) VALUES($1,$2,'VALID',$3,'HUMAN_AMENDMENT',$4,$5)",values:[row.id,previous.revision+1,JSON.stringify(result),reason,asOf]},
 {text:'UPDATE faro_attempts SET revision=revision+1 WHERE id=$1',values:[row.id]}]};
}
interface AmendmentDatabase {
 readBatch(queries:Array<{text:string;values:readonly unknown[]}>):Promise<Record<string,unknown>[][]>;
 query(text:string,values:readonly unknown[]):Promise<unknown>;
 transaction<T>(work:()=>T|Promise<T>,options?:{readOnly?:boolean}):Promise<T>;
}
export async function amendAssessment(database:AmendmentDatabase,userId:string,id:string,body:Record<string,unknown>,asOf:string,authorize:()=>void|Promise<void>) {
 let row:AttemptRow,process:ProcessRow;
 const authorizeOwned=async()=>{await authorize();row=attemptFromRows((await database.readBatch([attemptReadQuery(id)]))[0]??[]);process=processFromRows((await database.readBatch([processReadQuery(row.process_id)]))[0]??[]);await requireAttemptEmployerOwned(database,userId,process);};
 await runCommandOnce(database,userId,body.idempotencyKey,{...body,id,operation:'ASSESSMENT_AMEND'},asOf,authorizeOwned,async()=>{
  const rows=await database.readBatch([assessmentDefinitionQuery(row.assessment_id,row.assessment_version),attemptHistoryQuery(id)]),definition=assessmentDefinitionFromRows(rows[0]??[]),previous=attemptHistoryFromRows(rows[1]??[]).at(-1),plan=assessmentAmendmentPlan(row,process,JSON.parse(definition.content) as Definition,previous,body,asOf);
  for(const query of plan.queries)await database.query(query.text,query.values);
  const recipients=(await database.readBatch([processRecruiterReadQuery(process.offer_id)]))[0]??[];for(const query of processEventQueries(process,userId,'ASSESSMENT_RESULT_AMENDED',plan.event,recipients,asOf))await database.query(query.text,query.values);
  return {id};
 });
 // Existing contract projects current validity again after replay rather than returning a stale cached score.
 return database.transaction(async()=>{await authorizeOwned();return attemptViewOwned(database,userId,id,asOf);},{readOnly:true});
}
