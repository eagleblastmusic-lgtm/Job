import { createHash } from 'node:crypto';
import { HttpError } from '../http.js';
import { text,object,array,integer } from './validation.js';
import { type Definition,type DefinitionRow,assessmentDefinitionQuery,assessmentDefinitionFromRows } from './assessmentDefinitionModel.js';
import { type AttemptRow,attemptReadQuery,attemptFromRows,attemptHistoryQuery,attemptHistoryFromRows,requireAttemptEmployerOwned } from './assessmentAttemptReadModel.js';
import { processReadQuery,processFromRows } from './processReadModel.js';
import { offerReadQuery,offerFromRows } from './offerReadModel.js';
import { membershipReadQuery,membershipFromRows } from './organizationReadModel.js';
import { offerAssignedReadQuery,requireOfferAssignment } from './offerWriteModel.js';
export interface CorrectedKey {id:string;revision:number;accepted_options:string;}
export function correctedKeyQuery(id:string,version:number) {return {text:'SELECT id,revision,accepted_options FROM faro_key_corrections WHERE assessment_id=$1 AND assessment_version=$2 ORDER BY revision DESC LIMIT 1',values:[id,version]};}
export function cohortAttemptsQuery(id:string,version:number) {return {text:'SELECT a.id FROM faro_attempts a WHERE a.assessment_id=$1 AND a.assessment_version=$2 ORDER BY a.id LIMIT 501',values:[id,version]};}
export function cohortKeyInput(definition:DefinitionRow,previous:CorrectedKey|undefined,body:Record<string,unknown>) {
 const content=JSON.parse(definition.content) as Definition;
    if(content.type!=='QUIZ')throw new HttpError(409,'Odpowiedzi otwarte wymagają indywidualnego ręcznego przeglądu, bez klucza quizu.','NO_OBJECTIVE_KEY');
    if(definition.state!=='APPROVED')throw new HttpError(409,'Korekta dotyczy zatwierdzonej przypisanej wersji.');
    const reason=text(body.reason,1000,10),raw=object(body.acceptedOptions),key:Record<string,number[]>={};
    if(Object.keys(raw).length!==content.tasks.length||Object.keys(raw).some(k=>!content.tasks.some(t=>t.id===k)))throw new HttpError(400,'Podaj wspólny klucz wszystkich zadań.');
    for(const task of content.tasks) {const options=array(raw[task.id],task.options.length).map(v=>integer(v,0,task.options.length-1));if(!options.length||new Set(options).size!==options.length)throw new HttpError(400,'Wybierz poprawne odpowiedzi bez duplikatów.');key[task.id]=options.sort((a,b)=>a-b);}
    const original=Object.fromEntries(content.tasks.map(t=>[t.id,[t.answer]]));
    if(JSON.stringify(key)===JSON.stringify(previous?JSON.parse(previous.accepted_options):original))throw new HttpError(409,'Wspólny klucz nie zmienił się.');
 return {content,key,reason};
}
export function cohortEffect(content:Definition,key:Record<string,number[]>,attempt:AttemptRow,processRevision:number,history:ReturnType<typeof attemptHistoryFromRows>[number]|undefined) {
 const attemptId=attempt.id,answers=JSON.parse(attempt.answers) as Record<string,number>;
      const breakdown=content.tasks.map(t=>({taskId:t.id,earned:answers[t.id]===undefined?null:key[t.id]!.includes(answers[t.id]!)?t.points:0,possible:t.points}));
      return {attemptId,state:attempt.state,validity:history?.validity??null,manual:history?.result.review==='AMENDED',before:history?.result.earned??null,after:attempt.state==='FINALIZED'&&history?.validity==='VALID'?breakdown.reduce((sum,t)=>sum+(t.earned??0),0):null,attempt,processRevision,history,breakdown};
}
export function cohortPreview(userId:string,id:string,version:number,definition:DefinitionRow,previous:CorrectedKey|undefined,key:Record<string,number[]>,reason:string,effects:Array<ReturnType<typeof cohortEffect>>) {
    const blocked=effects.some(e=>['INVITED','STARTED','SCORED_PENDING_REVIEW'].includes(e.state)),manualCount=effects.filter(e=>e.manual&&e.validity==='VALID').length;
    const token=createHash('sha256').update(JSON.stringify({userId,id,version,definition,previous,key,reason,effects})).digest('hex');
    return {token,key,reason,blocked,manualCount,effects};
}
export function cohortPublicPreview(p:ReturnType<typeof cohortPreview>) {
    return {token:p.token,blocked:p.blocked,manualCount:p.manualCount,affected:p.effects.filter(e=>e.after!==null).length,attempts:p.effects.map(e=>({id:e.attemptId,state:e.state,validity:e.validity,individualAmendment:e.manual,before:e.before,after:e.after}))};
}
interface CohortDatabase {
 readBatch(queries:Array<{text:string;values:readonly unknown[]}>):Promise<Record<string,unknown>[][]>;
 transaction<T>(work:()=>T|Promise<T>,options?:{readOnly?:boolean}):Promise<T>;
}
export async function cohortDefinitionOwned(database:CohortDatabase,userId:string,id:string,version:number) {
 const definition=assessmentDefinitionFromRows((await database.readBatch([assessmentDefinitionQuery(id,version)]))[0]??[]),offer=offerFromRows((await database.readBatch([offerReadQuery(definition.offer_id)]))[0]??[]),access=await database.readBatch([membershipReadQuery(userId,offer.organizationId),offerAssignedReadQuery(userId,offer.id)]);membershipFromRows(access[0]??[]);requireOfferAssignment(access[1]??[]);return definition;
}
export async function cohortPreviewOwned(database:CohortDatabase,userId:string,id:string,version:number,body:Record<string,unknown>) {
 const definition=await cohortDefinitionOwned(database,userId,id,version),previous=(await database.readBatch([correctedKeyQuery(id,version)]))[0]?.[0] as unknown as CorrectedKey|undefined,{content,key,reason}=cohortKeyInput(definition,previous,body),rows=(await database.readBatch([cohortAttemptsQuery(id,version)]))[0]??[];
 if(rows.length>500)throw new HttpError(409,'Grupa wymaga osobnego kontrolowanego przegl\u0105du operacyjnego.');
 const effects=[];for(const item of rows){const attempt=attemptFromRows((await database.readBatch([attemptReadQuery(item.id as string)]))[0]??[]),process=processFromRows((await database.readBatch([processReadQuery(attempt.process_id)]))[0]??[]);await requireAttemptEmployerOwned(database,userId,process);const history=attemptHistoryFromRows((await database.readBatch([attemptHistoryQuery(attempt.id)]))[0]??[]).at(-1);effects.push(cohortEffect(content,key,attempt,process.revision,history));}
 return cohortPreview(userId,id,version,definition,previous,key,reason,effects);
}
export async function previewCohortCorrection(database:CohortDatabase,userId:string,id:string,version:number,body:Record<string,unknown>,authorize:()=>void|Promise<void>) {return database.transaction(async()=>{await authorize();return cohortPublicPreview(await cohortPreviewOwned(database,userId,id,version,body));},{readOnly:true});}
