# Job — implementation status

Last refreshed: 2026-09-13

This file tracks repository evidence against the Master Implementation Plan. A feature is marked implemented only when code and automated evidence exist. External/product gates that require real users, live infrastructure, legal review, provider credentials or manual accessibility work remain explicitly open.

## Gate summary

- **MVP 0.1 executable core:** PASS in repository/CI.
- **MVP 0.1 repository quality/recovery/security gates:** PASS for the current single-instance architecture.
- **MVP 0.1 live staging / representative-user / manual / legal / production-infrastructure acceptance:** PENDING.
- **Feature-flag rollout foundation:** IMPLEMENTED.
- **Today / Action Priority:** IMPLEMENTED BEHIND FEATURE FLAG; product acceptance remains PENDING.
- **Useful in-app Notifications:** IMPLEMENTED BEHIND FEATURE FLAG; external delivery and rollout evidence remain PENDING.
- **Interview Prep Pack V1:** IMPLEMENTED BEHIND FEATURE FLAG.
- **Legal JobSourceConnector + Job Feed + deterministic deduplication V1:** IMPLEMENTED BEHIND FEATURE FLAG.
- **Bottleneck Engine V1 + shared confidence vocabulary:** IMPLEMENTED BEHIND FEATURE FLAG.
- **Local Labour Intelligence V1.5:** IMPLEMENTED BEHIND FEATURE FLAG; public-data refresh/coverage remains an operational data task.
- **Effective Wage V1.5:** IMPLEMENTED ON THIS BRANCH BEHIND FEATURE FLAG; merge requires the full CI gate.
- **Skill ROI and later phases:** not complete unless explicitly listed below.

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
- Public registration cannot obtain `ADMIN` through an email allow-list. Promotion is an out-of-band local operator action and is audit logged transactionally.
- Database-aware `/api/health` returns 503 when schema/database health is unavailable.

## Security, privacy and recovery evidence

- CSP, frame protection, referrer/permissions policies, same-origin resource isolation and production HSTS.
- API `Cache-Control: no-store` / `Pragma: no-cache`.
- Same-origin mutation guard plus Fetch Metadata rejection of browser cross-site/same-site mutation contexts.
- Instance-local rate limiting and explicit trusted-proxy handling; forwarded addresses ignored by default.
- Generic JSON body limit plus explicit larger bounded paste-job budget.
- Bounded profile, Career Truth, experience/education, override, application/outcome and destructive-action inputs.
- Public arbitrary analytics ingestion removed; analytics event names/properties originate from explicit server flows and remain gated by consent persistence.
- User-owned resources use user-scoped SQL operations and stable public error contracts.
- Private portable upload keys, traversal-safe deletion, legacy path migration, upload signature/MIME/size checks.
- Shell-free ClamAV-compatible malware-scanner boundary with fail-closed required mode.
- Versioned Terms/Privacy acceptance and user-managed optional analytics consent.
- Public test-version legal surfaces exist but are not final legal documents.
- SQLite snapshot + upload backup, versioned manifest, integrity-checked restore and automated semantic restore exercise.

## Feature rollout foundation

Large post-MVP features use persisted feature flags with deterministic user bucketing and audited operator changes.

- Stable 0/10/50/100% rollout.
- `enabled=false` is immediate fail-closed rollback.
- `enabled=true` + 0% exposes the feature only to persisted ADMIN users for internal testing.
- Existing flags remain disabled by default until explicitly rolled out.
- Current keys include Today, Notifications, Interview Pack, Skill ROI, Career Transition, Strategy Engine, Job Feed, Bottleneck, Local Labour and Effective Wage.

## Today / Action Priority

- Deterministic Action Priority scoring from opportunity value, urgency, confidence, expected progress and estimated effort.
- Time budgets 10/30/60/120 minutes, max three actions and cumulative budget enforcement.
- Candidates from real application/Career Truth state; no streak/shame/panic mechanics.
- Accept/complete state and outcomes persisted.
- User-local day derived from stored timezone.
- API fail-closed behind feature flag; ownership tests and Playwright/axe coverage exist.

**Product gate:** representative-user validation remains pending.

## Useful Notifications

- Per-user settings for follow-up, deadlines, interview and future matched-job notifications.
- Persisted read/dismiss state and deterministic deduplication keys.
- V1 generators cover follow-up and deadline reminders from real data.
- User-scoped API, export coverage and Playwright/axe coverage.

**Delivery boundary:** no external email/SMS/push provider is claimed.

## Interview Prep Pack V1

- Generated from the saved job/application and confirmed Career Truth only.
- Includes role/company context available in stored data, strongest arguments, gaps, likely questions, answer frameworks, employer questions, salary preparation, mini-test and checklist.
- Unknown information is surfaced as unknown rather than fabricated.
- Feature-gated and user-scoped with automated/API/browser evidence.

## Job Sources, Feed and deduplication V1

- Connector abstraction records `fetch`, normalization, provenance, terms metadata and health.
- Source registry is independently disableable and admin-controlled.
- V1 accepts user-provided jobs and is designed only for official/licensed/partner/legally usable sources; no unauthorized scraping is implemented.
- Job Feed exposes recommended/saved/hidden/not-interested state, source/freshness and decision context.
- Deduplication uses exact URL, normalized company/title/location and text fingerprint; repost observations are preserved separately.
- CI covers import, provenance, source disablement, deduplication, user isolation and browser UI.

## Bottleneck Engine V1

