import { randomUUID } from 'node:crypto';
import { FaroStore } from './base.js';
import { RecruitmentService } from './recruitmentService.js';
import { HttpError } from '../http.js';
import { choice, date, integer, text } from './validation.js';

interface InterviewRow {
  id:string; process_id:string; recruiter_id:string|null; state:'PROPOSED'|'CONFIRMED'|'COMPLETED'|'CANCELLED'|'DISPUTED';
  revision:number; starts_at:string; ends_at:string; confirm_by:string; timezone:string; location:string; meeting_url:string|null;
  candidate_completed:number; employer_completed:number; created_at:string;
}
export class InterviewService extends FaroStore {
  get recruitment() { return new RecruitmentService(this.database,this.clock); }
  row(id:string) {
    const row=this.db.prepare('SELECT * FROM faro_interviews WHERE id=?').get(id) as unknown as InterviewRow|undefined;
    if(!row)throw new HttpError(404,'Nie znaleziono rozmowy.');
    return row;
  }
  list(userId:string,processId:string) {
    this.recruitment.authorize(userId,processId);
    return (this.db.prepare('SELECT id FROM faro_interviews WHERE process_id=? ORDER BY created_at,rowid').all(processId) as Array<{id:string}>).map(r=>this.view(userId,r.id));
  }
  view(userId:string,id:string) {
    const row=this.row(id); this.recruitment.authorize(userId,row.process_id);
    return {id:row.id,processId:row.process_id,state:row.state,revision:row.revision,startsAt:row.starts_at,endsAt:row.ends_at,confirmBy:row.confirm_by,
      timezone:row.timezone,location:row.location,meetingUrl:row.meeting_url,candidateCompleted:Boolean(row.candidate_completed),employerCompleted:Boolean(row.employer_completed)};
  }
  available(candidateId:string,recruiterId:string,starts:string,ends:string) {
    const busy=this.db.prepare("SELECT i.id FROM faro_interviews i JOIN faro_interests p ON p.id=i.process_id WHERE i.state='CONFIRMED' AND i.starts_at<? AND i.ends_at>? AND (p.candidate_id IN (?,?) OR i.recruiter_id IN (?,?)) LIMIT 1").get(ends,starts,candidateId,recruiterId,candidateId,recruiterId);
    if(busy)throw new HttpError(409,'Ten termin nie jest już dostępny. Wybierz inny.', 'SLOT_CONFLICT');
  }
  calendar(userId:string,id:string) {
    const row=this.view(userId,id);
    if(row.state!=='CONFIRMED')throw new HttpError(409,'Do kalendarza dodasz potwierdzoną rozmowę.');
    const stamp=(v:string)=>v.replace(/[-:]/g,'').replace(/\.\d{3}Z$/,'Z');
    // Fixed title and no attendee/contact fields: calendar export cannot disclose candidate identity.
    const escape=(v:string)=>v.replace(/\\/g,'\\\\').replace(/\r\n|\r|\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;');
    const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Faro//Recruitment//PL','BEGIN:VEVENT',`UID:${id}@faro`,`DTSTAMP:${stamp(this.now())}`,`DTSTART:${stamp(row.startsAt)}`,`DTEND:${stamp(row.endsAt)}`,'SUMMARY:Rozmowa Faro',`LOCATION:${escape(row.location)}`,...(row.meetingUrl?[`URL:${escape(row.meetingUrl)}`]:[]),'END:VEVENT','END:VCALENDAR'];
    // RFC 5545 line folding counts UTF-8 octets, not JavaScript code units.
    const fold=(line:string)=>{let result='',part='';for(const char of line){if(Buffer.byteLength(part+char)>75){result+=part+'\r\n';part=' ';}part+=char;}return result+part;};
    return {filename:`faro-${id}.ics`,content:lines.map(fold).join('\r\n')+'\r\n'};
  }
  propose(userId:string,processId:string,body:Record<string,unknown>) {
    this.recruitment.authorize(userId,processId);
    return this.recruitment.commandOnce(userId,body.idempotencyKey,{...body,processId,operation:'INTERVIEW_PROPOSE'},()=>{
      const p=this.recruitment.authorize(userId,processId),offer=this.recruitment.offers.get(p.offer_id);
      if(p.candidate_id===userId)throw new HttpError(403,'Propozycję terminu rozpoczyna rekruter.');
      this.member(userId,offer.organizationId,['OWNER','ADMIN','RECRUITER']);
      if(integer(body.expectedVersion,1)!==p.revision)throw new HttpError(409,'Odśwież proces.','VERSION_CONFLICT');
      if(body.confirmed!==true)throw new HttpError(400,'Potwierdź swoją dostępność.','CONFIRMATION_REQUIRED');
      if(p.status!=='ACTIVE'||!['ACCEPTED_TO_NEXT_STAGE','ASSESSMENT_COMPLETED','INTERVIEW_COMPLETED'].includes(p.stage))throw new HttpError(409,'Ten etap nie pozwala zaproponować rozmowy.','INVALID_TRANSITION');
      if(this.db.prepare("SELECT id FROM faro_interviews WHERE process_id=? AND state IN ('PROPOSED','CONFIRMED')").get(processId))throw new HttpError(409,'Najpierw zakończ lub anuluj poprzednią propozycję.','ACTIVE_INTERVIEW_EXISTS');
      const completed=(this.db.prepare("SELECT COUNT(*) n FROM faro_interviews WHERE process_id=? AND state='COMPLETED'").get(processId) as {n:number}).n;
      if(completed>=this.recruitment.offers.version(p.offer_id,p.offer_version).interviewCount)throw new HttpError(409,'Wykorzystano liczbę rozmów zadeklarowaną przy zgłoszeniu.','INTERVIEW_LIMIT');
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
      if(confirmBy<=this.now()||starts<=confirmBy||ends<=starts||Date.parse(ends)-Date.parse(starts)>8*3600000)throw new HttpError(400,'Potwierdzenie musi poprzedzać przyszłą rozmowę trwającą maksymalnie 8 godzin.');
      const location=text(body.location,300),meetingUrl=body.meetingUrl?text(body.meetingUrl,2000):null;
      if(meetingUrl) {
        let url:URL; try { url=new URL(meetingUrl); } catch { throw new HttpError(400,'Nieprawidłowy link spotkania.'); }
        if(url.protocol!=='https:'||url.username||url.password)throw new HttpError(400,'Link spotkania musi używać HTTPS bez danych logowania.');
      }
      this.available(p.candidate_id,userId,starts,ends);
      const id=randomUUID();
      this.db.prepare("INSERT INTO faro_interviews(id,process_id,recruiter_id,state,starts_at,ends_at,confirm_by,timezone,location,meeting_url,created_at) VALUES(?,?,?,'PROPOSED',?,?,?,?,?,?,?)").run(id,processId,userId,starts,ends,confirmBy,zone,location,meetingUrl,this.now());
      this.db.prepare("UPDATE faro_interests SET stage='INTERVIEW_PROPOSED',stage_due_at=?,next_action='Potwierdź zaproponowany termin rozmowy.',revision=revision+1 WHERE id=?").run(confirmBy,processId);
      this.recruitment.event(p,userId,'INTERVIEW_PROPOSED',{interviewId:id,startsAt:starts,endsAt:ends,confirmBy});
      return this.view(userId,id);
    });
  }
  tick() {
    this.transaction(()=>{
      const pending=this.db.prepare("SELECT * FROM faro_interviews WHERE state IN ('PROPOSED','CONFIRMED')").all() as unknown as InterviewRow[];
      for(const row of pending) {
        const p=this.recruitment.row(row.process_id);
        if(p.status!=='ACTIVE')continue;
        if(row.state==='PROPOSED'&&row.confirm_by<=this.now()) {
          this.db.prepare("UPDATE faro_interviews SET state='CANCELLED',revision=revision+1 WHERE id=?").run(row.id);
          const due=new Date(this.clock().getTime()+this.recruitment.offers.version(p.offer_id,p.offer_version).decisionHours*3600000).toISOString();
          this.db.prepare("UPDATE faro_interests SET stage='ACCEPTED_TO_NEXT_STAGE',stage_due_at=?,next_action='Propozycja terminu wygasła. Uzgodnijcie nowy termin.',revision=revision+1 WHERE id=?").run(due,p.id);
          this.recruitment.event(p,null,'INTERVIEW_PROPOSAL_EXPIRED',{interviewId:row.id});
          continue;
        }
        const deadline=row.state==='PROPOSED'?row.confirm_by:row.starts_at;
        const outcome=row.state==='CONFIRMED'&&row.ends_at<=this.now();
        if(!outcome&&(deadline<=this.now()||Date.parse(deadline)>this.clock().getTime()+24*3600000))continue;
        const recipients=row.state==='PROPOSED'?[p.candidate_id]:[p.candidate_id,...(row.recruiter_id?[row.recruiter_id]:[])];
        for(const recipient of recipients) {
          if(recipient!==p.candidate_id) {
            try { this.recruitment.offers.assigned(recipient,p.offer_id); } catch { continue; }
          }
          this.recruitment.enqueue(recipient,'process',p.id,outcome?'Potwierdź odbycie rozmowy lub zgłoś rozbieżność.':row.state==='PROPOSED'?'Zbliża się termin potwierdzenia propozycji rozmowy.':'Zbliża się potwierdzona rozmowa.',`interview:${row.id}:${outcome?'outcome':row.state}:${deadline}`);
        }
      }
    });
  }
  change(userId:string,id:string,body:Record<string,unknown>) {
    this.recruitment.authorize(userId,this.row(id).process_id);
    return this.recruitment.commandOnce(userId,body.idempotencyKey,{...body,id,operation:'INTERVIEW_CHANGE'},()=>{
      const row=this.row(id),p=this.recruitment.authorize(userId,row.process_id),candidate=p.candidate_id===userId;
      if(!candidate)this.member(userId,this.recruitment.offers.get(p.offer_id).organizationId,['OWNER','ADMIN','RECRUITER']);
      if(integer(body.expectedVersion,1)!==row.revision||integer(body.processVersion,1)!==p.revision)throw new HttpError(409,'Odśwież rozmowę i proces.','VERSION_CONFLICT');
      if(p.status!=='ACTIVE'||!['PROPOSED','CONFIRMED'].includes(row.state))throw new HttpError(409,'Rozmowa nie jest aktywna.','INVALID_TRANSITION');
      const command=choice(body.command,['CONFIRM','CANCEL','COMPLETE','DISPUTE'] as const);
      if(body.confirmed!==true)throw new HttpError(400,'Potwierdź działanie dotyczące rozmowy.','CONFIRMATION_REQUIRED');
      let state:InterviewRow['state']=row.state,stage=p.stage,due=p.stage_due_at,action=p.next_action,caseId:string|null=null;
      if(command==='CONFIRM') {
        if(!candidate||row.state!=='PROPOSED'||row.confirm_by<=this.now())throw new HttpError(409,'Potwierdzenie nie jest już dostępne.');
        if(!row.recruiter_id)throw new HttpError(409,'Rekruter nie jest dostępny.');
        this.recruitment.offers.assigned(row.recruiter_id,p.offer_id);
        this.available(p.candidate_id,row.recruiter_id,row.starts_at,row.ends_at);
        state='CONFIRMED'; stage='INTERVIEW_CONFIRMED'; due=row.ends_at; action='Rozmowa potwierdzona przez obie strony.';
      } else if(command==='CANCEL') {
        choice(body.reason,['RESCHEDULE','UNAVAILABLE','TECHNICAL_ISSUE'] as const);
        state='CANCELLED'; stage='ACCEPTED_TO_NEXT_STAGE'; action='Uzgodnij nowy termin rozmowy.';
        due=new Date(this.clock().getTime()+this.recruitment.offers.version(p.offer_id,p.offer_version).decisionHours*3600000).toISOString();
      } else {
        if(row.state!=='CONFIRMED'||row.ends_at>this.now())throw new HttpError(409,'Najpierw musi upłynąć potwierdzony termin rozmowy.');
        if(command==='COMPLETE') {
          if(candidate?row.candidate_completed:row.employer_completed)throw new HttpError(409,'Twoje potwierdzenie zostało już zapisane.');
          this.db.prepare(`UPDATE faro_interviews SET ${candidate?'candidate_completed':'employer_completed'}=1 WHERE id=?`).run(id);
          if(candidate?row.employer_completed:row.candidate_completed) {
            state='COMPLETED';stage='INTERVIEW_COMPLETED';action='Firma przekaże decyzję lub kolejny krok.';
            due=new Date(this.clock().getTime()+this.recruitment.offers.version(p.offer_id,p.offer_version).decisionHours*3600000).toISOString();
          }
        } else {
          state='DISPUTED';stage='ACCEPTED_TO_NEXT_STAGE';action='Rozbieżność dotycząca rozmowy czeka na wyjaśnienie.';due=null;
          const reason=choice(body.reason,['NO_SHOW','TECHNICAL_ISSUE','OTHER_DISCREPANCY'] as const);
          caseId=randomUUID();
          this.db.prepare("INSERT INTO faro_cases(id,organization_id,process_id,reporter_id,kind,statement,dedupe_key,created_at) VALUES(?,?,?,?,?,?,?,?)").run(caseId,this.recruitment.offers.get(p.offer_id).organizationId,p.id,userId,reason==='NO_SHOW'?'NO_SHOW_CASE':'INTERVIEW_DISCREPANCY',`Rozmowa ${id}: ${reason}. Wymaga wyjaśnienia przez obie strony; bez automatycznej sankcji.`,`interview:${id}`,this.now());
          const moderators=this.db.prepare("SELECT id FROM users WHERE role='ADMIN'").all() as Array<{id:string}>;
          for(const moderator of moderators)this.recruitment.enqueue(moderator.id,'case',caseId,'Nowa rozbieżność po rozmowie wymaga przeglądu.',`case:${caseId}:opened`);
          const assigned=this.db.prepare('SELECT a.user_id FROM faro_assignments a JOIN faro_offers o ON o.id=a.offer_id JOIN faro_members m ON m.user_id=a.user_id AND m.organization_id=o.organization_id AND m.active=1 WHERE a.offer_id=?').all(p.offer_id) as Array<{user_id:string}>;
          for(const recipient of [p.candidate_id,...assigned.map(a=>a.user_id)])this.recruitment.enqueue(recipient,'case',caseId,'Możesz przekazać prywatne wyjaśnienie rozbieżności po rozmowie.',`case:${caseId}:opened`);
        }
      }
      this.db.prepare('UPDATE faro_interviews SET state=?,revision=revision+1 WHERE id=?').run(state,id);
      this.db.prepare('UPDATE faro_interests SET stage=?,stage_due_at=?,next_action=?,revision=revision+1 WHERE id=?').run(stage,due,action,p.id);
      this.recruitment.event(p,userId,`INTERVIEW_${command}`,{interviewId:id,state,stage,stageDueAt:due,caseId,reason:command==='CANCEL'||command==='DISPUTE'?body.reason:null});
      return this.view(userId,id);
    });
  }
}
