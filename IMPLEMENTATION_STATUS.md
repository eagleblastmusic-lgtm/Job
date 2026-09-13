# Job — implementation status

Last refreshed: 2026-09-13

This file records repository evidence against `JOB_APP_MASTER_IMPLEMENTATION_PLAN.md`. Code is never treated as proof of real-user, legal, provider or production-infrastructure acceptance.

## Overall status

**Repository implementation through V2 is complete on this branch, subject to the final CI gate.**

Implemented product line:

1. MVP 0.1 — Decision → Application → Outcome.
2. MVP 0.2 — Today / Action Priority and useful in-app notifications.
3. V1 — Interview Prep, legal source connector boundary, Job Feed/deduplication and Bottleneck Engine.
4. V1.5 — Local Labour Intelligence, Effective Wage, Skill ROI and Just-in-Time Learning.
5. V2 — Career Transition, Outcome Inbox and Strategy Engine.

The following roadmap items are intentionally **not claimed complete** because the plan itself gives them external prerequisites:

- **V2.5 native mobile:** build only after PWA product-market fit. No PMF evidence exists yet, so duplicating the web product in React Native would violate the plan.
- **V3 cross-user intelligence:** only after privacy/legal review, aggregation/cohort safeguards, anonymization/pseudonymization decisions and fairness monitoring. Those approvals/evidence do not exist yet.

## Core application

- registration/login, bounded credentials, opaque hashed sessions and HttpOnly cookies;
- onboarding and CareerProfile without requiring a CV;
- Career Truth with provenance/status/confidence, user corrections and no auto-confirmation of inferred facts;
- CV upload boundary, secure private storage, malware-scanner integration boundary and grounded CV generation;
- Polish Job Parser, deterministic explainable Decision Engine and user override;
- Application Package, server-side PDF CV, Application Tracker and outcome capture;
- privacy consent, complete personal-data export, re-authenticated account deletion, backup/restore exercise;
- local FREE/TRIAL/PRO/JOB_SPRINT state, admin diagnostics and audited local admin provisioning;
- mobile-first PWA/web interface.

## Post-MVP features

### Today / Action Priority

Deterministic action ranking, 10/30/60/120-minute budgets, maximum three actions, persisted accept/complete state and no guilt/streak mechanics. Feature-gated.

### Notifications

Configurable in-app follow-up/deadline notifications with persisted read/dismiss state and deduplication. External email/SMS/push delivery is not claimed.

### Interview Prep Pack

Uses saved job/application and confirmed Career Truth only. Unknown information remains explicit rather than fabricated.

### Job Sources / Feed / deduplication

Connector abstraction, provenance and source registry; user-provided legal source path; canonical observations, feed state, deterministic duplicate/repost handling and admin source disablement. No unauthorized scraping.

### Bottleneck Engine

Evidence-limited funnel diagnostics with shared confidence vocabulary:
`ZA_MALO_DANYCH`, `WCZESNY_SYGNAL`, `PRAWDOPODOBNY_WNIOSEK`, `SILNY_WNIOSEK`. Tiny samples cannot become strong diagnoses.

### Local Labour Intelligence

Sourced official/public-data snapshot model, guarded official HTTPS imports, nearby-area links, comparable evidence and uncertainty. Scheduled national data acquisition/refresh remains an operational data task.

### Effective Wage

Optional offer decision aid with explicit salary/commute assumptions. Subjective value-of-time is kept separate and never presented as objective economics.

### Skill ROI

Ranks learning candidates only from confirmed user skills, requirements observed in the user's saved jobs, available local-market evidence and explicit user assumptions for learning cost/time/certification. Missing Career Truth means **not confirmed**, not **does not possess**. “Jobs unlocked” is limited to observed saved offers where the skill is the sole unconfirmed MUST_HAVE requirement. Confidence is always shown.

### Just-in-Time Learning

Creates bounded 15/30/60/120-minute preparation plans tied to a real interview, missing skill, certification topic or job requirement. It is deliberately not a course marketplace and never claims certification/completion beyond recorded user action.

