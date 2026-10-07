import { interviewOutcomePlan,interviewModeratorQuery,interviewCaseNotifications } from './interviewOutcomeModel.js';
import { processRecruiterReadQuery } from './interestWriteModel.js';
import { interviewChangeInput,interviewSchedulePlan } from './interviewScheduleModel.js';
import { interviewProposalContextQueries,interviewProposalInput,interviewProposalPlan } from './interviewProposalModel.js';
import { interviewReadQuery,interviewFromRows,interviewListQuery,interviewView,interviewSlotQuery,requireInterviewSlot,interviewCalendar,type InterviewRow } from './interviewReadModel.js';
import { FaroStore } from './base.js';
import { RecruitmentService } from './recruitmentService.js';
import { AppStore } from '../store.js';
import { HttpError } from '../http.js';

export class InterviewService extends FaroStore {
  get recruitment() { return new RecruitmentService(this.database,this.clock); }
  row(id:string) {
    const query=interviewReadQuery(id);return interviewFromRows(this.db.prepare(query.text).all({$1:id}));
  }
  list(userId:string,processId:string) {
    this.recruitment.authorize(userId,processId);const query=interviewListQuery(processId);
    return (this.db.prepare(query.text).all({$1:processId}) as Array<{id:string}>).map(r=>this.view(userId,r.id));
  }
  view(userId:string,id:string) {const row=this.row(id);this.recruitment.authorize(userId,row.process_id);return interviewView(row);}
  available(candidateId:string,recruiterId:string,starts:string,ends:string) {
    const query=interviewSlotQuery(candidateId,recruiterId,starts,ends);requireInterviewSlot(this.db.prepare(query.text).all(Object.fromEntries(query.values.map((value,index)=>[`$${index+1}`,value]))));
  }
  calendar(userId:string,id:string) {return interviewCalendar(this.view(userId,id),this.now());}

  propose(userId:string,processId:string,body:Record<string,unknown>) {
    const authorize=()=>{const p=this.recruitment.authorize(userId,processId);if(p.candidate_id===userId)throw new HttpError(403,'Propozycję terminu rozpoczyna rekruter.');this.member(userId,this.recruitment.offers.get(p.offer_id).organizationId,['OWNER','ADMIN','RECRUITER']);};authorize();
    return this.recruitment.commandOnce(userId,body.idempotencyKey,{...body,processId,operation:'INTERVIEW_PROPOSE'},()=>{
      const p=this.recruitment.authorize(userId,processId),rows=interviewProposalContextQueries(processId).map(query=>this.db.prepare(query.text).all({$1:processId})),input=interviewProposalInput(p,Boolean(rows[0]?.length),rows[1]?.[0]?.n as number,this.recruitment.offers.version(p.offer_id,p.offer_version).interviewCount,body,this.now());this.available(p.candidate_id,userId,input.starts,input.ends);const plan=interviewProposalPlan(userId,p,input,this.now());
      for(const query of plan.queries)this.db.prepare(query.text).run(Object.fromEntries(query.values.map((value,index)=>[`$${index+1}`,value])));
      this.recruitment.event(p,userId,'INTERVIEW_PROPOSED',plan.event);return this.view(userId,plan.id);
    },authorize);
  }

