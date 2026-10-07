import { HttpError } from '../http.js';
import { text,integer,choice,date,object } from './validation.js';
import { COMMANDS,REJECTION_REASONS,TERMINAL,transition } from '../../domain/faro/recruitment.js';
import { LEVELS,SOURCES,skillById } from '../../domain/faro/skills.js';
import type { OfferData } from '../../domain/faro/offers.js';
import { profileAvailability,profilePractice } from './profileWriteModel.js';
import { processReadQuery,processFromRows,processLatestDataQuery,processClarificationFromRows,processEmploymentFromRows,type ProcessRow,type Clarification,type EmploymentOffer } from './processReadModel.js';
import { offerReadQuery,offerFromRows,offerVersionFromRows } from './offerReadModel.js';
import { offerAssignedReadQuery,requireOfferAssignment } from './offerWriteModel.js';
import { membershipReadQuery,membershipFromRows } from './organizationReadModel.js';
import { processRecruiterReadQuery,processEventQueries } from './interestWriteModel.js';
import { runCommandOnce } from './commandJournal.js';
interface ProcessChangeContext {version:(version:number)=>OfferData;published:(version:number)=>boolean;clarification:()=>Clarification|null;employmentOffer:()=>EmploymentOffer|null;}
export function processChangePlan(row:ProcessRow,actor:'CANDIDATE'|'EMPLOYER',body:Record<string,unknown>,context:ProcessChangeContext,asOf:string) {
  if (integer(body.expectedVersion, 1) !== row.revision) throw new HttpError(409, 'Proces został zmieniony. Odśwież dane.', 'VERSION_CONFLICT');
  const command = choice(body.command, COMMANDS), next = transition(row.status, row.stage, actor, command)
    ?? (actor==='EMPLOYER'&&command==='CLARIFY'&&row.stage==='CLARIFICATION_REQUESTED'&&!context.clarification()?{status:row.status,stage:row.stage,substantive:false}:null);
  if (!next) throw new HttpError(409, 'Ta akcja nie jest dostępna w tym etapie.', 'INVALID_TRANSITION');
  let reason: Record<string, unknown> | null = null, action: string | null = null, due: string | null = null;
  let employmentOffer:EmploymentOffer|null=null;
  let question:Clarification|null=null,response:Record<string,unknown>|null=null;
  if (command === 'REJECT') {
    const raw = object(body.reason), code = choice(raw.code, REJECTION_REASONS);
    const requires = ['REQUIREMENT_NOT_DEMONSTRATED','REQUIREMENT_NOT_MET','OTHER_CANDIDATE_BETTER_MATCH'].includes(code);
    const requirementId = requires ? text(raw.requirementId, 100) : null;
    if (requires && !context.version(row.offer_version).requirements.some(r => r.id === requirementId && r.kind !== 'WILL_TEACH')) throw new HttpError(400, 'Wybierz wymaganie z wersji zgłoszenia; nauka w firmie nie jest barierą.', 'REJECTION_REQUIREMENT');
    reason = { code, requirementId };
  } else if (command === 'CANCEL') reason = { code: 'RECRUITMENT_CANCELLED', explanation: text(body.explanation, 1000, 5) };
  if (['ADVANCE','OFFER'].includes(command)) {
    action = text(body.nextAction, 1500, 5); due = date(body.dueAt);
    if (due <= asOf) throw new HttpError(400, 'Termin musi być w przyszłości.');
  }
  if(command==='OFFER') {
    if(body.confirmed!==true)throw new HttpError(400,'Potwierdź konkretne warunki oferty.','CONFIRMATION_REQUIRED');
    const sourceVersion=integer(body.offerVersion,1),salaryIndex=integer(body.salaryIndex,0,7);
    const published=context.published(sourceVersion);
    if(!published)throw new HttpError(409,'Wybierz opublikowaną wersję warunków.','PUBLICATION_NOT_FOUND');
    const conditions=context.version(sourceVersion),option=conditions.salary[salaryIndex];
    if(!option)throw new HttpError(400,'Wybierz istniejący wariant wynagrodzenia.');
    const amount=integer(body.amount,1);if(amount<option.min||amount>option.max)throw new HttpError(400,'Konkretna kwota musi należeć do wybranego przedziału.','SALARY_RANGE');
    const startsAt=date(body.startsAt);if(startsAt<=asOf)throw new HttpError(400,'Początek współpracy musi być w przyszłości.');
    employmentOffer={revision:row.revision+1,sourceVersion,salaryIndex,amount,startsAt,responseDueAt:due!,conditions};
  }
  if(command==='ACCEPT_OFFER') {
    employmentOffer=context.employmentOffer();
    if(!employmentOffer)throw new HttpError(409,'Oferta wymaga zapisanych konkretnych warunków.','EMPLOYMENT_TERMS_REQUIRED');
    if(integer(body.employmentOfferRevision,1)!==employmentOffer.revision)throw new HttpError(409,'Potwierdź właściwą wersję warunków.','VERSION_CONFLICT');
    if(body.confirmed!==true)throw new HttpError(400,'Potwierdź przyjęcie pokazanych warunków.','CONFIRMATION_REQUIRED');
    if(employmentOffer.responseDueAt<=asOf)throw new HttpError(409,'Termin przyjęcia oferty minął.','EMPLOYMENT_OFFER_EXPIRED');
  }
  if(command==='CLARIFY') {
    const raw=object(body.question),topic=choice(raw.topic,['REQUIREMENT','AVAILABILITY'] as const);
    const requirementId=topic==='REQUIREMENT'?text(raw.requirementId,100):null;
    const requirement=context.version(row.offer_version).requirements.find(r=>r.id===requirementId);
    if(topic==='REQUIREMENT'&&!requirement)throw new HttpError(400,'Wybierz wymaganie z wersji zgłoszenia.','CLARIFICATION_REQUIREMENT');
    question={topic,requirementId,skillId:requirement?.skillId??null,previousStage:row.stage==='CLARIFICATION_REQUESTED'?(row.status==='ACTIVE'?'ACCEPTED_TO_NEXT_STAGE':'AWAITING_EMPLOYER'):row.stage};
    action=topic==='AVAILABILITY'?'Potwierdź swoją aktualną dostępność.':`Jak deklarujesz kompetencję: ${skillById(requirement!.skillId)!.label}? Podaj poziom i praktykę albo kierunek nauki.`;
    due=date(body.dueAt);if(due<=asOf)throw new HttpError(400,'Termin odpowiedzi musi być w przyszłości.');
  }
  if(command==='ANSWER') {
    question=context.clarification();
    if(!question)throw new HttpError(409,'Pytanie wymaga ustrukturyzowania przez rekrutera.','STRUCTURED_QUESTION_REQUIRED');
    if(body.confirmed!==true)throw new HttpError(400,'Potwierdź udostępnianą deklarację.','CONFIRMATION_REQUIRED');
    const raw=object(body.response);
    if(question.topic==='AVAILABILITY') {
      response={kind:'AVAILABILITY',availability:profileAvailability(raw.availability,asOf)};
    } else {
      const kind=choice(raw.kind,['DECLARE_SKILL','NOT_YET','WANTS_TO_LEARN'] as const);
      response=kind==='DECLARE_SKILL'?{kind,skillId:question.skillId,level:choice(raw.level,LEVELS),source:choice(raw.source,SOURCES),practice:profilePractice(raw.practice),verification:'DECLARED'}:{kind,skillId:question.skillId};
    }
    next.stage=question.previousStage==='ACCEPTED_TO_NEXT_STAGE'?'ACCEPTED_TO_NEXT_STAGE':'AWAITING_EMPLOYER';
    action='Kandydat odpowiedział. Firma sprawdzi deklarację i przekaże kolejny krok.';
    due=new Date(Date.parse(asOf)+context.version(row.offer_version).decisionHours*3600000).toISOString();
  }
  const first = next.substantive ? row.first_response_at ?? asOf : row.first_response_at;
  return {command,terminal:TERMINAL.includes(next.status),event:{previousStage:row.stage,stage:next.stage,previousDueAt:row.stage_due_at,stageDueAt:due,reason,action,question,response,employmentOffer},ack:{id:row.id,revision:row.revision+1},query:{text:'UPDATE faro_interests SET status=$1,stage=$2,revision=revision+1,first_response_at=$3,stage_due_at=$4,next_action=$5,reason=$6 WHERE id=$7',values:[next.status,next.stage,first,due,action,reason?JSON.stringify(reason):null,row.id]}};
}
export function processCancelQueries(id:string,asOf:string) {
  return [
    {text:'UPDATE faro_contact_grants SET revoked_at=COALESCE(revoked_at,$1) WHERE process_id=$2',values:[asOf,id]},
    {text:"UPDATE faro_attempts SET state='WITHDRAWN',revision=revision+1 WHERE process_id=$1 AND state IN ('INVITED','STARTED')",values:[id]},
    {text:"UPDATE faro_interviews SET state='CANCELLED',revision=revision+1 WHERE process_id=$1 AND state IN ('PROPOSED','CONFIRMED')",values:[id]}
  ];
}
interface ProcessWriteDatabase {
  readBatch(queries:Array<{text:string;values:readonly unknown[]}>):Promise<Record<string,unknown>[][]>;
  query(text:string,values:readonly unknown[]):Promise<unknown>;
  transaction<T>(work:()=>T|Promise<T>):Promise<T>;
}
export async function changeProcess(database:ProcessWriteDatabase,userId:string,id:string,body:Record<string,unknown>,asOf:string,currentSessionAuthority:()=>void|Promise<void>,acceptedOffer:(id:string)=>void|Promise<void>) {
  let row:ProcessRow,organizationId:string;
  return runCommandOnce(database,userId,body.idempotencyKey,{id,...body},asOf,async()=>{
    await currentSessionAuthority();
    row=processFromRows((await database.readBatch([processReadQuery(id)]))[0]??[]);
    organizationId=offerFromRows((await database.readBatch([offerReadQuery(row.offer_id)]))[0]??[]).organizationId;
    if(row.candidate_id!==userId){const access=await database.readBatch([membershipReadQuery(userId,organizationId),offerAssignedReadQuery(userId,row.offer_id)]);membershipFromRows(access[0]??[]);requireOfferAssignment(access[1]??[]);}
  },async()=>{
    const actor=row.candidate_id===userId?'CANDIDATE':'EMPLOYER';
    if(actor==='EMPLOYER')membershipFromRows((await database.readBatch([membershipReadQuery(userId,organizationId)]))[0]??[],['OWNER','ADMIN','RECRUITER']);
    const data=await database.readBatch([{text:'SELECT version,content,publication_proof FROM faro_offer_versions WHERE offer_id=$1',values:[row.offer_id]},processLatestDataQuery(id,'CLARIFY',true),processLatestDataQuery(id,'OFFER',true)]);
    const versionRows=(version:number)=>(data[0]??[]).filter(item=>item.version===version);
    const plan=processChangePlan(row,actor,body,{version:version=>offerVersionFromRows(versionRows(version)),published:version=>versionRows(version).some(item=>item.publication_proof!=='NONE'),clarification:()=>processClarificationFromRows(data[1]??[]),employmentOffer:()=>processEmploymentFromRows(data[2]??[])},asOf);
    await database.query(plan.query.text,plan.query.values);
    if(plan.terminal)for(const query of processCancelQueries(id,asOf))await database.query(query.text,query.values);
    const recipients=(await database.readBatch([processRecruiterReadQuery(row.offer_id)]))[0]??[];
    for(const query of processEventQueries(row,userId,plan.command,plan.event,recipients,asOf))await database.query(query.text,query.values);
    // Required owned-transaction hook preserves the existing accepted-stage producer; never silently omit it.
    if(plan.command==='ACCEPT_OFFER')await acceptedOffer(id);
    return plan.ack;
  });
}
