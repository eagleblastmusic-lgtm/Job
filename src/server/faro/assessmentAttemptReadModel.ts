import { HttpError } from '../http.js';
import { type Definition,assessmentDefinitionQuery,assessmentDefinitionFromRows } from './assessmentDefinitionModel.js';
import { type ProcessRow,processReadQuery,processFromRows } from './processReadModel.js';
import { offerReadQuery,offerFromRows } from './offerReadModel.js';
import { membershipReadQuery,membershipFromRows } from './organizationReadModel.js';
import { offerAssignedReadQuery,requireOfferAssignment } from './offerWriteModel.js';
export interface AttemptRow { id: string; process_id: string; assessment_id: string; assessment_version: number; state: string; deadline: string; started_at: string | null; expires_at: string | null; answers: string; revision: number; result: string | null; attempt_number:number;retry_of:string|null;retry_reason:string|null;retry_authorized_at:string|null; }
export interface IncidentRow { id:string; category:string; statement:string; reportedAt:string; observedState:string; observedRevision:number; originalDeadline:string; originalStartedAt:string|null; originalExpiresAt:string|null; state:string; revision:number; resolution:string|null; reason:string|null; resolvedAt:string|null; }
export function attemptReadQuery(id:string) {return {text:'SELECT id,process_id,assessment_id,assessment_version,state,deadline,started_at,expires_at,answers,revision,result,attempt_number,retry_of,retry_reason,retry_authorized_at FROM faro_attempts WHERE id=$1',values:[id]};}
export function attemptFromRows(rows:Record<string,unknown>[]):AttemptRow {const row=rows[0] as unknown as AttemptRow|undefined;if(!row)throw new HttpError(404,'Nie znaleziono próby.');return row;}
export function attemptHistoryQuery(id:string) {return {text:'SELECT revision,validity,result,reason_code AS "reasonCode",reason,created_at AS "createdAt" FROM faro_result_history WHERE attempt_id=$1 ORDER BY revision',values:[id]};}
export function attemptContextQueries(row:AttemptRow) {return [
 attemptHistoryQuery(row.id),
 {text:'SELECT id,category,statement,reported_at AS "reportedAt",observed_state AS "observedState",observed_revision AS "observedRevision",original_deadline AS "originalDeadline",original_started_at AS "originalStartedAt",original_expires_at AS "originalExpiresAt",state,revision,resolution,reason,resolved_at AS "resolvedAt" FROM faro_attempt_incidents WHERE attempt_id=$1',values:[row.id]},
 {text:'SELECT id FROM faro_attempts WHERE retry_of=$1',values:[row.id]},
 {text:'SELECT id FROM faro_key_corrections WHERE assessment_id=$1 AND assessment_version=$2 ORDER BY revision DESC LIMIT 1',values:[row.assessment_id,row.assessment_version]},
 {text:"SELECT id FROM faro_attempts WHERE process_id=$1 AND state IN ('INVITED','STARTED','SCORED_PENDING_REVIEW')",values:[row.process_id]}
];}
export function attemptHistoryFromRows(rows:Record<string,unknown>[]) {return rows.map(row=>({revision:Number(row.revision),validity:row.validity as 'VALID'|'INVALIDATED',reasonCode:row.reasonCode as string|null,reason:row.reason as string|null,createdAt:row.createdAt as string|null,result:JSON.parse(row.result as string) as Record<string,unknown>}));}
export function attemptView(row:AttemptRow,process:ProcessRow,content:Definition,userId:string,asOf:string,context:Record<string,unknown>[][],retryRole:string|null) {
 const id=row.id,candidate=process.candidate_id===userId,history=row.state==='FINALIZED'?attemptHistoryFromRows(context[0]??[]):[],incident=context[1]?.[0] as unknown as IncidentRow|undefined,retryAttempt=context[2]?.[0] as {id:string}|undefined,corrected=Boolean(context[3]?.length),active=Boolean(context[4]?.length),submitted=['SCORED_PENDING_REVIEW','FINALIZED'].includes(row.state),savedAnswers=JSON.parse(row.answers) as Record<string,number|string>;
    return { id, attemptNumber:row.attempt_number,retryOf:row.retry_of,retryReason:row.retry_reason,retryAuthorizedAt:row.retry_authorized_at,retryAttemptId:retryAttempt?.id??null,canRetry:retryRole!==null&&retryRole!=='HIRING_MANAGER'&&row.state==='TECHNICAL_ISSUE'&&incident?.resolution==='ISSUE_CONFIRMED'&&process.status==='ACTIVE'&&process.stage==='ACCEPTED_TO_NEXT_STAGE'&&!retryAttempt&&!corrected&&!active, incident:incident??null,resultValidity:history.at(-1)?.validity??null,resultHistory:history, viewer:candidate?'CANDIDATE':'EMPLOYER', processId: row.process_id, processVersion:process.revision, state: row.state, title: content.title, type: content.type, taskCount: content.tasks.length, timeLimitMinutes: content.timeLimitMinutes, expectedMinutes: content.expectedMinutes, deadline: row.deadline, startedAt: row.started_at, expiresAt: row.expires_at, serverNow: asOf, revision: row.revision, rubricVersion: content.rubricVersion, scoringMode: content.scoringMode,
      tasks: candidate && row.started_at ? content.tasks.map(task => ({ id: task.id, prompt: task.prompt, options: task.options, points: task.points,evaluationCriteria:task.evaluationCriteria })) : [],
      reviewTasks:!candidate&&submitted?content.tasks.map(t=>({id:t.id,prompt:t.prompt,options:t.options,points:t.points,correctOption:content.type==='QUIZ'?t.answer:null,chosenOption:typeof savedAnswers[t.id]==='number'?savedAnswers[t.id]:null,chosenText:typeof savedAnswers[t.id]==='string'?savedAnswers[t.id]:null,evaluationCriteria:t.evaluationCriteria})):[],
      answers: candidate ? savedAnswers : {}, result: submitted && row.result && (row.state!=='FINALIZED'||history.at(-1)?.validity==='VALID') && (row.state === 'FINALIZED' || !candidate) ? (row.state==='FINALIZED'?history.at(-1)!.result:JSON.parse(row.result) as Record<string, unknown>) : null };
}

