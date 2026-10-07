import { randomUUID } from 'node:crypto';
import { HttpError } from '../http.js';
import { text,integer,date } from './validation.js';
import { type DefinitionRow,assessmentDefinitionQuery,assessmentDefinitionFromRows,assessmentLatestQuery } from './assessmentDefinitionModel.js';
import { type ProcessRow,processReadQuery,processFromRows } from './processReadModel.js';
import { offerReadQuery,offerFromRows } from './offerReadModel.js';
import { offerAssignedReadQuery,requireOfferAssignment } from './offerWriteModel.js';
import { membershipReadQuery,membershipFromRows } from './organizationReadModel.js';
import { runCommandOnce } from './commandJournal.js';
import { processRecruiterReadQuery,processEventQueries } from './interestWriteModel.js';
export function assignmentRequest(body:Record<string,unknown>) {return {definitionId:text(body.assessmentId,100),version:integer(body.version,1)};}
export function assignmentCorrectionQuery(id:string,version:number) {return {text:'SELECT id FROM faro_key_corrections WHERE assessment_id=$1 AND assessment_version=$2',values:[id,version]};}
export function assignmentExistingQuery(processId:string,id:string,version:number) {return {text:'SELECT id FROM faro_attempts WHERE process_id=$1 AND assessment_id=$2 AND assessment_version=$3',values:[processId,id,version]};}
export function assessmentAssignmentPlan(process:ProcessRow,definition:DefinitionRow,latest:number,corrected:boolean,existing:boolean,body:Record<string,unknown>,asOf:string) {
  if(definition.offer_id!==process.offer_id)throw new HttpError(404,'Nie znaleziono assessmentu.');
  if(definition.state!=='APPROVED')throw new HttpError(409,'Przypisanie wymaga zatwierdzonej wersji.','ASSESSMENT_NOT_APPROVED');
  if(definition.version!==latest)throw new HttpError(409,'Wybierz najnowszą zatwierdzoną wersję.','ASSESSMENT_SUPERSEDED');
  if(integer(body.expectedVersion,1)!==process.revision)throw new HttpError(409,'Odśwież proces.','VERSION_CONFLICT');
  if(corrected)throw new HttpError(409,'Po korekcie wspólnego klucza przypisz nową zatwierdzoną wersję.','CORRECTED_VERSION_CLOSED');
  if(process.status!=='ACTIVE'||process.stage!=='ACCEPTED_TO_NEXT_STAGE')throw new HttpError(409,'Najpierw przyjmij do kolejnego etapu.');
  if(existing)throw new HttpError(409,'Ta wersja ma już próbę w tym procesie.','ASSESSMENT_ALREADY_ASSIGNED');
  const deadline=date(body.deadline);if(deadline<=asOf)throw new HttpError(400,'Deadline musi być w przyszłości.');const id=randomUUID();
  return {ack:{id},event:{attemptId:id,deadline},queries:[{text:"INSERT INTO faro_attempts(id,process_id,assessment_id,assessment_version,state,deadline) VALUES($1,$2,$3,$4,'INVITED',$5)",values:[id,process.id,definition.id,definition.version,deadline]},{text:"UPDATE faro_interests SET stage='ASSESSMENT_REQUESTED',stage_due_at=$1,revision=revision+1 WHERE id=$2",values:[deadline,process.id]}]};
}
interface AssignmentDatabase {
  readBatch(queries:Array<{text:string;values:readonly unknown[]}>):Promise<Record<string,unknown>[][]>;
  query(text:string,values:readonly unknown[]):Promise<unknown>;
  transaction<T>(work:()=>T|Promise<T>):Promise<T>;
}
export async function assignAssessment(database:AssignmentDatabase,userId:string,processId:string,body:Record<string,unknown>,asOf:string,authorize:()=>void|Promise<void>) {
  let process:ProcessRow,organizationId:string;
  return runCommandOnce(database,userId,body.idempotencyKey,{...body,processId,operation:'ASSESSMENT_ASSIGN'},asOf,async()=>{
    await authorize();process=processFromRows((await database.readBatch([processReadQuery(processId)]))[0]??[]);organizationId=offerFromRows((await database.readBatch([offerReadQuery(process.offer_id)]))[0]??[]).organizationId;
    const access=await database.readBatch([membershipReadQuery(userId,organizationId),offerAssignedReadQuery(userId,process.offer_id)]);membershipFromRows(access[0]??[]);requireOfferAssignment(access[1]??[]);
  },async()=>{
    membershipFromRows((await database.readBatch([membershipReadQuery(userId,organizationId)]))[0]??[],['OWNER','ADMIN','RECRUITER']);const request=assignmentRequest(body),rows=await database.readBatch([assessmentDefinitionQuery(request.definitionId,request.version),assessmentLatestQuery(request.definitionId),assignmentCorrectionQuery(request.definitionId,request.version),assignmentExistingQuery(processId,request.definitionId,request.version)]),definition=assessmentDefinitionFromRows(rows[0]??[]),plan=assessmentAssignmentPlan(process,definition,rows[1]?.[0]?.version as number,Boolean(rows[2]?.length),Boolean(rows[3]?.length),body,asOf);
    for(const query of plan.queries)await database.query(query.text,query.values);
    const recipients=(await database.readBatch([processRecruiterReadQuery(process.offer_id)]))[0]??[];for(const query of processEventQueries(process,userId,'ASSESSMENT_ASSIGNED',plan.event,recipients,asOf))await database.query(query.text,query.values);
    return plan.ack;
  });
}
