import { ONTOLOGY, normalizeText } from '../ontology.js';

export const LEVELS = ['BASICS', 'INDEPENDENT', 'FLUENT'] as const;
export type SkillLevel = typeof LEVELS[number];
export const SOURCES = ['WORK', 'SELF_LEARNING', 'HOBBY', 'SCHOOL', 'VOLUNTEERING'] as const;
export type SkillSource = typeof SOURCES[number];
export interface Practice { quantity: number | null; unit: 'MONTHS' | 'PROJECTS' | 'TASKS'; }
export interface Claim {
  id: string; skillId: string; level: SkillLevel; source: SkillSource; practice: Practice;
  verification: 'DECLARED' | 'REVIEWED_EVIDENCE' | 'FARO_ASSESSMENT'; version: number; confirmedAt: string;
}
export interface Learning { skillId: string; mode: 'SELF_DEVELOPING' | 'WANTS_TO_LEARN'; practice: Practice; }
export interface Availability { kind: 'UNKNOWN' | 'IMMEDIATE' | 'AFTER_PERIOD' | 'ON_DATE'; value: string | null; updatedAt: string; }
export const SKILL_CATALOG = [
  ...ONTOLOGY.map((entry, index) => ({ id: `faro:legacy:${index + 1}`, label: entry.canonical, aliases: entry.aliases, taxonomyVersion: 'legacy-curated-v1', canonicalURI: null, licenseRef: 'repository-authored; ESCO mapping pending review' })),
  ...[
    ['customer-service', 'Obsługa klienta', ['obsługa klienta', 'klient', 'stacji']],
    ['cash-register', 'Obsługa kasy', ['kasa', 'kasę', 'stacji']],
    ['sales', 'Sprzedaż', ['sprzedaż', 'stacji']],
    ['shift-work', 'Praca zmianowa', ['zmianowa', 'zmiany', 'stacji']],
    ['conflict-resolution', 'Rozwiązywanie sytuacji konfliktowych', ['reklamacje', 'konflikt', 'stacji']]
  ].map(([id, label, aliases]) => ({ id: `faro:activity:${id as string}`, label: label as string, aliases: aliases as string[], taxonomyVersion: 'faro-activities-v1', canonicalURI: null, licenseRef: 'Faro authored task labels; not ESCO certification' }))
];
export function skillById(id: string) { return SKILL_CATALOG.find(skill => skill.id === id); }
export function suggestSkills(description: string) {
  const text = normalizeText(description);
  return SKILL_CATALOG.filter(skill => skill.aliases.some(alias => text.includes(normalizeText(alias))))
    .map(skill => ({ skillId: skill.id, rationale: `Czy wykonywano czynność: ${skill.label}? Opis nie jest dowodem kompetencji.`, modelVersion: 'local-question-rules-v1' }));
}

/** No free text, arbitrary metadata, URLs or private activity descriptions cross this boundary. */
export function employerProjection(processId: string, firstName: string, claims: Claim[], learning: Learning[], availability: Availability) {
  return {
    processId, firstName,
    skillClaims: claims.filter(claim => skillById(claim.skillId)).map(claim => ({
      skill: { id: claim.skillId, label: skillById(claim.skillId)!.label }, level: claim.level, source: claim.source,
      practice: { quantity: claim.practice.quantity, unit: claim.practice.unit },
      evidence: { kind: 'CANDIDATE_DECLARATION', confirmedAt: claim.confirmedAt }, verification: claim.verification, version: claim.version
    })),
    taskExperience: claims.filter(claim => claim.source === 'WORK' && skillById(claim.skillId)).map(claim => ({ task: skillById(claim.skillId)!.label, practice: { quantity: claim.practice.quantity, unit: claim.practice.unit } })),
    learningIntents: learning.filter(item => skillById(item.skillId)).map(item => ({ skill: { id: item.skillId, label: skillById(item.skillId)!.label }, mode: item.mode, practice: { quantity: item.practice.quantity, unit: item.practice.unit } })),
    availability: { kind: availability.kind, value: availability.value, updatedAt: availability.updatedAt },
    sharedAssessmentResults: []
  };
}
