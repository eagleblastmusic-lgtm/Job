export type InterestStatus = 'INTERESTED' | 'ACTIVE' | 'OFFERED' | 'HIRED' | 'REJECTED' | 'WITHDRAWN' | 'CANCELLED';
export type Stage = 'AWAITING_EMPLOYER' | 'CLARIFICATION_REQUESTED' | 'ACCEPTED_TO_NEXT_STAGE' | 'ASSESSMENT_REQUESTED' | 'ASSESSMENT_COMPLETED' | 'INTERVIEW_PROPOSED' | 'INTERVIEW_CONFIRMED' | 'INTERVIEW_COMPLETED' | 'OFFERED' | 'TERMINAL';
export const TERMINAL: InterestStatus[] = ['HIRED','REJECTED','WITHDRAWN','CANCELLED'];
export const COMMANDS = ['CLARIFY','ANSWER','ADVANCE','REJECT','WITHDRAW','CANCEL','OFFER','ACCEPT_OFFER'] as const;
export type RecruitmentCommand = typeof COMMANDS[number];
export const REJECTION_REASONS = ['REQUIREMENT_NOT_DEMONSTRATED','REQUIREMENT_NOT_MET','OTHER_CANDIDATE_BETTER_MATCH','POSITION_FILLED','RECRUITMENT_CANCELLED'] as const;
export function transition(status: InterestStatus, stage: Stage, actor: 'CANDIDATE' | 'EMPLOYER', command: RecruitmentCommand): { status: InterestStatus; stage: Stage; substantive: boolean } | null {
  if (TERMINAL.includes(status)) return null;
  if (actor === 'CANDIDATE') {
    if (command === 'WITHDRAW') return { status: 'WITHDRAWN', stage: 'TERMINAL', substantive: false };
    if (command === 'ACCEPT_OFFER' && status === 'OFFERED') return { status: 'HIRED', stage: 'TERMINAL', substantive: false };
    if (command === 'ANSWER' && stage === 'CLARIFICATION_REQUESTED') return { status, stage: 'AWAITING_EMPLOYER', substantive: false };
    return null;
  }
  if (command === 'REJECT') return { status: 'REJECTED', stage: 'TERMINAL', substantive: true };
  if (command === 'CANCEL') return { status: 'CANCELLED', stage: 'TERMINAL', substantive: true };
  if (status === 'OFFERED') return null;
  if (command === 'CLARIFY' && ['AWAITING_EMPLOYER','ACCEPTED_TO_NEXT_STAGE'].includes(stage)) return { status, stage: 'CLARIFICATION_REQUESTED', substantive: true };
  if (command === 'ADVANCE' && ['AWAITING_EMPLOYER','ASSESSMENT_COMPLETED','INTERVIEW_COMPLETED'].includes(stage)) return { status: 'ACTIVE', stage: 'ACCEPTED_TO_NEXT_STAGE', substantive: true };
  if (command === 'OFFER' && status === 'ACTIVE' && ['ACCEPTED_TO_NEXT_STAGE','ASSESSMENT_COMPLETED','INTERVIEW_COMPLETED'].includes(stage)) return { status: 'OFFERED', stage: 'OFFERED', substantive: true };
  return null;
}
