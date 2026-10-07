import { randomUUID } from 'node:crypto';
import { HttpError } from '../http.js';
import { TERMINAL } from '../../domain/faro/recruitment.js';
import { type Definition,assessmentDefinitionQuery,assessmentDefinitionFromRows } from './assessmentDefinitionModel.js';
import { type ProcessRow,processReadQuery,processFromRows } from './processReadModel.js';
import { type AttemptRow,attemptReadQuery,attemptFromRows,attemptViewOwned } from './assessmentAttemptReadModel.js';
import { expireAttempts } from './assessmentExpiryModel.js';
export function requireAttemptCandidate(userId:string,process:ProcessRow) {
 if(process.candidate_id!==userId)throw new HttpError(404,'Nie znaleziono pr\u00f3by.');
 if(TERMINAL.includes(process.status))throw new HttpError(409,'Proces zosta\u0142 zako\u0144czony.');
}
export function attemptStartQueries(userId:string,row:AttemptRow,definition:Definition,asOf:string) {
 if(row.state==='STARTED')return [];
 if(row.state!=='INVITED'||row.deadline<=asOf)throw new HttpError(409,'Zaproszenie nie jest ju\u017c aktywne.','ATTEMPT_EXPIRED');
 const expires=new Date(Math.min(Date.parse(row.deadline),Date.parse(asOf)+definition.timeLimitMinutes*60000)).toISOString();
 return [{text:"UPDATE faro_attempts SET state='STARTED',started_at=$1,expires_at=$2,revision=revision+1 WHERE id=$3",values:[asOf,expires,row.id]},
 {text:'INSERT INTO audit_logs(id,user_id,action,entity_type,entity_id,metadata,created_at) VALUES($1,$2,$3,$4,$5,$6,$7)',values:[randomUUID(),userId,'ATTEMPT_STARTED','faro',row.id,'{}',asOf]}];
}
interface StartDatabase {
 readBatch(queries:Array<{text:string;values:readonly unknown[]}>):Promise<Record<string,unknown>[][]>;
 query(text:string,values:readonly unknown[]):Promise<unknown>;
 transaction<T>(work:()=>T|Promise<T>,options?:{readOnly?:boolean}):Promise<T>;
}
async function candidateOwned(database:StartDatabase,userId:string,id:string,authorize:()=>void|Promise<void>) {
 await authorize();const row=attemptFromRows((await database.readBatch([attemptReadQuery(id)]))[0]??[]),process=processFromRows((await database.readBatch([processReadQuery(row.process_id)]))[0]??[]);requireAttemptCandidate(userId,process);return row;
}
export async function startAttempt(database:StartDatabase,userId:string,id:string,asOf:string,authorize:()=>void|Promise<void>) {
 // Expiry is committed before a refused start, matching the existing server-authoritative lifecycle.
 await expireAttempts(database,asOf,async()=>{await candidateOwned(database,userId,id,authorize);},id);
 return database.transaction(async()=>{
  const row=await candidateOwned(database,userId,id,authorize),definition=assessmentDefinitionFromRows((await database.readBatch([assessmentDefinitionQuery(row.assessment_id,row.assessment_version)]))[0]??[]);
  for(const query of attemptStartQueries(userId,row,JSON.parse(definition.content) as Definition,asOf))await database.query(query.text,query.values);
  return attemptViewOwned(database,userId,id,asOf);
 });
}
