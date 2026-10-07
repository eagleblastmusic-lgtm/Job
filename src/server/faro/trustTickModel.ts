import { randomUUID } from 'node:crypto';
import { processRecruiterReadQuery } from './interestWriteModel.js';
import { offerNotificationRecipientsQuery,offerNotificationQueries } from './offerWriteModel.js';
import { expireAttempts } from './assessmentExpiryModel.js';
import { tickInterviews } from './interviewTickModel.js';
import { claimOutbox,deliverClaimedOutbox } from './outboxModel.js';
function closesAt(expression:string,postgres:boolean){return postgres?`(SELECT value #>> '{}' FROM json_each(CASE WHEN json_typeof(${expression}::json)='object' THEN ${expression}::json ELSE '{}'::json END) WITH ORDINALITY AS field(key,value,position) WHERE key='closesAt' ORDER BY position LIMIT 1)`:`json_extract(${expression},'$.closesAt')`;}
export function staleOffersQuery(asOf:string){return {text:"SELECT id,organization_id FROM faro_offers WHERE status='PUBLISHED' AND confirmed_until<=$1",values:[asOf]};}
export function staleOfferQueries(id:string,orgId:string,asOf:string){return [
 {text:"UPDATE faro_offers SET status='PAUSED',revision=revision+1 WHERE id=$1",values:[id]},
 {text:"INSERT INTO audit_logs(id,user_id,action,entity_type,entity_id,metadata,created_at) VALUES($1,NULL,'STALE_INTAKE_PAUSED','faro',$2,'{}',$3)",values:[randomUUID(),id,asOf]},
 {text:"INSERT INTO faro_cases(id,organization_id,kind,statement,dedupe_key,created_at) VALUES($1,$2,'STALE_OFFER',$3,$4,$5) ON CONFLICT(dedupe_key) DO NOTHING",values:[randomUUID(),orgId,'Brak aktualnego potwierdzenia wakatu. Sygnał do sprawdzenia, nie ocena firmy.',`stale:${id}:${asOf.slice(0,10)}`,asOf]}
];}
export function closingOffersQuery(asOf:string,postgres=false){const content="(SELECT content FROM faro_offer_versions WHERE offer_id=faro_offers.id AND publication_proof<>'NONE' ORDER BY version DESC LIMIT 1)";return {text:`SELECT id,current_version FROM faro_offers WHERE status IN ('PUBLISHED','PAUSED') AND ${closesAt(content,postgres)}<=$1`,values:[asOf]};}
export function upcomingOffersQuery(asOf:string,postgres=false){const deadline=closesAt('v.content',postgres);return {text:`SELECT o.id,w.candidate_id,v.version,${deadline} deadline FROM faro_offers o JOIN faro_offer_versions v ON v.offer_id=o.id AND v.version=(SELECT MAX(version) FROM faro_offer_versions WHERE offer_id=o.id AND publication_proof<>'NONE') JOIN faro_watches w ON w.offer_id=o.id AND w.alerts=1 WHERE o.status IN ('PUBLISHED','PAUSED') AND ${deadline}>$1 AND ${deadline}<=$2`,values:[asOf,new Date(Date.parse(asOf)+86400000).toISOString()]};}
export function pendingProcessesQuery(){return {text:"SELECT id,candidate_id,offer_id,stage,response_due_at,stage_due_at,first_response_at FROM faro_interests WHERE status IN ('INTERESTED','ACTIVE','OFFERED')",values:[]};}
export function tickNotificationQuery(recipient:string,type:string,id:string,message:string,key:string,asOf:string){return {text:"INSERT INTO faro_outbox(id,recipient_id,entity_type,entity_id,message,dedupe_key,next_attempt_at) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(recipient_id,dedupe_key) DO NOTHING",values:[randomUUID(),recipient,type,id,message,key,asOf]};}
export function offerDeadlineQuery(row:Record<string,unknown>,asOf:string){return tickNotificationQuery(row.candidate_id as string,'offer',row.id as string,'Zbliża się zamknięcie obserwowanej oferty. Sprawdź jej aktualne warunki.',`offer:${row.id}:${row.deadline}:closing-soon`,asOf);}
export function processDeadlineQueries(row:Record<string,unknown>,recruiters:Record<string,unknown>[],asOf:string){
 if(['INTERVIEW_PROPOSED','INTERVIEW_CONFIRMED'].includes(row.stage as string))return [];
 const deadline=(row.first_response_at?row.stage_due_at:row.response_due_at) as string|null;
 if(!deadline||Date.parse(deadline)>Date.parse(asOf)+86400000)return [];
 const overdue=deadline<asOf,recipients=['CLARIFICATION_REQUESTED','ASSESSMENT_REQUESTED','OFFERED'].includes(row.stage as string)?[{user_id:row.candidate_id}]:recruiters;
 return recipients.map(recipient=>tickNotificationQuery(recipient.user_id as string,'process',row.id as string,overdue?'Minął zadeklarowany termin w rekrutacji. Sprawdź następny krok.':'Zbliża się zadeklarowany termin w rekrutacji.',`${row.id}:${deadline}:${overdue?'overdue':'reminder'}`,asOf));
}
interface TickDatabase {
 readBatch(queries:Array<{text:string;values:readonly unknown[]}>):Promise<Record<string,unknown>[][]>;
 query(text:string,values:readonly unknown[]):Promise<unknown>;
 transaction<T>(work:()=>T|Promise<T>):Promise<T>;
}
async function retryTick<T>(work:()=>Promise<T>):Promise<T>{for(let retry=0;;retry++)try{return await work();}catch(error){if(retry>=2||!['40001','40P01'].includes((error as {code?:string}).code??''))throw error;}}
export async function tickOffersAndProcesses(database:TickDatabase,asOf:string,authorizeWorker:()=>void|Promise<void>){return retryTick(()=>database.transaction(async()=>{
 await authorizeWorker();const read=async(query:{text:string;values:readonly unknown[]})=>(await database.readBatch([query]))[0]??[],execute=async(queries:Array<{text:string;values:readonly unknown[]}>)=>{for(const query of queries)await database.query(query.text,query.values);};
 const stale=await read(staleOffersQuery(asOf));for(const offer of stale)await execute(staleOfferQueries(offer.id as string,offer.organization_id as string,asOf));
 const closing=await read(closingOffersQuery(asOf,true));for(const offer of closing){await database.query("UPDATE faro_offers SET status='CLOSED',revision=revision+1 WHERE id=$1",[offer.id]);await execute(offerNotificationQueries(offer.id as string,offer.current_version as number,'CLOSE',await read(offerNotificationRecipientsQuery(offer.id as string)),asOf));}
 for(const offer of await read(upcomingOffersQuery(asOf,true)))await execute([offerDeadlineQuery(offer,asOf)]);
 for(const process of await read(pendingProcessesQuery()))await execute(processDeadlineQueries(process,await read(processRecruiterReadQuery(process.offer_id as string)),asOf));
 return {paused:stale.length,closed:closing.length};
}));}
/** Each phase owns a transaction; committed prior phases are idempotent after a restart. */
export async function tickNativeWorker(database:TickDatabase,asOf:string,authorizeWorker:()=>void|Promise<void>){
 const attempts=await retryTick(()=>expireAttempts(database,asOf,authorizeWorker)),interviews=await retryTick(()=>tickInterviews(database,asOf,authorizeWorker)),offers=await tickOffersAndProcesses(database,asOf,authorizeWorker),claims=await claimOutbox(database,asOf,authorizeWorker);let delivered=0;
 for(const claim of claims)if(await deliverClaimedOutbox(database,claim.id,claim.claimToken,asOf,authorizeWorker))delivered++;
 return {attempts,interviews,offers,delivered};
}
