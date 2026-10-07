import { HttpError } from '../http.js';
import { processReadQuery,processFromRows } from './processReadModel.js';
import { requireAttemptEmployerOwned } from './assessmentAttemptReadModel.js';
export interface InterviewRow {
  id:string; process_id:string; recruiter_id:string|null; state:'PROPOSED'|'CONFIRMED'|'COMPLETED'|'CANCELLED'|'DISPUTED';
  revision:number; starts_at:string; ends_at:string; confirm_by:string; timezone:string; location:string; meeting_url:string|null;
  candidate_completed:number; employer_completed:number; created_at:string;
}
export function interviewReadQuery(id:string) {return {text:'SELECT id,process_id,recruiter_id,state,revision,starts_at,ends_at,confirm_by,timezone,location,meeting_url,candidate_completed,employer_completed,created_at FROM faro_interviews WHERE id=$1',values:[id]};}
export function interviewFromRows(rows:Record<string,unknown>[]):InterviewRow {if(!rows[0])throw new HttpError(404,'Nie znaleziono rozmowy.');return rows[0] as unknown as InterviewRow;}
export function interviewListQuery(processId:string,postgres=false) {return {text:`SELECT id FROM faro_interviews WHERE process_id=$1 ORDER BY created_at,${postgres?'__faro_source_rowid':'rowid'}`,values:[processId]};}
export function interviewView(row:InterviewRow) {return {id:row.id,processId:row.process_id,state:row.state,revision:row.revision,startsAt:row.starts_at,endsAt:row.ends_at,confirmBy:row.confirm_by,timezone:row.timezone,location:row.location,meetingUrl:row.meeting_url,candidateCompleted:Boolean(row.candidate_completed),employerCompleted:Boolean(row.employer_completed)};}
export function interviewSlotQuery(candidateId:string,recruiterId:string,starts:string,ends:string) {return {text:"SELECT i.id FROM faro_interviews i JOIN faro_interests p ON p.id=i.process_id WHERE i.state='CONFIRMED' AND i.starts_at<$1 AND i.ends_at>$2 AND (p.candidate_id IN ($3,$4) OR i.recruiter_id IN ($3,$4)) LIMIT 1",values:[ends,starts,candidateId,recruiterId]};}
export function requireInterviewSlot(rows:Record<string,unknown>[]) {if(rows.length)throw new HttpError(409,'Ten termin nie jest już dostępny. Wybierz inny.','SLOT_CONFLICT');}
export function interviewCalendar(row:ReturnType<typeof interviewView>,asOf:string) {
 const id=row.id;if(row.state!=='CONFIRMED')throw new HttpError(409,'Do kalendarza dodasz potwierdzoną rozmowę.');
    const stamp=(v:string)=>v.replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
    // Fixed title and no attendee/contact fields: calendar export cannot disclose candidate identity.
    const escape=(v:string)=>v.replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
    const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Faro//Recruitment//PL','BEGIN:VEVENT',`UID:${id}@faro`,`DTSTAMP:${stamp(asOf)}`,`DTSTART:${stamp(row.startsAt)}`,`DTEND:${stamp(row.endsAt)}`,'SUMMARY:Rozmowa Faro',`LOCATION:${escape(row.location)}`,...(row.meetingUrl?[`URL:${escape(row.meetingUrl)}`]:[]),'END:VEVENT','END:VCALENDAR'];
    // RFC 5545 line folding counts UTF-8 octets, not JavaScript code units.
    const fold=(line:string)=>{let result='',part='';for(const char of line){if(Buffer.byteLength(part+char)>75){result+=part+'\r\n';part=' ';}part+=char;}return result+part;};
    return {filename:`faro-${id}.ics`,content:lines.map(fold).join('\r\n')+'\r\n'};
}
interface InterviewReadDatabase {
 readBatch(queries:Array<{text:string;values:readonly unknown[]}>):Promise<Record<string,unknown>[][]>;
 transaction<T>(work:()=>T|Promise<T>,options?:{readOnly?:boolean}):Promise<T>;
}
export async function interviewProcessOwned(database:InterviewReadDatabase,userId:string,processId:string) {const process=processFromRows((await database.readBatch([processReadQuery(processId)]))[0]??[]);if(process.candidate_id!==userId)await requireAttemptEmployerOwned(database,userId,process);return process;}
export async function interviewViewOwned(database:InterviewReadDatabase,userId:string,id:string) {const row=interviewFromRows((await database.readBatch([interviewReadQuery(id)]))[0]??[]);await interviewProcessOwned(database,userId,row.process_id);return interviewView(row);}
export async function readInterview(database:InterviewReadDatabase,userId:string,id:string,authorize:()=>void|Promise<void>) {return database.transaction(async()=>{await authorize();return interviewViewOwned(database,userId,id);},{readOnly:true});}
export async function readInterviews(database:InterviewReadDatabase,userId:string,processId:string,authorize:()=>void|Promise<void>) {return database.transaction(async()=>{await authorize();await interviewProcessOwned(database,userId,processId);const rows=(await database.readBatch([interviewListQuery(processId,true)]))[0]??[],views=[];for(const row of rows)views.push(await interviewViewOwned(database,userId,row.id as string));return views;},{readOnly:true});}
export async function readInterviewCalendar(database:InterviewReadDatabase,userId:string,id:string,asOf:string,authorize:()=>void|Promise<void>) {return database.transaction(async()=>{await authorize();return interviewCalendar(await interviewViewOwned(database,userId,id),asOf);},{readOnly:true});}
