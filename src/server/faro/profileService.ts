import { organizationCreatePlan,organizationVerificationReadQueries,organizationVerifyQueries,organizationInvitePlan,organizationInviteReadQuery,organizationInviteFromRows,organizationExistingMemberQuery,organizationInviteAcceptPlan,organizationRevokeQueries } from './organizationWriteModel.js';
import { organizationsReadQuery } from './organizationReadModel.js';
import { parseProfileSave,profileSaveQueries,profileAvailability,parseProfileConstraints,profileConstraintsQuery,profilePractice,profileClaimQueries,profileRevokeQuery,profileRevokeAuditQuery,profileLearningQuery,profileLearningEntryQuery,profileLearningRemovalQueries,profileActivityQueries,profileActivityRemovalQueries,profileProposalQuery,profileProposalDecisionQueries } from './profileWriteModel.js';
import { profileReadQueries,profileFromRows,profileProjection,profilePreview } from './profileReadModel.js';
import { FaroStore } from './base.js';
import { DEFAULT_CONSTRAINTS,type CandidateConstraints } from '../../domain/faro/offers.js';
import { HttpError } from '../http.js';
import { type Practice, type Availability } from '../../domain/faro/skills.js';

export class ProfileService extends FaroStore {
  constraints(userId:string):CandidateConstraints {
    const row=this.db.prepare('SELECT preferences FROM faro_profiles WHERE user_id=?').get(userId) as {preferences:string}|undefined;
    const preferences=row?JSON.parse(row.preferences) as Partial<CandidateConstraints>:{};
    return {...DEFAULT_CONSTRAINTS,...preferences} as CandidateConstraints;
  }
  saveConstraints(userId:string,body:Record<string,unknown>) {
    const parsed=parseProfileConstraints(body);
    return this.transaction(()=>{
      const query=profileConstraintsQuery(userId,body,this.profile(userId),parsed,this.now());
      this.db.prepare(query.text).run({$1:query.values[0]!,$2:query.values[1]!,$3:query.values[2]!});
      return this.profile(userId);
    });
  }

  profile(userId: string) {
    const rows=profileReadQueries(userId).map(query=>this.db.prepare(query.text).all(Object.fromEntries(query.values.map((value,index)=>[`$${index+1}`,value]))));
    return profileFromRows(rows,this.now());
  }

  save(userId: string, body: Record<string, unknown>) {
    const asOf=this.now(),parsed=parseProfileSave(body,asOf);
    return this.transaction(()=>{
      const current=this.profile(userId);
      for(const query of profileSaveQueries(userId,body,current,parsed,asOf))this.db.prepare(query.text).run(Object.fromEntries(query.values.map((value,index)=>[`$${index+1}`,value as string|number|null])));
      return this.profile(userId);
    });
  }
  availability(input:unknown):Availability {return profileAvailability(input,this.now());}

  private runQueries(queries:Array<{text:string;values:readonly unknown[]}>) {
    for(const query of queries)this.db.prepare(query.text).run(Object.fromEntries(query.values.map((value,index)=>[`$${index+1}`,value as string|number|null])));
  }
  practice(value:unknown):Practice {return profilePractice(value);}
  claim(userId:string,body:Record<string,unknown>) {this.runQueries(profileClaimQueries(userId,body,this.now()));}
  addClaim(userId:string,body:Record<string,unknown>) {this.transaction(()=>this.claim(userId,body));return this.profile(userId);}
  revoke(userId:string,id:string) {
    const asOf=this.now(),query=profileRevokeQuery(userId,id,asOf);
    this.transaction(()=>{
      if(!this.db.prepare(query.text).get({$1:query.values[0]!,$2:query.values[1]!,$3:query.values[2]!}))throw new HttpError(404,'Nie znaleziono deklaracji.');
      this.runQueries([profileRevokeAuditQuery(userId,id,asOf)]);
    });
  }
  learn(userId:string,body:Record<string,unknown>) {this.runQueries([profileLearningQuery(userId,body)]);return this.profile(userId);}
  removeLearning(userId:string,body:Record<string,unknown>) {
    const query=profileLearningEntryQuery(userId,body);
    return this.transaction(()=>{
      const row=this.db.prepare(query.text).get({$1:query.values[0]!,$2:query.values[1]!,$3:query.values[2]!});
      this.runQueries(profileLearningRemovalQueries(userId,body,row,this.now()));return this.profile(userId);
    });
  }
  activity(userId:string,body:Record<string,unknown>) {const queries=profileActivityQueries(userId,body,this.now());this.transaction(()=>this.runQueries(queries));return this.profile(userId);}
  removeActivity(userId:string,id:string,body:Record<string,unknown>) {
    const plan=profileActivityRemovalQueries(userId,id,body,this.now());
    return this.transaction(()=>{
      if(!this.db.prepare(plan.remove.text).get({$1:id,$2:userId}))throw new HttpError(404,'Nie znaleziono opisu.');
      this.runQueries([plan.audit]);return this.profile(userId);
    });
  }
  decideProposal(userId:string,id:string,body:Record<string,unknown>) {
    this.transaction(()=>{
      const query=profileProposalQuery(userId,id),row=this.db.prepare(query.text).get({$1:id,$2:userId});
      this.runQueries(profileProposalDecisionQueries(userId,id,body,row,this.now()));
    });return this.profile(userId);
  }
  projection(userId: string, processId = 'preview') {
    return profileProjection(this.profile(userId),processId);
  }
  previewConfirmation(userId: string) {
    return profilePreview(userId,this.profile(userId));
  }
  organizations(userId: string) {
    const query=organizationsReadQuery(userId);
    return this.db.prepare(query.text).all({$1:userId});
  }

  organization(userId: string, body: Record<string, unknown>) {
    const plan=organizationCreatePlan(userId,body,this.now());
    this.transaction(()=>this.runQueries(plan.queries));return plan.record;
  }
  verify(adminId:string,orgId:string,note:string) {
    return this.transaction(()=>{
      const rows=organizationVerificationReadQueries(adminId,orgId).map(query=>this.db.prepare(query.text).all(Object.fromEntries(query.values.map((value,index)=>[`$${index+1}`,value]))));
      this.runQueries(organizationVerifyQueries(adminId,orgId,note,rows,this.now()));
    });
  }

  invite(userId:string,orgId:string,body:Record<string,unknown>) {
    return this.transaction(()=>{
      this.member(userId,orgId,['OWNER','ADMIN']);const plan=organizationInvitePlan(userId,orgId,body,this.now());
      this.runQueries([plan.query]);return plan.record;
    });
  }
  acceptInvite(userId:string,email:string,token:string) {
    return this.transaction(()=>{
      const asOf=this.now(),query=organizationInviteReadQuery(email,token,asOf),row=organizationInviteFromRows(this.db.prepare(query.text).all({$1:query.values[0]!,$2:email,$3:asOf}));
      const existingQuery=organizationExistingMemberQuery(userId,row.organization_id),existing=this.db.prepare(existingQuery.text).get({$1:row.organization_id,$2:userId});
      const plan=organizationInviteAcceptPlan(userId,query.values[0]!,row,existing,asOf);this.runQueries(plan.queries);return plan.record;
    });
  }
  revokeMember(userId:string,orgId:string,memberId:string) {
    return this.transaction(()=>{
      this.member(userId,orgId,['OWNER','ADMIN']);const member=this.member(memberId,orgId);
      this.runQueries(organizationRevokeQueries(userId,orgId,memberId,member,this.now()));
    });
  }
}
