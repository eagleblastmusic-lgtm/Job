import { watchReadQuery,watchApplicantQuery,watchListQuery,watchStateQuery,watchAlertPlan,watchCancelQueries } from './watchModel.js';
import { processChangePlan,processCancelQueries } from './processWriteModel.js';
import { processReadQuery,processListReadQuery,processFromRows,processContextReadQueries,processViewFromRows,processLatestDataQuery,processClarificationFromRows,processEmploymentFromRows,type ProcessRow } from './processReadModel.js';
export type { ProcessRow } from './processReadModel.js';
import { interestReadQueries,interestPlan,processRecruiterReadQuery,processEventQueries } from './interestWriteModel.js';
import { commandRequest,commandReadQuery,commandReplay,commandSaveQuery } from './commandJournal.js';
import { AppStore } from '../store.js';
import { randomUUID, createHash } from 'node:crypto';
import { FaroStore } from './base.js';
import { ProfileService } from './profileService.js';
import { OfferService } from './offerService.js';
import { HttpError } from '../http.js';
import { integer, choice } from './validation.js';
import { type Stage } from '../../domain/faro/recruitment.js';
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
  commandOnce<T>(userId: string, key: unknown, input: unknown, work: () => T, authorize?:()=>void): T {
    const request=commandRequest(key,input);
    return this.transaction(()=>{
      authorize?.();
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
    const query=processListReadQuery(userId,offerId),rows=this.db.prepare(query.text).all({$1:query.values[0]!}) as Array<{id:string}>;
    return rows.map(row => this.view(userId, row.id));
  }
  change(userId: string, id: string, body: Record<string, unknown>) {
    this.authorize(userId, id);
    return this.commandOnce(userId, body.idempotencyKey, { id, ...body }, () => {
      const row = this.authorize(userId, id), actor = row.candidate_id === userId ? 'CANDIDATE' : 'EMPLOYER';
      if (actor === 'EMPLOYER') this.member(userId, this.offers.get(row.offer_id).organizationId, ['OWNER','ADMIN','RECRUITER']);
      const plan=processChangePlan(row,actor,body,{version:version=>this.offers.version(row.offer_id,version),published:version=>Boolean(this.db.prepare("SELECT 1 FROM faro_offer_versions WHERE offer_id=? AND version=? AND publication_proof<>'NONE'").get(row.offer_id,version)),clarification:()=>this.clarification(id),employmentOffer:()=>this.employmentOffer(id)},this.now());
      this.db.prepare(plan.query.text).run(Object.fromEntries(plan.query.values.map((value,index)=>[`$${index+1}`,value])));
      if(plan.terminal)this.cancelObligations(id);
      this.event(row,userId,plan.command,plan.event);
      if(plan.command==='ACCEPT_OFFER')new AppStore(this.database).faroOfferAccepted(id);
      return plan.ack;
    },()=>{this.authorize(userId,id);});
  }
  employmentOffer(id:string):{revision:number;sourceVersion:number;salaryIndex:number;amount:number;startsAt:string;responseDueAt:string;conditions:ReturnType<OfferService['version']>}|null {
    const query=processLatestDataQuery(id,'OFFER');return processEmploymentFromRows(this.db.prepare(query.text).all({$1:id,$2:'OFFER'}));
  }
  cancelObligations(id:string) {
    for(const query of processCancelQueries(id,this.now()))this.db.prepare(query.text).run(Object.fromEntries(query.values.map((value,index)=>[`$${index+1}`,value])));
  }
  clarification(id:string):{topic:'REQUIREMENT'|'AVAILABILITY';requirementId:string|null;skillId:string|null;previousStage:Stage}|null {
    const query=processLatestDataQuery(id,'CLARIFY');return processClarificationFromRows(this.db.prepare(query.text).all({$1:id,$2:'CLARIFY'}));
  }
  watch(userId: string, offerId: string, watching: boolean) {
    return this.transaction(()=>{
    if (watching) {
      const offer = this.offers.get(offerId); if (!this.offers.intake(offer)) throw new HttpError(409, 'Możesz obserwować aktywną ofertę.');
    }
    const query=watchStateQuery(userId,offerId,watching,this.now());this.db.prepare(query.text).run(Object.fromEntries(query.values.map((value,index)=>[`$${index+1}`,value])));
    if(!watching)this.cancelWatchAlerts(userId,offerId);
    return { watching };
    });
  }
  cancelWatchAlerts(userId:string,offerId:string) {
    const read=watchApplicantQuery(userId,offerId),applicant=Boolean(this.db.prepare(read.text).get({$1:userId,$2:offerId}));
    for(const query of watchCancelQueries(userId,offerId,applicant))this.db.prepare(query.text).run({$1:userId,$2:offerId});
  }
  watchSettings(userId:string,offerId:string,body:Record<string,unknown>) {
    if(typeof body.alerts!=='boolean')throw new HttpError(400,'Wybierz, czy chcesz otrzymywać alerty.');
    return this.transaction(()=>{
      const read=watchReadQuery(userId,offerId),watch=this.db.prepare(read.text).get({$1:userId,$2:offerId}),plan=watchAlertPlan(userId,offerId,body,watch);
      this.db.prepare(plan.query.text).run(Object.fromEntries(plan.query.values.map((value,index)=>[`$${index+1}`,value])));
      if(!plan.alerts)this.cancelWatchAlerts(userId,offerId);
      return {watching:true,alerts:plan.alerts};
    });
  }
  watches(userId: string) {
    const read=watchListQuery(userId),rows=this.db.prepare(read.text).all({$1:userId}) as Array<{ offer_id: string;alerts:number }>;
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