### Career Transition

Curated adjacent-role graph plus user-specific evidence: confirmed transferable skills, unconfirmed requirements, saved target jobs, local evidence, observed salary range, transition difficulty, suggested learning and confidence. The role graph is presented as a navigation aid, not exhaustive occupational truth. Users can persist explored paths.

### Outcome Inbox

A user-pasted recruitment message can create a pending suggestion for rejection, interview, offer, recruiter contact or unknown. **No application status changes from classification alone.** Explicit confirmation transactionally updates application status, records a user-confirmed outcome and resolves the inbox item. Dismissal changes no recruitment outcome. Provider-backed mailbox integration is optional and not claimed.

### Strategy Engine

Activates only after sufficient history. Fewer than 10 applied-or-beyond applications produce no recommendation. Sufficient samples can produce bounded experiments around response rate, interview conversion, late-stage conversion and freshness. Every recommendation exposes sample size/confidence and avoids causal or sweeping career claims.

## Privacy and data-flywheel readiness

The user export now includes core data plus Today actions, notification settings/items, Job Feed observations/state, Effective Wage assumptions, Skill ROI assumptions, Learning sessions, Career Transition explorations and Outcome Inbox records. User-owned records are deleted through user-scoped operations/foreign-key cascades.

The schema supports the candidate-side loop:

`job → decision → action → application → outcome → intervention → later outcome → better recommendation`

No cross-user recommendation model is activated.

## Executable migrations

CI validates sequential SQLite migrations:

- `0001_init.sql`
- `0002_hardening.sql`
- `0003_analytics_consent.sql`
- `0004_portable_upload_storage_keys.sql`
- `0005_today_actions.sql`
- `0006_notifications.sql`
- `0007_job_sources_feed.sql`
- `0008_bottleneck_flag.sql`
- `0009_local_labour_intelligence.sql`
- `0010_effective_wage.sql`
- `0011_skill_roi_learning.sql`
- `0012_career_transition.sql`
- `0013_outcome_inbox.sql`

`postgres_0001_reference.sql` remains a production-target reference, not evidence of a completed PostgreSQL production migration.

## Feature flags

Large features remain disabled by default and support controlled 0/10/50/100 rollout with immediate rollback. Current post-MVP keys include Today, Notifications, Interview Pack, Job Feed, Bottleneck, Local Labour, Effective Wage, Skill ROI, Just-in-Time Learning, Career Transition, Outcome Inbox and Strategy Engine.

## Automated quality gate

The branch CI gates:

- locked dependency install;
- static policy lint;
- strict server/client/E2E TypeScript checks;
- fresh-database migration validation;
- Node unit/API/security tests;
- ownership, feature-gate, uncertainty and confirmation-boundary tests;
- semantic backup/restore to a different root;
- Playwright Chromium on mobile and desktop;
- automated axe accessibility checks on critical/new screens;
- production Docker image build;
- booted-container `/api/health` smoke.

Final merge must wait for the latest full CI run to pass.

## Genuine external gates still open

These cannot be truthfully completed from repository code alone:

1. deploy/evidence a live disposable staging environment and then chosen production environment;
2. representative-user first-value study proving the `<3 min` target and product usefulness;
3. closed beta metrics, D7/D30 retention and paid-conversion evidence;
4. final legal review: controller/contact identity, legal bases, subprocessors/transfers, retention schedule and production Terms/Privacy;
5. live payment provider lifecycle and BLIK where practical;
6. production PostgreSQL plus private S3-compatible object storage migration if selected for scale;
7. managed encrypted off-host backups/restore drills and production monitoring;
8. live required malware scanner in the chosen hosting architecture;
9. manual assistive-technology/WCAG 2.2 AA review;
10. penetration/security review before broad public launch;
11. source partnerships/licences and broad scheduled public-market data refresh;
12. PWA product-market-fit evidence before native mobile;
13. privacy/legal/fairness review before any cross-user intelligence.

These are recorded as external gates, not fabricated as completed work.
