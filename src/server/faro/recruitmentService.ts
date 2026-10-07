import { processReadQuery,processFromRows,processContextReadQueries,processViewFromRows,processLatestDataQuery,processClarificationFromRows,processEmploymentFromRows,type ProcessRow } from './processReadModel.js';
export type { ProcessRow } from './processReadModel.js';
import { interestReadQueries,interestPlan,processRecruiterReadQuery,processEventQueries } from './interestWriteModel.js';
import { commandRequest,commandReadQuery,commandReplay,commandSaveQuery } from './commandJournal.js';
import { AppStore } from '../store.js';
import { randomUUID, createHash } from 'node:crypto';
import { FaroStore } from './base.js';
import { ProfileService } from './profileService.js';
import { OfferService } from './offerService.js';
import { HttpError } from '../http.js';
import { text, integer, choice, date, object } from './validation.js';
import { transition, COMMANDS, REJECTION_REASONS, TERMINAL, type Stage } from '../../domain/faro/recruitment.js';
import { LEVELS, SOURCES, skillById } from '../../domain/faro/skills.js';
export class RecruitmentService extends FaroStore {
  get offers() { return new OfferService(this.database, this.clock); }
  row(id: string) {
    const query=processReadQuery(id);return processFromRows(this.db.prepare(query.text).all({$1:id}));
  }
  authorize(userId: string, id: string) {
    const row = this.row(id);
    if (row.candidate_id !== userId) this.offers.assigned(userId, row.offer_id);
    return row;
  }
  commandOnce<T>(userId: string, key: unknown, input: unknown, work: () => T): T {
    const request=commandRequest(key,input);
    return this.transaction(()=>{
      const query=commandReadQuery(userId,request.key),replay=commandReplay<T>(this.db.prepare(query.text).all({$1:userId,$2:request.key}),request.hash);
      if(replay.found)return replay.result;
      const result=work(),save=commandSaveQuery(userId,request,result,this.now());
      this.db.prepare(save.text).run(Object.fromEntries(save.values.map((value,index)=>[`$${index+1}`,value as string])));
      return result;
    });
  }
  enqueue(recipient: string, type: string, id: string, message: string, key: string) {
    this.db.prepare('INSERT OR IGNORE INTO faro_outbox(id,recipient_id,entity_type,entity_id,message,dedupe_key,next_attempt_at) VALUES(?,?,?,?,?,?,?)').run(randomUUID(), recipient, type, id, message, key, this.now());
  }
  event(row: Pick<ProcessRow,'id'|'candidate_id'|'offer_id'>, actor: string | null, kind: string, data: Record<string, unknown>) {
    const read=processRecruiterReadQuery(row.offer_id),recipients=this.db.prepare(read.text).all({$1:row.offer_id});
    for(const query of processEventQueries(row,actor,kind,data,recipients,this.now()))this.db.prepare(query.text).run(Object.fromEntries(query.values.map((value,index)=>[`$${index+1}`,value as string|null])));
  }
  interest(userId: string, offerId: string, body: Record<string, unknown>) {
    return this.commandOnce(userId,body.idempotencyKey,{...body,offerId},()=>{
      const offer=this.offers.get(offerId),rows=interestReadQueries(userId,offerId).map(query=>this.db.prepare(query.text).all({$1:userId,$2:offerId}));
      const plan=interestPlan(userId,offer,this.offers.intake(offer),body,rows,()=>new ProfileService(this.database,this.clock).previewConfirmation(userId),this.now());
      this.db.prepare(plan.query.text).run(Object.fromEntries(plan.query.values.map((value,index)=>[`$${index+1}`,value])));
      this.event(plan.subject,userId,'INTEREST_CREATED',plan.event);
      return {id:plan.id};
    });
  }
  view(userId: string, id: string) {
    const row=this.authorize(userId,id),candidate=row.candidate_id===userId,source=this.offers.published(row.offer_id),offer=candidate?source:this.offers.get(row.offer_id);
    const rows=processContextReadQueries(row).map(query=>this.db.prepare(query.text).all(Object.fromEntries(query.values.map((value,index)=>[`$${index+1}`,value]))));
    return processViewFromRows(row,candidate,offer,source,rows);
  }
  list(userId: string, offerId?: string) {
    if (offerId) this.offers.assigned(userId, offerId);
    const rows = (offerId ? this.db.prepare('SELECT id FROM faro_interests WHERE offer_id=? ORDER BY created_at').all(offerId) : this.db.prepare('SELECT id FROM faro_interests WHERE candidate_id=? ORDER BY created_at DESC').all(userId)) as Array<{ id: string }>;
    return rows.map(row => this.view(userId, row.id));
  }
  change(userId: string, id: string, body: Record<string, unknown>) {
    this.authorize(userId, id);
    return this.commandOnce(userId, body.idempotencyKey, { id, ...body }, () => {
      const row = this.authorize(userId, id), actor = row.candidate_id === userId ? 'CANDIDATE' : 'EMPLOYER';
      if (actor === 'EMPLOYER') this.member(userId, this.offers.get(row.offer_id).organizationId, ['OWNER','ADMIN','RECRUITER']);
      if (integer(body.expectedVersion, 1) !== row.revision) throw new HttpError(409, 'Proces został zmieniony. Odśwież dane.', 'VERSION_CONFLICT');
      const command = choice(body.command, COMMANDS), next = transition(row.status, row.stage, actor, command)
        ?? (actor==='EMPLOYER'&&command==='CLARIFY'&&row.stage==='CLARIFICATION_REQUESTED'&&!this.clarification(id)?{status:row.status,stage:row.stage,substantive:false}:null);
      if (!next) throw new HttpError(409, 'Ta akcja nie jest dostępna w tym etapie.', 'INVALID_TRANSITION');
      let reason: Record<string, unknown> | null = null, action: string | null = null, due: string | null = null;
      let employmentOffer:ReturnType<RecruitmentService['employmentOffer']>=null;
      let question:ReturnType<RecruitmentService['clarification']>=null,response:Record<string,unknown>|null=null;
      if (command === 'REJECT') {
        const raw = object(body.reason), code = choice(raw.code, REJECTION_REASONS);
        const requires = ['REQUIREMENT_NOT_DEMONSTRATED','REQUIREMENT_NOT_MET','OTHER_CANDIDATE_BETTER_MATCH'].includes(code);
        const requirementId = requires ? text(raw.requirementId, 100) : null;
        if (requires && !this.offers.version(row.offer_id, row.offer_version).requirements.some(r => r.id === requirementId && r.kind !== 'WILL_TEACH')) throw new HttpError(400, 'Wybierz wymaganie z wersji zgłoszenia; nauka w firmie nie jest barierą.', 'REJECTION_REQUIREMENT');
        reason = { code, requirementId };
      } else if (command === 'CANCEL') reason = { code: 'RECRUITMENT_CANCELLED', explanation: text(body.explanation, 1000, 5) };
      if (['ADVANCE','OFFER'].includes(command)) {
        action = text(body.nextAction, 1500, 5); due = date(body.dueAt);
        if (due <= this.now()) throw new HttpError(400, 'Termin musi być w przyszłości.');
      }
      if(command==='OFFER') {
        if(body.confirmed!==true)throw new HttpError(400,'Potwierdź konkretne warunki oferty.','CONFIRMATION_REQUIRED');
        const sourceVersion=integer(body.offerVersion,1),salaryIndex=integer(body.salaryIndex,0,7);
        const published=this.db.prepare("SELECT 1 FROM faro_offer_versions WHERE offer_id=? AND version=? AND publication_proof<>'NONE'").get(row.offer_id,sourceVersion);
        if(!published)throw new HttpError(409,'Wybierz opublikowaną wersję warunków.','PUBLICATION_NOT_FOUND');
        const conditions=this.offers.version(row.offer_id,sourceVersion),option=conditions.salary[salaryIndex];
        if(!option)throw new HttpError(400,'Wybierz istniejący wariant wynagrodzenia.');
        const amount=integer(body.amount,1);if(amount<option.min||amount>option.max)throw new HttpError(400,'Konkretna kwota musi należeć do wybranego przedziału.','SALARY_RANGE');
        const startsAt=date(body.startsAt);if(startsAt<=this.now())throw new HttpError(400,'Początek współpracy musi być w przyszłości.');
        employmentOffer={revision:row.revision+1,sourceVersion,salaryIndex,amount,startsAt,responseDueAt:due!,conditions};
      }
      if(command==='ACCEPT_OFFER') {
        employmentOffer=this.employmentOffer(id);
        if(!employmentOffer)throw new HttpError(409,'Oferta wymaga zapisanych konkretnych warunków.','EMPLOYMENT_TERMS_REQUIRED');
        if(integer(body.employmentOfferRevision,1)!==employmentOffer.revision)throw new HttpError(409,'Potwierdź właściwą wersję warunków.','VERSION_CONFLICT');
        if(body.confirmed!==true)throw new HttpError(400,'Potwierdź przyjęcie pokazanych warunków.','CONFIRMATION_REQUIRED');
        if(employmentOffer.responseDueAt<=this.now())throw new HttpError(409,'Termin przyjęcia oferty minął.','EMPLOYMENT_OFFER_EXPIRED');
      }
      if(command==='CLARIFY') {
        const raw=object(body.question),topic=choice(raw.topic,['REQUIREMENT','AVAILABILITY'] as const);
        const requirementId=topic==='REQUIREMENT'?text(raw.requirementId,100):null;
        const requirement=this.offers.version(row.offer_id,row.offer_version).requirements.find(r=>r.id===requirementId);
        if(topic==='REQUIREMENT'&&!requirement)throw new HttpError(400,'Wybierz wymaganie z wersji zgłoszenia.','CLARIFICATION_REQUIREMENT');
        question={topic,requirementId,skillId:requirement?.skillId??null,previousStage:row.stage==='CLARIFICATION_REQUESTED'?(row.status==='ACTIVE'?'ACCEPTED_TO_NEXT_STAGE':'AWAITING_EMPLOYER'):row.stage};
        action=topic==='AVAILABILITY'?'Potwierdź swoją aktualną dostępność.':`Jak deklarujesz kompetencję: ${skillById(requirement!.skillId)!.label}? Podaj poziom i praktykę albo kierunek nauki.`;
        due=date(body.dueAt);if(due<=this.now())throw new HttpError(400,'Termin odpowiedzi musi być w przyszłości.');
      }
      if(command==='ANSWER') {
        question=this.clarification(id);
        if(!question)throw new HttpError(409,'Pytanie wymaga ustrukturyzowania przez rekrutera.','STRUCTURED_QUESTION_REQUIRED');
        if(body.confirmed!==true)throw new HttpError(400,'Potwierdź udostępnianą deklarację.','CONFIRMATION_REQUIRED');
        const raw=object(body.response);
        if(question.topic==='AVAILABILITY') {
          response={kind:'AVAILABILITY',availability:new ProfileService(this.database,this.clock).availability(raw.availability)};
        } else {
          const kind=choice(raw.kind,['DECLARE_SKILL','NOT_YET','WANTS_TO_LEARN'] as const);
          response=kind==='DECLARE_SKILL'?{kind,skillId:question.skillId,level:choice(raw.level,LEVELS),source:choice(raw.source,SOURCES),practice:new ProfileService(this.database,this.clock).practice(raw.practice),verification:'DECLARED'}:{kind,skillId:question.skillId};
        }
        next.stage=question.previousStage==='ACCEPTED_TO_NEXT_STAGE'?'ACCEPTED_TO_NEXT_STAGE':'AWAITING_EMPLOYER';
        action='Kandydat odpowiedział. Firma sprawdzi deklarację i przekaże kolejny krok.';
        due=new Date(this.clock().getTime()+this.offers.version(row.offer_id,row.offer_version).decisionHours*3600000).toISOString();
      }
      const first = next.substantive ? row.first_response_at ?? this.now() : row.first_response_at;
      this.db.prepare('UPDATE faro_interests SET status=?,stage=?,revision=revision+1,first_response_at=?,stage_due_at=?,next_action=?,reason=? WHERE id=?').run(next.status, next.stage, first, due, action, reason ? JSON.stringify(reason) : null, id);
      if (TERMINAL.includes(next.status)) this.cancelObligations(id);
      this.event(row, userId, command, { previousStage: row.stage, stage: next.stage, previousDueAt: row.stage_due_at, stageDueAt: due, reason, action,question,response,employmentOffer });
      if(command==='ACCEPT_OFFER')new AppStore(this.database).faroOfferAccepted(id);
      return { id, revision: row.revision + 1 };
    });
  }
  employmentOffer(id:string):{revision:number;sourceVersion:number;salaryIndex:number;amount:number;startsAt:string;responseDueAt:string;conditions:ReturnType<OfferService['version']>}|null {
    const query=processLatestDataQuery(id,'OFFER');return processEmploymentFromRows(this.db.prepare(query.text).all({$1:id,$2:'OFFER'}));
  }
  cancelObligations(id:string) {
    this.db.prepare('UPDATE faro_contact_grants SET revoked_at=COALESCE(revoked_at,?) WHERE process_id=?').run(this.now(),id);
    this.db.prepare("UPDATE faro_attempts SET state='WITHDRAWN',revision=revision+1 WHERE process_id=? AND state IN ('INVITED','STARTED')").run(id);
    this.db.prepare("UPDATE faro_interviews SET state='CANCELLED',revision=revision+1 WHERE process_id=? AND state IN ('PROPOSED','CONFIRMED')").run(id);
  }
  clarification(id:string):{topic:'REQUIREMENT'|'AVAILABILITY';requirementId:string|null;skillId:string|null;previousStage:Stage}|null {
    const query=processLatestDataQuery(id,'CLARIFY');return processClarificationFromRows(this.db.prepare(query.text).all({$1:id,$2:'CLARIFY'}));
  }
  watch(userId: string, offerId: string, watching: boolean) {
    return this.transaction(()=>{
    if (watching) {
      const offer = this.offers.get(offerId); if (!this.offers.intake(offer)) throw new HttpError(409, 'Możesz obserwować aktywną ofertę.');
      this.db.prepare('INSERT OR IGNORE INTO faro_watches(candidate_id,offer_id,created_at) VALUES(?,?,?)').run(userId, offerId, this.now());
    } else {this.db.prepare('DELETE FROM faro_watches WHERE candidate_id=? AND offer_id=?').run(userId, offerId);this.cancelWatchAlerts(userId,offerId);}
    return { watching };
    });
  }
  cancelWatchAlerts(userId:string,offerId:string) {
    this.db.prepare("DELETE FROM faro_outbox WHERE recipient_id=? AND entity_type='offer' AND entity_id=? AND status='PENDING' AND dedupe_key LIKE '%:closing-soon'").run(userId,offerId);
    // Applicant updates are independent of an optional watch preference.
    if(!this.db.prepare('SELECT id FROM faro_interests WHERE candidate_id=? AND offer_id=?').get(userId,offerId))this.db.prepare("DELETE FROM faro_outbox WHERE recipient_id=? AND entity_type='offer' AND entity_id=? AND status='PENDING'").run(userId,offerId);
  }
  watchSettings(userId:string,offerId:string,body:Record<string,unknown>) {
    if(typeof body.alerts!=='boolean')throw new HttpError(400,'Wybierz, czy chcesz otrzymywać alerty.');
    return this.transaction(()=>{
      const watch=this.db.prepare('SELECT alerts FROM faro_watches WHERE candidate_id=? AND offer_id=?').get(userId,offerId);
      if(!watch)throw new HttpError(404,'Nie znaleziono obserwowanej oferty.');
      this.db.prepare('UPDATE faro_watches SET alerts=? WHERE candidate_id=? AND offer_id=?').run(body.alerts?1:0,userId,offerId);
      if(!body.alerts)this.cancelWatchAlerts(userId,offerId);
      return {watching:true,alerts:body.alerts};
    });
  }
  watches(userId: string) {
    const rows = this.db.prepare('SELECT offer_id,alerts FROM faro_watches WHERE candidate_id=? ORDER BY created_at DESC').all(userId) as Array<{ offer_id: string;alerts:number }>;
    return rows.flatMap(row=>{
      try {return [{...this.offers.published(row.offer_id),watchAlerts:row.alerts===1}];}
      catch(error){if(error instanceof HttpError&&error.code==='PUBLICATION_NOT_FOUND')return [];throw error;}
    });
  }
  phonePreview(userId:string,id:string) {
    const row=this.row(id);
    if(row.candidate_id!==userId)throw new HttpError(404,'Nie znaleziono procesu.');
    if(!['ACTIVE','OFFERED'].includes(row.status))throw new HttpError(409,'Telefon udostępnisz dopiero po przyjęciu do kolejnego etapu.');
    const phone=new ProfileService(this.database,this.clock).profile(userId).phone;
    if(!phone)throw new HttpError(400,'Najpierw zapisz prywatny numer w profilu.');
    const confirmationToken=createHash('sha256').update(JSON.stringify([userId,id,phone])).digest('hex');
    return {phone,confirmationToken};
  }
  grant(userId: string, id: string, grant: boolean, body:Record<string,unknown>={}) {
    return this.transaction(()=>{
      const row = this.row(id);
      if (row.candidate_id !== userId) throw new HttpError(404, 'Nie znaleziono procesu.');
      if (grant) {
        const preview=this.phonePreview(userId,id);
        if(body.phoneConfirmed!==true)throw new HttpError(400,'Potwierdź udostępnienie wyświetlonego numeru.','CONFIRMATION_REQUIRED');
        if(body.confirmationToken!==preview.confirmationToken)throw new HttpError(409,'Numer zmienił się. Otwórz aktualny podgląd.','PHONE_PREVIEW_STALE');
        this.db.prepare('INSERT INTO faro_contact_grants(process_id,candidate_id,organization_id,granted_at) VALUES(?,?,?,?) ON CONFLICT(process_id) DO UPDATE SET granted_at=excluded.granted_at,revoked_at=NULL').run(id, userId, this.offers.get(row.offer_id).organizationId, this.now());
      } else this.db.prepare('UPDATE faro_contact_grants SET revoked_at=? WHERE process_id=? AND candidate_id=?').run(this.now(), id, userId);
      this.audit(userId, grant ? 'PHONE_GRANTED' : 'PHONE_REVOKED', id);
      return { granted: grant };
    });
  }
  phone(userId: string, id: string) {
    const row = this.row(id); this.offers.assigned(userId, row.offer_id);
    const grant = this.db.prepare('SELECT process_id FROM faro_contact_grants WHERE process_id=? AND revoked_at IS NULL').get(id);
    if (!grant || !['ACTIVE','OFFERED'].includes(row.status)) throw new HttpError(403, 'Kandydat nie udostępnia teraz numeru.', 'CONTACT_NOT_GRANTED');
    this.audit(userId, 'GRANTED_PHONE_READ', id);
    return { phone: new ProfileService(this.database, this.clock).profile(row.candidate_id).phone };
  }
  claimOutbox(limit=100,leaseMs=30000) {
    integer(limit,1,100);integer(leaseMs,1000,300000);
    return this.transaction(()=>{
      const now=this.now(),until=new Date(this.clock().getTime()+leaseMs).toISOString();
      // A crashed reservation consumes its attempt budget; expiry never grants an unbounded retry loop.
      this.db.prepare("UPDATE faro_outbox SET status='DEAD_LETTER',error_code=CASE WHEN lease_until IS NULL THEN 'ATTEMPT_BUDGET_EXHAUSTED' ELSE 'LEASE_EXPIRED' END,claim_token=NULL,lease_until=NULL WHERE status='PENDING' AND attempts>=max_attempts AND (lease_until IS NULL OR lease_until<=?)").run(now);
      const rows=this.db.prepare("SELECT id FROM faro_outbox WHERE status='PENDING' AND attempts<max_attempts AND next_attempt_at<=? AND (lease_until IS NULL OR lease_until<=?) ORDER BY next_attempt_at,id LIMIT ?").all(now,now,limit) as Array<{id:string}>;
      return rows.map(row=>{
        const claimToken=randomUUID();
        this.db.prepare('UPDATE faro_outbox SET claim_token=?,lease_until=?,attempts=attempts+1 WHERE id=?').run(claimToken,until,row.id);
        return {id:row.id,claimToken};
      });
    });
  }
  private outboxEligible(row:{recipient_id:string;entity_type:string;entity_id:string;dedupe_key:string}) {
    if(row.entity_type!=='offer')return true;
    const watch=this.db.prepare('SELECT alerts FROM faro_watches WHERE candidate_id=? AND offer_id=?').get(row.recipient_id,row.entity_id) as {alerts:number}|undefined;
    if(watch?.alerts===1)return true;
    if(row.dedupe_key.endsWith(':closing-soon'))return false;
    return !!this.db.prepare('SELECT id FROM faro_interests WHERE candidate_id=? AND offer_id=?').get(row.recipient_id,row.entity_id);
  }
  deliverClaimedOutbox(id:string,claimToken:string) {
    try {
      return this.transaction(()=>{
        const row=this.db.prepare("SELECT recipient_id,entity_type,entity_id,message,dedupe_key FROM faro_outbox WHERE id=? AND status='PENDING' AND claim_token=? AND lease_until>?").get(id,claimToken,this.now()) as {recipient_id:string;entity_type:string;entity_id:string;message:string;dedupe_key:string}|undefined;
        // Re-read under the write transaction. Erasure/mute or an expired/replaced claim cannot deliver cached content.
        if(!row)return false;
        if(!this.outboxEligible(row)) {
          this.db.prepare('DELETE FROM faro_outbox WHERE id=? AND claim_token=?').run(id,claimToken);
          return false;
        }
        this.db.prepare("INSERT OR IGNORE INTO notifications(id,user_id,notification_type,entity_type,entity_id,message,dedupe_key,created_at,updated_at) VALUES(?,?,'FOLLOW_UP',?,?,?,?,?,?)").run(randomUUID(),row.recipient_id,row.entity_type,row.entity_id,row.message,`faro:${row.dedupe_key}`,this.now(),this.now());
        this.db.prepare("UPDATE faro_outbox SET status='DELIVERED',error_code=NULL,claim_token=NULL,lease_until=NULL WHERE id=? AND claim_token=?").run(id,claimToken);
        return true;
      });
    } catch {
      // Preserve a newer owner's claim if this worker resumes after its lease expired.
      this.transaction(()=>{
        const row=this.db.prepare("SELECT attempts,max_attempts FROM faro_outbox WHERE id=? AND status='PENDING' AND claim_token=? AND lease_until>?").get(id,claimToken,this.now()) as {attempts:number;max_attempts:number}|undefined;
        if(!row)return;
        this.db.prepare('UPDATE faro_outbox SET status=?,error_code=?,next_attempt_at=?,claim_token=NULL,lease_until=NULL WHERE id=? AND claim_token=?').run(row.attempts>=row.max_attempts?'DEAD_LETTER':'PENDING','DELIVERY_FAILED',new Date(this.clock().getTime()+Math.min(3600000,1000*2**Math.min(row.attempts-1,12))).toISOString(),id,claimToken);
      });
      return false;
    }
  }
  deliverOutbox() {
    for(const claim of this.claimOutbox())this.deliverClaimedOutbox(claim.id,claim.claimToken);
  }
  retryDeadLetter(userId:string,id:string,body:Record<string,unknown>) {
    const authorize=()=>{if((this.db.prepare('SELECT role FROM users WHERE id=?').get(userId) as {role:string}|undefined)?.role!=='ADMIN')throw new HttpError(403,'Wymagany administrator.','FORBIDDEN');};
    authorize();
    return this.commandOnce(userId,body.idempotencyKey,{...body,id,operation:'OUTBOX_RETRY'},()=>{
      authorize();
      const row=this.db.prepare('SELECT status,attempts,recipient_id,entity_type,entity_id,dedupe_key FROM faro_outbox WHERE id=?').get(id) as {status:string;attempts:number;recipient_id:string;entity_type:string;entity_id:string;dedupe_key:string}|undefined;
      if(!row)throw new HttpError(404,'Nie znaleziono operacji.');
      if(row.status!=='DEAD_LETTER'||integer(body.expectedAttempts)!==row.attempts)throw new HttpError(409,'Stan operacji zmienił się.','VERSION_CONFLICT');
      if(body.confirmed!==true)throw new HttpError(400,'Potwierdź sprawdzenie przyczyny niepowodzenia.','CONFIRMATION_REQUIRED');
      const reasonCode=choice(body.reasonCode,['TRANSIENT_FAILURE_RESOLVED','LEASE_RECOVERY_REVIEWED'] as const);
      if(!this.outboxEligible(row))throw new HttpError(409,'Operacja nie spełnia aktualnych warunków dostarczenia.','OUTBOX_NO_LONGER_ELIGIBLE');
      this.db.prepare("UPDATE faro_outbox SET status='PENDING',max_attempts=?,next_attempt_at=?,claim_token=NULL,lease_until=NULL WHERE id=?").run(row.attempts+5,this.now(),id);
      this.audit(userId,`OUTBOX_RETRY_${reasonCode}`,id);
      return {id,queued:true};
    });
  }
}
