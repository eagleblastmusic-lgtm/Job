import { HttpError } from '../http.js';
import { integer,choice,text } from './validation.js';
import { type AttemptRow,attemptReadQuery,attemptFromRows,attemptHistoryQuery,attemptHistoryFromRows,attemptViewOwned,requireAttemptEmployerOwned } from './assessmentAttemptReadModel.js';
import { type ProcessRow,processReadQuery,processFromRows } from './processReadModel.js';
import { runCommandOnce } from './commandJournal.js';
import { processRecruiterReadQuery,processEventQueries } from './interestWriteModel.js';
type ResultHistory=ReturnType<typeof attemptHistoryFromRows>[number];
export function assessmentInvalidationPlan(row:AttemptRow,process:ProcessRow,previous:ResultHistory|undefined,body:Record<string,unknown>,asOf:string) {
      if(integer(body.expectedVersion,1)!==row.revision||integer(body.processVersion,1)!==process.revision)throw new HttpError(409,'Próba lub proces zmieniły się.','VERSION_CONFLICT');
      if(row.state!=='FINALIZED'||!previous||previous.validity!=='VALID')throw new HttpError(409,'Tylko aktualny zatwierdzony wynik można oznaczyć jako nieważny.','RESULT_NOT_VALID');
      if(body.confirmed!==true)throw new HttpError(400,'Potwierdź wycofanie ważności wyniku.','CONFIRMATION_REQUIRED');
      const reasonCode=choice(body.reasonCode,['KEY_ERROR','AMBIGUOUS_TASK','TECHNICAL_INCIDENT'] as const),reason=text(body.reason,1000,10);
 return {event:{attemptId:row.id,reasonCode},queries:[{text:"INSERT INTO faro_result_history(attempt_id,revision,validity,result,reason_code,reason,created_at) VALUES($1,$2,'INVALIDATED',$3,$4,$5,$6)",values:[row.id,previous.revision+1,JSON.stringify(previous.result),reasonCode,reason,asOf]},
 {text:'UPDATE faro_attempts SET revision=revision+1 WHERE id=$1',values:[row.id]}]};
}
interface InvalidationDatabase {
 readBatch(queries:Array<{text:string;values:readonly unknown[]}>):Promise<Record<string,unknown>[][]>;
 query(text:string,values:readonly unknown[]):Promise<unknown>;
 transaction<T>(work:()=>T|Promise<T>,options?:{readOnly?:boolean}):Promise<T>;
}
export async function invalidateAssessment(database:InvalidationDatabase,userId:string,id:string,body:Record<string,unknown>,asOf:string,authorize:()=>void|Promise<void>) {
 let row:AttemptRow,process:ProcessRow;
 return runCommandOnce(database,userId,body.idempotencyKey,{...body,id,operation:'ASSESSMENT_INVALIDATE'},asOf,async()=>{
  await authorize();row=attemptFromRows((await database.readBatch([attemptReadQuery(id)]))[0]??[]);process=processFromRows((await database.readBatch([processReadQuery(row.process_id)]))[0]??[]);await requireAttemptEmployerOwned(database,userId,process);
 },async()=>{
  const history=attemptHistoryFromRows((await database.readBatch([attemptHistoryQuery(id)]))[0]??[]),plan=assessmentInvalidationPlan(row,process,history.at(-1),body,asOf);
  for(const query of plan.queries)await database.query(query.text,query.values);
  const recipients=(await database.readBatch([processRecruiterReadQuery(process.offer_id)]))[0]??[];for(const query of processEventQueries(process,userId,'ASSESSMENT_RESULT_INVALIDATED',plan.event,recipients,asOf))await database.query(query.text,query.values);
  return attemptViewOwned(database,userId,id,asOf);
 });
}