interface AttemptReadDatabase {
 readBatch(queries:Array<{text:string;values:readonly unknown[]}>):Promise<Record<string,unknown>[][]>;
 transaction<T>(work:()=>T|Promise<T>,options?:{readOnly?:boolean}):Promise<T>;
}
export async function requireAttemptEmployerOwned(database:AttemptReadDatabase,userId:string,process:ProcessRow) {
 const offer=offerFromRows((await database.readBatch([offerReadQuery(process.offer_id)]))[0]??[]),access=await database.readBatch([membershipReadQuery(userId,offer.organizationId),offerAssignedReadQuery(userId,process.offer_id)]);const member=membershipFromRows(access[0]??[]);requireOfferAssignment(access[1]??[]);return member.role;
}
async function attemptProcessOwned(database:AttemptReadDatabase,userId:string,processId:string) {
 const process=processFromRows((await database.readBatch([processReadQuery(processId)]))[0]??[]);let role:string|null=null;
 if(process.candidate_id!==userId)role=await requireAttemptEmployerOwned(database,userId,process);
 return {process,role};
}
export async function attemptViewOwned(database:AttemptReadDatabase,userId:string,id:string,asOf:string) {
 const row=attemptFromRows((await database.readBatch([attemptReadQuery(id)]))[0]??[]),{process,role}=await attemptProcessOwned(database,userId,row.process_id),definition=assessmentDefinitionFromRows((await database.readBatch([assessmentDefinitionQuery(row.assessment_id,row.assessment_version)]))[0]??[]);
 return attemptView(row,process,JSON.parse(definition.content) as Definition,userId,asOf,await database.readBatch(attemptContextQueries(row)),role);
}
export async function readAttempt(database:AttemptReadDatabase,userId:string,id:string,asOf:string,authorize:()=>void|Promise<void>) {return database.transaction(async()=>{await authorize();return attemptViewOwned(database,userId,id,asOf);},{readOnly:true});}
export function attemptListQuery(userId:string,processId?:string,postgres=false) {const order=postgres?'a.__faro_source_rowid':'a.rowid';return processId?{text:`SELECT a.id FROM faro_attempts a WHERE a.process_id=$1 ORDER BY ${order}`,values:[processId]}:{text:`SELECT a.id FROM faro_attempts a JOIN faro_interests p ON p.id=a.process_id WHERE p.candidate_id=$1 ORDER BY ${order}`,values:[userId]};}
export async function readAttempts(database:AttemptReadDatabase,userId:string,asOf:string,authorize:()=>void|Promise<void>,processId?:string) {return database.transaction(async()=>{await authorize();if(processId)await attemptProcessOwned(database,userId,processId);const rows=(await database.readBatch([attemptListQuery(userId,processId,true)]))[0]??[],views=[];for(const row of rows)views.push(await attemptViewOwned(database,userId,row.id as string,asOf));return views;},{readOnly:true});}
