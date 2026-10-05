import { createHash } from 'node:crypto';
import { FaroStore } from './base.js';
import { HttpError } from '../http.js';
import { RecruitmentService } from './recruitmentService.js';

/** Account data rights do not grant organization-wide candidate export. */
export class PrivacyService extends FaroStore {
  exportOwn(userId: string) {
    const own: Record<string, unknown> = { exportVersion: 'faro-data-rights-v1', exportedAt: this.now() };
    for (const table of ['faro_profiles','faro_activities','faro_proposals','faro_claims','faro_learning','faro_members'] as const) {
      own[table] = this.db.prepare(`SELECT * FROM ${table} WHERE user_id=?`).all(userId);
    }
    for (const table of ['faro_interests','faro_watches','faro_contact_grants','faro_economics'] as const) {
      own[table] = this.db.prepare(`SELECT * FROM ${table} WHERE candidate_id=?`).all(userId);
    }
    own.faro_events = this.db.prepare('SELECT e.kind,e.data,e.occurred_at,e.process_id FROM faro_events e JOIN faro_interests p ON p.id=e.process_id WHERE p.candidate_id=?').all(userId);
    own.faro_restriction_appeals=this.db.prepare('SELECT id,organization_id,appeal,appealed_at FROM faro_restrictions WHERE appeal_by=?').all(userId);
    own.faro_interviews = this.db.prepare('SELECT i.id,i.process_id,i.state,i.revision,i.starts_at,i.ends_at,i.confirm_by,i.timezone,i.location,i.meeting_url,i.candidate_completed,i.employer_completed FROM faro_interviews i JOIN faro_interests p ON p.id=i.process_id WHERE p.candidate_id=? OR i.recruiter_id=?').all(userId,userId);
    own.faro_attempts = this.db.prepare('SELECT a.id,a.process_id,a.assessment_id,a.assessment_version,a.state,a.deadline,a.started_at,a.expires_at,a.answers,a.result,a.revision,a.reviewed_at,a.attempt_number,a.retry_of,a.retry_reason,a.retry_authorized_at FROM faro_attempts a JOIN faro_interests p ON p.id=a.process_id WHERE p.candidate_id=?').all(userId);
    own.faro_result_history = this.db.prepare('SELECT h.attempt_id,h.revision,h.validity,h.result,h.reason_code,h.reason,h.created_at FROM faro_result_history h JOIN faro_attempts a ON a.id=h.attempt_id JOIN faro_interests p ON p.id=a.process_id WHERE p.candidate_id=?').all(userId);
    own.faro_attempt_incidents=this.db.prepare('SELECT i.id,i.attempt_id,i.category,i.statement,i.reported_at,i.observed_state,i.observed_revision,i.original_deadline,i.original_started_at,i.original_expires_at,i.state,i.revision,i.resolution,i.reason,i.resolved_at FROM faro_attempt_incidents i JOIN faro_attempts a ON a.id=i.attempt_id JOIN faro_interests p ON p.id=a.process_id WHERE p.candidate_id=?').all(userId);
    own.faro_cases = this.db.prepare('SELECT c.id,c.kind,c.state,CASE WHEN c.reporter_id=? THEN c.statement ELSE NULL END statement,c.public_reason decision,c.review_at,CASE WHEN c.appeal_by=? THEN c.appeal ELSE NULL END appeal,c.created_at FROM faro_cases c LEFT JOIN faro_interests p ON p.id=c.process_id WHERE c.reporter_id=? OR p.candidate_id=?').all(userId,userId,userId,userId);
    own.faro_case_explanations=this.db.prepare('SELECT case_id,participant,statement,created_at FROM faro_case_explanations WHERE user_id=?').all(userId);
    own.notifications = this.db.prepare('SELECT id,entity_type,entity_id,message,read_at,created_at FROM notifications WHERE user_id=?').all(userId);
    own.faro_outbox = this.db.prepare('SELECT entity_type,entity_id,message,status FROM faro_outbox WHERE recipient_id=?').all(userId);
    own.faro_organizations = this.db.prepare('SELECT o.id,o.name,o.verification,m.role,m.active FROM faro_organizations o JOIN faro_members m ON m.organization_id=o.id WHERE m.user_id=?').all(userId);
    return own;
  }
  assertDeletable(userId: string) {
    const sharedOwnership = this.db.prepare("SELECT m.organization_id FROM faro_members m WHERE m.user_id=? AND m.active=1 AND m.role='OWNER' AND EXISTS(SELECT 1 FROM faro_members other WHERE other.organization_id=m.organization_id AND other.user_id<>m.user_id AND other.active=1) LIMIT 1").get(userId);
    if (sharedOwnership) throw new HttpError(409, 'Przenieś własność organizacji na aktywnego członka przed usunięciem konta.', 'OWNERSHIP_TRANSFER_REQUIRED');
  }
  /** Called inside the transaction that deletes users; cascade handles personal rows. */
  eraseDerivatives(userId: string, isolatedRecovery = false) {
    // Offline replay targets an isolated restore, never an HTTP-provided flag.
    // An obsolete shared owner must not resurrect an erased account; unresolved organizations close.
    if(!isolatedRecovery)this.assertDeletable(userId);
    const user = this.db.prepare('SELECT email FROM users WHERE id=?').get(userId) as { email: string } | undefined;
    if (!user) throw new HttpError(404, 'Nie znaleziono konta.');
    // Abandoned solo organizations cannot continue accepting candidates.
    const owned = this.db.prepare("SELECT organization_id FROM faro_members WHERE user_id=? AND role='OWNER' AND active=1").all(userId) as Array<{ organization_id: string }>;
    const recruitment = new RecruitmentService(this.database,this.clock);
    for (const org of owned) {
      const processes = this.db.prepare("SELECT p.id FROM faro_interests p JOIN faro_offers o ON o.id=p.offer_id WHERE o.organization_id=? AND p.status IN ('INTERESTED','ACTIVE','OFFERED')").all(org.organization_id) as Array<{id:string}>;
      for (const process of processes) {
        const row = recruitment.row(process.id);
        this.db.prepare("UPDATE faro_interests SET status='CANCELLED',stage='TERMINAL',stage_due_at=NULL,next_action=NULL,reason=?,revision=revision+1 WHERE id=?").run(JSON.stringify({code:'RECRUITMENT_CANCELLED',explanation:isolatedRecovery?'Organizacja wymaga ponownej weryfikacji po odtworzeniu danych.':'Organizacja zakończyła rekrutację po usunięciu konta jedynego właściciela.'}),row.id);
        recruitment.cancelObligations(row.id);
        recruitment.event(row,userId,'CANCEL',{reason:{code:'RECRUITMENT_CANCELLED'},source:'ORGANIZATION_CLOSED'});
      }
      const openOffers = this.db.prepare("SELECT id,current_version FROM faro_offers WHERE organization_id=? AND status NOT IN ('CLOSED','ARCHIVED','REMOVED')").all(org.organization_id) as Array<{id:string;current_version:number}>;
      for (const offer of openOffers) recruitment.offers.notifyChange(offer.id,offer.current_version,'CLOSE');
      this.db.prepare("UPDATE faro_organizations SET verification='RESTRICTED' WHERE id=?").run(org.organization_id);
      this.db.prepare("UPDATE faro_offers SET status='CLOSED',revision=revision+1 WHERE organization_id=? AND status NOT IN ('CLOSED','ARCHIVED','REMOVED')").run(org.organization_id);
      this.db.prepare('DELETE FROM faro_invites WHERE organization_id=?').run(org.organization_id);
    }
    this.db.prepare('DELETE FROM faro_invites WHERE email=? OR created_by=?').run(user.email,userId);
    this.db.prepare('DELETE FROM analytics_events WHERE user_id=?').run(userId);
    const meetings=this.db.prepare("SELECT id,process_id FROM faro_interviews WHERE recruiter_id=? AND state IN ('PROPOSED','CONFIRMED')").all(userId) as Array<{id:string;process_id:string}>;
    for(const meeting of meetings) {
      this.db.prepare("UPDATE faro_interviews SET state='CANCELLED',revision=revision+1 WHERE id=?").run(meeting.id);
      this.db.prepare("UPDATE faro_interests SET stage='ACCEPTED_TO_NEXT_STAGE',stage_due_at=NULL,next_action='Firma musi wyznaczyć nowego rekrutera i termin.',revision=revision+1 WHERE id=? AND status='ACTIVE'").run(meeting.process_id);
      recruitment.event(recruitment.row(meeting.process_id),userId,'INTERVIEW_CANCEL',{interviewId:meeting.id,reason:'RECRUITER_UNAVAILABLE'});
    }
    // A transferred organization survives, but intake cannot rely on a deleted responsible recruiter.
    this.db.prepare("UPDATE faro_offers SET status='PAUSED',revision=revision+1 WHERE status='PUBLISHED' AND id IN (SELECT v.offer_id FROM faro_offer_versions v JOIN faro_offers o ON o.id=v.offer_id AND o.current_version=v.version WHERE json_extract(v.content,'$.recruiterId')=?)").run(userId);
    // Shared case history must not retain free-form personal statements after erasure.
    this.db.prepare("UPDATE faro_restrictions SET appeal=NULL,appealed_at=NULL WHERE appeal_by=?").run(userId);
    this.db.prepare("UPDATE faro_cases SET statement='Treść usunięta w ramach realizacji prawa do danych.',appeal=NULL,decision=NULL WHERE reporter_id=? OR process_id IN (SELECT id FROM faro_interests WHERE candidate_id=?)").run(userId,userId);
    this.db.prepare("UPDATE faro_case_explanations SET statement='Treść usunięta w ramach realizacji prawa do danych.' WHERE case_id IN (SELECT id FROM faro_cases WHERE reporter_id=? OR process_id IN (SELECT id FROM faro_interests WHERE candidate_id=?))").run(userId,userId);
    this.db.prepare('DELETE FROM faro_outbox WHERE entity_type=? AND entity_id IN (SELECT id FROM faro_interests WHERE candidate_id=?)').run('process',userId);
    this.db.prepare('DELETE FROM notifications WHERE entity_type=? AND entity_id IN (SELECT id FROM faro_interests WHERE candidate_id=?)').run('process',userId);
    this.db.prepare("INSERT INTO faro_erasure_log(subject_hash,erased_at,policy_version) VALUES(?,?,'local-erasure-v1') ON CONFLICT(subject_hash) DO UPDATE SET erased_at=excluded.erased_at").run(createHash('sha256').update(userId).digest('hex'),this.now());
  }
  transferOwner(userId: string, orgId: string, successorId: string) {
    return this.transaction(() => {
      this.member(userId,orgId,['OWNER']); this.member(successorId,orgId);
      if (userId === successorId) throw new HttpError(400,'Wybierz innego aktywnego członka.');
      this.db.prepare("UPDATE faro_members SET role='ADMIN' WHERE organization_id=? AND user_id=?").run(orgId,userId);
      this.db.prepare("UPDATE faro_members SET role='OWNER' WHERE organization_id=? AND user_id=?").run(orgId,successorId);
      this.audit(userId,'ORGANIZATION_OWNERSHIP_TRANSFERRED',orgId);
      return { ok:true };
    });
  }
}
