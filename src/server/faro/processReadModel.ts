import { HttpError } from '../http.js';
import { COMMANDS,transition,type InterestStatus,type Stage } from '../../domain/faro/recruitment.js';
import { materialDiff,type OfferData } from '../../domain/faro/offers.js';
import type { employerProjection } from '../../domain/faro/skills.js';
import { membershipReadQuery,membershipFromRows } from './organizationReadModel.js';
import { offerAssignedReadQuery,requireOfferAssignment } from './offerWriteModel.js';
import { offerReadQuery,offerFromRows,publishedReadQuery,publishedFromRows,intakeReadQueries,intakeFromRows,offerVersionReadQuery,offerVersionFromRows,type OfferRecord } from './offerReadModel.js';
export interface ProcessRow {
  id:string;candidate_id:string;offer_id:string;offer_version:number;snapshot:string;previous_interest_id:string|null;
  status:InterestStatus;stage:Stage;revision:number;response_due_at:string;first_response_at:string|null;
  stage_due_at:string|null;next_action:string|null;reason:string|null;created_at:string;
}
export interface Clarification {topic:'REQUIREMENT'|'AVAILABILITY';requirementId:string|null;skillId:string|null;previousStage:Stage;}
export interface EmploymentOffer {revision:number;sourceVersion:number;salaryIndex:number;amount:number;startsAt:string;responseDueAt:string;conditions:OfferData;}
export function processReadQuery(id:string) {return {text:'SELECT id,candidate_id,offer_id,offer_version,snapshot,previous_interest_id,status,stage,revision,response_due_at,first_response_at,stage_due_at,next_action,reason,created_at FROM faro_interests WHERE id=$1',values:[id]};}
export function processFromRows(rows:Record<string,unknown>[]):ProcessRow {if(!rows[0])throw new HttpError(404,'Nie znaleziono procesu.','NOT_FOUND');return rows[0] as unknown as ProcessRow;}
export function processLatestDataQuery(id:string,kind:'CLARIFY'|'OFFER',postgres=false) {return {text:`SELECT data FROM faro_events WHERE process_id=$1 AND kind=$2 ORDER BY ${postgres?'__faro_source_rowid':'rowid'} DESC LIMIT 1`,values:[id,kind]};}
export function processClarificationFromRows(rows:Record<string,unknown>[]):Clarification|null {return rows[0]?(JSON.parse(rows[0].data as string) as {question?:Clarification}).question??null:null;}
export function processEmploymentFromRows(rows:Record<string,unknown>[]):EmploymentOffer|null {return rows[0]?(JSON.parse(rows[0].data as string) as {employmentOffer?:EmploymentOffer}).employmentOffer??null:null;}
export function processContextReadQueries(row:ProcessRow,postgres=false) {
  const order=postgres?'__faro_source_rowid':'rowid';
  return [
    {text:`SELECT kind,data,occurred_at FROM faro_events WHERE process_id=$1 ORDER BY occurred_at,${order}`,values:[row.id]},
    {text:`SELECT kind FROM faro_events WHERE process_id=$1 ORDER BY ${order} DESC LIMIT 1`,values:[row.id]},
    {text:'SELECT granted_at,revoked_at FROM faro_contact_grants WHERE process_id=$1',values:[row.id]},
    processLatestDataQuery(row.id,'CLARIFY',postgres),processLatestDataQuery(row.id,'OFFER',postgres),offerVersionReadQuery(row.offer_id,row.offer_version)
  ];
}
export function processViewFromRows(row:ProcessRow,candidate:boolean,offer:OfferRecord,source:OfferRecord,rows:Record<string,unknown>[][]) {
  const events=(rows[0]??[]).map(raw=>{const event=raw as {kind:string;data:string;occurred_at:string};if(event.kind!=='ANSWER')return event;const data=JSON.parse(event.data) as Record<string,unknown>;delete data.action;return {...event,data:JSON.stringify(data)};});
  const clarification=processClarificationFromRows(rows[3]??[]),version=offerVersionFromRows(rows[5]??[]);
  return {id:row.id,previousInterestId:row.previous_interest_id,offerId:row.offer_id,offerVersion:row.offer_version,role:offer.data.role,company:offer.company,status:row.status,stage:row.stage,revision:row.revision,
    responseDueAt:row.response_due_at,firstResponseAt:row.first_response_at,stageDueAt:row.stage_due_at,nextAction:rows[1]?.[0]?.kind==='ANSWER'?'Kandydat odpowiedział. Firma sprawdzi deklarację i przekaże kolejny krok.':row.next_action,
    clarification,employmentOffer:processEmploymentFromRows(rows[4]??[]),employmentSource:source,
    availableCommands:COMMANDS.filter(command=>transition(row.status,row.stage,candidate?'CANDIDATE':'EMPLOYER',command)||(!candidate&&command==='CLARIFY'&&row.stage==='CLARIFICATION_REQUESTED'&&!clarification)),
    reason:row.reason?JSON.parse(row.reason) as Record<string,unknown>:null,createdAt:row.created_at,projection:JSON.parse(row.snapshot) as ReturnType<typeof employerProjection>,events,contactGrant:rows[2]?.[0]??null,viewer:candidate?'CANDIDATE':'EMPLOYER',requirements:version.requirements,changes:materialDiff(version,offer.data)};
}
interface ProcessReadDatabase {
  readBatch(queries:Array<{text:string;values:readonly unknown[]}>):Promise<Record<string,unknown>[][]>;
  transaction<T>(work:()=>T|Promise<T>,options?:{readOnly?:boolean}):Promise<T>;
}
async function processViewOwned(database:ProcessReadDatabase,userId:string,id:string,asOf:string) {
    const row=processFromRows((await database.readBatch([processReadQuery(id)]))[0]??[]),candidate=row.candidate_id===userId,current=offerFromRows((await database.readBatch([offerReadQuery(row.offer_id)]))[0]??[]);
    if(!candidate){const access=await database.readBatch([membershipReadQuery(userId,current.organizationId),offerAssignedReadQuery(userId,row.offer_id)]);membershipFromRows(access[0]??[]);requireOfferAssignment(access[1]??[]);}
    const publication=await database.readBatch([publishedReadQuery(row.offer_id),...intakeReadQueries(current)]),source=publishedFromRows(current,publication[0]??[],intakeFromRows(current,publication.slice(1),asOf));
    return processViewFromRows(row,candidate,candidate?source:current,source,await database.readBatch(processContextReadQueries(row,true)));
}
export async function readProcessView(database:ProcessReadDatabase,userId:string,id:string,asOf:string) {
  return database.transaction(()=>processViewOwned(database,userId,id,asOf),{readOnly:true});
}
export function processListReadQuery(userId:string,offerId?:string,postgres=false) {
  return {text:`SELECT id FROM faro_interests WHERE ${offerId?'offer_id':'candidate_id'}=$1 ORDER BY created_at ${offerId?'ASC':'DESC'},${postgres?'__faro_source_rowid':'rowid'} ASC`,values:[offerId||userId]};
}
export async function readProcessList(database:ProcessReadDatabase,userId:string,offerId:string|undefined,asOf:string) {
  return database.transaction(async()=>{
    if(offerId){const offer=offerFromRows((await database.readBatch([offerReadQuery(offerId)]))[0]??[]),access=await database.readBatch([membershipReadQuery(userId,offer.organizationId),offerAssignedReadQuery(userId,offerId)]);membershipFromRows(access[0]??[]);requireOfferAssignment(access[1]??[]);}
    const rows=(await database.readBatch([processListReadQuery(userId,offerId,true)]))[0]??[],views=[];
    for(const row of rows)views.push(await processViewOwned(database,userId,row.id as string,asOf));
    return views;
  },{readOnly:true});
}
