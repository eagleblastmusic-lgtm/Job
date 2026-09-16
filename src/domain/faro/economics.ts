import type { SalaryOption } from './offers.js';
export interface EconomicsInput {
  salaryOptionIndex: number; netMin: number | null; netMax: number | null;
  commuteCost: number | null; commuteMinutes: number | null;
  transport: 'CAR' | 'TRANSIT' | 'MIXED' | 'NONE'; source: string; observedAt: string; assumptions: string;
}
/** Manual estimates are labelled as such. No unreviewed payroll/tax constants. */
export function calculateEconomics(salary: SalaryOption, input: EconomicsInput, now: string) {
  return { basis: salary.basis, grossOrInvoiceMin: salary.min, grossOrInvoiceMax: salary.max, currency: salary.currency, period: salary.period,
    estimatedNetRange: input.netMin === null || input.netMax === null ? null : { min: input.netMin, max: input.netMax },
    commuteCost: input.commuteCost, commuteTimeMinutes: input.commuteMinutes,
    netAfterCommute: input.netMin === null || input.netMax === null || input.commuteCost === null ? null : { min: input.netMin - input.commuteCost, max: input.netMax - input.commuteCost },
    assumptions: input.assumptions, source: input.source, sourceDate: input.observedAt, calculatedAt: now,
    calculationVersion: 'manual-scenario-v1', automaticTax: { supported: false, reason: 'TAX_RULES_REVIEW_REQUIRED' }, transport: input.transport };
}
export interface NetRulesProvider {
  version: string; source: string; effectiveFrom: string;
  calculate(salary: SalaryOption, privateScenario: Record<string, unknown>, date: string): { supported: boolean; min: number | null; max: number | null; assumptions: string[] };
}
