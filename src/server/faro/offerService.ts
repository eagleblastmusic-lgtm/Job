import { offerCreateQueries,offerEditQueries,offerAssignedReadQuery,requireOfferAssignment,offerLifecycleAction,offerPublicationOrganizationQuery,requireOfferPublication,offerLifecycleQueries,offerNotificationRecipientsQuery,offerNotificationQueries } from './offerWriteModel.js';
import { offerReadQuery,offerFromRows,publishedReadQuery,publishedFromRows,intakeReadQueries,intakeFromRows,offerListReadQuery,offerConditionsReadQueries,offerConditionsFromRows,offerConditionsAllow,offerDetailReadQueries,requireOfferDetailAccess,offerDetailFromRows,type OfferRecord } from './offerReadModel.js';
export type { OfferRecord } from './offerReadModel.js';
import { randomUUID } from 'node:crypto';
import { FaroStore } from './base.js';
import { HttpError } from '../http.js';
import { object, text, array, choice, integer, date, nullableBoolean } from './validation.js';
import { LEVELS, skillById } from '../../domain/faro/skills.js';
import { sortOffers, type OfferData, type SalaryOption } from '../../domain/faro/offers.js';
import { ProfileService } from './profileService.js';
export function parseOffer(body: Record<string, unknown>): OfferData {
  const salary = array(body.salary, 8).map(raw => {
    const s = object(raw), contract = choice(s.contract, ['UOP','CIVIL','B2B'] as const);
    const basis = choice(s.basis, ['GROSS_EMPLOYMENT','GROSS_CIVIL','B2B_NET_INVOICE_EXCL_VAT'] as const);
    if (({ UOP: 'GROSS_EMPLOYMENT', CIVIL: 'GROSS_CIVIL', B2B: 'B2B_NET_INVOICE_EXCL_VAT' })[contract] !== basis) throw new HttpError(400, 'Podstawa kwoty nie odpowiada umowie.', 'SALARY_BASIS');
    const min = integer(s.min, 1), max = integer(s.max, 1); if (min > max) throw new HttpError(400, 'Minimum przekracza maksimum.', 'SALARY_RANGE');
    return { contract, basis, min, max, currency: choice(s.currency, ['PLN'] as const), period: choice(s.period, ['HOUR','DAY','MONTH','YEAR'] as const), variable: text(s.variable, 500, 0), hoursPerPeriod: integer(s.hoursPerPeriod, 1, 9000), ftePercent: integer(s.ftePercent, 1, 100) } satisfies SalaryOption;
  });
  if (!salary.length) throw new HttpError(400, 'Wynagrodzenie jest wymagane.', 'SALARY_REQUIRED');
  const requirements = array(body.requirements).map(raw => {
    const r = object(raw), skillId = text(r.skillId, 100);
    if (!skillById(skillId)) throw new HttpError(400, 'Nieznana kompetencja.');
    return { id: text(r.id, 100), skillId, kind: choice(r.kind, ['MUST_HAVE','NICE_TO_HAVE','WILL_TEACH'] as const), level: choice(r.level, LEVELS), rationale: text(r.rationale, 500) };
  });
  if (new Set(requirements.map(r => r.id)).size !== requirements.length) throw new HttpError(400, 'Identyfikatory wymagań muszą być unikalne.');
  const responsibilities = array(body.responsibilities, 30).map(v => text(v, 500)), stages = array(body.stages, 20).map(v => text(v, 150));
  if (!responsibilities.length || !stages.length) throw new HttpError(400, 'Podaj zadania i etapy.');
  return { role: text(body.role, 150), responsibilities, requirements, salary, location: text(body.location, 200), workModel: choice(body.workModel, ['ONSITE','HYBRID','REMOTE'] as const), remoteDays: integer(body.remoteDays, 0, 7), hours: text(body.hours, 200), shifts: text(body.shifts, 200), nights: nullableBoolean(body.nights), weekends: nullableBoolean(body.weekends), learningSupport: text(body.learningSupport, 1000, 0), responseHours: integer(body.responseHours, 1, 720), stages, assessmentMinutes: integer(body.assessmentMinutes, 0, 480), interviewCount: integer(body.interviewCount, 0, 20), decisionHours: integer(body.decisionHours, 1, 2160), closesAt: date(body.closesAt), recruiterId: text(body.recruiterId, 100) };
}
export class OfferService extends FaroStore {
  get(id: string): OfferRecord {
    const query=offerReadQuery(id);
    return offerFromRows(this.db.prepare(query.text).all({$1:id}));
  }

  version(id: string, version: number): OfferData {
    const row = this.db.prepare('SELECT content FROM faro_offer_versions WHERE offer_id=? AND version=?').get(id, version) as { content: string } | undefined;
    if (!row) throw new HttpError(404, 'Nie znaleziono wersji.'); return JSON.parse(row.content) as OfferData;
  }
  published(id:string):OfferRecord {
    const offer=this.get(id),query=publishedReadQuery(id);
    return publishedFromRows(offer,this.db.prepare(query.text).all({$1:id}),this.intake(offer));
  }

