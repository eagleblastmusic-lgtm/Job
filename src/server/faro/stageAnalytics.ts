import { createHash } from 'node:crypto';
export interface StageSource {candidate_id:string;offer_id:string;occurred_at:string;}
export function stageConsentQuery(userId:string,postgres=false) {return {text:`SELECT granted,created_at FROM consents WHERE user_id=$1 AND consent_type='ANALYTICS' ORDER BY created_at DESC,${postgres?'__faro_source_rowid':'rowid'} DESC LIMIT 1`,values:[userId]};}
export function pairStagePlan(source:StageSource|undefined,consent:Record<string,unknown>|undefined,stage:'INTERVIEW_COMPLETED'|'OFFER_ACCEPTED') {
  if(!source||consent?.granted!==1||String(consent.created_at)>source.occurred_at)return null;
  const week=new Date(source.occurred_at);if(!Number.isFinite(week.getTime()))return null;
  week.setUTCDate(week.getUTCDate()-(week.getUTCDay()+6)%7);week.setUTCHours(0,0,0,0);
  const weekStart=week.toISOString(),definitionVersion='faro-mutual-stage-pair-week-v2',dedupeNamespace='faro-mutual-stage-pair-week-v1';
  const id=createHash('sha256').update(JSON.stringify([dedupeNamespace,source.candidate_id,source.offer_id,weekStart])).digest('hex');
  return {text:"INSERT INTO analytics_events(id,user_id,event_name,properties,created_at) VALUES($1,$2,'FARO_MUTUAL_STAGE_COMPLETED',$3,$4) ON CONFLICT(id) DO NOTHING",values:[id,source.candidate_id,JSON.stringify({definitionVersion,weekStart,stage}),source.occurred_at]};
}
// JSON input is validated by the database. Preserve keys, escapes and numeric spelling;
// only whitespace outside strings is removed, matching SQLite object extraction.
export function compactStageTerms(raw:string) {
  let quoted=false,escaped=false,result='';
  for(const char of raw){
    if(quoted){result+=char;if(escaped)escaped=false;else if(char==='\\')escaped=true;else if(char==='"')quoted=false;}
    else if(char==='"'){quoted=true;result+=char;}
    else if(!/[ \t\r\n]/.test(char))result+=char;
  }
  return result;
}
const sqliteAccepted="SELECT p.candidate_id,p.offer_id,e.occurred_at FROM faro_interests p JOIN faro_events e ON e.process_id=p.id JOIN faro_events o ON o.process_id=p.id JOIN faro_offer_versions v ON v.offer_id=p.offer_id AND v.version=json_extract(e.data,'$.employmentOffer.sourceVersion') WHERE p.id=$1 AND p.status='HIRED' AND e.kind='ACCEPT_OFFER' AND e.actor_id=p.candidate_id AND o.kind='OFFER' AND o.actor_id<>p.candidate_id AND json_extract(e.data,'$.stage')='TERMINAL' AND json_extract(e.data,'$.employmentOffer.revision') IS NOT NULL AND json_extract(e.data,'$.employmentOffer')=json_extract(o.data,'$.employmentOffer') AND v.publication_proof<>'NONE' ORDER BY e.occurred_at DESC,e.rowid DESC LIMIT 1";
// Closed internal expressions/keys, never user supplied. First duplicate key matches SQLite.
function firstField(expression:string,key:string) {return `(SELECT value FROM json_each(CASE WHEN json_typeof(${expression})='object' THEN ${expression} ELSE '{}'::json END) WITH ORDINALITY AS field(key,value,position) WHERE key='${key}' ORDER BY position LIMIT 1)`;}
export function acceptedStageQuery(id:string,postgres=false) {
  if(!postgres)return {text:sqliteAccepted,values:[id]};
  const text=`WITH events AS (
    SELECT p.candidate_id,p.offer_id,e.occurred_at,e.__faro_source_rowid AS source_order,e.data::json AS accepted,o.data::json AS offered
    FROM faro_interests p JOIN faro_events e ON e.process_id=p.id JOIN faro_events o ON o.process_id=p.id
    WHERE p.id=$1 AND p.status='HIRED' AND e.kind='ACCEPT_OFFER' AND e.actor_id=p.candidate_id AND o.kind='OFFER' AND o.actor_id<>p.candidate_id
  ), extracted AS (
    SELECT *,${firstField('accepted','employmentOffer')} AS accepted_terms,${firstField('offered','employmentOffer')} AS offered_terms,${firstField('accepted','stage')} AS stage FROM events
  ), terms AS (
    SELECT *,${firstField('accepted_terms','sourceVersion')} AS source_version,${firstField('accepted_terms','revision')} AS revision FROM extracted
  ) SELECT candidate_id,terms.offer_id,occurred_at,accepted_terms::text,offered_terms::text FROM terms
    JOIN faro_offer_versions v ON v.offer_id=terms.offer_id AND v.version=CASE json_typeof(source_version)
      WHEN 'boolean' THEN CASE WHEN source_version::text='true' THEN 1 ELSE 0 END::numeric
      WHEN 'number' THEN source_version::text::numeric
      WHEN 'string' THEN CASE WHEN pg_input_is_valid(source_version#>>'{}','numeric') THEN (source_version#>>'{}')::numeric END
    END
    WHERE stage#>>'{}'='TERMINAL' AND revision IS NOT NULL AND revision::text<>'null' AND offered_terms IS NOT NULL AND v.publication_proof<>'NONE'
    ORDER BY occurred_at DESC,source_order DESC`;
  return {text,values:[id]};
}
interface AnalyticsDatabase {
  readBatch(queries:Array<{text:string;values:readonly unknown[]}>):Promise<Record<string,unknown>[][]>;
  query(text:string,values:readonly unknown[]):Promise<unknown>;
  transaction<T>(work:()=>T|Promise<T>):Promise<T>;
}
// Called by the process command inside its existing owned transaction.
export async function recordAcceptedStageOwned(database:AnalyticsDatabase,id:string):Promise<boolean> {
    const rows=(await database.readBatch([acceptedStageQuery(id,true)]))[0]??[],raw=rows.find(row=>typeof row.accepted_terms==='string'&&typeof row.offered_terms==='string'&&compactStageTerms(row.accepted_terms)===compactStageTerms(row.offered_terms));
    if(!raw)return false;
    const source:StageSource={candidate_id:raw.candidate_id as string,offer_id:raw.offer_id as string,occurred_at:raw.occurred_at as string},consent=(await database.readBatch([stageConsentQuery(source.candidate_id,true)]))[0]?.[0],plan=pairStagePlan(source,consent,'OFFER_ACCEPTED');
    if(!plan)return false;
    const result=await database.query(plan.text,plan.values) as {rowCount:number|null};return result.rowCount===1;
}
export async function recordAcceptedStage(database:AnalyticsDatabase,id:string):Promise<boolean> {
  return database.transaction(()=>recordAcceptedStageOwned(database,id));
}

