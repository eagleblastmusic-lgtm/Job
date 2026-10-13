import type { OfferData } from './offers.js';

export interface PublishedPatternOffer { id: string; data: OfferData; publishedAt: string | null }
const label = (value: string) => value.normalize('NFKC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('pl');
/** Syntactic repetition only. Excludes identity/deadline, never infers equivalence of skills or employer intent. */
function termsKey(data: OfferData) {
  const sorted = (rows: unknown[]) => rows.map(row => JSON.stringify(row)).sort();
  return JSON.stringify([
    label(data.role), sorted(data.responsibilities.map(label)),
    sorted(data.requirements.map(r => [r.skillId, r.kind, r.level, label(r.rationale)])),
    sorted(data.salary.map(s => [s.contract, s.basis, s.min, s.max, s.currency, s.period, label(s.variable), s.hoursPerPeriod, s.ftePercent])),
    label(data.location), data.workModel, data.remoteDays, label(data.hours), label(data.shifts), data.nights, data.weekends,
    label(data.learningSupport), data.responseHours, data.stages.map(label), data.assessmentMinutes, data.interviewCount, data.decisionHours
  ]);
}
export function offerPatternFacts(rows: PublishedPatternOffer[]) {
  const unique = new Map(rows.map(row => [row.id, row])), groups = new Map<string, number>();
  for (const row of unique.values()) { const key = termsKey(row.data); groups.set(key, (groups.get(key) ?? 0) + 1); }
  const repeated = [...groups.values()].filter(count => count > 1);
  return { calculationVersion: 'repeated-native-terms-v1', cohortBy: 'OFFER_CREATED_AT', coverage: 'RETAINED_OFFERS_WITH_PUBLICATION_PROOF',
    sampleSize: unique.size, unknownPublicationDate: [...unique.values()].filter(row => row.publishedAt === null).length,
    repeatedTermsGroups: repeated.length, offersInRepeatedTermsGroups: repeated.reduce((sum, count) => sum + count, 0),
    additionalOfferRecordsWithSameTerms: repeated.reduce((sum, count) => sum + count - 1, 0),
    rule: 'SAME_NORMALIZED_TERMS_EXCLUDING_DEADLINE_RECRUITER_AND_REQUIREMENT_IDS', interpretation: 'MANUAL_CONTEXT_REQUIRED_NO_INTENT_OR_SANCTION' };
}
