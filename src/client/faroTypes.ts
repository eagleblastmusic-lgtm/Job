export interface User { id: string; name: string; email: string; role: string; }
export interface Skill { id: string; label: string;levelGuidance?:{version:string;status:'AUTHOR_DRAFT';BASICS:string;INDEPENDENT:string;FLUENT:string}; }
export interface Practice { quantity: number | null; unit: string; }
export interface Claim { id: string; skillId: string; level: string; source: string; verification: string; practice: Practice; }
export interface Learning { skillId: string; mode: string; practice: Practice; }
export interface Profile {
  preferences:{active?:boolean;workModels?:string[];contracts?:string[];noNights?:boolean;noWeekends?:boolean;maxCommuteMinutes?:number|null;salaryMinimum?:{amount:number;currency:string;basis:string;period:string;hoursPerPeriod:number;ftePercent:number}|null};
  firstName: string; phone: string | null; version: number;
  availability: { kind: string; value: string | null }; claims: Claim[]; learning: Learning[];
  activities: Array<{ id: string; description: string; source: string }>;
  proposals: Array<{ id: string; skill_id: string; rationale: string; status: string }>;
}
export interface Projection {
  firstName: string; skillClaims: Array<{ skill: Skill; level: string; source: string; verification: string; practice: Practice }>;
  taskExperience: Array<{ task: string; practice: Practice }>;
  learningIntents: Array<{ skill: Skill; mode: string }>; availability: { kind: string; value: string | null };
}
export interface Salary { min: number; max: number; contract: string; basis: string; period: string; currency: string; hoursPerPeriod: number; ftePercent: number; variable: string; }
export interface Requirement { id: string; skillId: string; kind: string; level: string; rationale: string; }
export interface OfferData {
  role: string; responsibilities: string[]; requirements: Requirement[]; salary: Salary[]; location: string; workModel: string;
  remoteDays: number; hours: string; shifts: string; nights: boolean | null; weekends: boolean | null; learningSupport: string;
  responseHours: number; decisionHours: number; stages: string[]; assessmentMinutes: number; interviewCount: number; closesAt: string; recruiterId: string;
}
export interface Offer {
  hasUnknownConditions?:boolean;
  conditionExplanation?:Array<{field:string;state:string}>;
  watchAlerts?:boolean;
  ownInterest?:{id:string;status:string}|null;
  id: string; company: string; organizationId: string; status: string; version: number; revision: number; data: OfferData;
  acceptingInterest?: boolean;
  explanation?: Array<{ requirementId: string; skillId: string; kind: string; state: string; developing: boolean; wantsToLearn: boolean }>;
}
export interface Organization { id: string; name: string; verification: string; role: string; }
export interface Process {
  previousInterestId:string|null;
  availableCommands:string[];
  clarification:{topic:'REQUIREMENT'|'AVAILABILITY';requirementId:string|null;skillId:string|null;previousStage:string}|null;
  id: string; offerId: string; role: string; company: string; status: string; stage: string; revision: number;
  viewer: 'CANDIDATE' | 'EMPLOYER'; projection: Projection; requirements: Requirement[];
  responseDueAt: string; firstResponseAt: string | null; stageDueAt: string | null; nextAction: string | null;
  reason: { code: string; requirementId: string | null } | null;
  changes: Array<{ field: string; before: unknown; after: unknown }>;
  events: Array<{ kind: string; occurred_at: string; data: string }>;
  contactGrant: { granted_at: string; revoked_at: string | null } | null;
}
export interface Attempt {
  attemptNumber:number;retryOf:string|null;retryReason:string|null;retryAuthorizedAt:string|null;retryAttemptId:string|null;canRetry:boolean;
  incident:{id:string;category:string;statement:string;reportedAt:string;observedState:string;observedRevision:number;originalDeadline:string;originalStartedAt:string|null;originalExpiresAt:string|null;state:string;revision:number;resolution:string|null;reason:string|null;resolvedAt:string|null}|null;
  resultValidity:'VALID'|'INVALIDATED'|null;
  resultHistory:Array<{revision:number;validity:'VALID'|'INVALIDATED';reasonCode:string|null;reason:string|null;createdAt:string|null;result:{earned:number;possible:number}}>;
  viewer:'CANDIDATE'|'EMPLOYER';rubricVersion:string;
  reviewTasks:Array<{id:string;prompt:string;options:string[];points:number;correctOption:number;chosenOption:number|null}>;
  processVersion:number;
  id: string; title: string; state: string; processId: string; taskCount: number; timeLimitMinutes: number; expectedMinutes: number;
  deadline: string; startedAt: string | null; expiresAt: string | null; serverNow: string; revision: number;
  tasks: Array<{ id: string; prompt: string; options: string[]; points: number }>;
  answers: Record<string, number>; result: { earned: number; possible: number; unanswered: number; review: string; reviewNote?: string;breakdown?:Array<{taskId:string;earned:number|null;possible:number}> } | null;
}
export interface Interview {
  id:string; processId:string; state:string; revision:number; startsAt:string; endsAt:string; confirmBy:string;
  timezone:string; location:string; meetingUrl:string|null; candidateCompleted:boolean; employerCompleted:boolean;
}
export interface Economics {
  offerVersion: number; scenario: Record<string, string | number | null>;
  result: { estimatedNetRange: { min: number; max: number } | null; netAfterCommute: { min: number; max: number } | null;
    commuteCost: number | null; commuteTimeMinutes: number | null; source: string; sourceDate: string; assumptions: string; calculationVersion: string; period: string;
    basis:string;grossOrInvoiceMin:number;grossOrInvoiceMax:number;units?:{money:string;netPeriod:string;commuteCostPeriod:string;commuteTime:string} };
}
export interface AssessmentDefinition {
  title:string; timeLimitMinutes:number; expectedMinutes:number; rubricVersion:string;
  tasks:Array<{prompt:string;options:string[];answer:number;points:number}>;
}

export interface Reliability {
  window:{from:string;to:string;asOf:string};sampleSize:number;maturedCohort:number;
  exclusions:{withdrawnBeforeOriginalDeadline:number};
  firstResponse:{numerator:number;denominator:number;answered:number;late:number;unanswered:number;rightCensored:number;medianAnsweredHours:number|null;medianSampleSize:number};
  currentWaiting:{count:number;overdue:number;maxOverdueHours:number|null};
  progression:{processesWithNextStage:number;processesWithAssessmentInvitation:number;processesWithConfirmedInterview:number;processesWithMutuallyCompletedInterview:number;processesRejected:number};
  progressionGaps:{processesWithoutRecordedAdvance:number;processesWithoutRecordedConfirmedInterview:number;denominator:number;rule:string};
}
