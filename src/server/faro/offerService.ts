import { randomUUID } from 'node:crypto';
import { FaroStore } from './base.js';
import { HttpError } from '../http.js';
import { object, text, array, choice, integer, date, nullableBoolean } from './validation.js';
import { LEVELS, skillById } from '../../domain/faro/skills.js';
import { materialDiff, explainOffer, sortOffers, type OfferData, type OfferStatus, type SalaryOption } from '../../domain/faro/offers.js';
import { ProfileService } from './profileService.js';
export interface OfferRecord { id: string; organizationId: string; company: string; status: OfferStatus; version: number; revision: number; approvedVersion: number | null; confirmedUntil: string | null; createdAt: string; data: OfferData; }
export function parseOffer(body: Record<string, unknown>): OfferData {
  const salary = array(body.salary, 8).map(raw => {
    const s = object(raw), contract = choice(s.contract, ['UOP','CIVIL','B2B'] as const);
    const basis = choice(s.basis, ['GROSS_EMPLOYMENT','GROSS_CIVIL','B2B_NET_INVOICE_EXCL_VAT'] as const);
    if (({ UOP: 'GROSS_EMPLOYMENT', CIVIL: 'GROSS_CIVIL', B2B: 'B2B_NET_INVOICE_EXCL_VAT' })[contract] !== basis) throw new HttpError(400, 'Podstawa kwoty nie odpowiada umowie.', 'SALARY_BASIS');
    const min = integer(s.min, 1), max = integer(s.max, 1); if (min > max) throw new HttpError(400, 'Minimum przekracza maksimum.', 'SALARY_RANGE');
    return { contract, basis, min, max, currency: choice(s.currency, ['PLN'] as const), period: choice(s.period, ['HOUR','DAY','MONTH','YEAR'] as const), variable: text(s.variable, 500, 0), hoursPerPeriod: integer(s.hoursPerPeriod, 1, 9000), ftePercent: integer(s.ftePercent, 1, 100) } satisfies SalaryOption;
  });
  if (!salary.length) throw new HttpError(400, 'Wynagrodzenie jest wymagane.', 'SALARY_REQUIRED');
  const requirements = array(body.requirements).map(raw => {
    const r = object(raw), skillId = text(r.skillId, 100);
    if (!skillById(skillId)) throw new HttpError(400, 'Nieznana kompetencja.');
    return { id: text(r.id, 100), skillId, kind: choice(r.kind, ['MUST_HAVE','NICE_TO_HAVE','WILL_TEACH'] as const), level: choice(r.level, LEVELS), rationale: text(r.rationale, 500) };
  });
  if (new Set(requirements.map(r => r.id)).size !== requirements.length) throw new HttpError(400, 'Identyfikatory wymagań muszą być unikalne.');
  const responsibilities = array(body.responsibilities, 30).map(v => text(v, 500)), stages = array(body.stages, 20).map(v => text(v, 150));
  if (!responsibilities.length || !stages.length) throw new HttpError(400, 'Podaj zadania i etapy.');
  return { role: text(body.role, 150), responsibilities, requirements, salary, location: text(body.location, 200), workModel: choice(body.workModel, ['ONSITE','HYBRID','REMOTE'] as const), remoteDays: integer(body.remoteDays, 0, 7), hours: text(body.hours, 200), shifts: text(body.shifts, 200), nights: nullableBoolean(body.nights), weekends: nullableBoolean(body.weekends), learningSupport: text(body.learningSupport, 1000, 0), responseHours: integer(body.responseHours, 1, 720), stages, assessmentMinutes: integer(body.assessmentMinutes, 0, 480), interviewCount: integer(body.interviewCount, 0, 20), decisionHours: integer(body.decisionHours, 1, 2160), closesAt: date(body.closesAt), recruiterId: text(body.recruiterId, 100) };
}
export class OfferService extends FaroStore {
  get(id: string): OfferRecord {
    const row = this.db.prepare('SELECT o.*,g.name company,v.content FROM faro_offers o JOIN faro_organizations g ON g.id=o.organization_id JOIN faro_offer_versions v ON v.offer_id=o.id AND v.version=o.current_version WHERE o.id=?').get(id) as { id: string; organization_id: string; company: string; status: OfferStatus; current_version: number; revision: number; approved_version: number | null; confirmed_until: string | null; created_at: string; content: string } | undefined;
    if (!row) throw new HttpError(404, 'Nie znaleziono oferty.', 'NOT_FOUND');
    return { id: row.id, organizationId: row.organization_id, company: row.company, status: row.status, version: row.current_version, revision: row.revision, approvedVersion: row.approved_version, confirmedUntil: row.confirmed_until, createdAt: row.created_at, data: JSON.parse(row.content) as OfferData };
  }
  version(id: string, version: number): OfferData {
    const row = this.db.prepare('SELECT content FROM faro_offer_versions WHERE offer_id=? AND version=?').get(id, version) as { content: string } | undefined;
    if (!row) throw new HttpError(404, 'Nie znaleziono wersji.'); return JSON.parse(row.content) as OfferData;
  }
  assigned(userId: string, offerId: string) {
    const offer = this.get(offerId); this.member(userId, offer.organizationId);
    if (!this.db.prepare('SELECT user_id FROM faro_assignments WHERE user_id=? AND offer_id=?').get(userId, offerId)) throw new HttpError(404, 'Nie znaleziono rekrutacji.', 'NOT_FOUND');
    return offer;
  }
  intake(offer: OfferRecord) {
    const org = this.db.prepare('SELECT verification FROM faro_organizations WHERE id=?').get(offer.organizationId) as { verification: string };
    return offer.status === 'PUBLISHED' && offer.approvedVersion === offer.version && org.verification === 'VERIFIED' && Boolean(offer.confirmedUntil && offer.confirmedUntil > this.now()) && offer.data.closesAt > this.now();
  }
  list(userId: string, orgId?: string) {
    if (orgId) this.member(userId, orgId);
    const ids = (orgId ? this.db.prepare('SELECT id FROM faro_offers WHERE organization_id=?').all(orgId) : this.db.prepare("SELECT id FROM faro_offers WHERE status='PUBLISHED'").all()) as Array<{ id: string }>;
    return sortOffers(ids.map(row => this.get(row.id)).filter(offer => orgId || this.intake(offer)));
  }
  detail(userId: string, id: string) {
    const offer = this.get(id);
    if (!this.intake(offer)) {
      const hasInterest = this.db.prepare('SELECT id FROM faro_interests WHERE candidate_id=? AND offer_id=?').get(userId, id);
      const watched = this.db.prepare('SELECT offer_id FROM faro_watches WHERE candidate_id=? AND offer_id=?').get(userId, id);
      if (!hasInterest && !watched) this.assigned(userId, id);
    }
    const p = new ProfileService(this.database, this.clock).profile(userId);
    return { ...offer, acceptingInterest: this.intake(offer), explanation: explainOffer(offer.data, p.claims, p.learning) };
  }
  create(userId: string, orgId: string, raw: Record<string, unknown>) {
    this.member(userId, orgId, ['OWNER','ADMIN','RECRUITER']); const data = parseOffer(raw);
    this.member(data.recruiterId, orgId, ['OWNER','ADMIN','RECRUITER']);
    const id = randomUUID();
    this.transaction(() => {
      this.db.prepare('INSERT INTO faro_offers(id,organization_id,created_at) VALUES(?,?,?)').run(id, orgId, this.now());
      this.db.prepare('INSERT INTO faro_offer_versions(offer_id,version,content,author_id,created_at) VALUES(?,1,?,?,?)').run(id, JSON.stringify(data), userId, this.now());
      for (const member of new Set([userId, data.recruiterId])) this.db.prepare('INSERT INTO faro_assignments(offer_id,user_id) VALUES(?,?)').run(id, member);
      this.audit(userId, 'OFFER_DRAFT_CREATED', id);
    }); return this.get(id);
  }
  edit(userId: string, id: string, body: Record<string, unknown>) {
    const offer = this.assigned(userId, id); this.member(userId, offer.organizationId, ['OWNER','ADMIN','RECRUITER']);
    const data = parseOffer(object(body.data)); this.member(data.recruiterId, offer.organizationId, ['OWNER','ADMIN','RECRUITER']);
    if (integer(body.expectedVersion, 1) !== offer.revision) throw new HttpError(409, 'Oferta zmieniła się.', 'VERSION_CONFLICT');
    if (['CLOSED','ARCHIVED','REMOVED'].includes(offer.status)) throw new HttpError(409, 'Ta oferta jest zakończona.');
    const diff = materialDiff(offer.data, data); if (!diff.length) return offer;
    this.transaction(() => {
      this.db.prepare('INSERT INTO faro_offer_versions(offer_id,version,content,author_id,created_at) VALUES(?,?,?,?,?)').run(id, offer.version + 1, JSON.stringify(data), userId, this.now());
      this.db.prepare("UPDATE faro_offers SET current_version=current_version+1,revision=revision+1,approved_version=NULL,status='DRAFT' WHERE id=?").run(id);
      this.db.prepare('INSERT OR IGNORE INTO faro_assignments(offer_id,user_id) VALUES(?,?)').run(id, data.recruiterId);
      this.audit(userId, 'OFFER_VERSION_CREATED', id);
    }); return this.get(id);
  }
  lifecycle(userId: string, id: string, body: Record<string, unknown>) {
    const offer = this.assigned(userId, id); this.member(userId, offer.organizationId, ['OWNER','ADMIN','RECRUITER']);
    if (integer(body.expectedVersion, 1) !== offer.revision) throw new HttpError(409, 'Oferta zmieniła się.', 'VERSION_CONFLICT');
    const action = choice(body.action, ['REVIEW','PUBLISH','PAUSE','CLOSE','ARCHIVE','RECONFIRM'] as const);
    const allowed: Record<typeof action, OfferStatus[]> = { REVIEW: ['DRAFT'], PUBLISH: ['IN_REVIEW','PAUSED'], PAUSE: ['PUBLISHED'], CLOSE: ['DRAFT','IN_REVIEW','PUBLISHED','PAUSED'], ARCHIVE: ['CLOSED'], RECONFIRM: ['PUBLISHED','PAUSED'] };
    if (!allowed[action].includes(offer.status)) throw new HttpError(409, 'Niedozwolona zmiana stanu.', 'INVALID_TRANSITION');
    const publish = action === 'PUBLISH' || action === 'RECONFIRM';
    if (publish) {
      const org = this.db.prepare('SELECT verification FROM faro_organizations WHERE id=?').get(offer.organizationId) as { verification: string };
      if (org.verification !== 'VERIFIED') throw new HttpError(409, 'Organizacja oczekuje na weryfikację.', 'ORGANIZATION_NOT_VERIFIED');
      if (offer.data.closesAt <= this.now() || body.confirmed !== true) throw new HttpError(400, 'Potwierdź aktualną wersję i przyszłą datę zamknięcia.');
      this.member(offer.data.recruiterId, offer.organizationId, ['OWNER','ADMIN','RECRUITER']);
    }
    const status: OfferStatus = ({ REVIEW: 'IN_REVIEW', PUBLISH: 'PUBLISHED', PAUSE: 'PAUSED', CLOSE: 'CLOSED', ARCHIVE: 'ARCHIVED', RECONFIRM: 'PUBLISHED' } as const)[action];
    this.transaction(() => {
      this.db.prepare('UPDATE faro_offers SET status=?,revision=revision+1,approved_version=?,confirmed_until=? WHERE id=?').run(status, publish ? offer.version : offer.approvedVersion, publish ? new Date(Math.min(Date.parse(offer.data.closesAt), this.clock().getTime() + 14 * 86400000)).toISOString() : offer.confirmedUntil, id);
      this.audit(userId, `OFFER_${action}`, id);
      if (publish || action === 'CLOSE') this.notifyChange(id, offer.version, action);
    }); return this.get(id);
  }
  notifyChange(id: string, version: number, action: string) {
    const recipients = this.db.prepare('SELECT candidate_id FROM faro_watches WHERE offer_id=? AND alerts=1 UNION SELECT candidate_id FROM faro_interests WHERE offer_id=?').all(id, id) as Array<{ candidate_id: string }>;
    for (const recipient of recipients) this.db.prepare('INSERT OR IGNORE INTO faro_outbox(id,recipient_id,entity_type,entity_id,message,dedupe_key,next_attempt_at) VALUES(?,?,?,?,?,?,?)').run(randomUUID(), recipient.candidate_id, 'offer', id, action === 'CLOSE' ? 'Obserwowana oferta została zamknięta. Sprawdź swój proces.' : 'Opublikowano warunki oferty. Sprawdź, co się zmieniło.', `offer:${id}:${version}:${action}`, this.now());
  }
}