  tick() {
    this.transaction(()=>{
      const pending=this.db.prepare("SELECT * FROM faro_interviews WHERE state IN ('PROPOSED','CONFIRMED')").all() as unknown as InterviewRow[];
      for(const row of pending) {
        const p=this.recruitment.row(row.process_id);
        if(p.status!=='ACTIVE')continue;
        if(row.state==='PROPOSED'&&row.confirm_by<=this.now()) {
          this.db.prepare("UPDATE faro_interviews SET state='CANCELLED',revision=revision+1 WHERE id=?").run(row.id);
          const due=new Date(this.clock().getTime()+this.recruitment.offers.version(p.offer_id,p.offer_version).decisionHours*3600000).toISOString();
          this.db.prepare("UPDATE faro_interests SET stage='ACCEPTED_TO_NEXT_STAGE',stage_due_at=?,next_action='Propozycja terminu wygasła. Uzgodnijcie nowy termin.',revision=revision+1 WHERE id=?").run(due,p.id);
          this.recruitment.event(p,null,'INTERVIEW_PROPOSAL_EXPIRED',{interviewId:row.id});
          continue;
        }
        const deadline=row.state==='PROPOSED'?row.confirm_by:row.starts_at;
        const outcome=row.state==='CONFIRMED'&&row.ends_at<=this.now();
        if(!outcome&&(deadline<=this.now()||Date.parse(deadline)>this.clock().getTime()+24*3600000))continue;
        const recipients=row.state==='PROPOSED'?[p.candidate_id]:[p.candidate_id,...(row.recruiter_id?[row.recruiter_id]:[])];
        for(const recipient of recipients) {
          if(recipient!==p.candidate_id) {
            try { this.recruitment.offers.assigned(recipient,p.offer_id); } catch { continue; }
          }
          this.recruitment.enqueue(recipient,'process',p.id,outcome?'Potwierdź odbycie rozmowy lub zgłoś rozbieżność.':row.state==='PROPOSED'?'Zbliża się termin potwierdzenia propozycji rozmowy.':'Zbliża się potwierdzona rozmowa.',`interview:${row.id}:${outcome?'outcome':row.state}:${deadline}`);
        }
      }
    });
  }
  change(userId:string,id:string,body:Record<string,unknown>) {
    const authorize=()=>{const p=this.recruitment.authorize(userId,this.row(id).process_id);if(p.candidate_id!==userId)this.member(userId,this.recruitment.offers.get(p.offer_id).organizationId,['OWNER','ADMIN','RECRUITER']);};authorize();
    return this.recruitment.commandOnce(userId,body.idempotencyKey,{...body,id,operation:'INTERVIEW_CHANGE'},()=>{
      const row=this.row(id),p=this.recruitment.authorize(userId,row.process_id),candidate=p.candidate_id===userId;
      if(!candidate)this.member(userId,this.recruitment.offers.get(p.offer_id).organizationId,['OWNER','ADMIN','RECRUITER']);
      const command=interviewChangeInput(row,p,body);
      if(command==='CONFIRM'||command==='CANCEL') {
        const plan=interviewSchedulePlan(userId,row,p,body,this.recruitment.offers.version(p.offer_id,p.offer_version).decisionHours,this.now());
        if(command==='CONFIRM'){this.recruitment.offers.assigned(row.recruiter_id!,p.offer_id);this.available(p.candidate_id,row.recruiter_id!,row.starts_at,row.ends_at);}
        for(const query of plan.queries)this.db.prepare(query.text).run(Object.fromEntries(query.values.map((value,index)=>[`$${index+1}`,value])));
        this.recruitment.event(p,userId,`INTERVIEW_${command}`,plan.event);return this.view(userId,id);
      }
      const plan=interviewOutcomePlan(userId,row,p,body,this.recruitment.offers.get(p.offer_id).organizationId,this.recruitment.offers.version(p.offer_id,p.offer_version).decisionHours,this.now());
      for(const query of plan.queries)this.db.prepare(query.text).run(Object.fromEntries(query.values.map((value,index)=>[`$${index+1}`,value])));
      if(plan.caseId) {
        const moderators=this.db.prepare(interviewModeratorQuery().text).all(),assigned=this.db.prepare(processRecruiterReadQuery(p.offer_id).text).all({$1:p.offer_id});
        for(const query of interviewCaseNotifications(plan.caseId,p,moderators,assigned,this.now()))this.db.prepare(query.text).run(Object.fromEntries(query.values.map((value,index)=>[`$${index+1}`,value])));
      }
      this.recruitment.event(p,userId,`INTERVIEW_${command}`,plan.event);
      if(plan.state==='COMPLETED')new AppStore(this.database).faroMutualStageCompleted(id);
      return this.view(userId,id);
    },authorize);
  }
}
