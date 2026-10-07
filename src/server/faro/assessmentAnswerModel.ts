import { HttpError } from '../http.js';
import { integer,object,text } from './validation.js';
import { type Definition,assessmentDefinitionQuery,assessmentDefinitionFromRows } from './assessmentDefinitionModel.js';
import { type AttemptRow,attemptViewOwned } from './assessmentAttemptReadModel.js';
import { processReadQuery,processFromRows } from './processReadModel.js';
import { processRecruiterReadQuery,processEventQueries } from './interestWriteModel.js';
import { candidateOwned } from './assessmentStartModel.js';
import { expireAttempts,pinnedAttemptOfferQuery } from './assessmentExpiryModel.js';
export function attemptAnswerQueries(row:AttemptRow,definition:Definition,body:Record<string,unknown>,submit:boolean,decisionHours:number|null,asOf:string) {
    if(row.state==='EXPIRED')throw new HttpError(409,'Czas próby upłynął.','ATTEMPT_EXPIRED');
    if (row.state !== 'STARTED') throw new HttpError(409, 'Próba nie jest aktywna.');
    if (!row.expires_at || row.expires_at <= asOf) {
      throw new HttpError(409, 'Czas próby upłynął.', 'ATTEMPT_EXPIRED');
    }
    if (integer(body.expectedVersion, 1) !== row.revision) throw new HttpError(409, 'Odpowiedzi zmieniły się.', 'VERSION_CONFLICT');
    const raw = object(body.answers), answers: Record<string, number|string> = {};
    for (const [key, value] of Object.entries(raw)) {
      const task = definition.tasks.find(t => t.id === key); if (!task) throw new HttpError(400, 'Nieznane zadanie.');
      answers[key] = definition.type==='OPEN_ANSWER'?text(value,5000):integer(value, 0, task.options.length - 1);
    }
    const breakdown = definition.tasks.map(task => ({ taskId: task.id, earned: answers[task.id] === undefined||definition.type==='OPEN_ANSWER' ? null : answers[task.id] === task.answer ? task.points : 0, possible: task.points }));
    const result = { breakdown, earned: definition.type==='OPEN_ANSWER'?null:breakdown.reduce((sum, task) => sum + (task.earned ?? 0), 0), possible: breakdown.reduce((sum, task) => sum + task.possible, 0), unanswered:definition.tasks.filter(t=>answers[t.id]===undefined).length, assessmentVersion: row.assessment_version, rubricVersion: definition.rubricVersion, review: 'PENDING' };
    const queries:Array<{text:string;values:readonly (string|null)[]}>=[{text:'UPDATE faro_attempts SET answers=$1,revision=revision+1,state=$2,result=$3 WHERE id=$4',values:[JSON.stringify(answers),submit?'SCORED_PENDING_REVIEW':'STARTED',submit?JSON.stringify(result):null,row.id]}];
    if(submit){if(decisionHours===null)throw new HttpError(404,'Nie znaleziono wersji oferty.');queries.push({text:"UPDATE faro_interests SET stage='ASSESSMENT_COMPLETED',stage_due_at=$1,revision=revision+1 WHERE id=$2",values:[new Date(Date.parse(asOf)+decisionHours*3600000).toISOString(),row.process_id]});}
    return queries;
}
interface AnswerDatabase {
 readBatch(queries:Array<{text:string;values:readonly unknown[]}>):Promise<Record<string,unknown>[][]>;
 query(text:string,values:readonly unknown[]):Promise<unknown>;
 transaction<T>(work:()=>T|Promise<T>,options?:{readOnly?:boolean}):Promise<T>;
}
export async function saveAttempt(database:AnswerDatabase,userId:string,id:string,body:Record<string,unknown>,submit:boolean,asOf:string,authorize:()=>void|Promise<void>) {
 await expireAttempts(database,asOf,async()=>{await candidateOwned(database,userId,id,authorize);},id);
 return database.transaction(async()=>{
  const row=await candidateOwned(database,userId,id,authorize),process=processFromRows((await database.readBatch([processReadQuery(row.process_id)]))[0]??[]),definition=assessmentDefinitionFromRows((await database.readBatch([assessmentDefinitionQuery(row.assessment_id,row.assessment_version)]))[0]??[]);let decisionHours:number|null=null;
  if(submit){const pinned=(await database.readBatch([pinnedAttemptOfferQuery(process)]))[0]?.[0];if(pinned)decisionHours=(JSON.parse(pinned.content as string) as {decisionHours:number}).decisionHours;}
  for(const query of attemptAnswerQueries(row,JSON.parse(definition.content) as Definition,body,submit,decisionHours,asOf))await database.query(query.text,query.values);
  if(submit){const recipients=(await database.readBatch([processRecruiterReadQuery(process.offer_id)]))[0]??[];for(const query of processEventQueries(process,userId,'ATTEMPT_SUBMITTED',{attemptId:id},recipients,asOf))await database.query(query.text,query.values);}
  return attemptViewOwned(database,userId,id,asOf);
 });
}
