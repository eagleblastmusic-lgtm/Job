import { runCommandOnce } from './commandJournal.js';
import { randomUUID } from 'node:crypto';
import { HttpError } from '../http.js';
import { text,integer,array,object,choice } from './validation.js';
import { offerReadQuery,offerFromRows } from './offerReadModel.js';
import { offerAssignedReadQuery,requireOfferAssignment } from './offerWriteModel.js';
import { membershipReadQuery,membershipFromRows } from './organizationReadModel.js';
export interface Task {id:string;prompt:string;options:string[];answer:number;points:number;evaluationCriteria?:string;}
export interface Definition {title:string;type:'QUIZ'|'OPEN_ANSWER';tasks:Task[];timeLimitMinutes:number;expectedMinutes:number;rubricVersion:string;scoringMode:'OBJECTIVE'|'HUMAN';}
export interface DefinitionRow {id:string;version:number;offer_id:string;state:'DRAFT'|'IN_REVIEW'|'APPROVED';content:string;origin:string;approved_by:string|null;approved_at:string|null;created_at:string;}
export function parseAssessment(body:Record<string,unknown>):Definition {
    const type=body.type===undefined?'QUIZ':choice(body.type,['QUIZ','OPEN_ANSWER'] as const);
    if(body.scoringMode!==undefined&&body.scoringMode!==(type==='QUIZ'?'OBJECTIVE':'HUMAN'))throw new HttpError(400,'Tryb oceny nie pasuje do typu zadania.');
    const tasks = array(body.tasks, 50).map((raw, index) => {
      if(type==='OPEN_ANSWER') {const task=object(raw);if('options' in task||'answer' in task)throw new HttpError(400,'Zadanie otwarte nie ma klucza wyboru.');return {id:`task-${index+1}`,prompt:text(task.prompt,1500),options:[],answer:0,points:integer(task.points,1,100),evaluationCriteria:text(task.evaluationCriteria,1500,10)};}
      const task = object(raw), options = array(task.options, 8).map(option => text(option, 500));
      if (options.length < 2) throw new HttpError(400, 'Zadanie wymaga przynajmniej dwóch odpowiedzi.');
      return { id: `task-${index + 1}`, prompt: text(task.prompt, 1500), options, answer: integer(task.answer, 0, options.length - 1), points: integer(task.points, 1, 100) };
    });
    if (!tasks.length) throw new HttpError(400, 'Dodaj zadanie.');
    for (const forbidden of ['internetAllowed','aiAllowed','globalSkillExpiry','cumulativeTestTimeLimit']) if (forbidden in body) throw new HttpError(400, 'Pole nie należy do Canonical.');
    return { title: text(body.title, 150), type, tasks, timeLimitMinutes: integer(body.timeLimitMinutes, 1, 480), expectedMinutes: integer(body.expectedMinutes, 1, 480), rubricVersion: text(body.rubricVersion, 80), scoringMode: type==='QUIZ'?'OBJECTIVE':'HUMAN' };
}
export function assessmentDefinitionQuery(id:string,version:number) {integer(version,1);return {text:'SELECT id,version,offer_id,state,content,origin,approved_by,approved_at,created_at FROM faro_assessments WHERE id=$1 AND version=$2',values:[id,version]};}
export function assessmentDefinitionFromRows(rows:Record<string,unknown>[]):DefinitionRow {if(!rows[0])throw new HttpError(404,'Nie znaleziono wersji assessmentu.');return rows[0] as unknown as DefinitionRow;}
export function assessmentListQuery(offerId:string,postgres=false) {return {text:`SELECT id,version,state,origin,content,approved_at FROM faro_assessments WHERE offer_id=$1 ORDER BY created_at DESC,${postgres?'__faro_source_rowid':'rowid'} ASC`,values:[offerId]};}
export function assessmentLatestQuery(id:string,offerId?:string) {return {text:'SELECT MAX(version) version FROM faro_assessments WHERE id=$1'+(offerId?' AND offer_id=$2':''),values:offerId?[id,offerId]:[id]};}
function auditQuery(userId:string,id:string,action:string,asOf:string) {return {text:'INSERT INTO audit_logs(id,user_id,action,entity_type,entity_id,metadata,created_at) VALUES($1,$2,$3,$4,$5,$6,$7)',values:[randomUUID(),userId,action,'faro',id,'{}',asOf]};}
export function assessmentCreatePlan(userId:string,offerId:string,body:Record<string,unknown>,prior:number|null,id:string,previous:boolean,asOf:string) {
  const definition=parseAssessment(body);if(previous&&!prior)throw new HttpError(404,'Nie znaleziono assessmentu w tej rekrutacji.');
  const version=(prior??0)+1;
  return {ack:{id,version,state:'DRAFT'},queries:[{text:"INSERT INTO faro_assessments(id,version,offer_id,state,content,origin,created_at) VALUES($1,$2,$3,'DRAFT',$4,$5,$6)",values:[id,version,offerId,JSON.stringify(definition),body.origin==='AI'?'AI':'HUMAN',asOf]},auditQuery(userId,id,'ASSESSMENT_DRAFT_CREATED',asOf)]};
}
export function assessmentApprovalPlan(userId:string,row:DefinitionRow,body:Record<string,unknown>,latest:number,asOf:string) {
  if(row.version!==latest)throw new HttpError(409,'Starsza wersja jest historią. Przejrzyj najnowszy szkic.','ASSESSMENT_SUPERSEDED');
  const action=choice(body.action,['REVIEW','APPROVE'] as const);
  if(action==='REVIEW'&&row.state!=='DRAFT'||action==='APPROVE'&&row.state!=='IN_REVIEW')throw new HttpError(409,'Assessment wymaga właściwego etapu review.');
  if(action==='APPROVE'&&body.confirmed!==true)throw new HttpError(400,'Zatwierdź treść, rubrykę, czas i prawa do zadań.');
  const state=action==='REVIEW'?'IN_REVIEW':'APPROVED';
  return {ack:{id:row.id,version:row.version,state},queries:[{text:'UPDATE faro_assessments SET state=$1,approved_by=$2,approved_at=$3 WHERE id=$4 AND version=$5',values:[state,action==='APPROVE'?userId:null,action==='APPROVE'?asOf:null,row.id,row.version]},auditQuery(userId,row.id,`ASSESSMENT_${action}`,asOf)]};
}
interface AssessmentDatabase {
  readBatch(queries:Array<{text:string;values:readonly unknown[]}>):Promise<Record<string,unknown>[][]>;
  query(text:string,values:readonly unknown[]):Promise<unknown>;
  transaction<T>(work:()=>T|Promise<T>,options?:{readOnly?:boolean}):Promise<T>;
}
async function assignedOwned(database:AssessmentDatabase,userId:string,offerId:string) {
  const offer=offerFromRows((await database.readBatch([offerReadQuery(offerId)]))[0]??[]),rows=await database.readBatch([membershipReadQuery(userId,offer.organizationId),offerAssignedReadQuery(userId,offerId)]);membershipFromRows(rows[0]??[]);requireOfferAssignment(rows[1]??[]);
}
export async function readAssessment(database:AssessmentDatabase,userId:string,id:string,version:number) {
  return database.transaction(async()=>{const row=assessmentDefinitionFromRows((await database.readBatch([assessmentDefinitionQuery(id,version)]))[0]??[]);await assignedOwned(database,userId,row.offer_id);return row;},{readOnly:true});
}
export async function readAssessments(database:AssessmentDatabase,userId:string,offerId:string) {
  return database.transaction(async()=>{await assignedOwned(database,userId,offerId);return (await database.readBatch([assessmentListQuery(offerId,true)]))[0]??[];},{readOnly:true});
}
export async function createAssessment(database:AssessmentDatabase,userId:string,offerId:string,body:Record<string,unknown>,asOf:string,authorize:()=>void|Promise<void>,previousId?:string) {
  return database.transaction(async()=>{await authorize();await assignedOwned(database,userId,offerId);const id=previousId??randomUUID(),prior=(await database.readBatch([assessmentLatestQuery(id,offerId)]))[0]?.[0]?.version as number|null,plan=assessmentCreatePlan(userId,offerId,body,prior,id,Boolean(previousId),asOf);for(const query of plan.queries)await database.query(query.text,query.values);return plan.ack;});
}
export async function approveAssessment(database:AssessmentDatabase,userId:string,id:string,body:Record<string,unknown>,asOf:string,authorize:()=>void|Promise<void>) {
  return database.transaction(async()=>{await authorize();const row=assessmentDefinitionFromRows((await database.readBatch([assessmentDefinitionQuery(id,integer(body.version,1))]))[0]??[]);await assignedOwned(database,userId,row.offer_id);const latest=(await database.readBatch([assessmentLatestQuery(id)]))[0]?.[0]?.version as number,plan=assessmentApprovalPlan(userId,row,body,latest,asOf);for(const query of plan.queries)await database.query(query.text,query.values);return plan.ack;});
}

export function assessmentEditInput(row:DefinitionRow,latest:number,body:Record<string,unknown>) {
  if(integer(body.expectedVersion,1)!==row.version||latest!==row.version)throw new HttpError(409,'Odśwież najnowszą wersję assessmentu.','VERSION_CONFLICT');
  return {...object(body.data),origin:row.origin};
}
export async function editAssessment(database:AssessmentDatabase,userId:string,id:string,version:number,body:Record<string,unknown>,asOf:string,authorize:()=>void|Promise<void>) {
  let prior:DefinitionRow;
  return runCommandOnce(database,userId,body.idempotencyKey,{...body,id,version,operation:'ASSESSMENT_EDIT'},asOf,async()=>{
    await authorize();prior=assessmentDefinitionFromRows((await database.readBatch([assessmentDefinitionQuery(id,version)]))[0]??[]);await assignedOwned(database,userId,prior.offer_id);
  },async()=>{
    const latest=(await database.readBatch([assessmentLatestQuery(id)]))[0]?.[0]?.version as number,data=assessmentEditInput(prior,latest,body),plan=assessmentCreatePlan(userId,prior.offer_id,data,latest,id,true,asOf);
    for(const query of plan.queries)await database.query(query.text,query.values);
    return plan.ack;
  });
}
