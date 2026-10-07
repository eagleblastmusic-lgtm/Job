import { ownExportQueries,ownExportFromRows,deletableOwnershipQuery,requireDeletableOwnership,transferOwnerQueries } from './privacyReadModel.js';
import { createHash } from 'node:crypto';
import { FaroStore } from './base.js';
import { HttpError } from '../http.js';
import { RecruitmentService } from './recruitmentService.js';

/** Account data rights do not grant organization-wide candidate export. */
export class PrivacyService extends FaroStore {
  exportOwn(userId: string) {
    return ownExportFromRows(ownExportQueries(userId).map(query=>this.db.prepare(query.text).all({$1:userId})),this.now());
  }
  assertDeletable(userId:string){const query=deletableOwnershipQuery(userId);requireDeletableOwnership(this.db.prepare(query.text).all({$1:userId}));}

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
      for(const query of transferOwnerQueries(userId,orgId,successorId,this.now()))this.db.prepare(query.text).run(Object.fromEntries(query.values.map((value,index)=>[`$${index+1}`,value])));
      return { ok:true };
    });
  }
}
