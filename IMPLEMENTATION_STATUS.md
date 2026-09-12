# Job — implementation status

Last refreshed: 2026-09-13

This file tracks repository evidence against the Master Implementation Plan. A feature is marked implemented only when code and automated evidence exist. External/product gates that require real users, live infrastructure, legal review, provider credentials or manual accessibility work remain explicitly open.

## Gate summary

- **MVP 0.1 executable core:** PASS in repository/CI.
- **MVP 0.1 repository quality/recovery/security gates:** PASS for the current single-instance architecture.
- **MVP 0.1 live staging / representative-user / manual / legal / production-infrastructure acceptance:** PENDING.
- **Feature-flag rollout foundation:** IMPLEMENTED.
- **MVP 0.2 Today / Action Priority implementation:** IMPLEMENTED BEHIND FEATURE FLAG; product acceptance remains PENDING.
- **MVP 0.2 useful in-app Notifications:** IMPLEMENTED BEHIND FEATURE FLAG; external delivery and rollout evidence remain PENDING.
- **Later Master Plan phases:** not complete unless explicitly listed below.

## Implemented MVP 0.1 product scope

### Identity, onboarding and Career Truth
- Email/password registration/login with scrypt, opaque hashed sessions and HttpOnly cookies.
- Bounded credential inputs, generic login failures and dummy scrypt work for normal-sized unknown-account attempts.
- CareerProfile onboarding without requiring a CV.
- Career Truth Lite with status, provenance and confidence; inferred facts never auto-confirm and never auto-enter generated CV content.
- Manual facts, experience and education; current employment is represented explicitly with `endDate=null`.
- User corrections/removal for own facts, experience and education with indistinguishable foreign/nonexistent 404 contracts.
- CV upload/inference boundary and Polish occupation/skill normalization foundations.

### Job decision and application execution
- Paste-job workflow and deterministic Polish Job Parser.
- Explainable deterministic Decision Engine with uncertainty and user override.
- Career-Truth-grounded Application Package and server-side PDF CV generation with Polish characters.
- Education is preserved in Application Package, HTML/PDF CV and export; removed Career Truth records do not enter newly generated documents.
- Application Tracker with guarded state transitions and one-tap outcome capture.
- Data export and re-authenticated account deletion.
- Local FREE/TRIAL/PRO/JOB_SPRINT product state; live checkout remains external/open.

### Interface and administration
- Polish mobile-first PWA/web interface, install manifest and service worker.
- Minimal admin diagnostics protected by persisted `ADMIN` role.
- Public registration cannot obtain `ADMIN` through an email allow-list. Promotion is an out-of-band local operator action (`npm run provision:admin -- <email>`) and is audit logged transactionally.
- Database-aware `/api/health` returns 503 when schema/database health is unavailable.

## Security, privacy and recovery evidence

- CSP, frame protection, referrer/permissions policies, same-origin resource isolation and production HSTS.
- API `Cache-Control: no-store` / `Pragma: no-cache`.
- Same-origin mutation guard plus Fetch Metadata rejection of browser cross-site/same-site mutation contexts.
- Instance-local rate limiting and explicit trusted-proxy handling; forwarded addresses ignored by default.
- Generic JSON body limit of 64 KiB; paste-job has explicit 256 KiB JSON / 100,000-character text budget and minimum useful length.
- Bounded profile, Career Truth, experience/education, override, application/outcome and destructive-action inputs.
- Public arbitrary analytics ingestion removed; analytics event names/properties originate from explicit server flows and remain gated by the database consent trigger.
- User-owned resources use user-scoped SQL operations and stable public error contracts.
- Private portable upload keys, traversal-safe deletion, legacy path migration, upload signature/MIME/size checks.
- Shell-free ClamAV-compatible malware-scanner boundary. In required mode scanner absence/error/timeout fails closed before document extraction/DB persistence; infected uploads are deleted and rejected.
- Versioned Terms/Privacy acceptance and user-managed optional analytics consent.
- Public test-version legal surfaces exist but are not final legal documents.
- SQLite snapshot + upload backup, versioned manifest, integrity-checked restore and automated semantic restore-to-different-root exercise.

## Feature rollout foundation

Large post-MVP features use persisted feature flags with deterministic user bucketing and audited operator changes.

- Stable 0/10/50/100% rollout.
- `enabled=false` is immediate fail-closed rollback.
- `enabled=true` + 0% exposes the feature only to persisted ADMIN users for internal testing.
- Operator command: `npm run feature:flag -- <key> <on|off> <0|10|50|100>`.
- Current keys include Today, Notifications, Interview Pack, Skill ROI, Career Transition, Strategy Engine and Job Feed.
- Existing flags remain disabled by default until explicitly rolled out.

## MVP 0.2 — Today / Action Priority

Repository implementation includes the feature-gated **DZISIAJ** vertical:

