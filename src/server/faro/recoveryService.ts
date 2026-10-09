import { createHash,randomUUID } from 'node:crypto';
import { FaroStore } from './base.js';
import { PrivacyService } from './privacyService.js';
import { currentActivityAuthority } from './recoveryReadModel.js';

export interface RecoveryLedger {
  activities:Array<{id:string;user_id:string}>;
  erasures:Array<{subject_hash:string;erased_at:string;policy_version:string}>;
  owners:Array<{organization_id:string;user_id:string}>;
  members:Array<{organization_id:string;user_id:string;role:'OWNER'|'ADMIN'|'RECRUITER'|'HIRING_MANAGER'}>;
  assignments:Array<{offer_id:string;user_id:string}>;
  /** Sensitive authority snapshot: never log or serialize this input to diagnostics. */
  accounts:Array<{id:string;role:'USER'|'ADMIN';password_hash:string;email:string;name:string}>;
  uploads?:Array<{id:string;user_id:string;storage_key:string;size_bytes:number;sha256:string}>;
  mfa?:Array<{user_id:string;active_cipher:string;last_counter:number;activated_at:string}>;
  mfaRecovery?:Array<{user_id:string;code_hash:string;used_at:string|null}>;
  mfaLimits?:Array<{user_id:string;failures:number;window_start:string}>;
  organizations:Array<{id:string;verification:'PENDING'|'VERIFIED'|'RESTRICTED'}>;
  restrictions:Array<{id:string;organization_id:string;source_case_id:string|null;source_reporter_id:string|null;source_candidate_id:string|null;scope:string;state:string;reason_code:string;restoration_condition:string|null;created_at:string|null;review_at:string|null;revision:number;appeal:string|null;appealed_at:string|null;appeal_by:string|null;restoration_reason:string|null;restored_at:string|null;restored_by:string|null}>;
}
/** Offline only: caller must use a new isolated database, with a consistent latest ledger snapshot. */
export class RecoveryService extends FaroStore {
  reconcile(ledger:RecoveryLedger) {
    const hashes=new Set<string>();
    const erasedAt=new Map<string,string>();
    for(const item of ledger.erasures) {
      if(!/^[a-f0-9]{64}$/.test(item.subject_hash)||item.policy_version!=='local-erasure-v1'||!Number.isFinite(Date.parse(item.erased_at)))throw new Error('Nieprawidłowy lub nieobsługiwany rejestr usunięć.');
      if(hashes.has(item.subject_hash))throw new Error('Powielony wpis rejestru usunięć.');
      hashes.add(item.subject_hash);erasedAt.set(item.subject_hash,item.erased_at);
    }
    if((!ledger.mfa||!ledger.mfaRecovery||!ledger.mfaLimits)&&Number(this.db.prepare('SELECT COUNT(*) n FROM faro_mfa WHERE active_cipher IS NOT NULL').get()!.n)>0)throw new Error('Brak bieżącego rejestru MFA. Odtworzenie wstrzymane.');
    const owners=new Map<string,string>();
    for(const item of ledger.owners) {
      if(owners.has(item.organization_id)&&owners.get(item.organization_id)!==item.user_id)throw new Error('Niejednoznaczna własność w bieżącym rejestrze.');
      owners.set(item.organization_id,item.user_id);
    }
    const users=this.db.prepare('SELECT id FROM users').all() as Array<{id:string}>;
    const erased=users.filter(u=>hashes.has(createHash('sha256').update(u.id).digest('hex')));
    const erasedIds=new Set(erased.map(u=>u.id));
    const accounts=new Map(ledger.accounts.map(a=>[a.id,a]));
    if(accounts.size!==ledger.accounts.length)throw new Error('Niejednoznaczny bieżący rejestr kont.');
    for(const user of users)if(!erasedIds.has(user.id)&&!accounts.has(user.id))throw new Error('Bieżący rejestr nie rozstrzyga konta z kopii. Odtworzenie wstrzymane.');
    const members=new Map(ledger.members.map(m=>[JSON.stringify([m.organization_id,m.user_id]),m]));
    const assignments=new Set(ledger.assignments.map(a=>JSON.stringify([a.offer_id,a.user_id])));
    if(!Array.isArray(ledger.restrictions))throw new Error('Brak bieżącego rejestru ograniczeń. Odtworzenie wstrzymane.');
    const activities=currentActivityAuthority(ledger);
    return this.transaction(()=>{
      // Cascades erase proposal lineage; accepted claims remain independent declarations.
      for(const old of this.db.prepare('SELECT id,user_id FROM faro_activities').all() as Array<{id:string;user_id:string}>){
        if(activities.has(old.id)&&activities.get(old.id)!==old.user_id)throw new Error('Private activity authority ownership mismatch.');
        if(!activities.has(old.id))this.db.prepare('DELETE FROM faro_activities WHERE id=?').run(old.id);
      }
      let restoredOwnerships=0,closedOrganizations=0;
      const closedIds=new Set<string>();
      for(const user of erased) {
        const oldOwned=this.db.prepare("SELECT organization_id FROM faro_members WHERE user_id=? AND role='OWNER' AND active=1").all(user.id) as Array<{organization_id:string}>;
        for(const org of oldOwned) {
          const successor=owners.get(org.organization_id);
          // Never invent a successor or grant process assignment through ownership.
          if(successor&&!erasedIds.has(successor)&&this.db.prepare('SELECT user_id FROM faro_members WHERE organization_id=? AND user_id=? AND active=1').get(org.organization_id,successor)) {
            this.db.prepare("UPDATE faro_members SET role='ADMIN' WHERE organization_id=? AND user_id=?").run(org.organization_id,user.id);
            this.db.prepare("UPDATE faro_members SET role='OWNER' WHERE organization_id=? AND user_id=?").run(org.organization_id,successor);
            restoredOwnerships++;
          } else {closedOrganizations++;closedIds.add(org.organization_id);}
        }
        const hash=createHash('sha256').update(user.id).digest('hex');
        new PrivacyService(this.database,()=>new Date(erasedAt.get(hash)!)).eraseDerivatives(user.id,true);
        this.db.prepare('DELETE FROM users WHERE id=?').run(user.id);
        this.audit(null,'RECOVERY_ERASURE_REPLAY',createHash('sha256').update(user.id).digest('hex'));
      }
      for(const entry of ledger.erasures)this.db.prepare('INSERT INTO faro_erasure_log(subject_hash,erased_at,policy_version) VALUES(?,?,?) ON CONFLICT(subject_hash) DO UPDATE SET erased_at=MAX(erased_at,excluded.erased_at),policy_version=excluded.policy_version').run(entry.subject_hash,entry.erased_at,entry.policy_version);
      for(const user of users) {
        if(erasedIds.has(user.id))continue;
        const current=accounts.get(user.id)!;
        this.db.prepare('UPDATE users SET role=?,password_hash=?,email=?,name=? WHERE id=?').run(current.role,current.password_hash,current.email,current.name,user.id);
      }
      const oldMembers=this.db.prepare('SELECT organization_id,user_id FROM faro_members').all() as Array<{organization_id:string;user_id:string}>;
      for(const old of oldMembers) {
        const current=members.get(JSON.stringify([old.organization_id,old.user_id]));
        if(current)this.db.prepare('UPDATE faro_members SET role=?,active=1 WHERE organization_id=? AND user_id=?').run(current.role,old.organization_id,old.user_id);
        else this.db.prepare('UPDATE faro_members SET active=0 WHERE organization_id=? AND user_id=?').run(old.organization_id,old.user_id);
      }
      const oldAssignments=this.db.prepare('SELECT offer_id,user_id FROM faro_assignments').all() as Array<{offer_id:string;user_id:string}>;
      for(const old of oldAssignments)if(!assignments.has(JSON.stringify([old.offer_id,old.user_id])))this.db.prepare('DELETE FROM faro_assignments WHERE offer_id=? AND user_id=?').run(old.offer_id,old.user_id);
      const invalidatedSessions=Number(this.db.prepare('DELETE FROM sessions').run().changes);
      this.db.prepare('DELETE FROM faro_mfa').run();this.db.prepare('DELETE FROM faro_mfa_limits').run();
      for(const m of ledger.mfa??[])if(this.db.prepare('SELECT id FROM users WHERE id=?').get(m.user_id))this.db.prepare('INSERT INTO faro_mfa(user_id,active_cipher,last_counter,activated_at) VALUES(?,?,?,?)').run(m.user_id,m.active_cipher,m.last_counter,m.activated_at);
      for(const r of ledger.mfaRecovery??[])if(this.db.prepare('SELECT user_id FROM faro_mfa WHERE user_id=?').get(r.user_id))this.db.prepare('INSERT INTO faro_mfa_recovery(user_id,code_hash,used_at) VALUES(?,?,?)').run(r.user_id,r.code_hash,r.used_at);
      for(const l of ledger.mfaLimits??[])if(this.db.prepare('SELECT id FROM users WHERE id=?').get(l.user_id))this.db.prepare('INSERT INTO faro_mfa_limits(user_id,failures,window_start) VALUES(?,?,?)').run(l.user_id,l.failures,l.window_start);
      // An old worker reservation is not authority to deliver into a restored database.
      this.db.prepare('UPDATE faro_outbox SET claim_token=NULL,lease_until=NULL WHERE claim_token IS NOT NULL').run();
      this.db.prepare('DELETE FROM faro_invites').run();
      // Optional Canonical telemetry cannot be resurrected from a stale-consent snapshot.
      this.db.prepare("DELETE FROM analytics_events WHERE event_name='FARO_MUTUAL_STAGE_COMPLETED'").run();
      const revokedPhoneGrants=Number(this.db.prepare('UPDATE faro_contact_grants SET revoked_at=? WHERE revoked_at IS NULL').run(this.now()).changes);
      for(const user of users) {
        if(erasedIds.has(user.id))continue;
        const consent=this.db.prepare("SELECT granted FROM consents WHERE user_id=? AND consent_type='ANALYTICS' ORDER BY created_at DESC,rowid DESC LIMIT 1").get(user.id) as {granted:number}|undefined;
        if(consent?.granted===1)this.db.prepare("INSERT INTO consents(id,user_id,consent_type,granted,version,created_at) VALUES(?,?,'ANALYTICS',0,'recovery-default-off-v1',?)").run(randomUUID(),user.id,this.now());
      }
      const orgStates=new Map(ledger.organizations.map(o=>[o.id,o.verification]));
      // Use current authority and current surviving actor references, never stale private appeals.
      this.db.prepare('DELETE FROM faro_restrictions').run();
      for(const r of ledger.restrictions)if(this.db.prepare('SELECT id FROM faro_organizations WHERE id=?').get(r.organization_id)) {
        const actor=(id:string|null)=>id&&this.db.prepare('SELECT id FROM users WHERE id=?').get(id)?id:null;
        const caseId=r.source_case_id&&this.db.prepare('SELECT id FROM faro_cases WHERE id=?').get(r.source_case_id)?r.source_case_id:null;
        this.db.prepare('INSERT INTO faro_restrictions(id,organization_id,source_case_id,source_reporter_id,source_candidate_id,scope,state,reason_code,restoration_condition,created_at,review_at,revision,appeal,appealed_at,appeal_by,restoration_reason,restored_at,restored_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(r.id,r.organization_id,caseId,actor(r.source_reporter_id),actor(r.source_candidate_id),r.scope,r.state,r.reason_code,r.restoration_condition,r.created_at,r.review_at,r.revision,actor(r.appeal_by)?r.appeal:null,actor(r.appeal_by)?r.appealed_at:null,actor(r.appeal_by),r.restoration_reason,r.restored_at,actor(r.restored_by));
      }
      const oldOrgs=this.db.prepare('SELECT id FROM faro_organizations').all() as Array<{id:string}>;
      for(const org of oldOrgs)this.db.prepare('UPDATE faro_organizations SET verification=? WHERE id=?').run(closedIds.has(org.id)?'RESTRICTED':orgStates.get(org.id)??'RESTRICTED',org.id);
      this.db.prepare("UPDATE faro_organizations SET verification='RESTRICTED' WHERE EXISTS(SELECT 1 FROM faro_restrictions r WHERE r.organization_id=faro_organizations.id AND r.state='ACTIVE')").run();
      // A historical snapshot cannot prove the vacancy is still open today.
      const published=this.db.prepare("SELECT id FROM faro_offers WHERE status='PUBLISHED'").all() as Array<{id:string}>;
      for(const offer of published)this.audit(null,'RECOVERY_INTAKE_PAUSED',offer.id);
      this.db.prepare("UPDATE faro_offers SET status='PAUSED',revision=revision+1 WHERE status='PUBLISHED'").run();
      if(this.db.prepare('PRAGMA foreign_key_check').all().length)throw new Error('Odtworzona baza ma niespójne relacje.');
      return {erasedSubjects:erased.length,restoredOwnerships,closedOrganizations,pausedOffers:published.length,invalidatedSessions,revokedPhoneGrants};
    });
  }
}
