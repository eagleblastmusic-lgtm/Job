import { randomUUID, createHash } from 'node:crypto';
import { FaroStore } from './base.js';
import { ProfileService } from './profileService.js';
import { OfferService } from './offerService.js';
import { HttpError } from '../http.js';
import { text, integer, choice, date, object } from './validation.js';
import { transition, COMMANDS, REJECTION_REASONS, TERMINAL, type InterestStatus, type Stage } from '../../domain/faro/recruitment.js';
import { materialDiff } from '../../domain/faro/offers.js';
import type { employerProjection } from '../../domain/faro/skills.js';
export interface ProcessRow {
  id: string; candidate_id: string; offer_id: string; offer_version: number; snapshot: string;
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
  event(row: ProcessRow, actor: string, kind: string, data: Record<string, unknown>) {
    const eventId = randomUUID();
    this.db.prepare('INSERT INTO faro_events(id,process_id,actor_id,kind,data,occurred_at) VALUES(?,?,?,?,?,?)').run(eventId, row.id, actor, kind, JSON.stringify(data), this.now());
    this.audit(actor, kind, row.id);
    this.enqueue(row.candidate_id, 'process', row.id, 'W Twojej rekrutacji pojawiła się aktualizacja.', eventId);
    const recruiters = this.db.prepare('SELECT a.user_id FROM faro_assignments a JOIN faro_offers o ON o.id=a.offer_id JOIN faro_members m ON m.user_id=a.user_id AND m.organization_id=o.organization_id WHERE a.offer_id=? AND m.active=1').all(row.offer_id) as Array<{ user_id: string }>;
    for (const recruiter of recruiters) this.enqueue(recruiter.user_id, 'process', row.id, 'W przypisanej rekrutacji pojawiła się aktualizacja.', eventId);
  }
  interest(userId: string, offerId: string, body: Record<string, unknown>) {
    return this.commandOnce(userId, body.idempotencyKey, { offerId, ...body }, () => {
      const offer = this.offers.get(offerId);
      if (!this.offers.intake(offer)) throw new HttpError(409, 'Oferta nie przyjmuje nowych zgłoszeń.', 'INTAKE_CLOSED');
      if (integer(body.offerVersion, 1) !== offer.version) throw new HttpError(409, 'Warunki oferty zmieniły się. Sprawdź je ponownie.', 'OFFER_CHANGED');
      if (body.projectionConfirmed !== true) throw new HttpError(400, 'Potwierdź zakres udostępnianych danych.');
      if (this.db.prepare("SELECT id FROM faro_interests WHERE candidate_id=? AND offer_id=? AND status IN ('INTERESTED','ACTIVE','OFFERED')").get(userId, offerId)) throw new HttpError(409, 'Masz już aktywne zgłoszenie.', 'ACTIVE_INTEREST_EXISTS');
      const preview = new ProfileService(this.database, this.clock).previewConfirmation(userId);
      if (body.confirmationToken !== preview.confirmationToken) throw new HttpError(409, 'Profil zmienił się lub brakuje potwierdzonego podglądu. Sprawdź dane ponownie.', 'PROFILE_CHANGED');
      const id = randomUUID(), snapshot = { ...preview.projection, processId: id };
      const responseDue = new Date(this.clock().getTime() + offer.data.responseHours * 3600000).toISOString();
      this.db.prepare("INSERT INTO faro_interests(id,candidate_id,offer_id,offer_version,snapshot,status,stage,response_due_at,created_at) VALUES(?,?,?,?,?,'INTERESTED','AWAITING_EMPLOYER',?,?)").run(id, userId, offerId, offer.version, JSON.stringify(snapshot), responseDue, this.now());
      this.event(this.row(id), userId, 'INTEREST_CREATED', { offerVersion: offer.version });
      return { id };
    });
  }
  view(userId: string, id: string) {
    const row = this.authorize(userId, id), candidate = row.candidate_id === userId;
    const offer = this.offers.get(row.offer_id);
    const events = this.db.prepare('SELECT kind,data,occurred_at FROM faro_events WHERE process_id=? ORDER BY occurred_at,rowid').all(id);
    const grant = this.db.prepare('SELECT granted_at,revoked_at FROM faro_contact_grants WHERE process_id=?').get(id) ?? null;
    return { id, offerId: row.offer_id, offerVersion: row.offer_version, role: offer.data.role, company: offer.company, status: row.status, stage: row.stage, revision: row.revision,
      responseDueAt: row.response_due_at, firstResponseAt: row.first_response_at, stageDueAt: row.stage_due_at, nextAction: row.next_action,
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
      const command = choice(body.command, COMMANDS), next = transition(row.status, row.stage, actor, command);
      if (!next) throw new HttpError(409, 'Ta akcja nie jest dostępna w tym etapie.', 'INVALID_TRANSITION');
      let reason: Record<string, unknown> | null = null, action: string | null = null, due: string | null = null;
      if (command === 'REJECT') {
        const raw = object(body.reason), code = choice(raw.code, REJECTION_REASONS);
        const requires = ['REQUIREMENT_NOT_DEMONSTRATED','REQUIREMENT_NOT_MET','OTHER_CANDIDATE_BETTER_MATCH'].includes(code);
        const requirementId = requires ? text(raw.requirementId, 100) : null;
        if (requires && !this.offers.version(row.offer_id, row.offer_version).requirements.some(r => r.id === requirementId && r.kind !== 'WILL_TEACH')) throw new HttpError(400, 'Wybierz wymaganie z wersji zgłoszenia; nauka w firmie nie jest barierą.', 'REJECTION_REQUIREMENT');
        reason = { code, requirementId };
      } else if (command === 'CANCEL') reason = { code: 'RECRUITMENT_CANCELLED', explanation: text(body.explanation, 1000, 5) };
      if (['ADVANCE','CLARIFY','OFFER'].includes(command)) {
        action = text(body.nextAction, 1500, 5); due = date(body.dueAt);
        if (due <= this.now()) throw new HttpError(400, 'Termin musi być w przyszłości.');
      }
      if (command === 'ANSWER') action = text(body.answer, 1500, 1);
      const first = next.substantive ? row.first_response_at ?? this.now() : row.first_response_at;
      this.db.prepare('UPDATE faro_interests SET status=?,stage=?,revision=revision+1,first_response_at=?,stage_due_at=?,next_action=?,reason=? WHERE id=?').run(next.status, next.stage, first, due, action, reason ? JSON.stringify(reason) : null, id);
      if (TERMINAL.includes(next.status)) this.db.prepare('UPDATE faro_contact_grants SET revoked_at=COALESCE(revoked_at,?) WHERE process_id=?').run(this.now(), id);
      this.event(row, userId, command, { previousStage: row.stage, stage: next.stage, previousDueAt: row.stage_due_at, stageDueAt: due, reason, action });
      return { id, revision: row.revision + 1 };
    });
  }
  watch(userId: string, offerId: string, watching: boolean) {
    if (watching) {
      const offer = this.offers.get(offerId); if (!this.offers.intake(offer)) throw new HttpError(409, 'Możesz obserwować aktywną ofertę.');
      this.db.prepare('INSERT OR IGNORE INTO faro_watches(candidate_id,offer_id,created_at) VALUES(?,?,?)').run(userId, offerId, this.now());
    } else this.db.prepare('DELETE FROM faro_watches WHERE candidate_id=? AND offer_id=?').run(userId, offerId);
    return { watching };
  }
  watches(userId: string) {
    const rows = this.db.prepare('SELECT offer_id FROM faro_watches WHERE candidate_id=? ORDER BY created_at DESC').all(userId) as Array<{ offer_id: string }>;
    return rows.map(row => this.offers.get(row.offer_id));
  }
  grant(userId: string, id: string, grant: boolean) {
    const row = this.row(id);
    if (row.candidate_id !== userId) throw new HttpError(404, 'Nie znaleziono procesu.');
    if (grant) {
      if (!['ACTIVE','OFFERED'].includes(row.status)) throw new HttpError(409, 'Telefon udostępnisz dopiero po przyjęciu do kolejnego etapu.');
      if (!new ProfileService(this.database, this.clock).profile(userId).phone) throw new HttpError(400, 'Najpierw zapisz prywatny numer w profilu.');
      this.db.prepare('INSERT INTO faro_contact_grants(process_id,candidate_id,organization_id,granted_at) VALUES(?,?,?,?) ON CONFLICT(process_id) DO UPDATE SET granted_at=excluded.granted_at,revoked_at=NULL').run(id, userId, this.offers.get(row.offer_id).organizationId, this.now());
    } else this.db.prepare('UPDATE faro_contact_grants SET revoked_at=? WHERE process_id=? AND candidate_id=?').run(this.now(), id, userId);
    this.audit(userId, grant ? 'PHONE_GRANTED' : 'PHONE_REVOKED', id);
    return { granted: grant };
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