- Shared stages include MARKET, DISCOVERY, FIT, ACTION, RESPONSE, INTERVIEW, LATE_STAGE and OFFER.
- V1 quantifies only stages supported by recorded user data and does not fabricate MARKET/DISCOVERY evidence.
- Every diagnosis includes sample size, confidence, evidence, alternative explanations and one cautious next action.
- Confidence vocabulary: `ZA_MALO_DANYCH`, `WCZESNY_SYGNAL`, `PRAWDOPODOBNY_WNIOSEK`, `SILNY_WNIOSEK`.
- Thresholds control wording strength, not causality; tiny samples never become strong diagnoses.
- Feature is fail-closed by default with domain/API/Playwright/axe evidence.

## Local Labour Intelligence V1.5

- Combines profile location and commute tolerance with user-stored job supply and normalized official public-data snapshots.
- Public snapshots retain source, URL, year, update date and optional licence/provenance.
- Supported source classes are Barometr Zawodów, GUS BDL and other explicitly official Polish government/statistics/employment sources.
- Nearby-area comparisons require sourced area links; the application does not invent distances from place names.
- `+10 km` recommendation appears only when a sourced nearby area outside the current radius but within +10 km has actual public evidence and a stronger comparable signal.
- PUP, CBOP and Internet offer-flow counts are not summed because coverage can overlap; one comparable reference channel is used.
- Missing credentials mean “not confirmed”, never “not possessed”.
- Admin-only source import is same-origin protected and audit logged; source URLs are restricted to official HTTPS domains.
- Feature remains disabled by default and browser/API/domain evidence is in CI.

**Operational boundary:** the normalized source model and guarded import surface exist; scheduled acquisition/refresh and broad national data coverage remain separate operational work.

## Effective Wage V1.5

- Optional decision aid for a saved job; it does not decide whether to accept/reject work.
- Uses stated salary range/period and gross/net context from the parsed job plus explicit user assumptions.
- If salary is gross, net is estimated only when the user supplies a gross→net ratio; unknown context stays unknown.
- Commute cash cost uses explicit round-trip distance × user cost/km × commute days/month.
- Commute time is calculated separately.
- Optional personal value of time is shown in a separate subjective section and never presented as objective salary/economic value.
- Night/weekend/shift information is context only; V1.5 does not silently assign a monetary premium or penalty.
- Preferences and job access are user-scoped; foreign and nonexistent job IDs share the same 404 contract.
- Feature is disabled by default; domain/API/Playwright/axe tests cover uncertainty, ownership and assumption disclosure.

## Executable migrations

Sequential SQLite migrations validated by CI:

- `0001_init.sql` — initial schema and feature-flag seeds;
- `0002_hardening.sql` — hardening/index changes;
- `0003_analytics_consent.sql` — analytics-consent persistence gate;
- `0004_portable_upload_storage_keys.sql` — portable upload references and legacy-path migration;
- `0005_today_actions.sql` — Today action fields/indexes;
- `0006_notifications.sql` — notification preferences/records and rollout seed;
- `0007_job_sources_feed.sql` — job-source registry, canonical observations, feed state and deduplication support;
- `0008_bottleneck_flag.sql` — Bottleneck rollout seed;
- `0009_local_labour_intelligence.sql` — sourced local-market snapshots, area links and Local Labour rollout seed;
- `0010_effective_wage.sql` — user Effective Wage assumptions and rollout seed.

`postgres_0001_reference.sql` remains a production target/reference, not an executed production PostgreSQL migration.

## Automated quality gate

CI gates repository changes on:

- locked `npm ci`, policy lint and strict server/client/E2E TypeScript checks;
- fresh-database migration validation;
- Node unit/API/security tests;
- HTTP/proxy/cache/transport/input-boundary/resource-isolation/authentication/malware regressions;
- feature-flag deterministic rollout/rollback and audited operator tests;
- Career Truth, document generation and correction flows;
- post-MVP feature ownership/gating/domain tests;
- semantic backup/restore exercise;
- Playwright Chromium mobile + desktop flows and automated axe WCAG A/AA checks;
- Docker production-image build and booted-container `/api/health` smoke.

The automated <=180-second path proves technical capability only. Representative-user `<3 min` acceptance is still open.

## Remaining MVP 0.1/public-launch gates

1. Apply the existing Render Blueprint and evidence live disposable staging health/smoke/browser/log checks.
2. Execute representative-user first-value protocol and validate the `<3 min` target with real users.
3. Perform manual assistive-technology/WCAG 2.2 AA review.
4. Complete final controller/contact identity, legal bases, subprocessors/transfers, retention schedule and legal review.
5. Integrate live payment provider/lifecycle/BLIK where practical.
6. Move public production persistence to PostgreSQL plus private S3-compatible object storage.
7. Add managed encrypted off-host backup/restore drills, managed monitoring and shared/distributed rate limiting where required by deployment topology.
8. Install and evidence a live malware scanner with required scanning in the chosen hosting architecture.
9. Complete penetration/security review before broad launch.

## Next Master Plan phases

After Effective Wage, the implementation order is:

1. Skill ROI Engine V1.5,
2. Just-in-Time Learning V1.5,
3. Career Transition Engine V2,
4. Outcome Inbox,
5. Strategy Engine,
6. native/mobile,
7. later cross-user intelligence only after legal/privacy review.

No later phase is marked complete merely because schema placeholders or feature-flag keys exist.
