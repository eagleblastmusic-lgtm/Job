# Job V2 — release notes

Date: 2026-09-13

## Scope completed

This release line completes repository implementation from the existing MVP/V1 baseline through V1.5 and V2.

### V1.5

- Local Labour Intelligence with sourced official/public evidence and guarded imports.
- Effective Wage with explicit user assumptions and separately labelled subjective time value.
- Skill ROI with observed-job unlock logic, cost/time/certification assumptions and confidence.
- Just-in-Time Learning plans for 15/30/60/120 minutes tied to real targets.

### V2

- Career Transition Engine with adjacent-role graph, transferable skills, gaps, observed jobs/local evidence, salary range, difficulty, suggested learning and confidence.
- Outcome Inbox with deterministic message classification and mandatory user confirmation before tracker/outcome mutation.
- Strategy Engine with minimum-sample gates and bounded experiment recommendations.
- Complete V2 personal-data export for newly persisted user-owned records.

## Safety and product invariants

- no invented Career Truth;
- missing skill/credential evidence means “not confirmed”, never automatic absence;
- no auto-apply;
- no employer-side candidate ranking;
- no unauthorized scraping;
- no silent Outcome Inbox state changes;
- no Strategy recommendations from fewer than 10 applied-or-beyond applications;
- no cross-user intelligence;
- large features remain feature-gated and disabled by default.

## Quality gate

The release is gated by lint, strict TypeScript, sequential migrations, Node unit/API/security tests, backup/restore, Playwright mobile+desktop, axe accessibility, Docker production build and container health smoke.

## Deferred by explicit roadmap gates

- native React Native/Expo application until PWA PMF evidence;
- cross-user data moat until privacy/legal/fairness approval;
- optional provider integration for Outcome Inbox;
- broad scheduled public labour-data acquisition;
- live billing/provider integration and production infrastructure evidence.

See `IMPLEMENTATION_STATUS.md` and `docs/PRODUCTION_READINESS.md` for the authoritative completion boundary.
