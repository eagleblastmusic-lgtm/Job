import { reliabilityWindow,reliabilityQueries,reliabilityFromRows } from './reliabilityReadModel.js';
import { caseReadQuery,caseFromRows,caseListQuery,caseExplanationsQuery,caseVisible,caseView,restrictionReadQuery,restrictionFromRows,restrictionsReadQuery,restrictionView,type CaseRow,type RestrictionRow } from './trustReadModel.js';
import { staleOffersQuery,staleOfferQueries,closingOffersQuery,upcomingOffersQuery,pendingProcessesQuery,offerDeadlineQuery,processDeadlineQueries } from './trustTickModel.js';
import { processRecruiterReadQuery } from './interestWriteModel.js';
import { randomUUID } from 'node:crypto';
import { FaroStore } from './base.js';
import { RecruitmentService } from './recruitmentService.js';
import { InterviewService } from './interviewService.js';
import { AssessmentService } from './assessmentService.js';
import { HttpError } from '../http.js';
import { text, choice, date, integer } from './validation.js';
export class TrustService extends FaroStore {
  private restriction(id:string) {
    const query=restrictionReadQuery(id);return restrictionFromRows(this.db.prepare(query.text).all({$1:id}));
  }
  private restrictionModerator(userId:string,row:RestrictionRow) {
    return !!this.db.prepare("SELECT id FROM users WHERE id=? AND role='ADMIN'").get(userId)&&row.source_reporter_id!==userId&&row.source_candidate_id!==userId&&!this.affiliated(userId,row.organization_id)&&(!row.source_case_id||!this.involved(userId,this.caseRow(row.source_case_id)));
  }
  restrictions(userId:string,orgId:string) {
    const own=this.db.prepare("SELECT user_id FROM faro_members WHERE organization_id=? AND user_id=? AND active=1 AND role IN ('OWNER','ADMIN')").get(orgId,userId);
    if(!own&&!this.db.prepare("SELECT id FROM users WHERE id=? AND role='ADMIN'").get(userId))throw new HttpError(404,'Nie znaleziono organizacji.');
    if(!own&&this.affiliated(userId,orgId))throw new HttpError(404,'Nie znaleziono organizacji.');
    if(!own)this.audit(userId,'MODERATION_RESTRICTIONS_READ',orgId);
    const query=restrictionsReadQuery(orgId),rows=this.db.prepare(query.text).all({$1:orgId}) as unknown as RestrictionRow[];
    if(!own&&rows.some(row=>!this.restrictionModerator(userId,row)))throw new HttpError(404,'Nie znaleziono niezależnego przeglądu.');
    return rows.map(row=>restrictionView(row,Boolean(own),this.restrictionModerator(userId,row)));
  }
  private notifyRestriction(row:RestrictionRow) {
    const recipients=this.db.prepare("SELECT user_id FROM faro_members WHERE organization_id=? AND active=1 AND role IN ('OWNER','ADMIN')").all(row.organization_id) as Array<{user_id:string}>;
    for(const recipient of recipients)new RecruitmentService(this.database,this.clock).enqueue(recipient.user_id,'organization',row.organization_id,'Zmieniono stan ograniczenia organizacji. Sprawdź zakres i ręczny przegląd.',`restriction:${row.id}:${row.revision}`);
  }
  appealRestriction(userId:string,id:string,body:Record<string,unknown>) {
    const authorize=()=>{const row=this.restriction(id);this.member(userId,row.organization_id,['OWNER','ADMIN']);return row;};authorize();
    return new RecruitmentService(this.database,this.clock).commandOnce(userId,body.idempotencyKey,{...body,id,operation:'RESTRICTION_APPEAL'},()=>{
      const row=authorize();if(integer(body.expectedVersion,1)!==row.revision)throw new HttpError(409,'Odśwież ograniczenie.','VERSION_CONFLICT');
      if(row.state!=='ACTIVE'||row.appeal)throw new HttpError(409,'Odwołanie nie jest teraz dostępne.');
      this.db.prepare('UPDATE faro_restrictions SET appeal=?,appealed_at=?,appeal_by=?,revision=revision+1 WHERE id=?').run(text(body.reason,1500,10),this.now(),userId,id);
      this.audit(userId,'RESTRICTION_APPEALED',id);this.notifyModerators(row.organization_id,'Odwołanie od ograniczenia organizacji wymaga ręcznego przeglądu.',`restriction:${id}:appeal`,'organization');
      return {id};
    });
  }
  restoreRestriction(userId:string,id:string,body:Record<string,unknown>) {
    const authorize=()=>{const row=this.restriction(id);if(!this.restrictionModerator(userId,row))throw new HttpError(403,'Wymagany niezależny moderator.','MODERATION_CONFLICT');return row;};authorize();
    return new RecruitmentService(this.database,this.clock).commandOnce(userId,body.idempotencyKey,{...body,id,operation:'RESTRICTION_RESTORE'},()=>{
      const row=authorize();if(integer(body.expectedVersion,1)!==row.revision)throw new HttpError(409,'Odśwież ograniczenie.','VERSION_CONFLICT');
      if(row.state!=='ACTIVE')throw new HttpError(409,'Ograniczenie zostało już rozpatrzone.');
      if(body.confirmed!==true)throw new HttpError(400,'Potwierdź ręczne sprawdzenie warunków przywrócenia.','CONFIRMATION_REQUIRED');
      this.db.prepare("UPDATE faro_restrictions SET state='RESTORED',restoration_reason=?,restored_at=?,restored_by=?,revision=revision+1 WHERE id=?").run(text(body.reason,1500,10),this.now(),userId,id);
      // Releasing one restriction never clears another or republishes a vacancy.
      if(!this.db.prepare("SELECT id FROM faro_restrictions WHERE organization_id=? AND state='ACTIVE'").get(row.organization_id))this.db.prepare("UPDATE faro_organizations SET verification='PENDING' WHERE id=? AND verification='RESTRICTED'").run(row.organization_id);
      this.audit(userId,'RESTRICTION_RESTORED',id);this.notifyRestriction(this.restriction(id));return {id};
    });
  }
  reliability(userId:string,orgId:string,from:string,to:string) {
    this.member(userId,orgId,['OWNER','ADMIN']);
    const asOf=this.now();
    const {start,end}=reliabilityWindow(from,to,asOf);
    return this.transaction(()=>{this.member(userId,orgId,['OWNER','ADMIN']);return reliabilityFromRows(reliabilityQueries(orgId,start,end).map(query=>this.db.prepare(query.text).all({$1:orgId,$2:start,$3:end})),start,end,asOf);});
  }

