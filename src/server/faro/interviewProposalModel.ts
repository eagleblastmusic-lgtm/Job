import { randomUUID } from 'node:crypto';
import { HttpError } from '../http.js';
import { date,integer,text } from './validation.js';
import { type ProcessRow } from './processReadModel.js';
import { offerReadQuery,offerFromRows,offerVersionReadQuery,offerVersionFromRows } from './offerReadModel.js';
import { membershipReadQuery,membershipFromRows } from './organizationReadModel.js';
import { interviewProcessOwned,interviewViewOwned,interviewSlotQuery,requireInterviewSlot } from './interviewReadModel.js';
import { processRecruiterReadQuery,processEventQueries } from './interestWriteModel.js';
import { runCommandOnce } from './commandJournal.js';
export function interviewProposalContextQueries(processId:string) {return [{text:"SELECT id FROM faro_interviews WHERE process_id=$1 AND state IN ('PROPOSED','CONFIRMED')",values:[processId]},{text:"SELECT COUNT(*) n FROM faro_interviews WHERE process_id=$1 AND state='COMPLETED'",values:[processId]}];}
export function interviewProposalInput(p:ProcessRow,active:boolean,completed:number,limit:number,body:Record<string,unknown>,asOf:string) {
      if(integer(body.expectedVersion,1)!==p.revision)throw new HttpError(409,'Odśwież proces.','VERSION_CONFLICT');
      if(body.confirmed!==true)throw new HttpError(400,'Potwierdź swoją dostępność.','CONFIRMATION_REQUIRED');
      if(p.status!=='ACTIVE'||!['ACCEPTED_TO_NEXT_STAGE','ASSESSMENT_COMPLETED','INTERVIEW_COMPLETED'].includes(p.stage))throw new HttpError(409,'Ten etap nie pozwala zaproponować rozmowy.','INVALID_TRANSITION');
      if(active)throw new HttpError(409,'Najpierw zakończ lub anuluj poprzednią propozycję.','ACTIVE_INTERVIEW_EXISTS');
      if(completed>=limit)throw new HttpError(409,'Wykorzystano liczbę rozmów zadeklarowaną przy zgłoszeniu.','INTERVIEW_LIMIT');
      const starts=date(body.startsAt),ends=date(body.endsAt),confirmBy=date(body.confirmBy),zone=text(body.timezone,100);
      try { new Intl.DateTimeFormat('pl-PL',{timeZone:zone}).format(); } catch { throw new HttpError(400,'Nieprawidłowa strefa IANA.'); }
      for(const raw of [body.startsAt,body.endsAt,body.confirmBy]) {
        const value=text(raw,40);
        if(value.endsWith('Z'))continue;
        const parts=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(value));
        const part=(type:string)=>parts.find(p=>p.type===type)!.value;
        const local=`${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}:${part('second')}`;
        if(local!==value.slice(0,19))throw new HttpError(400,'Godzina lub przesunięcie UTC nie odpowiada wybranej strefie. Sprawdź zmianę czasu.','TIMEZONE_MISMATCH');
      }
      if(confirmBy<=asOf||starts<=confirmBy||ends<=starts||Date.parse(ends)-Date.parse(starts)>8*3600000)throw new HttpError(400,'Potwierdzenie musi poprzedzać przyszłą rozmowę trwającą maksymalnie 8 godzin.');
      const location=text(body.location,300),meetingUrl=body.meetingUrl?text(body.meetingUrl,2000):null;
      if(meetingUrl) {
        let url:URL; try { url=new URL(meetingUrl); } catch { throw new HttpError(400,'Nieprawidłowy link spotkania.'); }
        if(url.protocol!=='https:'||url.username||url.password)throw new HttpError(400,'Link spotkania musi używać HTTPS bez danych logowania.');
      }

 return {starts,ends,confirmBy,zone,location,meetingUrl};
}
export function interviewProposalPlan(userId:string,p:ProcessRow,input:ReturnType<typeof interviewProposalInput>,asOf:string) {
 const id=randomUUID(),{starts,ends,confirmBy,zone,location,meetingUrl}=input;
 return {id,event:{interviewId:id,startsAt:starts,endsAt:ends,confirmBy},queries:[{text:"INSERT INTO faro_interviews(id,process_id,recruiter_id,state,starts_at,ends_at,confirm_by,timezone,location,meeting_url,created_at) VALUES($1,$2,$3,'PROPOSED',$4,$5,$6,$7,$8,$9,$10)",values:[id,p.id,userId,starts,ends,confirmBy,zone,location,meetingUrl,asOf]},{text:"UPDATE faro_interests SET stage='INTERVIEW_PROPOSED',stage_due_at=$1,next_action='Potwierdź zaproponowany termin rozmowy.',revision=revision+1 WHERE id=$2",values:[confirmBy,p.id]}]};
}
interface InterviewProposalDatabase {
 readBatch(queries:Array<{text:string;values:readonly unknown[]}>):Promise<Record<string,unknown>[][]>;
 query(text:string,values:readonly unknown[]):Promise<unknown>;
 transaction<T>(work:()=>T|Promise<T>,options?:{readOnly?:boolean}):Promise<T>;
}
export async function proposeInterview(database:InterviewProposalDatabase,userId:string,processId:string,body:Record<string,unknown>,asOf:string,authorize:()=>void|Promise<void>) {
 let process:ProcessRow;
 return runCommandOnce(database,userId,body.idempotencyKey,{...body,processId,operation:'INTERVIEW_PROPOSE'},asOf,async()=>{
  await authorize();process=await interviewProcessOwned(database,userId,processId);if(process.candidate_id===userId)throw new HttpError(403,'Propozycję terminu rozpoczyna rekruter.');const offer=offerFromRows((await database.readBatch([offerReadQuery(process.offer_id)]))[0]??[]);membershipFromRows((await database.readBatch([membershipReadQuery(userId,offer.organizationId)]))[0]??[],['OWNER','ADMIN','RECRUITER']);
 },async()=>{
  const rows=await database.readBatch([...interviewProposalContextQueries(processId),offerVersionReadQuery(process.offer_id,process.offer_version)]),version=offerVersionFromRows(rows[2]??[]),input=interviewProposalInput(process,Boolean(rows[0]?.length),rows[1]?.[0]?.n as number,version.interviewCount,body,asOf);requireInterviewSlot((await database.readBatch([interviewSlotQuery(process.candidate_id,userId,input.starts,input.ends)]))[0]??[]);const plan=interviewProposalPlan(userId,process,input,asOf);
  for(const query of plan.queries)await database.query(query.text,query.values);const recipients=(await database.readBatch([processRecruiterReadQuery(process.offer_id)]))[0]??[];for(const query of processEventQueries(process,userId,'INTERVIEW_PROPOSED',plan.event,recipients,asOf))await database.query(query.text,query.values);
  return interviewViewOwned(database,userId,plan.id);
 });
}
