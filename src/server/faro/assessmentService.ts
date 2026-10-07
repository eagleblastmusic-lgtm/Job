import { cohortCorrectionPlan } from './assessmentCohortWriteModel.js';
import { type CorrectedKey,correctedKeyQuery,cohortAttemptsQuery,cohortKeyInput,cohortEffect,cohortPreview,cohortPublicPreview } from './assessmentCohortReadModel.js';
import { assessmentRetryPlan,attemptRetryContextQueries } from './assessmentRetryModel.js';
import { incidentReportPlan,incidentResolutionPlan,otherActiveAttemptQuery,requireIncidentCandidate } from './assessmentIncidentModel.js';
import { assessmentAmendmentPlan } from './assessmentAmendmentModel.js';
import { assessmentInvalidationPlan } from './assessmentInvalidationModel.js';
import { assessmentFinalizeQueries } from './assessmentReviewModel.js';
import { attemptAnswerQueries } from './assessmentAnswerModel.js';
import { requireAttemptCandidate,attemptStartQueries } from './assessmentStartModel.js';
import { dueAttemptsQuery,attemptExpiryQueries } from './assessmentExpiryModel.js';
import { type AttemptRow,type IncidentRow,attemptHistoryQuery,attemptHistoryFromRows,attemptIncidentQuery,attemptReadQuery,attemptFromRows,attemptContextQueries,attemptView,attemptListQuery } from './assessmentAttemptReadModel.js';
import { assignmentRequest,assignmentCorrectionQuery,assignmentExistingQuery,assessmentAssignmentPlan } from './assessmentAssignmentModel.js';
import { parseAssessment,assessmentEditInput,assessmentDefinitionQuery,assessmentDefinitionFromRows,assessmentListQuery,assessmentLatestQuery,assessmentCreatePlan,assessmentApprovalPlan,type Definition } from './assessmentDefinitionModel.js';
import { randomUUID } from 'node:crypto';
import { FaroStore } from './base.js';
import { RecruitmentService } from './recruitmentService.js';
import { OfferService } from './offerService.js';
import { HttpError } from '../http.js';
import { integer } from './validation.js';
import { TERMINAL } from '../../domain/faro/recruitment.js';
export class AssessmentService extends FaroStore {
  get recruitment() { return new RecruitmentService(this.database, this.clock); }
  definition(id: string, version: number) {
    const query=assessmentDefinitionQuery(id,version);return assessmentDefinitionFromRows(this.db.prepare(query.text).all({$1:id,$2:version}));
  }
  private correctedKey(id:string,version:number) {
    const query=correctedKeyQuery(id,version);return this.db.prepare(query.text).get({$1:id,$2:version}) as CorrectedKey|undefined;
  }
  previewKeyCorrection(userId:string,id:string,version:number,body:Record<string,unknown>) {
    const definition=this.read(userId,id,version),previous=this.correctedKey(id,version),{content,key,reason}=cohortKeyInput(definition,previous,body),query=cohortAttemptsQuery(id,version),rows=this.db.prepare(query.text).all({$1:id,$2:version}) as Array<{id:string}>;
    if(rows.length>500)throw new HttpError(409,'Grupa wymaga osobnego kontrolowanego przeglądu operacyjnego.');
    const effects=rows.map(({id:attemptId})=>{const attempt=this.row(attemptId),process=this.recruitment.row(attempt.process_id);this.recruitment.offers.assigned(userId,process.offer_id);return cohortEffect(content,key,attempt,process.revision,this.resultHistory(attemptId).at(-1));});
    return cohortPreview(userId,id,version,definition,previous,key,reason,effects);
  }
  keyCorrectionPreview(userId:string,id:string,version:number,body:Record<string,unknown>) {
    const p=this.previewKeyCorrection(userId,id,version,body);
    return cohortPublicPreview(p);
  }
  correctCohortKey(userId:string,id:string,version:number,body:Record<string,unknown>) {
    this.read(userId,id,version);
    const ack=this.recruitment.commandOnce(userId,body.idempotencyKey,{...body,id,version,operation:'ASSESSMENT_COHORT_KEY_CORRECTION'},()=>{
      const p=this.previewKeyCorrection(userId,id,version,body);
      const plan=cohortCorrectionPlan(userId,id,version,p,this.correctedKey(id,version)?.revision??0,body,this.now());
      for(const query of plan.queries)this.db.prepare(query.text).run(Object.fromEntries(query.values.map((value,index)=>[`$${index+1}`,value])));
      for(const effect of plan.effects)this.recruitment.event(this.recruitment.row(effect.attempt.process_id),userId,'ASSESSMENT_COHORT_CORRECTED',{attemptId:effect.attemptId,scoringRevision:plan.ack.correctionId});
      return plan.ack;
    },()=>{this.read(userId,id,version);});
    this.read(userId,id,version);return ack;
  }
  list(userId: string, offerId: string) {
    new OfferService(this.database, this.clock).assigned(userId, offerId);
    const query=assessmentListQuery(offerId);return this.db.prepare(query.text).all({$1:offerId});
  }
  read(userId:string,id:string,version:number) {
    const row=this.definition(id,version);
    new OfferService(this.database,this.clock).assigned(userId,row.offer_id);
    return row;
  }
  edit(userId:string,id:string,version:number,body:Record<string,unknown>) {
    this.read(userId,id,version);
    return this.recruitment.commandOnce(userId,body.idempotencyKey,{...body,id,version,operation:'ASSESSMENT_EDIT'},()=>{
      const prior=this.read(userId,id,version);
      const latest=this.db.prepare('SELECT MAX(version) version FROM faro_assessments WHERE id=?').get(id) as {version:number};
      return this.createOwned(userId,prior.offer_id,assessmentEditInput(prior,latest.version,body),id);
    },()=>{this.read(userId,id,version);});
  }
  parse(body:Record<string,unknown>):Definition {return parseAssessment(body);}
  create(userId:string,offerId:string,body:Record<string,unknown>,previousId?:string) {
    return this.transaction(()=>this.createOwned(userId,offerId,body,previousId));
  }
  private createOwned(userId:string,offerId:string,body:Record<string,unknown>,previousId?:string) {
    const offer=new OfferService(this.database,this.clock).assigned(userId,offerId);this.member(userId,offer.organizationId,['OWNER','ADMIN','RECRUITER','HIRING_MANAGER']);
    const id=previousId??randomUUID(),read=assessmentLatestQuery(id,offerId),prior=this.db.prepare(read.text).get({$1:id,$2:offerId}) as {version:number|null},plan=assessmentCreatePlan(userId,offerId,body,prior.version,id,Boolean(previousId),this.now());
    for(const query of plan.queries)this.db.prepare(query.text).run(Object.fromEntries(query.values.map((value,index)=>[`$${index+1}`,value])));
    return plan.ack;
  }
  approve(userId:string,id:string,body:Record<string,unknown>) {
    return this.transaction(()=>{
      const row=this.read(userId,id,integer(body.version,1)),read=assessmentLatestQuery(id),latest=this.db.prepare(read.text).get({$1:id}) as {version:number},plan=assessmentApprovalPlan(userId,row,body,latest.version,this.now());
      for(const query of plan.queries)this.db.prepare(query.text).run(Object.fromEntries(query.values.map((value,index)=>[`$${index+1}`,value])));
      return plan.ack;
    });
  }
  assign(userId: string, processId: string, body: Record<string, unknown>) {
    this.recruitment.authorize(userId,processId);
    return this.recruitment.commandOnce(userId,body.idempotencyKey,{...body,processId,operation:'ASSESSMENT_ASSIGN'},()=>{
    const process = this.recruitment.row(processId);
    const offer = new OfferService(this.database, this.clock).assigned(userId, process.offer_id);
    this.member(userId, offer.organizationId, ['OWNER','ADMIN','RECRUITER']);
    const request=assignmentRequest(body),definition=this.definition(request.definitionId,request.version),latestQuery=assessmentLatestQuery(request.definitionId),latest=this.db.prepare(latestQuery.text).get({$1:request.definitionId}) as {version:number},correction=assignmentCorrectionQuery(request.definitionId,request.version),existing=assignmentExistingQuery(processId,request.definitionId,request.version);
    const plan=assessmentAssignmentPlan(process,definition,latest.version,Boolean(this.db.prepare(correction.text).get({$1:request.definitionId,$2:request.version})),Boolean(this.db.prepare(existing.text).get({$1:processId,$2:request.definitionId,$3:request.version})),body,this.now());
    for(const query of plan.queries)this.db.prepare(query.text).run(Object.fromEntries(query.values.map((value,index)=>[`$${index+1}`,value])));
    this.recruitment.event(process,userId,'ASSESSMENT_ASSIGNED',plan.event);
    return plan.ack;
    },()=>{this.recruitment.offers.assigned(userId,this.recruitment.row(processId).offer_id);});
  }
  expire(id?:string) {
    this.transaction(()=>{
      const query=dueAttemptsQuery(this.now(),id),due=this.db.prepare(query.text).all(Object.fromEntries(query.values.map((value,index)=>[`$${index+1}`,value]))) as Array<{id:string}>;
      for(const item of due) {
        const attempt=this.row(item.id),process=this.recruitment.row(attempt.process_id),decisionHours=!TERMINAL.includes(process.status)&&process.stage==='ASSESSMENT_REQUESTED'?this.recruitment.offers.version(process.offer_id,process.offer_version).decisionHours:null;
        for(const write of attemptExpiryQueries(attempt,process,decisionHours,this.now()))this.db.prepare(write.text).run(Object.fromEntries(write.values.map((value,index)=>[`$${index+1}`,value])));
        this.recruitment.event(process,null,'ATTEMPT_EXPIRED',{attemptId:item.id});
      }
    });
  }
  row(id: string) {
    const query=attemptReadQuery(id);return attemptFromRows(this.db.prepare(query.text).all({$1:id}));
  }
  resultHistory(id:string) {
    const query=attemptHistoryQuery(id);return attemptHistoryFromRows(this.db.prepare(query.text).all({$1:id}));
  }
  incident(id:string) {
    const query=attemptIncidentQuery(id);return this.db.prepare(query.text).get({$1:id}) as unknown as IncidentRow|undefined;
  }
  reportIncident(userId:string,id:string,body:Record<string,unknown>) {
    const authorize=()=>{
      const row=this.row(id),process=this.recruitment.row(row.process_id);
      requireIncidentCandidate(userId,process);
      return {row,process};
    };
    authorize();
    const acknowledgement=this.recruitment.commandOnce(userId,body.idempotencyKey,{...body,id,operation:'ATTEMPT_INCIDENT_REPORT'},()=>{
      const {row,process}=authorize();
      const plan=incidentReportPlan(userId,row,process,this.incident(id),body,this.now());
      for(const query of plan.queries)this.db.prepare(query.text).run(Object.fromEntries(query.values.map((value,index)=>[`$${index+1}`,value])));
      this.recruitment.event(process,userId,'ATTEMPT_INCIDENT_REPORTED',plan.event);
      return {id};
    },authorize);
    return this.overview(userId,acknowledgement.id);
  }
  resolveIncident(userId:string,id:string,body:Record<string,unknown>) {
    const authorize=()=>{
      const row=this.row(id),process=this.recruitment.row(row.process_id);
      if(process.candidate_id===userId)throw new HttpError(404,'Nie znaleziono przeglądu.');
      const offer=this.recruitment.offers.assigned(userId,process.offer_id);
      this.member(userId,offer.organizationId,['OWNER','ADMIN','RECRUITER','HIRING_MANAGER']);
      return {row,process};
    };
    authorize();
    const acknowledgement=this.recruitment.commandOnce(userId,body.idempotencyKey,{...body,id,operation:'ATTEMPT_INCIDENT_RESOLVE'},()=>{
      const {row,process}=authorize(),incident=this.incident(id);
      const other=otherActiveAttemptQuery(process.id,id),anotherActive=Boolean(this.db.prepare(other.text).get({$1:process.id,$2:id})),decisionHours=incident&&body.resolution==='ISSUE_CONFIRMED'&&['INVITED','STARTED','EXPIRED','SCORED_PENDING_REVIEW'].includes(row.state)&&!TERMINAL.includes(process.status)&&!anotherActive&&['ASSESSMENT_REQUESTED','ASSESSMENT_COMPLETED'].includes(process.stage)?this.recruitment.offers.version(process.offer_id,process.offer_version).decisionHours:null;
      const plan=incidentResolutionPlan(userId,row,process,incident,anotherActive,decisionHours,body,this.now());
      for(const query of plan.queries)this.db.prepare(query.text).run(Object.fromEntries(query.values.map((value,index)=>[`$${index+1}`,value])));
      this.recruitment.event(process,userId,'ATTEMPT_INCIDENT_RESOLVED',plan.event);
      // Do not retain the candidate statement in another user's command replay cache after erasure.
      return {id};
    },authorize);
    return this.overview(userId,acknowledgement.id);
  }
  retry(userId:string,id:string,body:Record<string,unknown>) {
    const authorize=()=>{
      const row=this.row(id),process=this.recruitment.row(row.process_id);
      if(process.candidate_id===userId)throw new HttpError(404,'Nie znaleziono próby do ponowienia.');
      const offer=this.recruitment.offers.assigned(userId,process.offer_id);
      this.member(userId,offer.organizationId,['OWNER','ADMIN','RECRUITER']);
      return {row,process};
    };
    authorize();
    const acknowledgement=this.recruitment.commandOnce(userId,body.idempotencyKey,{...body,id,operation:'ATTEMPT_RETRY'},()=>{
      const {row,process}=authorize(),incident=this.incident(id);
      const rows=attemptRetryContextQueries(row).map(query=>this.db.prepare(query.text).all(Object.fromEntries(query.values.map((value,index)=>[`$${index+1}`,value])))),plan=assessmentRetryPlan(userId,row,process,this.definition(row.assessment_id,row.assessment_version),incident,Boolean(rows[1]?.length),Boolean(rows[2]?.length),Boolean(rows[3]?.length),body,this.now());
      for(const query of plan.queries)this.db.prepare(query.text).run(Object.fromEntries(query.values.map((value,index)=>[`$${index+1}`,value])));
      this.recruitment.event(process,userId,'ATTEMPT_RETRY_AUTHORIZED',plan.event);
      return plan.ack;
    },authorize);
    return this.overview(userId,acknowledgement.id);
  }
  overview(userId: string, id: string) {
    const row=this.row(id),process=this.recruitment.authorize(userId,row.process_id),content=JSON.parse(this.definition(row.assessment_id,row.assessment_version).content) as Definition,candidate=process.candidate_id===userId,role=candidate?null:this.member(userId,this.recruitment.offers.get(process.offer_id).organizationId).role;
    const context=attemptContextQueries(row).map(query=>this.db.prepare(query.text).all(Object.fromEntries(query.values.map((value,index)=>[`$${index+1}`,value]))));
    return attemptView(row,process,content,userId,this.now(),context,role);
  }
  attempts(userId: string, processId?: string) {
    if(processId)this.recruitment.authorize(userId,processId);
    const query=attemptListQuery(userId,processId),rows=this.db.prepare(query.text).all({$1:processId??userId}) as Array<{id:string}>;
    return rows.map(row=>this.overview(userId,row.id));
  }
  candidate(userId: string, row: AttemptRow) {
    const process = this.recruitment.row(row.process_id);
    requireAttemptCandidate(userId,process);
    return process;
  }
  start(userId: string, id: string) {
    this.candidate(userId,this.row(id));
    this.expire(id);
    return this.transaction(() => {
      const row = this.row(id); this.candidate(userId, row);
      const definition=JSON.parse(this.definition(row.assessment_id,row.assessment_version).content) as Definition;
      for(const query of attemptStartQueries(userId,row,definition,this.now()))this.db.prepare(query.text).run(Object.fromEntries(query.values.map((value,index)=>[`$${index+1}`,value])));
      return this.overview(userId,id);
    });
  }
  save(userId: string, id: string, body: Record<string, unknown>, submit: boolean) {
    this.candidate(userId,this.row(id));
    this.expire(id);
    return this.transaction(()=>{
    const row = this.row(id), process = this.candidate(userId, row);
    const definition=JSON.parse(this.definition(row.assessment_id,row.assessment_version).content) as Definition,decisionHours=submit?this.recruitment.offers.version(process.offer_id,process.offer_version).decisionHours:null;
    for(const query of attemptAnswerQueries(row,definition,body,submit,decisionHours,this.now()))this.db.prepare(query.text).run(Object.fromEntries(query.values.map((value,index)=>[`$${index+1}`,value])));
    if(submit)this.recruitment.event(process,userId,'ATTEMPT_SUBMITTED',{attemptId:id});
    return this.overview(userId, id);
    });
  }
  finalize(userId: string, id: string, body: Record<string, unknown>) {
    const initial=this.row(id);
    this.recruitment.offers.assigned(userId,this.recruitment.row(initial.process_id).offer_id);
    return this.recruitment.commandOnce(userId,body.idempotencyKey,{...body,id,operation:'ASSESSMENT_FINALIZE'},()=>{
      const row=this.row(id),process=this.recruitment.row(row.process_id);
      this.recruitment.offers.assigned(userId,process.offer_id);
      const definition=JSON.parse(this.definition(row.assessment_id,row.assessment_version).content) as Definition;
      for(const query of assessmentFinalizeQueries(userId,row,process,definition,this.incident(id),body,this.now()))this.db.prepare(query.text).run(Object.fromEntries(query.values.map((value,index)=>[`$${index+1}`,value])));
      this.recruitment.event(process,userId,'ASSESSMENT_FINALIZED',{attemptId:id});
      return this.overview(userId,id);
    },()=>{this.recruitment.offers.assigned(userId,this.recruitment.row(this.row(id).process_id).offer_id);});
  }
  invalidateResult(userId:string,id:string,body:Record<string,unknown>) {
    this.recruitment.offers.assigned(userId,this.recruitment.row(this.row(id).process_id).offer_id);
    return this.recruitment.commandOnce(userId,body.idempotencyKey,{...body,id,operation:'ASSESSMENT_INVALIDATE'},()=>{
      const row=this.row(id),process=this.recruitment.row(row.process_id);
      this.recruitment.offers.assigned(userId,process.offer_id);
      const plan=assessmentInvalidationPlan(row,process,this.resultHistory(id).at(-1),body,this.now());
      for(const query of plan.queries)this.db.prepare(query.text).run(Object.fromEntries(query.values.map((value,index)=>[`$${index+1}`,value])));
      this.recruitment.event(process,userId,'ASSESSMENT_RESULT_INVALIDATED',plan.event);
      return this.overview(userId,id);
    },()=>{this.recruitment.offers.assigned(userId,this.recruitment.row(this.row(id).process_id).offer_id);});
  }
  amendResult(userId:string,id:string,body:Record<string,unknown>) {
    const authorize=()=>this.recruitment.offers.assigned(userId,this.recruitment.row(this.row(id).process_id).offer_id);
    authorize();
    const ack=this.recruitment.commandOnce(userId,body.idempotencyKey,{...body,id,operation:'ASSESSMENT_AMEND'},()=>{
      authorize();const row=this.row(id),process=this.recruitment.row(row.process_id),previous=this.resultHistory(id).at(-1);
      const definition=JSON.parse(this.definition(row.assessment_id,row.assessment_version).content) as Definition,plan=assessmentAmendmentPlan(row,process,definition,previous,body,this.now());
      for(const query of plan.queries)this.db.prepare(query.text).run(Object.fromEntries(query.values.map((value,index)=>[`$${index+1}`,value])));
      this.recruitment.event(process,userId,'ASSESSMENT_RESULT_AMENDED',plan.event);
      return {id};
    },authorize);
    return this.overview(userId,ack.id);
  }

}
