import { randomUUID } from 'node:crypto';
import { HttpError } from '../http.js';
import { cohortPreview,cohortPreviewOwned,cohortDefinitionOwned,correctedKeyQuery } from './assessmentCohortReadModel.js';
import { processReadQuery,processFromRows } from './processReadModel.js';
import { processRecruiterReadQuery,processEventQueries } from './interestWriteModel.js';
import { runCommandOnce } from './commandJournal.js';
export function cohortCorrectionPlan(userId:string,id:string,version:number,p:ReturnType<typeof cohortPreview>,previousRevision:number,body:Record<string,unknown>,asOf:string) {
 if(p.token!==body.previewToken)throw new HttpError(409,'Grupa lub klucz zmieniły się. Ponów podgląd.','VERSION_CONFLICT');
 if(p.blocked)throw new HttpError(409,'Najpierw zakończ lub rozpatrz aktywne próby. Nie zmieniamy ich klucza w trakcie.');
 if(body.confirmed!==true||p.manualCount>0&&body.replaceIndividualAmendments!==true)throw new HttpError(400,'Potwierdź wspólną korektę i świadome zastąpienie indywidualnych korekt.');
 const effects=p.effects.filter(e=>e.after!==null);if(!effects.length)throw new HttpError(409,'Brak aktualnych zatwierdzonych wyników do korekty.');
 const correctionId=randomUUID(),queries=[{text:'INSERT INTO faro_key_corrections(id,assessment_id,assessment_version,revision,accepted_options,reason,created_at,actor_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',values:[correctionId,id,version,previousRevision+1,JSON.stringify(p.key),p.reason,asOf,userId]}];
 for(const effect of effects) {
  const result={...effect.history!.result,breakdown:effect.breakdown,earned:effect.after,possible:effect.breakdown.reduce((sum,t)=>sum+t.possible,0),unanswered:effect.breakdown.filter(t=>t.earned===null).length,review:'COHORT_CORRECTED',reviewNote:p.reason,comparisonStatus:'COHORT_KEY_CORRECTION',scoringRevision:correctionId};
  queries.push({text:"INSERT INTO faro_result_history(attempt_id,revision,validity,result,reason_code,reason,created_at) VALUES($1,$2,'VALID',$3,'HUMAN_AMENDMENT',$4,$5)",values:[effect.attemptId,effect.history!.revision+1,JSON.stringify(result),p.reason,asOf]},{text:'UPDATE faro_attempts SET revision=revision+1 WHERE id=$1',values:[effect.attemptId]});
 }
 return {queries,effects,ack:{correctionId,affected:effects.length}};
}
interface CohortWriteDatabase {
 readBatch(queries:Array<{text:string;values:readonly unknown[]}>):Promise<Record<string,unknown>[][]>;
 query(text:string,values:readonly unknown[]):Promise<unknown>;
 transaction<T>(work:()=>T|Promise<T>,options?:{readOnly?:boolean}):Promise<T>;
}
export async function correctCohortKey(database:CohortWriteDatabase,userId:string,id:string,version:number,body:Record<string,unknown>,asOf:string,authorize:()=>void|Promise<void>) {
 return runCommandOnce(database,userId,body.idempotencyKey,{...body,id,version,operation:'ASSESSMENT_COHORT_KEY_CORRECTION'},asOf,async()=>{await authorize();await cohortDefinitionOwned(database,userId,id,version);},async()=>{
  const p=await cohortPreviewOwned(database,userId,id,version,body),previous=(await database.readBatch([correctedKeyQuery(id,version)]))[0]?.[0],plan=cohortCorrectionPlan(userId,id,version,p,previous?.revision as number??0,body,asOf);
  for(const query of plan.queries)await database.query(query.text,query.values);
  for(const effect of plan.effects) {const process=processFromRows((await database.readBatch([processReadQuery(effect.attempt.process_id)]))[0]??[]),recipients=(await database.readBatch([processRecruiterReadQuery(process.offer_id)]))[0]??[];for(const query of processEventQueries(process,userId,'ASSESSMENT_COHORT_CORRECTED',{attemptId:effect.attemptId,scoringRevision:plan.ack.correctionId},recipients,asOf))await database.query(query.text,query.values);}
  return plan.ack;
 });
}
