import { normalizeText } from '../ontology.js';
import { SKILL_CATALOG,LOCAL_SKILL_CATALOG } from './skillCatalog.js';
export { SKILL_CATALOG } from './skillCatalog.js';

export const LEVELS = ['BASICS', 'INDEPENDENT', 'FLUENT'] as const;
export type SkillLevel = typeof LEVELS[number];
export const SOURCES = ['WORK', 'SELF_LEARNING', 'HOBBY', 'SCHOOL', 'VOLUNTEERING'] as const;
export type SkillSource = typeof SOURCES[number];
export interface Practice { quantity: number | null; unit: 'MONTHS' | 'PROJECTS' | 'TASKS'; context?:string; }
export interface Claim {
  id: string; skillId: string; level: SkillLevel; source: SkillSource; practice: Practice;
  verification: 'DECLARED' | 'REVIEWED_EVIDENCE' | 'FARO_ASSESSMENT'; version: number; confirmedAt: string;
}
export interface Learning { skillId: string; mode: 'SELF_DEVELOPING' | 'WANTS_TO_LEARN'; practice: Practice; }
export interface Availability { kind: 'UNKNOWN' | 'IMMEDIATE' | 'AFTER_PERIOD' | 'ON_DATE'; value: string | null; updatedAt: string; }
const skillsById=new Map(SKILL_CATALOG.map(skill=>[skill.id,skill]));
export function skillById(id: string) { return skillsById.get(id); }
export const LOCAL_SUGGESTION_VERSION = 'local-question-rules-v3';
export const SKILL_PROPOSAL_SCHEMA_VERSION='faro-skill-proposal-ids-v1';
/** Producer output is untrusted. Only catalog IDs enter persisted pending questions. */
export function validateSkillProposalResponse(response:unknown) {
  if(!response||typeof response!=='object'||Array.isArray(response)||Object.keys(response).length!==1||!Object.hasOwn(response,'skillIds'))throw new Error('SKILL_PROPOSAL_SCHEMA');
  const ids=(response as {skillIds:unknown}).skillIds;
  if(!Array.isArray(ids)||ids.length>50||ids.some(id=>typeof id!=='string'||!skillById(id))||new Set(ids).size!==ids.length)throw new Error('SKILL_PROPOSAL_SCHEMA');
  return (ids as string[]).map(skillId=>({skillId,rationale:`Czy wykonywano czynność: ${skillById(skillId)!.label}? Opis nie jest dowodem kompetencji.`,modelVersion:LOCAL_SUGGESTION_VERSION}));
}
export function skillProposalProvenance(modelVersion:unknown) {
  const known=typeof modelVersion==='string'&&['local-question-rules-v1','local-question-rules-v2',LOCAL_SUGGESTION_VERSION].includes(modelVersion);
  return {producer:known?'LOCAL_RULES':'UNKNOWN',modelVersion:typeof modelVersion==='string'?modelVersion:null,schemaVersion:modelVersion===LOCAL_SUGGESTION_VERSION?SKILL_PROPOSAL_SCHEMA_VERSION:null,promptVersion:null,confidence:null};
}
function containsAlias(text:string,alias:string) {
  const needle=normalizeText(alias);
  let offset=text.indexOf(needle);
  while(offset!==-1){
    const before=text[offset-1],after=text[offset+needle.length];
    if((before===undefined||!/[a-z0-9+]/.test(before))&&(after===undefined||!/[a-z0-9+]/.test(after)))return true;
    offset=text.indexOf(needle,offset+1);
  }
  return false;
}
export function suggestSkills(description: string) {
  const text = normalizeText(description);
  return validateSkillProposalResponse({skillIds:LOCAL_SKILL_CATALOG.filter(skill => skill.aliases.some(alias => containsAlias(text,alias))).map(skill=>skill.id)});
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