  assigned(userId: string, offerId: string) {
    const offer = this.get(offerId); this.member(userId, offer.organizationId);
    const query=offerAssignedReadQuery(userId,offerId);requireOfferAssignment(this.db.prepare(query.text).all({$1:userId,$2:offerId}));
    return offer;
  }
  intake(offer: OfferRecord) {
    const rows=intakeReadQueries(offer).map(query=>this.db.prepare(query.text).all(Object.fromEntries(query.values.map((value,index)=>[`$${index+1}`,value]))));
    return intakeFromRows(offer,rows,this.now());
  }

  private conditions(userId:string,offer:OfferRecord) {
    const rows=offerConditionsReadQueries(userId,offer.id).map(query=>this.db.prepare(query.text).all(Object.fromEntries(query.values.map((value,index)=>[`$${index+1}`,value]))));
    return offerConditionsFromRows(offer,rows,this.now());
  }
  list(userId: string, orgId?: string, includeUnknown=false) {
    if (orgId) this.member(userId, orgId);
    const query=offerListReadQuery(orgId),ids=this.db.prepare(query.text).all(Object.fromEntries(query.values.map((value,index)=>[`$${index+1}`,value]))) as Array<{id:string}>;
    return sortOffers(ids.map(row => this.get(row.id)).filter(offer => orgId || this.intake(offer)).map(offer=>orgId?offer:this.published(offer.id)).flatMap(offer=>{
      if(orgId)return [offer];const conditions=this.conditions(userId,offer);
      return offerConditionsAllow(conditions,includeUnknown)?[{...offer,hasUnknownConditions:conditions.some(c=>c.state==='UNKNOWN')}]:[];
    }));
  }
  detail(userId: string, id: string) {
    const current=this.get(id),intake=this.intake(current),rows=offerDetailReadQueries(userId,current).map(query=>this.db.prepare(query.text).all(Object.fromEntries(query.values.map((value,index)=>[`$${index+1}`,value]))));
    requireOfferDetailAccess(rows,intake);
    const offer=rows[0]?.length?current:this.published(id),profile=new ProfileService(this.database,this.clock).profile(userId);
    return offerDetailFromRows(offer,rows,intake,profile,rows[0]?.length?[]:this.conditions(userId,offer));
  }
  create(userId: string, orgId: string, raw: Record<string, unknown>) {
    const id=randomUUID();
    return this.transaction(()=>{
      this.member(userId,orgId,['OWNER','ADMIN','RECRUITER']);const data=parseOffer(raw);
      this.member(data.recruiterId,orgId,['OWNER','ADMIN','RECRUITER']);
      for(const query of offerCreateQueries(userId,orgId,id,data,this.now()))this.db.prepare(query.text).run(Object.fromEntries(query.values.map((value,index)=>[`$${index+1}`,value])));
      return this.get(id);
    });
  }

  edit(userId: string, id: string, body: Record<string, unknown>) {
    return this.transaction(()=>{
      const offer=this.assigned(userId,id);this.member(userId,offer.organizationId,['OWNER','ADMIN','RECRUITER']);
      const data=parseOffer(object(body.data));this.member(data.recruiterId,offer.organizationId,['OWNER','ADMIN','RECRUITER']);
      for(const query of offerEditQueries(userId,offer,body,data,this.now()))this.db.prepare(query.text).run(Object.fromEntries(query.values.map((value,index)=>[`$${index+1}`,value])));
      return this.get(id);
    });
  }

  lifecycle(userId: string, id: string, body: Record<string, unknown>) {
    return this.transaction(()=>{
      const offer=this.assigned(userId,id);this.member(userId,offer.organizationId,['OWNER','ADMIN','RECRUITER']);
      const asOf=this.now(),action=offerLifecycleAction(offer,body),publish=action==='PUBLISH'||action==='RECONFIRM';
      if(publish){const query=offerPublicationOrganizationQuery(offer.organizationId);requireOfferPublication(offer,body,this.db.prepare(query.text).get({$1:offer.organizationId}),asOf);this.member(offer.data.recruiterId,offer.organizationId,['OWNER','ADMIN','RECRUITER']);}
      for(const query of offerLifecycleQueries(userId,offer,action,asOf))this.db.prepare(query.text).run(Object.fromEntries(query.values.map((value,index)=>[`$${index+1}`,value])));
      if(publish||action==='CLOSE')this.notifyChange(id,offer.version,action);
      return this.get(id);
    });
  }
  notifyChange(id:string,version:number,action:string) {
    const query=offerNotificationRecipientsQuery(id),recipients=this.db.prepare(query.text).all({$1:id});
    for(const command of offerNotificationQueries(id,version,action,recipients,this.now()))this.db.prepare(command.text).run(Object.fromEntries(command.values.map((value,index)=>[`$${index+1}`,value as string])));
  }
}
