import { randomUUID, createHash } from 'node:crypto';
import { FaroStore } from './base.js';
import { ProfileService } from './profileService.js';
import { OfferService } from './offerService.js';
import { HttpError } from '../http.js';
import { text, integer, choice, date, object } from './validation.js';
import { transition, COMMANDS, REJECTION_REASONS, TERMINAL, type InterestStatus, type Stage } from '../../domain/faro/recruitment.js';
import { materialDiff } from '../../domain/faro/offers.js';
import type { employerProjection } from '../../domain/faro/skills.js';
import { LEVELS, SOURCES, skillById } from '../../domain/faro/skills.js';
export interface ProcessRow {
  id: string; candidate_id: string; offer_id: string; offer_version: number; snapshot: string;
  previous_interest_id:string|null;
  status: InterestStatus; stage: Stage; revision: number; response_due_at: string; first_response_at: string | null;
  stage_due_at: string | null; next_action: string | null; reason: string | null; created_at: string;
}
export class RecruitmentService extends FaroStore {
  get offers() { return new OfferService(this.database, this.clock); }
  row(id: string) {
    const row = this.db.prepare('SELECT * FROM faro_interests WHERE id=?').get(id) as unknown as ProcessRow | undefined;
    if (!row) throw new HttpError(404, 'Nie znaleziono procesu.', 'NOT_FOUND'); return row;
  }
  authorize(userId: string, id: string) {
    const row = this.row(id);
    if (row.candidate_id !== userId) this.offers.assigned(userId, row.offer_id);
    return row;
  }
  commandOnce<T>(userId: string, key: unknown, input: unknown, work: () => T): T {
    const commandKey = text(key, 150), hash = createHash('sha256').update(JSON.stringify(input)).digest('hex');
    return this.transaction(() => {
      const existing = this.db.prepare('SELECT input_hash,result FROM faro_commands WHERE user_id=? AND command_key=?').get(userId, commandKey) as { input_hash: string; result: string } | undefined;
      if (existing) {
        if (existing.input_hash !== hash) throw new HttpError(409, 'Klucz operacji został już użyty dla innych danych.', 'IDEMPOTENCY_CONFLICT');
        return JSON.parse(existing.result) as T;
      }
      const result = work();
      this.db.prepare('INSERT INTO faro_commands(user_id,command_key,input_hash,result,created_at) VALUES(?,?,?,?,?)').run(userId, commandKey, hash, JSON.stringify(result), this.now());
      return result;
    });
  }
  enqueue(recipient: string, type: string, id: string, message: string, key: string) {
    this.db.prepare('INSERT OR IGNORE INTO faro_outbox(id,recipient_id,entity_type,entity_id,message,dedupe_key,next_attempt_at) VALUES(?,?,?,?,?,?,?)').run(randomUUID(), recipient, type, id, message, key, this.now());
  }
  event(row: ProcessRow, actor: string | null, kind: string, data: Record<string, unknown>) {
    const eventId = randomUUID();
    this.db.prepare('INSERT INTO faro_events(id,process_id,actor_id,kind,data,occurred_at) VALUES(?,?,?,?,?,?)').run(eventId, row.id, actor, kind, JSON.stringify(data), this.now());
    this.audit(actor, kind, row.id);
    this.enqueue(row.candidate_id, 'process', row.id, 'W Twojej rekrutacji pojawiła się aktualizacja.', eventId);
    const recruiters = this.db.prepare('SELECT a.user_id FROM faro_assignments a JOIN faro_offers o ON o.id=a.offer_id JOIN faro_members m ON m.user_id=a.user_id AND m.organization_id=o.organization_id WHERE a.offer_id=? AND m.active=1').all(row.offer_id) as Array<{ user_id: string }>;
    for (const recruiter of recruiters) this.enqueue(recruiter.user_id, 'process', row.id, 'W przypisanej rekrutacji pojawiła się aktualizacja.', eventId);
  }
  interest(userId: string, offerId: string, body: Record<string, unknown>) {
    return this.commandOnce(userId, body.idempotencyKey, { ...body, offerId }, () => {
      const offer = this.offers.get(offerId);
      if (!this.offers.intake(offer)) throw new HttpError(409, 'Oferta nie przyjmuje nowych zgłoszeń.', 'INTAKE_CLOSED');
      if (integer(body.offerVersion, 1) !== offer.version) throw new HttpError(409, 'Warunki oferty zmieniły się. Sprawdź je ponownie.', 'OFFER_CHANGED');
      if (body.projectionConfirmed !== true) throw new HttpError(400, 'Potwierdź zakres udostępnianych danych.');
      if (this.db.prepare("SELECT id FROM faro_interests WHERE candidate_id=? AND offer_id=? AND status IN ('INTERESTED','ACTIVE','OFFERED')").get(userId, offerId)) throw new HttpError(409, 'Masz już aktywne zgłoszenie.', 'ACTIVE_INTEREST_EXISTS');
      const previous=this.db.prepare('SELECT id FROM faro_interests WHERE candidate_id=? AND offer_id=? ORDER BY rowid DESC LIMIT 1').get(userId,offerId) as {id:string}|undefined;
      if(previous&&(body.previousInterestId!==previous.id||body.renewalConfirmed!==true))throw new HttpError(409,'Potwierdź nowy proces powiązany z poprzednim zgłoszeniem.','RENEWAL_CONFIRMATION_REQUIRED');
      if(!previous&&body.previousInterestId)throw new HttpError(400,'Nieprawidłowy poprzedni proces.','INVALID_HISTORY_LINK');
      const preview = new ProfileService(this.database, this.clock).previewConfirmation(userId);
      if (body.confirmationToken !== preview.confirmationToken) throw new HttpError(409, 'Profil zmienił się lub brakuje potwierdzonego podglądu. Sprawdź dane ponownie.', 'PROFILE_CHANGED');
      const id = randomUUID(), snapshot = { ...preview.projection, processId: id };
      const responseDue = new Date(this.clock().getTime() + offer.data.responseHours * 3600000).toISOString();
      this.db.prepare("INSERT INTO faro_interests(id,candidate_id,offer_id,offer_version,snapshot,status,stage,response_due_at,created_at,previous_interest_id) VALUES(?,?,?,?,?,'INTERESTED','AWAITING_EMPLOYER',?,?,?)").run(id, userId, offerId, offer.version, JSON.stringify(snapshot), responseDue, this.now(),previous?.id??null);
      this.event(this.row(id), userId, 'INTEREST_CREATED', { offerVersion: offer.version,previousInterestId:previous?.id??null });
      return { id };
    });
  }
  view(userId: string, id: string) {
    const row = this.authorize(userId, id), candidate = row.candidate_id === userId;
    const offer = candidate?this.offers.published(row.offer_id):this.offers.get(row.offer_id);
    const events = (this.db.prepare('SELECT kind,data,occurred_at FROM faro_events WHERE process_id=? ORDER BY occurred_at,rowid').all(id) as Array<{kind:string;data:string;occurred_at:string}>).map(event=>{
      if(event.kind!=='ANSWER')return event;
      const data=JSON.parse(event.data) as Record<string,unknown>;
      // Historical free-form candidate answers never cross the employer API boundary.
      delete data.action;
      return {...event,data:JSON.stringify(data)};
    });
    const last=this.db.prepare('SELECT kind FROM faro_events WHERE process_id=? ORDER BY rowid DESC LIMIT 1').get(id) as {kind:string}|undefined;
    const grant = this.db.prepare('SELECT granted_at,revoked_at FROM faro_contact_grants WHERE process_id=?').get(id) ?? null;
    return { id, previousInterestId:row.previous_interest_id, offerId: row.offer_id, offerVersion: row.offer_version, role: offer.data.role, company: offer.company, status: row.status, stage: row.stage, revision: row.revision,
      responseDueAt: row.response_due_at, firstResponseAt: row.first_response_at, stageDueAt: row.stage_due_at, nextAction: last?.kind==='ANSWER'?'Kandydat odpowiedział. Firma sprawdzi deklarację i przekaże kolejny krok.':row.next_action,
      clarification:this.clarification(row.id),
      availableCommands:COMMANDS.filter(command=>transition(row.status,row.stage,candidate?'CANDIDATE':'EMPLOYER',command)||(!candidate&&command==='CLARIFY'&&row.stage==='CLARIFICATION_REQUESTED'&&!this.clarification(row.id))),
      reason: row.reason ? JSON.parse(row.reason) as Record<string, unknown> : null, createdAt: row.created_at,
      projection: JSON.parse(row.snapshot) as ReturnType<typeof employerProjection>, events, contactGrant: grant, viewer: candidate ? 'CANDIDATE' : 'EMPLOYER',
      requirements: this.offers.version(row.offer_id, row.offer_version).requirements,
      changes: materialDiff(this.offers.version(row.offer_id, row.offer_version), offer.data) };
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
      this.event(row, userId, command, { previousStage: row.stage, stage: next.stage, previousDueAt: row.stage_due_at, stageDueAt: due, reason, action,question,response });
      return { id, revision: row.revision + 1 };
    });
  }
  cancelObligations(id:string) {
    this.db.prepare('UPDATE faro_contact_grants SET revoked_at=COALESCE(revoked_at,?) WHERE process_id=?').run(this.now(),id);
    this.db.prepare("UPDATE faro_attempts SET state='WITHDRAWN',revision=revision+1 WHERE process_id=? AND state IN ('INVITED','STARTED')").run(id);
    this.db.prepare("UPDATE faro_interviews SET state='CANCELLED',revision=revision+1 WHERE process_id=? AND state IN ('PROPOSED','CONFIRMED')").run(id);
  }
  clarification(id:string):{topic:'REQUIREMENT'|'AVAILABILITY';requirementId:string|null;skillId:string|null;previousStage:Stage}|null {
    const latest=this.db.prepare("SELECT data FROM faro_events WHERE process_id=? AND kind='CLARIFY' ORDER BY rowid DESC LIMIT 1").get(id) as {data:string}|undefined;
    return latest?(JSON.parse(latest.data) as {question?:ReturnType<RecruitmentService['clarification']>}).question??null:null;
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
  deliverOutbox() {
    const rows = this.db.prepare("SELECT * FROM faro_outbox WHERE status='PENDING' AND next_attempt_at<=? ORDER BY next_attempt_at LIMIT 100").all(this.now()) as unknown as Array<{ id: string; recipient_id: string; entity_type: string; entity_id: string; message: string; dedupe_key: string; attempts: number }>;
    for (const row of rows) {
      try {
        this.transaction(() => {
          this.db.prepare("INSERT OR IGNORE INTO notifications(id,user_id,notification_type,entity_type,entity_id,message,dedupe_key,created_at,updated_at) VALUES(?,?,'FOLLOW_UP',?,?,?,?,?,?)").run(randomUUID(), row.recipient_id, row.entity_type, row.entity_id, row.message, `faro:${row.dedupe_key}`, this.now(), this.now());
          this.db.prepare("UPDATE faro_outbox SET status='DELIVERED',attempts=attempts+1,error_code=NULL WHERE id=?").run(row.id);
        });
      } catch {
        this.db.prepare('UPDATE faro_outbox SET attempts=attempts+1,status=?,error_code=?,next_attempt_at=? WHERE id=?').run(row.attempts >= 4 ? 'DEAD_LETTER' : 'PENDING', 'DELIVERY_FAILED', new Date(this.clock().getTime() + Math.min(3600000, 1000 * 2 ** row.attempts)).toISOString(), row.id);
      }
    }
  }
}