- deterministic Action Priority scoring based on opportunity value, urgency, confidence, expected progress and estimated effort;
- supported time budgets 10/30/60/120 minutes;
- maximum three primary actions and cumulative time-budget enforcement;
- action candidates from real application/Career Truth state: apply, follow-up after sufficient waiting time, update outcome, interview preparation, confirm inferred Career Truth fact, plus a grounded base-CV fallback;
- no streaks, shame/panic language or guilt mechanics;
- user can accept and complete an action; estimated time, acceptance, completion and outcome are persisted;
- accepted/completed daily plans are not silently replaced by a later re-ranking;
- user-local date is derived from the stored timezone;
- `/api/features` exposes only effective feature availability for the authenticated user;
- `/api/today*` is fail-closed with `FEATURE_DISABLED` when the Today flag is unavailable;
- foreign/nonexistent action IDs expose the same 404 contract;
- server-generated `today_opened`, `today_action_accepted` and `today_action_completed` analytics events remain subject to analytics consent persistence rules;
- the client injects the Today navigation/screen only when the feature is effective for the user and provides calm 10/30/60/120-minute controls plus accept/complete actions;
- Node/API tests cover ranking, flag gating, invalid budgets, cross-user isolation and action state changes; Playwright/axe coverage exercises the Today UI on mobile/desktop CI profiles.

**Important product gate:** the Master Plan requires real MVP usage before formally activating/accepting Today. Repository implementation is therefore not evidence that the product gate has passed. The flag remains the rollout boundary.

## MVP 0.2 — Useful Notifications

Repository implementation includes a feature-gated in-app notification center designed to surface only actionable reminders:

- per-user settings for follow-up reminders, application deadlines, interview reminders and future matched-job notifications;
- persisted notification records with read/dismiss state and deterministic deduplication keys;
- current V1 generators cover follow-up after a sufficient waiting period and near application deadlines using real tracker/job data;
- interview/matched-job switches are persisted now, while generation remains dependent on later interview-date/feed data rather than fabricated signals;
- notifications are user-scoped and foreign IDs cannot be mutated by another user;
- in-app UI uses calm language without streak/shame/panic mechanics and supports read/dismiss actions;
- notification preferences and records are included in user export;
- server events for notification interaction remain subject to existing analytics-consent persistence rules;
- Node/API tests cover generation, deduplication, settings, user isolation and export; Playwright/axe covers the notification UI without consuming production authentication rate-limit budget.

**Delivery boundary:** no external email, SMS or push provider is claimed. V1 is an in-app notification center; provider-backed delivery and real staged-rollout evidence remain open.

## Migrations

Executable SQLite migrations are sequentially validated in CI:

- `0001_init.sql` — initial schema and feature-flag seeds;
- `0002_hardening.sql` — hardening/index changes;
- `0003_analytics_consent.sql` — analytics-consent persistence gate;
- `0004_portable_upload_storage_keys.sql` — portable upload references and legacy-path migration;
- `0005_today_actions.sql` — Today action key/priority/day/update fields and indexes;
- `0006_notifications.sql` — notification preferences, persisted in-app notifications and notification rollout seed.

`postgres_0001_reference.sql` remains a production target/reference, not an executed production PostgreSQL migration.

## Automated quality gate

CI gates repository changes on:

- locked `npm ci`, policy lint and strict server/client/E2E TypeScript checks;
- fresh-database migration validation;
- Node unit/API/security tests;
- HTTP/proxy/cache/transport/input-boundary/resource-isolation/authentication/malware regressions;
- feature-flag deterministic rollout/rollback and audited operator tests;
- Career Truth, education, document-generation and correction flows;
- Today and Notifications ownership/input/deduplication/state tests;
- semantic backup/restore exercise;
- Playwright Chromium mobile + desktop flows and a <=180-second technical first-Decision-Card gate;
- automated axe WCAG 2.2 A/AA checks and accessibility regressions;
- Docker production-image build and booted-container `/api/health` smoke.

The automated <=180-second path proves technical capability only. Representative-user `<3 min` acceptance is still open.

## Remaining MVP 0.1/public-launch gates

1. Apply the existing Render Blueprint once and evidence live disposable staging health/smoke/browser/log checks. Render is test-only and ephemeral.
2. Execute representative-user first-value protocol and validate the `<3 min` target with real users.
3. Perform manual assistive-technology/WCAG 2.2 AA review.
4. Complete final controller/contact identity, legal bases, subprocessors/transfers, retention schedule and legal review.
5. Integrate live payment provider/lifecycle/BLIK where practical.
6. Move public production persistence to PostgreSQL plus private S3-compatible object storage.
7. Add managed encrypted off-host backup/restore drills, managed monitoring and shared/distributed rate limiting where required by deployment topology.
8. Install and evidence a live malware scanner with required scanning in the chosen hosting architecture.
9. Complete penetration/security review before broad launch.

## Master Plan phases after Notifications

Next implementation order remains: Interview Prep Pack V1 → legal JobSourceConnector abstraction → Job Feed + deduplication → Bottleneck Engine/confidence → Local Labour Intelligence + Effective Wage → Skill ROI + just-in-time learning → Career Transition → Outcome Inbox → Strategy Engine → native/mobile and larger-scale data-moat phases.

No later phase is marked complete merely because schema placeholders or feature-flag keys exist.
