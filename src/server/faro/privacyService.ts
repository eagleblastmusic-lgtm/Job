import { ownExportQueries,ownExportFromRows,deletableOwnershipQuery,requireDeletableOwnership,transferOwnerQueries } from './privacyReadModel.js';
import { erasureAccountQueries,organizationErasureReadQueries,erasureProcessQuery,organizationErasureQueries,recruiterErasureReadQuery,recruiterErasureQueries,personalErasureQueries } from './privacyErasureModel.js';
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
    const read=(query:{text:string;values:readonly (string|number|null)[]})=>this.db.prepare(query.text).all(Object.fromEntries(query.values.map((value,index)=>[`$${index+1}`,value])));
    const execute=(queries:Array<{text:string;values:readonly (string|number|null)[]}>)=>{for(const query of queries)this.db.prepare(query.text).run(Object.fromEntries(query.values.map((value,index)=>[`$${index+1}`,value])));};
    const account=erasureAccountQueries(userId).map(read),email=account[0]?.[0]?.email;
    if(typeof email!=='string')throw new HttpError(404,'Nie znaleziono konta.');
    const recruitment=new RecruitmentService(this.database,this.clock);
    for(const org of account[1]??[]){
      const orgId=org.organization_id as string,rows=organizationErasureReadQueries(orgId).map(read);
      for(const process of rows[0]??[]){const row=recruitment.row(process.id as string);execute([erasureProcessQuery(row.id,isolatedRecovery)]);recruitment.cancelObligations(row.id);recruitment.event(row,userId,'CANCEL',{reason:{code:'RECRUITMENT_CANCELLED'},source:'ORGANIZATION_CLOSED'});}
      for(const offer of rows[1]??[])recruitment.offers.notifyChange(offer.id as string,offer.current_version as number,'CLOSE');
      execute(organizationErasureQueries(orgId));
    }
    for(const meeting of read(recruiterErasureReadQuery(userId))){execute(recruiterErasureQueries(meeting.id as string,meeting.process_id as string));recruitment.event(recruitment.row(meeting.process_id as string),userId,'INTERVIEW_CANCEL',{interviewId:meeting.id,reason:'RECRUITER_UNAVAILABLE'});}
    execute(personalErasureQueries(userId,email,this.now()));
  }

  transferOwner(userId: string, orgId: string, successorId: string) {
    return this.transaction(() => {
      this.member(userId,orgId,['OWNER']); this.member(successorId,orgId);
      for(const query of transferOwnerQueries(userId,orgId,successorId,this.now()))this.db.prepare(query.text).run(Object.fromEntries(query.values.map((value,index)=>[`$${index+1}`,value])));
      return { ok:true };
    });
  }
}
