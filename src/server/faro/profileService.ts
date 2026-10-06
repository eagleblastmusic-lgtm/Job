import { parseProfileSave,profileSaveQueries,profileAvailability } from './profileWriteModel.js';
import { profileReadQueries,profileFromRows } from './profileReadModel.js';
import { randomUUID, createHash } from 'node:crypto';
import { FaroStore } from './base.js';
import { object, text, choice, integer, array } from './validation.js';
import { DEFAULT_CONSTRAINTS,type CandidateConstraints, type SalaryMinimum } from '../../domain/faro/offers.js';
import { HttpError } from '../http.js';
import { LEVELS, SOURCES, skillById, suggestSkills, employerProjection, type Practice, type Availability } from '../../domain/faro/skills.js';

export class ProfileService extends FaroStore {
  constraints(userId:string):CandidateConstraints {
    const row=this.db.prepare('SELECT preferences FROM faro_profiles WHERE user_id=?').get(userId) as {preferences:string}|undefined;
    const preferences=row?JSON.parse(row.preferences) as Partial<CandidateConstraints>:{};
    return {...DEFAULT_CONSTRAINTS,...preferences} as CandidateConstraints;
  }
  saveConstraints(userId:string,body:Record<string,unknown>) {
    const raw=object(body.constraints);
    for(const key of ['active','noNights','noWeekends'])if(typeof raw[key]!=='boolean')throw new HttpError(400,'Wybierz jawnie granice warunków.');
    const constraints:CandidateConstraints={active:raw.active as boolean,noNights:raw.noNights as boolean,noWeekends:raw.noWeekends as boolean,
      workModels:[...new Set(array(raw.workModels,3).map(v=>choice(v,['ONSITE','HYBRID','REMOTE'] as const)))],
      contracts:[...new Set(array(raw.contracts,3).map(v=>choice(v,['UOP','CIVIL','B2B'] as const)))]};
    return this.transaction(()=>{
      const current=this.profile(userId);
      if(!current.version)throw new HttpError(409,'Najpierw zapisz swój profil.','PROFILE_REQUIRED');
      if(integer(body.expectedVersion,1)!==current.version)throw new HttpError(409,'Odśwież profil.','VERSION_CONFLICT');
      // Older callers omitting this field do not silently erase an existing private minimum.
      const salaryRaw=raw.salaryMinimum===undefined?this.constraints(userId).salaryMinimum:raw.salaryMinimum;
      const commuteRaw=raw.maxCommuteMinutes===undefined?this.constraints(userId).maxCommuteMinutes:raw.maxCommuteMinutes;
      constraints.maxCommuteMinutes=commuteRaw===null||commuteRaw===undefined?null:integer(commuteRaw,0,1440);
      if(salaryRaw===null||salaryRaw===undefined)constraints.salaryMinimum=null;
      else {
        const s=object(salaryRaw);
        constraints.salaryMinimum={amount:integer(s.amount,1),currency:choice(s.currency,['PLN'] as const),
          basis:choice(s.basis,['GROSS_EMPLOYMENT','GROSS_CIVIL','B2B_NET_INVOICE_EXCL_VAT'] as const),
          period:choice(s.period,['HOUR','DAY','MONTH','YEAR'] as const),hoursPerPeriod:integer(s.hoursPerPeriod,1,9000),ftePercent:integer(s.ftePercent,1,100)} satisfies SalaryMinimum;
      }
      this.db.prepare('UPDATE faro_profiles SET preferences=?,version=version+1,updated_at=? WHERE user_id=?').run(JSON.stringify(constraints),this.now(),userId);
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

  practice(value: unknown): Practice {
    const p = object(value);
    return { quantity: p.quantity === null ? null : integer(p.quantity, 0, 10000), unit: choice(p.unit, ['MONTHS', 'PROJECTS', 'TASKS'] as const) };
  }
  claim(userId: string, body: Record<string, unknown>) {
    const skillId = text(body.skillId, 100);
    if (!skillById(skillId)) throw new HttpError(400, 'Wybierz znaną kompetencję.');
    const level = choice(body.level, LEVELS), source = choice(body.source, SOURCES), practice = this.practice(body.practice);
    if (body.confirmed !== true) throw new HttpError(400, 'Potwierdź własną deklarację.', 'CONFIRMATION_REQUIRED');
    this.db.prepare('UPDATE faro_claims SET revoked_at=? WHERE user_id=? AND skill_id=? AND revoked_at IS NULL').run(this.now(), userId, skillId);
    const previous = this.db.prepare('SELECT COALESCE(MAX(version),0) v FROM faro_claims WHERE user_id=? AND skill_id=?').get(userId, skillId) as { v: number };
    this.db.prepare('INSERT INTO faro_claims(id,user_id,skill_id,level,source,practice,version,confirmed_at) VALUES(?,?,?,?,?,?,?,?)').run(randomUUID(), userId, skillId, level, source, JSON.stringify(practice), previous.v + 1, this.now());
    this.audit(userId, 'SKILL_DECLARED', skillId);
  }
  addClaim(userId: string, body: Record<string, unknown>) { this.transaction(() => this.claim(userId, body)); return this.profile(userId); }
  revoke(userId: string, id: string) {
    if (!this.db.prepare('UPDATE faro_claims SET revoked_at=? WHERE id=? AND user_id=? AND revoked_at IS NULL').run(this.now(), id, userId).changes) throw new HttpError(404, 'Nie znaleziono deklaracji.');
  }
  learn(userId: string, body: Record<string, unknown>) {
    const skillId = text(body.skillId, 100); if (!skillById(skillId)) throw new HttpError(400, 'Nieznana kompetencja.');
    this.db.prepare('INSERT INTO faro_learning(user_id,skill_id,mode,practice) VALUES(?,?,?,?) ON CONFLICT(user_id,skill_id,mode) DO UPDATE SET practice=excluded.practice').run(userId, skillId, choice(body.mode, ['SELF_DEVELOPING','WANTS_TO_LEARN'] as const), JSON.stringify(this.practice(body.practice)));
    return this.profile(userId);
  }
  activity(userId: string, body: Record<string, unknown>) {
    const description = text(body.description, 3000), source = choice(body.source, SOURCES), id = randomUUID();
    this.transaction(() => {
      this.db.prepare('INSERT INTO faro_activities(id,user_id,description,source,created_at) VALUES(?,?,?,?,?)').run(id, userId, description, source, this.now());
      for (const p of suggestSkills(description)) this.db.prepare('INSERT INTO faro_proposals(id,user_id,activity_id,skill_id,rationale,model_version,created_at) VALUES(?,?,?,?,?,?,?)').run(randomUUID(), userId, id, p.skillId, p.rationale, p.modelVersion, this.now());
      this.audit(userId, 'ACTIVITY_RECORDED', id);
    });
    return this.profile(userId);
  }
  decideProposal(userId: string, id: string, body: Record<string, unknown>) {
    this.transaction(() => {
      const p = this.db.prepare('SELECT skill_id,status FROM faro_proposals WHERE id=? AND user_id=?').get(id, userId) as { skill_id: string; status: string } | undefined;
      if (!p) throw new HttpError(404, 'Nie znaleziono propozycji.');
      if (p.status !== 'PENDING') throw new HttpError(409, 'Propozycja została już rozpatrzona.');
      const status = choice(body.status, ['ACCEPTED','REJECTED'] as const);
      if (status === 'ACCEPTED') this.claim(userId, { ...body, skillId: p.skill_id });
      this.db.prepare('UPDATE faro_proposals SET status=?,decided_at=? WHERE id=?').run(status, this.now(), id);
    }); return this.profile(userId);
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
    return this.db.prepare('SELECT o.id,o.name,o.verification,o.verified_at,m.role FROM faro_organizations o JOIN faro_members m ON m.organization_id=o.id WHERE m.user_id=? AND m.active=1 ORDER BY o.created_at').all(userId);
  }
  organization(userId: string, body: Record<string, unknown>) {
    const id = randomUUID(), name = text(body.name, 150);
    this.transaction(() => {
      this.db.prepare('INSERT INTO faro_organizations(id,name,created_at) VALUES(?,?,?)').run(id, name, this.now());
      this.db.prepare("INSERT INTO faro_members(organization_id,user_id,role) VALUES(?,?,'OWNER')").run(id, userId);
      this.audit(userId, 'ORGANIZATION_CREATED', id);
    }); return { id, name, verification: 'PENDING' };
  }
  verify(adminId: string, orgId: string, note: string) {
    return this.transaction(()=>{
      const admin = this.db.prepare("SELECT id FROM users WHERE id=? AND role='ADMIN'").get(adminId);
      if (!admin) throw new HttpError(403, 'Wymagany moderator.');
      const org=this.db.prepare('SELECT verification FROM faro_organizations WHERE id=?').get(orgId) as {verification:string}|undefined;
      if(!org)throw new HttpError(404,'Nie znaleziono organizacji.');
      if(this.affiliated(adminId,orgId))throw new HttpError(409,'Organizację musi zweryfikować moderator bez powiązania z nią.','VERIFICATION_CONFLICT');
      if(org.verification==='RESTRICTED')throw new HttpError(409,'Ograniczenie wymaga odrębnego rozstrzygnięcia moderacyjnego.','RESTRICTION_REVIEW_REQUIRED');
      this.db.prepare("UPDATE faro_organizations SET verification='VERIFIED',verified_at=?,verification_note=? WHERE id=?").run(this.now(), text(note, 1000, 10), orgId);
      this.audit(adminId, 'ORGANIZATION_VERIFIED', orgId);
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
