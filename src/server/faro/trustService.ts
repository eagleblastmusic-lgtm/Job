import { caseReportPlan,caseExplanationPlan,caseAppealPlan,caseReviewPlan } from './caseWriteModel.js';
import { restrictionAppealQueries,restrictionRestoreQueries } from './restrictionWriteModel.js';
import { reliabilityWindow,reliabilityQueries,reliabilityFromRows } from './reliabilityReadModel.js';
import { caseReadQuery,caseFromRows,caseListQuery,caseExplanationsQuery,caseVisible,caseView,restrictionReadQuery,restrictionFromRows,restrictionsReadQuery,restrictionView,type CaseRow,type RestrictionRow } from './trustReadModel.js';
import { staleOffersQuery,staleOfferQueries,closingOffersQuery,upcomingOffersQuery,pendingProcessesQuery,offerDeadlineQuery,processDeadlineQueries } from './trustTickModel.js';
import { processRecruiterReadQuery } from './interestWriteModel.js';
import { FaroStore } from './base.js';
import { RecruitmentService } from './recruitmentService.js';
import { InterviewService } from './interviewService.js';
import { AssessmentService } from './assessmentService.js';
import { HttpError } from '../http.js';
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
      const row=authorize();for(const query of restrictionAppealQueries(userId,row,body,this.now()))this.db.prepare(query.text).run(Object.fromEntries(query.values.map((value,index)=>[`$${index+1}`,value])));this.notifyModerators(row.organization_id,'Odwołanie od ograniczenia organizacji wymaga ręcznego przeglądu.',`restriction:${id}:appeal`,'organization');
      return {id};
    });
  }
  restoreRestriction(userId:string,id:string,body:Record<string,unknown>) {
    const authorize=()=>{const row=this.restriction(id);if(!this.restrictionModerator(userId,row))throw new HttpError(403,'Wymagany niezależny moderator.','MODERATION_CONFLICT');return row;};authorize();
    return new RecruitmentService(this.database,this.clock).commandOnce(userId,body.idempotencyKey,{...body,id,operation:'RESTRICTION_RESTORE'},()=>{
      const row=authorize();for(const query of restrictionRestoreQueries(userId,row,body,this.now()))this.db.prepare(query.text).run(Object.fromEntries(query.values.map((value,index)=>[`$${index+1}`,value])));this.notifyRestriction(this.restriction(id));return {id};
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
    const authorize=()=>new RecruitmentService(this.database,this.clock).authorize(userId,processId);authorize();
    return new RecruitmentService(this.database,this.clock).commandOnce(userId,body.idempotencyKey,{...body,processId,operation:'CASE_REPORT'},()=>{
    const service = new RecruitmentService(this.database, this.clock), row = service.authorize(userId, processId);
    const orgId=service.offers.get(row.offer_id).organizationId,plan=caseReportPlan(userId,processId,orgId,body,this.now());
    for(const query of plan.queries)this.db.prepare(query.text).run(Object.fromEntries(query.values.map((value,index)=>[`$${index+1}`,value])));
    this.notifyModerators(plan.ack.id,'Nowe prywatne zgłoszenie wymaga przeglądu.',`case:${plan.ack.id}:report`);return plan.ack;
    },()=>{authorize();});
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
    const authorize=()=>this.participant(userId,this.caseRow(id));authorize();
    return new RecruitmentService(this.database,this.clock).commandOnce(userId,body.idempotencyKey,{...body,id,operation:'CASE_EXPLAIN'},()=>{
      const row=this.caseRow(id),participant=this.participant(userId,row);
      const plan=caseExplanationPlan(userId,row,participant,body,this.now());for(const query of plan.queries)this.db.prepare(query.text).run(Object.fromEntries(query.values.map((value,index)=>[`$${index+1}`,value])));
      this.notifyModerators(id,'Wpłynęło prywatne wyjaśnienie do sprawy.',`case:${id}:explanation:${plan.explanationId}`);return plan.ack;
    },()=>{authorize();});
  }
  review(userId: string, id: string, body: Record<string, unknown>) {
    const authorize=()=>{if(!this.db.prepare("SELECT id FROM users WHERE id=? AND role='ADMIN'").get(userId))throw new HttpError(403,'Wymagany moderator.');const row=this.caseRow(id);if(this.involved(userId,row))throw new HttpError(409,'Sprawę musi rozpatrzyć moderator niezwiązany z jej stronami.','MODERATION_CONFLICT');return row;};authorize();
    return new RecruitmentService(this.database,this.clock).commandOnce(userId,body.idempotencyKey,{...body,id,operation:'CASE_REVIEW'},()=>{
    const row=authorize();
    const sides=Number(this.db.prepare('SELECT COUNT(DISTINCT participant) n FROM faro_case_explanations WHERE case_id=?').get(id)?.n??0),candidateId=row.process_id?new RecruitmentService(this.database,this.clock).row(row.process_id).candidate_id:null,plan=caseReviewPlan(userId,row,body,sides,candidateId,this.now());
    for(const query of plan.queries)this.db.prepare(query.text).run(Object.fromEntries(query.values.map((value,index)=>[`$${index+1}`,value])));
    if(plan.restrictionId)this.notifyRestriction(this.restriction(plan.restrictionId));
    if(row.process_id)new RecruitmentService(this.database,this.clock).event(new RecruitmentService(this.database,this.clock).row(row.process_id),userId,'MODERATION_CASE_UPDATED',plan.event);
    return plan.ack;
    },()=>{authorize();});
  }
  appeal(userId: string, id: string, body: Record<string, unknown>) {
    const authorize=()=>{const row=this.caseRow(id);if(row.reporter_id!==userId)this.participant(userId,row);return row;};authorize();
    return new RecruitmentService(this.database,this.clock).commandOnce(userId,body.idempotencyKey,{...body,id,operation:'CASE_APPEAL'},()=>{
    const row=this.caseRow(id);
    if(row.reporter_id!==userId)this.participant(userId,row);
    const plan=caseAppealPlan(userId,row,body,this.now());for(const query of plan.queries)this.db.prepare(query.text).run(Object.fromEntries(query.values.map((value,index)=>[`$${index+1}`,value])));
    this.notifyModerators(id,'Wpłynęło prywatne odwołanie od decyzji.',`case:${id}:appeal:${row.revision+1}`);
    if(row.process_id)new RecruitmentService(this.database,this.clock).event(new RecruitmentService(this.database,this.clock).row(row.process_id),userId,'MODERATION_CASE_UPDATED',{caseId:id,state:'APPEAL'});
    return plan.ack;
    },()=>{authorize();});
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
