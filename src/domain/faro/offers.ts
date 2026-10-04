import { LEVELS, type Claim, type Learning, type SkillLevel } from './skills.js';
export type OfferStatus = 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | 'PAUSED' | 'CLOSED' | 'ARCHIVED' | 'REMOVED';
export interface SalaryOption {
  contract: 'UOP' | 'CIVIL' | 'B2B'; basis: 'GROSS_EMPLOYMENT' | 'GROSS_CIVIL' | 'B2B_NET_INVOICE_EXCL_VAT';
  min: number; max: number; currency: 'PLN'; period: 'HOUR' | 'DAY' | 'MONTH' | 'YEAR';
  variable: string; hoursPerPeriod: number; ftePercent: number;
}
export interface Requirement { id: string; skillId: string; kind: 'MUST_HAVE' | 'NICE_TO_HAVE' | 'WILL_TEACH'; level: SkillLevel; rationale: string; }
export interface OfferData {
  role: string; responsibilities: string[]; requirements: Requirement[]; salary: SalaryOption[];
  location: string; workModel: 'ONSITE' | 'HYBRID' | 'REMOTE'; remoteDays: number;
  hours: string; shifts: string; nights: boolean | null; weekends: boolean | null; learningSupport: string;
  responseHours: number; stages: string[]; assessmentMinutes: number; interviewCount: number;
  decisionHours: number; closesAt: string; recruiterId: string;
}
export function materialDiff(before: OfferData, after: OfferData) {
  return (Object.keys(before) as Array<keyof OfferData>).filter(key => JSON.stringify(before[key]) !== JSON.stringify(after[key]))
    .map(field => ({ field, before: before[field], after: after[field] }));
}
export function explainOffer(offer: OfferData, claims: Claim[], learning: Learning[]) {
  return offer.requirements.map(req => {
    const claim = claims.find(c => c.skillId === req.skillId);
    const state = req.kind === 'WILL_TEACH' ? 'NOT_APPLICABLE' : !claim ? 'NOT_DEMONSTRATED'
      : LEVELS.indexOf(claim.level) >= LEVELS.indexOf(req.level) ? 'SATISFIED' : 'KNOWN_NOT_MET';
    return { requirementId: req.id, skillId: req.skillId, kind: req.kind, requiredLevel: req.level, declaredLevel: claim?.level ?? null, state,
      verification: claim?.verification ?? null, developing: learning.some(l => l.skillId === req.skillId && l.mode === 'SELF_DEVELOPING'), wantsToLearn: learning.some(l => l.skillId === req.skillId && l.mode === 'WANTS_TO_LEARN') };
  });
}
export function sortOffers<T extends { id: string; createdAt: string }>(offers: T[]): T[] {
  return [...offers].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
}
