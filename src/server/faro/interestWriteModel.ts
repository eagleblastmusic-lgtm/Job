import { randomUUID } from 'node:crypto';
import { HttpError } from '../http.js';
import { integer } from './validation.js';
import { runCommandOnce } from './commandJournal.js';
import { readProfile,profilePreview } from './profileReadModel.js';
import { offerReadQuery,offerFromRows,intakeReadQueries,intakeFromRows,type OfferRecord } from './offerReadModel.js';
export function interestReadQueries(userId:string,offerId:string,postgres=false) {
  const order=postgres?'__faro_source_rowid':'rowid';
  return [
    {text:"SELECT id FROM faro_interests WHERE candidate_id=$1 AND offer_id=$2 AND status IN ('INTERESTED','ACTIVE','OFFERED')",values:[userId,offerId]},
    {text:`SELECT id FROM faro_interests WHERE candidate_id=$1 AND offer_id=$2 ORDER BY ${order} DESC LIMIT 1`,values:[userId,offerId]}
  ];
}
export function interestPlan(userId:string,offer:OfferRecord,accepting:boolean,body:Record<string,unknown>,rows:Record<string,unknown>[][],preview:()=>ReturnType<typeof profilePreview>,asOf:string) {
  if(!accepting)throw new HttpError(409,'Oferta nie przyjmuje nowych zgłoszeń.','INTAKE_CLOSED');
  if(integer(body.offerVersion,1)!==offer.version)throw new HttpError(409,'Warunki oferty zmieniły się. Sprawdź je ponownie.','OFFER_CHANGED');
  if(body.projectionConfirmed!==true)throw new HttpError(400,'Potwierdź zakres udostępnianych danych.');
  if(rows[0]?.length)throw new HttpError(409,'Masz już aktywne zgłoszenie.','ACTIVE_INTEREST_EXISTS');
  const previous=rows[1]?.[0] as {id:string}|undefined;
  if(previous&&(body.previousInterestId!==previous.id||body.renewalConfirmed!==true))throw new HttpError(409,'Potwierdź nowy proces powiązany z poprzednim zgłoszeniem.','RENEWAL_CONFIRMATION_REQUIRED');
  if(!previous&&body.previousInterestId)throw new HttpError(400,'Nieprawidłowy poprzedni proces.','INVALID_HISTORY_LINK');
  const projection=preview();if(body.confirmationToken!==projection.confirmationToken)throw new HttpError(409,'Profil zmienił się lub brakuje potwierdzonego podglądu. Sprawdź dane ponownie.','PROFILE_CHANGED');
  const id=randomUUID(),snapshot={...projection.projection,processId:id};
  return {id,subject:{id,candidate_id:userId,offer_id:offer.id},event:{offerVersion:offer.version,previousInterestId:previous?.id??null},query:{text:"INSERT INTO faro_interests(id,candidate_id,offer_id,offer_version,snapshot,status,stage,response_due_at,created_at,previous_interest_id) VALUES($1,$2,$3,$4,$5,'INTERESTED','AWAITING_EMPLOYER',$6,$7,$8)",values:[id,userId,offer.id,offer.version,JSON.stringify(snapshot),new Date(Date.parse(asOf)+offer.data.responseHours*3600000).toISOString(),asOf,previous?.id??null]}};
}
export function processRecruiterReadQuery(offerId:string) {return {text:'SELECT a.user_id FROM faro_assignments a JOIN faro_offers o ON o.id=a.offer_id JOIN faro_members m ON m.user_id=a.user_id AND m.organization_id=o.organization_id WHERE a.offer_id=$1 AND m.active=1',values:[offerId]};}
export function processEventQueries(row:{id:string;candidate_id:string;offer_id:string},actor:string|null,kind:string,data:Record<string,unknown>,recipients:Record<string,unknown>[],asOf:string) {
  const eventId=randomUUID();
  return [
    {text:'INSERT INTO faro_events(id,process_id,actor_id,kind,data,occurred_at) VALUES($1,$2,$3,$4,$5,$6)',values:[eventId,row.id,actor,kind,JSON.stringify(data),asOf]},
    {text:'INSERT INTO audit_logs(id,user_id,action,entity_type,entity_id,metadata,created_at) VALUES($1,$2,$3,$4,$5,$6,$7)',values:[randomUUID(),actor,kind,'faro',row.id,'{}',asOf]},
    ...[{id:row.candidate_id,message:'W Twojej rekrutacji pojawiła się aktualizacja.'},...recipients.map(recipient=>({id:recipient.user_id as string,message:'W przypisanej rekrutacji pojawiła się aktualizacja.'}))].map(recipient=>({text:'INSERT INTO faro_outbox(id,recipient_id,entity_type,entity_id,message,dedupe_key,next_attempt_at) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(recipient_id,dedupe_key) DO NOTHING',values:[randomUUID(),recipient.id,'process',row.id,recipient.message,eventId,asOf]}))
  ];
}
interface InterestDatabase {
  readBatch(queries:Array<{text:string;values:readonly unknown[]}>):Promise<Record<string,unknown>[][]>;
  query(text:string,values:readonly unknown[]):Promise<unknown>;
  transaction<T>(work:()=>T|Promise<T>):Promise<T>;
}
export async function submitInterest(database:InterestDatabase,userId:string,offerId:string,body:Record<string,unknown>,asOf:string,authorize:()=>void|Promise<void>) {
  return runCommandOnce(database,userId,body.idempotencyKey,{...body,offerId},asOf,authorize,async()=>{
    const offer=offerFromRows((await database.readBatch([offerReadQuery(offerId)]))[0]??[]),accepting=intakeFromRows(offer,await database.readBatch(intakeReadQueries(offer)),asOf);
    const rows=await database.readBatch(interestReadQueries(userId,offerId,true)),profile=await readProfile(database,userId,asOf),plan=interestPlan(userId,offer,accepting,body,rows,()=>profilePreview(userId,profile),asOf);
    await database.query(plan.query.text,plan.query.values);
    const recipients=(await database.readBatch([processRecruiterReadQuery(offerId)]))[0]??[];
    for(const query of processEventQueries(plan.subject,userId,'INTEREST_CREATED',plan.event,recipients,asOf))await database.query(query.text,query.values);
    return {id:plan.id};
  });
}