export function mutualStageQuery(id:string,postgres=false) {
 if(!postgres)return {text:"SELECT p.candidate_id,p.offer_id,e.occurred_at FROM faro_interviews i JOIN faro_interests p ON p.id=i.process_id JOIN faro_events e ON e.process_id=p.id WHERE i.id=$1 AND i.state='COMPLETED' AND i.candidate_completed=1 AND i.employer_completed=1 AND e.kind='INTERVIEW_COMPLETE' AND json_extract(e.data,'$.interviewId')=i.id AND json_extract(e.data,'$.state')='COMPLETED' ORDER BY e.occurred_at DESC,e.rowid DESC LIMIT 1",values:[id]};
 const interviewId=firstField('e.data::json','interviewId'),state=firstField('e.data::json','state');
 return {text:`SELECT p.candidate_id,p.offer_id,e.occurred_at FROM faro_interviews i JOIN faro_interests p ON p.id=i.process_id JOIN faro_events e ON e.process_id=p.id WHERE i.id=$1 AND i.state='COMPLETED' AND i.candidate_completed=1 AND i.employer_completed=1 AND e.kind='INTERVIEW_COMPLETE' AND (${interviewId})#>>'{}'=i.id AND (${state})#>>'{}'='COMPLETED' ORDER BY e.occurred_at DESC,e.__faro_source_rowid DESC LIMIT 1`,values:[id]};
}
// Called by interview completion inside its existing owned command transaction.
export async function recordMutualStageOwned(database:AnalyticsDatabase,id:string):Promise<boolean> {
 const source=(await database.readBatch([mutualStageQuery(id,true)]))[0]?.[0] as unknown as StageSource|undefined;if(!source)return false;
 const consent=(await database.readBatch([stageConsentQuery(source.candidate_id,true)]))[0]?.[0],plan=pairStagePlan(source,consent,'INTERVIEW_COMPLETED');if(!plan)return false;
 const result=await database.query(plan.text,plan.values) as {rowCount:number|null};return result.rowCount===1;
}
export async function recordMutualStage(database:AnalyticsDatabase,id:string):Promise<boolean> {return database.transaction(()=>recordMutualStageOwned(database,id));}
