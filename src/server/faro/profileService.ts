import { organizationCreatePlan,organizationVerificationReadQueries,organizationVerifyQueries } from './organizationWriteModel.js';
import { organizationsReadQuery } from './organizationReadModel.js';
import { parseProfileSave,profileSaveQueries,profileAvailability,parseProfileConstraints,profileConstraintsQuery,profilePractice,profileClaimQueries,profileRevokeQuery,profileLearningQuery,profileActivityQueries,profileProposalQuery,profileProposalDecisionQueries } from './profileWriteModel.js';
import { profileReadQueries,profileFromRows } from './profileReadModel.js';
import { randomUUID, createHash } from 'node:crypto';
import { FaroStore } from './base.js';
import { text, choice } from './validation.js';
import { DEFAULT_CONSTRAINTS,type CandidateConstraints } from '../../domain/faro/offers.js';
import { HttpError } from '../http.js';
import { employerProjection, type Practice, type Availability } from '../../domain/faro/skills.js';

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
    const query=profileRevokeQuery(userId,id,this.now());
    if(!this.db.prepare(query.text).get({$1:query.values[0]!,$2:query.values[1]!,$3:query.values[2]!}))throw new HttpError(404,'Nie znaleziono deklaracji.');
  }
  learn(userId:string,body:Record<string,unknown>) {this.runQueries([profileLearningQuery(userId,body)]);return this.profile(userId);}
  activity(userId:string,body:Record<string,unknown>) {const queries=profileActivityQueries(userId,body,this.now());this.transaction(()=>this.runQueries(queries));return this.profile(userId);}
  decideProposal(userId:string,id:string,body:Record<string,unknown>) {
    this.transaction(()=>{
      const query=profileProposalQuery(userId,id),row=this.db.prepare(query.text).get({$1:id,$2:userId});
      this.runQueries(profileProposalDecisionQueries(userId,id,body,row,this.now()));
    });return this.profile(userId);
  }
  projection(userId: string, processId = 'preview') {
    const p = this.profile(userId);
    if (!p.firstName) throw new HttpError(400, 'Najpierw zapisz swoje imię w profilu.', 'PROFILE_REQUIRED');
    return employerProjection(processId, p.firstName, p.claims, p.learning, p.availability);
  }
  previewConfirmation(userId: string) {
    const projection = this.projection(userId);
    const confirmationToken = createHash('sha256').update(JSON.stringify({ userId, projection })).digest('hex');
    return { projection, confirmationToken };
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

  invite(userId: string, orgId: string, body: Record<string, unknown>) {
    this.member(userId, orgId, ['OWNER','ADMIN']);
    const token = randomUUID() + randomUUID(), hash = createHash('sha256').update(token).digest('hex');
    const email = text(body.email, 254).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError(400, 'Nieprawidłowy e-mail.');
    this.db.prepare('INSERT INTO faro_invites(token_hash,organization_id,role,email,expires_at,created_by) VALUES(?,?,?,?,?,?)').run(hash, orgId, choice(body.role, ['ADMIN','RECRUITER','HIRING_MANAGER'] as const), email, new Date(this.clock().getTime() + 72 * 3600000).toISOString(), userId);
    return { token, expiresInHours: 72 };
  }
  acceptInvite(userId: string, email: string, token: string) {
    return this.transaction(() => {
      const hash = createHash('sha256').update(token).digest('hex');
      const row = this.db.prepare('SELECT organization_id,role FROM faro_invites WHERE token_hash=? AND email=? AND expires_at>? AND accepted_at IS NULL').get(hash, email, this.now()) as { organization_id: string; role: string } | undefined;
      if (!row) throw new HttpError(404, 'Zaproszenie jest niedostępne.');
      const existing = this.db.prepare('SELECT role FROM faro_members WHERE organization_id=? AND user_id=?').get(row.organization_id, userId) as { role: string } | undefined;
      if (existing?.role === 'OWNER') throw new HttpError(409, 'Właściciel ma już dostęp.');
      this.db.prepare('INSERT INTO faro_members(organization_id,user_id,role) VALUES(?,?,?) ON CONFLICT(organization_id,user_id) DO UPDATE SET role=excluded.role,active=1').run(row.organization_id, userId, row.role);
      this.db.prepare('UPDATE faro_invites SET accepted_at=? WHERE token_hash=?').run(this.now(), hash);
      this.audit(userId, 'MEMBERSHIP_ACCEPTED', row.organization_id);
      return { organizationId: row.organization_id };
    });
  }
  revokeMember(userId: string, orgId: string, memberId: string) {
    this.member(userId, orgId, ['OWNER','ADMIN']);
    const member = this.member(memberId, orgId);
    if (member.role === 'OWNER') throw new HttpError(409, 'Najpierw przenieś własność organizacji.');
    this.db.prepare('UPDATE faro_members SET active=0 WHERE organization_id=? AND user_id=?').run(orgId, memberId);
    this.audit(userId, 'MEMBERSHIP_REVOKED', orgId);
  }
}
