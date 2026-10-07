import { randomUUID } from 'node:crypto';
import { HttpError } from '../http.js';
import { choice } from './validation.js';
import { interviewChangeInput } from './interviewScheduleModel.js';
import { type InterviewRow,interviewReadQuery,interviewFromRows,interviewProcessOwned,interviewViewOwned } from './interviewReadModel.js';
import { type ProcessRow } from './processReadModel.js';
import { requireAttemptEmployerOwned } from './assessmentAttemptReadModel.js';
import { offerVersionReadQuery,offerVersionFromRows } from './offerReadModel.js';
import { processRecruiterReadQuery,processEventQueries } from './interestWriteModel.js';
import { runCommandOnce } from './commandJournal.js';
import { recordMutualStageOwned } from './stageAnalytics.js';

export function interviewOutcomePlan(userId:string,row:InterviewRow,p:ProcessRow,body:Record<string,unknown>,organizationId:string,decisionHours:number,asOf:string) {
 const command=interviewChangeInput(row,p,body),candidate=p.candidate_id===userId;
 if(command!=='COMPLETE'&&command!=='DISPUTE')throw new HttpError(400,'Wybierz potwierdzenie odbycia lub rozbieżność.');
 if(row.state!=='CONFIRMED'||row.ends_at>asOf)throw new HttpError(409,'Najpierw musi upłynąć potwierdzony termin rozmowy.');
 let state:InterviewRow['state']=row.state,stage=p.stage,due=p.stage_due_at,action=p.next_action,caseId:string|null=null;
 const queries:Array<{text:string;values:(string|number|null)[]}>=[];
 if(command==='COMPLETE') {
  if(candidate?row.candidate_completed:row.employer_completed)throw new HttpError(409,'Twoje potwierdzenie zostało już zapisane.');
  queries.push({text:`UPDATE faro_interviews SET ${candidate?'candidate_completed':'employer_completed'}=1 WHERE id=$1`,values:[row.id]});
  if(candidate?row.employer_completed:row.candidate_completed){state='COMPLETED';stage='INTERVIEW_COMPLETED';action='Firma przekaże decyzję lub kolejny krok.';due=new Date(Date.parse(asOf)+decisionHours*3600000).toISOString();}
 }else {
  const reason=choice(body.reason,['NO_SHOW','TECHNICAL_ISSUE','OTHER_DISCREPANCY'] as const);
  state='DISPUTED';stage='ACCEPTED_TO_NEXT_STAGE';action='Rozbieżność dotycząca rozmowy czeka na wyjaśnienie.';due=null;caseId=randomUUID();
  queries.push({text:'INSERT INTO faro_cases(id,organization_id,process_id,reporter_id,kind,statement,dedupe_key,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',values:[caseId,organizationId,p.id,userId,reason==='NO_SHOW'?'NO_SHOW_CASE':'INTERVIEW_DISCREPANCY',`Rozmowa ${row.id}: ${reason}. Wymaga wyjaśnienia przez obie strony; bez automatycznej sankcji.`,`interview:${row.id}`,asOf]});
 }
 queries.push({text:'UPDATE faro_interviews SET state=$1,revision=revision+1 WHERE id=$2',values:[state,row.id]},{text:'UPDATE faro_interests SET stage=$1,stage_due_at=$2,next_action=$3,revision=revision+1 WHERE id=$4',values:[stage,due,action,p.id]});
 return {command,state,caseId,queries,event:{interviewId:row.id,state,stage,stageDueAt:due,caseId,reason:command==='DISPUTE'?body.reason:null}};
}
export function interviewModeratorQuery(){return {text:"SELECT id FROM users WHERE role='ADMIN'",values:[]};}
export function interviewCaseNotifications(caseId:string,p:ProcessRow,moderators:Record<string,unknown>[],assigned:Record<string,unknown>[],asOf:string) {
 return [...moderators.map(row=>({id:row.id as string,message:'Nowa rozbieżność po rozmowie wymaga przeglądu.'})),...[{user_id:p.candidate_id},...assigned].map(row=>({id:row.user_id as string,message:'Możesz przekazać prywatne wyjaśnienie rozbieżności po rozmowie.'}))].map(row=>({text:'INSERT INTO faro_outbox(id,recipient_id,entity_type,entity_id,message,dedupe_key,next_attempt_at) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(recipient_id,dedupe_key) DO NOTHING',values:[randomUUID(),row.id,'case',caseId,row.message,`case:${caseId}:opened`,asOf]}));
}
interface OutcomeDatabase {
 readBatch(queries:Array<{text:string;values:readonly unknown[]}>):Promise<Record<string,unknown>[][]>;
 query(text:string,values:readonly unknown[]):Promise<unknown>;
 transaction<T>(work:()=>T|Promise<T>,options?:{readOnly?:boolean}):Promise<T>;
}
export async function changeInterviewOutcome(database:OutcomeDatabase,userId:string,id:string,body:Record<string,unknown>,asOf:string,authorize:()=>void|Promise<void>) {
 let row:InterviewRow,p:ProcessRow;
 return runCommandOnce(database,userId,body.idempotencyKey,{...body,id,operation:'INTERVIEW_CHANGE'},asOf,async()=>{
  await authorize();row=interviewFromRows((await database.readBatch([interviewReadQuery(id)]))[0]??[]);p=await interviewProcessOwned(database,userId,row.process_id);
  if(p.candidate_id!==userId){const role=await requireAttemptEmployerOwned(database,userId,p);if(!['OWNER','ADMIN','RECRUITER'].includes(role))throw new HttpError(404,'Nie znaleziono zasobu.','NOT_FOUND');}
 },async()=>{
  const rows=await database.readBatch([offerVersionReadQuery(p.offer_id,p.offer_version),{text:'SELECT organization_id FROM faro_offers WHERE id=$1',values:[p.offer_id]},processRecruiterReadQuery(p.offer_id)]),version=offerVersionFromRows(rows[0]??[]),assigned=rows[2]??[],plan=interviewOutcomePlan(userId,row,p,body,rows[1]![0]!.organization_id as string,version.decisionHours,asOf);
  for(const query of plan.queries)await database.query(query.text,query.values);
  if(plan.caseId)for(const query of interviewCaseNotifications(plan.caseId,p,(await database.readBatch([interviewModeratorQuery()]))[0]??[],assigned,asOf))await database.query(query.text,query.values);
  for(const query of processEventQueries(p,userId,`INTERVIEW_${plan.command}`,plan.event,assigned,asOf))await database.query(query.text,query.values);
  if(plan.state==='COMPLETED')await recordMutualStageOwned(database,id);
  return interviewViewOwned(database,userId,id);
 });
}
