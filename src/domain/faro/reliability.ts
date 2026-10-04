import type { InterestStatus } from './recruitment.js';
export interface ReliabilityInterest {
  id:string;createdAt:string;responseDueAt:string;firstResponseAt:string|null;status:InterestStatus;withdrawnAt:string|null;
}
export interface ReliabilityEvent {processId:string;kind:string;createdAt:string;}
/** Descriptive records only; no score, intent inference, automatic restriction or ranking input. */
export function reliabilitySnapshot(interests:ReliabilityInterest[],events:ReliabilityEvent[],from:string,to:string,asOf:string) {
  const end=Date.parse(asOf),start=Date.parse(from),stop=Date.parse(to);
  if(![end,start,stop].every(Number.isFinite)||start>=stop||stop>end)throw new Error('Invalid reliability window.');
  const cohort=interests.filter(p=>Date.parse(p.createdAt)>=start&&Date.parse(p.createdAt)<stop);
  for(const p of cohort) {
    const created=Date.parse(p.createdAt),dates=[Date.parse(p.responseDueAt),...(p.firstResponseAt?[Date.parse(p.firstResponseAt)]:[]),...(p.withdrawnAt?[Date.parse(p.withdrawnAt)]:[])];
    if(dates.some(t=>!Number.isFinite(t)||t<created))throw new Error('Invalid reliability record chronology.');
  }
  const matured=cohort.filter(p=>Date.parse(p.responseDueAt)<=end);
  const early=matured.filter(p=>p.withdrawnAt&&Date.parse(p.withdrawnAt)<Date.parse(p.responseDueAt));
  const excluded=new Set(early.map(p=>p.id)),eligible=matured.filter(p=>!excluded.has(p.id));
  const answered=eligible.filter(p=>p.firstResponseAt&&Date.parse(p.firstResponseAt)<=end);
  const onTime=answered.filter(p=>Date.parse(p.firstResponseAt!)<=Date.parse(p.responseDueAt));
  const waits=cohort.filter(p=>!p.firstResponseAt&&['INTERESTED','ACTIVE','OFFERED'].includes(p.status));
  const overdue=waits.filter(p=>Date.parse(p.responseDueAt)<end);
  const durations=answered.map(p=>(Date.parse(p.firstResponseAt!)-Date.parse(p.createdAt))/3600000).sort((a,b)=>a-b);
  const median=durations.length?(durations[Math.floor((durations.length-1)/2)]!+durations[Math.floor(durations.length/2)]!)/2:null;
  const ids=new Set(cohort.map(p=>p.id)),relevant=events.filter(e=>ids.has(e.processId)&&Date.parse(e.createdAt)<=end);
  const count=(kinds:string[])=>new Set(relevant.filter(e=>kinds.includes(e.kind)).map(e=>e.processId)).size;
  return {
    calculationVersion:'response-cohort-v1',window:{from,to,asOf,cohortBy:'INTEREST_CREATED_AT',deadline:'ORIGINAL_RESPONSE_DUE_AT',timezone:'UTC'},
    coverage:'RETAINED_PROCESS_RECORDS_ONLY',sampleSize:cohort.length,maturedCohort:matured.length,
    exclusions:{withdrawnBeforeOriginalDeadline:early.length,rule:'SEPARATE_NOT_SUCCESS'},
    firstResponse:{numerator:onTime.length,denominator:eligible.length,onTimeRate:eligible.length?onTime.length/eligible.length:null,answered:answered.length,late:answered.length-onTime.length,
      unanswered:eligible.length-answered.length,rightCensored:eligible.length-answered.length,medianAnsweredHours:median,medianSampleSize:durations.length,
      minAnsweredHours:durations[0]??null,maxAnsweredHours:durations.at(-1)??null},
    currentWaiting:{count:waits.length,overdue:overdue.length,maxOverdueHours:overdue.length?Math.max(...overdue.map(p=>(end-Date.parse(p.responseDueAt))/3600000)):null},
    progression:{processesWithNextStage:count(['ADVANCE']),processesWithAssessmentInvitation:count(['ASSESSMENT_ASSIGNED']),processesWithConfirmedInterview:count(['INTERVIEW_CONFIRM']),processesRejected:count(['REJECT'])},
    interpretation:eligible.length?'DESCRIPTIVE_ONLY':'NO_MATURED_DATA'
  };
}
