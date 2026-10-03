import { randomUUID } from 'node:crypto';
import { FaroStore } from './base.js';
import { RecruitmentService } from './recruitmentService.js';
import { InterviewService } from './interviewService.js';
import { HttpError } from '../http.js';
import { text, choice, date } from './validation.js';
export class TrustService extends FaroStore {
  report(userId: string, processId: string, body: Record<string, unknown>) {
    const service = new RecruitmentService(this.database, this.clock), row = service.authorize(userId, processId);
    const orgId = service.offers.get(row.offer_id).organizationId, id = randomUUID();
    this.db.prepare('INSERT INTO faro_cases(id,organization_id,process_id,reporter_id,kind,statement,created_at) VALUES(?,?,?,?,?,?,?)').run(id, orgId, processId, userId, choice(body.kind, ['CV_REQUEST','DISCRIMINATION','SCAM','PROCESS','ASSESSMENT_ABUSE','TECHNICAL_ISSUE'] as const), text(body.statement, 2000, 10), this.now());
    this.audit(userId, 'PRIVATE_REPORT_CREATED', id); return { id, state: 'OPEN' };
  }
  list(userId: string, admin: boolean) {
    return admin ? this.db.prepare('SELECT * FROM faro_cases ORDER BY created_at DESC LIMIT 200').all() : this.db.prepare('SELECT id,kind,state,decision,review_at,created_at FROM faro_cases WHERE reporter_id=? ORDER BY created_at DESC').all(userId);
  }
  review(userId: string, id: string, body: Record<string, unknown>) {
    if (!this.db.prepare("SELECT id FROM users WHERE id=? AND role='ADMIN'").get(userId)) throw new HttpError(403, 'Wymagany moderator.');
    const row = this.db.prepare('SELECT organization_id,state FROM faro_cases WHERE id=?').get(id) as { organization_id: string; state: string } | undefined;
    if (!row) throw new HttpError(404, 'Nie znaleziono sprawy.');
    const target = choice(body.state, ['EVIDENCE_REVIEW','ACTION','NO_ACTION','RESOLVED'] as const);
    const valid: Record<string, string[]> = { OPEN: ['EVIDENCE_REVIEW'], EVIDENCE_REVIEW: ['ACTION','NO_ACTION'], APPEAL: ['RESOLVED'], ACTION: ['RESOLVED'], NO_ACTION: ['RESOLVED'] };
    if (!valid[row.state]?.includes(target)) throw new HttpError(409, 'Niedozwolony stan sprawy.');
    const decision = text(body.decision, 1500, 10), reviewAt = date(body.reviewAt);
    this.transaction(() => {
      this.db.prepare('UPDATE faro_cases SET state=?,decision=?,review_at=? WHERE id=?').run(target, decision, reviewAt, id);
      if (target === 'ACTION' && body.restrict === true) {
        this.db.prepare("UPDATE faro_organizations SET verification='RESTRICTED' WHERE id=?").run(row.organization_id);
        this.db.prepare("UPDATE faro_offers SET status='PAUSED',revision=revision+1 WHERE organization_id=? AND status='PUBLISHED'").run(row.organization_id);
      }
      this.audit(userId, 'MODERATION_REVIEWED', id);
    }); return { id, state: target };
  }
  appeal(userId: string, id: string, body: Record<string, unknown>) {
    const row = this.db.prepare('SELECT reporter_id,organization_id,state FROM faro_cases WHERE id=?').get(id) as { reporter_id: string | null; organization_id: string; state: string } | undefined;
    if (!row) throw new HttpError(404, 'Nie znaleziono sprawy.');
    if (row.reporter_id !== userId) this.member(userId, row.organization_id, ['OWNER','ADMIN']);
    if (!['ACTION','NO_ACTION'].includes(row.state)) throw new HttpError(409, 'Odwołanie nie jest teraz dostępne.');
    this.db.prepare("UPDATE faro_cases SET state='APPEAL',appeal=? WHERE id=?").run(text(body.statement, 2000, 10), id);
    this.audit(userId, 'MODERATION_APPEALED', id); return { id, state: 'APPEAL' };
  }
  tick() {
    new InterviewService(this.database,this.clock).tick();
    const service = new RecruitmentService(this.database, this.clock), now = this.now();
    this.transaction(() => {
      const stale = this.db.prepare("SELECT id,organization_id FROM faro_offers WHERE status='PUBLISHED' AND confirmed_until<=?").all(now) as Array<{ id: string; organization_id: string }>;
      for (const offer of stale) {
        this.db.prepare("UPDATE faro_offers SET status='PAUSED',revision=revision+1 WHERE id=?").run(offer.id);
        this.audit(null, 'STALE_INTAKE_PAUSED', offer.id);
        const key = `stale:${offer.id}:${now.slice(0,10)}`;
        this.db.prepare("INSERT OR IGNORE INTO faro_cases(id,organization_id,kind,statement,dedupe_key,created_at) VALUES(?,?,'STALE_OFFER',?,?,?)").run(randomUUID(), offer.organization_id, 'Brak aktualnego potwierdzenia wakatu. Sygnał do sprawdzenia, nie ocena firmy.', key, now);
      }
      const closing = this.db.prepare("SELECT id FROM faro_offers WHERE status IN ('PUBLISHED','PAUSED') AND json_extract((SELECT content FROM faro_offer_versions WHERE offer_id=faro_offers.id AND version=current_version),'$.closesAt')<=?").all(now) as Array<{ id: string }>;
      for (const offer of closing) {
        this.db.prepare("UPDATE faro_offers SET status='CLOSED',revision=revision+1 WHERE id=?").run(offer.id);
        service.offers.notifyChange(offer.id, service.offers.get(offer.id).version, 'CLOSE');
      }
      const due = this.db.prepare("SELECT id,candidate_id,offer_id,stage,response_due_at,stage_due_at,first_response_at FROM faro_interests WHERE status IN ('INTERESTED','ACTIVE','OFFERED')").all() as unknown as Array<{ id: string; candidate_id: string; offer_id: string; stage:string; response_due_at: string; stage_due_at: string | null; first_response_at: string | null }>;
      for (const p of due) {
        if(['INTERVIEW_PROPOSED','INTERVIEW_CONFIRMED'].includes(p.stage))continue;
        const deadline = p.first_response_at ? p.stage_due_at : p.response_due_at;
        if (!deadline || Date.parse(deadline) > this.clock().getTime() + 24 * 3600000) continue;
        const overdue = deadline < now;
        const recruiters=this.db.prepare('SELECT a.user_id FROM faro_assignments a JOIN faro_offers o ON o.id=a.offer_id JOIN faro_members m ON m.organization_id=o.organization_id AND m.user_id=a.user_id WHERE a.offer_id=? AND m.active=1').all(p.offer_id) as Array<{ user_id: string }>;
        const recipients=['CLARIFICATION_REQUESTED','ASSESSMENT_REQUESTED','OFFERED'].includes(p.stage)?[{user_id:p.candidate_id}]:recruiters;
        for (const recipient of recipients) service.enqueue(recipient.user_id, 'process', p.id, overdue ? 'Minął zadeklarowany termin w rekrutacji. Sprawdź następny krok.' : 'Zbliża się zadeklarowany termin w rekrutacji.', `${p.id}:${deadline}:${overdue ? 'overdue' : 'reminder'}`);
      }
    });
    service.deliverOutbox();
  }
}