  notifyModerators(id:string,message:string,key:string,entityType='case') {
    const recipients=this.db.prepare("SELECT id FROM users WHERE role='ADMIN'").all() as Array<{id:string}>;
    for(const recipient of recipients)new RecruitmentService(this.database,this.clock).enqueue(recipient.id,entityType,id,message,key);
  }
  report(userId: string, processId: string, body: Record<string, unknown>) {
    new RecruitmentService(this.database,this.clock).authorize(userId,processId);
    return new RecruitmentService(this.database,this.clock).commandOnce(userId,body.idempotencyKey,{...body,processId,operation:'CASE_REPORT'},()=>{
    const service = new RecruitmentService(this.database, this.clock), row = service.authorize(userId, processId);
    const orgId = service.offers.get(row.offer_id).organizationId, id = randomUUID();
    this.db.prepare('INSERT INTO faro_cases(id,organization_id,process_id,reporter_id,kind,statement,created_at) VALUES(?,?,?,?,?,?,?)').run(id, orgId, processId, userId, choice(body.kind, ['CV_REQUEST','DISCRIMINATION','SCAM','PROCESS','ASSESSMENT_ABUSE','TECHNICAL_ISSUE'] as const), text(body.statement, 2000, 10), this.now());
    this.audit(userId, 'PRIVATE_REPORT_CREATED', id);
    this.notifyModerators(id,'Nowe prywatne zgłoszenie wymaga przeglądu.',`case:${id}:report`);
    return { id, state: 'OPEN' };
    });
  }
  caseRow(id:string) {
    const query=caseReadQuery(id);return caseFromRows(this.db.prepare(query.text).all({$1:id}));
  }
  participant(userId:string,row:CaseRow):'CANDIDATE'|'EMPLOYER' {
    if(!row.process_id) {this.member(userId,row.organization_id,['OWNER','ADMIN']);return 'EMPLOYER';}
    const p=new RecruitmentService(this.database,this.clock).authorize(userId,row.process_id);
    return p.candidate_id===userId?'CANDIDATE':'EMPLOYER';
  }
  involved(userId:string,row:CaseRow) {
    return row.reporter_id===userId||this.affiliated(userId,row.organization_id)||Boolean(row.process_id&&new RecruitmentService(this.database,this.clock).row(row.process_id).candidate_id===userId);
  }
  list(userId: string) {
    const admin=Boolean(this.db.prepare("SELECT id FROM users WHERE id=? AND role='ADMIN'").get(userId));
    const query=caseListQuery(userId,admin),rows=this.db.prepare(query.text).all(admin?{}:{$1:userId}) as unknown as CaseRow[];
    if(admin)this.audit(userId,'MODERATION_CASES_READ','cases');
    const result:Record<string,unknown>[]=[];
    for(const row of rows) {
      const moderator=admin&&!this.involved(userId,row);
      let participant:'CANDIDATE'|'EMPLOYER'|null=null;
      if(!moderator) {
        try {participant=this.participant(userId,row);}catch{if(row.reporter_id!==userId)continue;}
      }
      if(!caseVisible(row,userId,moderator,participant))continue;
      const query=caseExplanationsQuery(row.id,moderator?null:userId),explanations=this.db.prepare(query.text).all(moderator?{$1:row.id}:{$1:row.id,$2:userId});
      result.push(caseView(row,userId,moderator,participant,explanations));
    }
    return result.slice(0,200);
  }
  explain(userId:string,id:string,body:Record<string,unknown>) {
    this.participant(userId,this.caseRow(id));
    return new RecruitmentService(this.database,this.clock).commandOnce(userId,body.idempotencyKey,{...body,id,operation:'CASE_EXPLAIN'},()=>{
      const row=this.caseRow(id),participant=this.participant(userId,row);
      if(!['NO_SHOW_CASE','INTERVIEW_DISCREPANCY'].includes(row.kind)||!['OPEN','EVIDENCE_REVIEW','APPEAL'].includes(row.state))throw new HttpError(409,'Wyjaśnienie nie jest teraz dostępne.');
      if(integer(body.expectedVersion,1)!==row.revision)throw new HttpError(409,'Odśwież sprawę.','VERSION_CONFLICT');
      const explanationId=randomUUID();
      this.db.prepare('INSERT INTO faro_case_explanations(id,case_id,user_id,participant,statement,created_at) VALUES(?,?,?,?,?,?)').run(explanationId,id,userId,participant,text(body.statement,2000,10),this.now());
      this.db.prepare('UPDATE faro_cases SET revision=revision+1 WHERE id=?').run(id);
      this.audit(userId,'PRIVATE_CASE_EXPLANATION',id);
      this.notifyModerators(id,'Wpłynęło prywatne wyjaśnienie do sprawy.',`case:${id}:explanation:${explanationId}`);
      return {id,revision:row.revision+1};
    });
  }
  review(userId: string, id: string, body: Record<string, unknown>) {
    if (!this.db.prepare("SELECT id FROM users WHERE id=? AND role='ADMIN'").get(userId)) throw new HttpError(403, 'Wymagany moderator.');
    return new RecruitmentService(this.database,this.clock).commandOnce(userId,body.idempotencyKey,{...body,id,operation:'CASE_REVIEW'},()=>{
    const row=this.caseRow(id);
    if(!this.db.prepare("SELECT id FROM users WHERE id=? AND role='ADMIN'").get(userId))throw new HttpError(403,'Wymagany moderator.');
    if(this.involved(userId,row))throw new HttpError(409,'Sprawę musi rozpatrzyć moderator niezwiązany z jej stronami.','MODERATION_CONFLICT');
    if(integer(body.expectedVersion,1)!==row.revision)throw new HttpError(409,'Odśwież sprawę.','VERSION_CONFLICT');
    const target = choice(body.state, ['EVIDENCE_REVIEW','ACTION','NO_ACTION','RESOLVED'] as const);
    const valid: Record<string, string[]> = { OPEN: ['EVIDENCE_REVIEW'], EVIDENCE_REVIEW: ['ACTION','NO_ACTION'], APPEAL: ['RESOLVED'], ACTION: ['RESOLVED'], NO_ACTION: ['RESOLVED'] };
    if (!valid[row.state]?.includes(target)) throw new HttpError(409, 'Niedozwolony stan sprawy.');
    const decision = text(body.decision, 1500, 10), reviewAt = date(body.reviewAt);
    const publicReason=target==='EVIDENCE_REVIEW'?null:choice(body.decisionCode,['PROCESS_VIOLATION_CONFIRMED','INSUFFICIENT_EVIDENCE','TECHNICAL_ISSUE','NO_VIOLATION_CONFIRMED','CASE_RESOLVED'] as const);
    const bilateral=['NO_SHOW_CASE','INTERVIEW_DISCREPANCY'].includes(row.kind);
    let explanationDue=row.explanation_due_at;
    if(bilateral&&target==='EVIDENCE_REVIEW') {
      explanationDue=date(body.explanationDueAt);
      if(explanationDue<=this.now())throw new HttpError(400,'Termin na wyjaśnienia musi być w przyszłości.');
    }
    const sides=(this.db.prepare('SELECT COUNT(DISTINCT participant) n FROM faro_case_explanations WHERE case_id=?').get(id) as {n:number}).n;
    if(bilateral&&['ACTION','NO_ACTION'].includes(target)&&sides<2&&(!explanationDue||explanationDue>this.now()))throw new HttpError(409,'Najpierw wyjaśnienia obu stron albo upływ jawnego terminu.','EXPLANATION_WINDOW_OPEN');
    if(target==='ACTION'&&body.restrict===true&&row.kind==='NO_SHOW_CASE') {
      const p=row.process_id?new RecruitmentService(this.database,this.clock).row(row.process_id):null;
      if(!p||row.reporter_id!==p.candidate_id)throw new HttpError(409,'Sprawa dotycząca kandydata nie może ograniczyć organizacji. Ograniczenia kandydata wymagają odrębnej zatwierdzonej polityki.','RESTRICTION_SCOPE');
    }
      this.db.prepare('UPDATE faro_cases SET state=?,decision=?,public_reason=?,review_at=?,explanation_due_at=?,revision=revision+1 WHERE id=?').run(target, decision,publicReason, reviewAt,explanationDue, id);
      if (target === 'ACTION' && body.restrict === true) {
        const condition=text(body.restorationCondition,1000,10);
        if(reviewAt<=this.now())throw new HttpError(400,'Wybierz przyszły termin przeglądu ograniczenia.');
        const candidateId=row.process_id?new RecruitmentService(this.database,this.clock).row(row.process_id).candidate_id:null;
        this.db.prepare('INSERT INTO faro_restrictions(id,organization_id,source_case_id,source_reporter_id,source_candidate_id,reason_code,restoration_condition,created_at,review_at) VALUES(?,?,?,?,?,?,?,?,?)').run(randomUUID(),row.organization_id,id,row.reporter_id,candidateId,publicReason,condition,this.now(),reviewAt);
        this.db.prepare("UPDATE faro_organizations SET verification='RESTRICTED' WHERE id=?").run(row.organization_id);
        this.db.prepare("UPDATE faro_offers SET status='PAUSED',revision=revision+1 WHERE organization_id=? AND status='PUBLISHED'").run(row.organization_id);
        const restriction=this.db.prepare('SELECT id FROM faro_restrictions WHERE source_case_id=?').get(id) as {id:string};this.notifyRestriction(this.restriction(restriction.id));
      }
      this.audit(userId, 'MODERATION_REVIEWED', id);
      if(row.process_id)new RecruitmentService(this.database,this.clock).event(new RecruitmentService(this.database,this.clock).row(row.process_id),userId,'MODERATION_CASE_UPDATED',{caseId:id,state:target,explanationDueAt:explanationDue});
      return { id, state: target,revision:row.revision+1 };
    });
  }
  appeal(userId: string, id: string, body: Record<string, unknown>) {
    const authorized=this.caseRow(id);
    if(authorized.reporter_id!==userId)this.participant(userId,authorized);
    return new RecruitmentService(this.database,this.clock).commandOnce(userId,body.idempotencyKey,{...body,id,operation:'CASE_APPEAL'},()=>{
    const row=this.caseRow(id);
    if(row.reporter_id!==userId)this.participant(userId,row);
    if(integer(body.expectedVersion,1)!==row.revision)throw new HttpError(409,'Odśwież sprawę.','VERSION_CONFLICT');
    if (!['ACTION','NO_ACTION'].includes(row.state)) throw new HttpError(409, 'Odwołanie nie jest teraz dostępne.');
    this.db.prepare("UPDATE faro_cases SET state='APPEAL',appeal=?,appeal_by=?,revision=revision+1 WHERE id=?").run(text(body.statement, 2000, 10),userId, id);
    this.audit(userId, 'MODERATION_APPEALED', id);
    this.notifyModerators(id,'Wpłynęło prywatne odwołanie od decyzji.',`case:${id}:appeal:${row.revision+1}`);
    if(row.process_id)new RecruitmentService(this.database,this.clock).event(new RecruitmentService(this.database,this.clock).row(row.process_id),userId,'MODERATION_CASE_UPDATED',{caseId:id,state:'APPEAL'});
    return { id, state: 'APPEAL',revision:row.revision+1 };
    });
  }
  tick() {
    new AssessmentService(this.database,this.clock).expire();
    new InterviewService(this.database,this.clock).tick();
    const service = new RecruitmentService(this.database, this.clock), now = this.now();
    this.transaction(() => {
      const read=(query:{text:string;values:readonly (string|number)[]})=>this.db.prepare(query.text).all(Object.fromEntries(query.values.map((value,index)=>[`$${index+1}`,value]))),execute=(queries:Array<{text:string;values:readonly (string|number)[]}>)=>{for(const query of queries)this.db.prepare(query.text).run(Object.fromEntries(query.values.map((value,index)=>[`$${index+1}`,value])));};
      for(const offer of read(staleOffersQuery(now)))execute(staleOfferQueries(offer.id as string,offer.organization_id as string,now));
      for(const offer of read(closingOffersQuery(now))){this.db.prepare("UPDATE faro_offers SET status='CLOSED',revision=revision+1 WHERE id=?").run(offer.id as string);service.offers.notifyChange(offer.id as string,offer.current_version as number,'CLOSE');}
      for(const offer of read(upcomingOffersQuery(now)))execute([offerDeadlineQuery(offer,now)]);
      for(const process of read(pendingProcessesQuery()))execute(processDeadlineQueries(process,read(processRecruiterReadQuery(process.offer_id as string)),now));
    });
    service.deliverOutbox();
  }
}
