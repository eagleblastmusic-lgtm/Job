# CURRENT SYSTEM MAP

Audit date: 2026-09-16. Fetched `origin/main`: `ae4af4e5cc5dff1e35e32df3445ca7a86097a337`. Working branch: `codex/faro-canonical`, isolated under `.worktrees/faro-canonical`. Parent checkout contains user edits; those are excluded from this audit and must not be overwritten. Canonical ZIP SHA256: `FA8C06E0B688B4722DCAB304066E5DD7A568E13A0F7C5977D661EF9E0EE389C7`.

## Actual request and data paths

`src/server/index.ts → createExtendedJobApp → extension API handlers / createJobApp → AppStore → JobDatabase (node:sqlite)`. There is no framework router or ORM. The extended listener duplicates security headers and dispatches known feature paths before the base listener. Base API uses origin checks, session lookup, request-size helpers and route-specific rate limits. Extension APIs must explicitly enforce these controls; they do not automatically inherit base-route middleware.

`public/index.html → src/client/app.ts → fetch /api/*`. Handwritten DOM, native forms, hash navigation, multiple progressive feature scripts. Two TypeScript builds: server/domain/tests and browser. No React dependency or need for a framework rewrite. `scripts/copy-static.mjs` copies public assets after client compilation.

| Area | Actual implementation | Canonical implication |
|---|---|---|
| Frontend/routing | Auth and app sections in one document; app.ts toggles screens and runs onboarding/CV/import flows | Preserve auth DOM/CSS; replace authenticated entry with real workspace; leave legacy source as historical migration material |
| Auth | auth.ts: salted scrypt, hash-only session tokens, constant-time verification, dummy login hash; app.ts cookies HttpOnly/SameSite/Secure in production, origin validation and login/register limits | Reuse; add org membership and assignment checks, not a second identity system. MFA/recovery not implemented |
| Data | SQLite WAL, FK enabled, ordered transactional SQL migrations 0001–0019; PostgreSQL file is reference only | Additive canonical tables; keep existing private data without fabricating canonical claims. PostgreSQL runtime/rehearsal remains release prerequisite |
| Profiles | career_profiles preferences; career_facts confirmed/inferred/unknown; career_experiences explicitly employer/title; education and credentials | Useful inference/confirmation distinction but profile is CV-shaped. Build explicit activities/proposals/versioned claims and learning intents |
| Offers | jobs belongs to an individual user; parser normalizes pasted external text; job_requirements MUST/NICE/UNKNOWN | Not employer-owned native publishing. Add org offers with immutable versions, typed salary, approval, WILL_TEACH |
| Applications | applications uses SAVED/APPLIED/CONTACTED/INTERVIEW/OFFER/CLOSED; statusTransitions is personal tracking | Cannot repurpose as two-party recruitment: no actor matrix, concurrency, original version, clocks or reason requirements |
| Employer | No membership, assignment, verified organization or candidate projection tables/routes | Missing, not partially complete because a company name occurs in imported job text |
| Matching | decisionEngine and jobSearch derive aggregate dimensions, recommendation and explanation | Keep normalization helpers; new canonical matching returns evidence per requirement, never legacy aggregate score |
| AI | AiGateway structured validation, request metadata and timeout; careerTruth local inference | Reuse adapter with output/time/PII hardening; proposal-only integration. No model authority to write claims or move recruitment |
| Notifications | notifications/preferences with user scope and unique dedupe; NotificationService pulls follow-up/deadline data | Reuse inbox persistence; add transactional outbox and canonical events. Existing receipt is not employer response |
| Assessments | No definitions, attempts, server timer, rubric approvals or results. InterviewPack is preparation | New bounded module, legal-gated beyond development; no code execution in web process |
| Economics | effectiveWage module computes a prohibited derivative; salary mixes gross/net and contracts | Disconnect rejected API/UI; add manual private economics and versioned provider contract, unknown stays null |
| Trust | No review cases/appeal/verified no-show; outcomes is user-reported tracking | Need separate evidence cases and reconfirmation policy; no automated intent verdict |
| Uploads | files.ts validates CV upload; malwareScanner boundary, private storage and account cleanup | Never route old uploads to employers. Native assessment file execution stays disabled until isolation/scan gate |
| Privacy | scoped export; delete requires current password and confirmation; analytics consent gating in AppStore | Extend canonical data export/delete and backup tombstones; controlled DTO on every employer surface |
| PWA | sw.js excludes /api but caches other GETs broadly, including unknown resources | Change to exact public asset allowlist, no private runtime cache, upgrade and logout cleanup |
| Responsive/a11y | mobile-nav, desktop sidebar, forms/live regions; Playwright mobile+desktop and axe tests | Existing tests are baseline evidence, not proof of new split/mobile flows |
| Analytics | consent-gated event table; career navigation events | New events must exclude profile/watch/tax data; NSM significant mutual progress, rejection separate |
| CI | lint, three typechecks, migrations, node tests, restore, browser, Docker smoke | Extend to canonical branch/tests; never remove failing contracts to get green |
| Deployment | Node22 Docker, unprivileged node runtime, SQLite data directory; Render free service without persistent disk | Not durable public production. No deploy in this task while legal and persistence gates open |

## Baseline verification

Build completed on installed Node 24.19.0. Initial node:test invocation was blocked by sandbox `spawn EPERM`; rerun under reviewed execution completed: **92 tests, 90 passed, 2 failed**. Failures: OLX Praca and LinkedIn Guest API fixture ingestion expected IMPORTED but got FAILED (`src/tests/public-job-ingestion.test.ts`). These are pre-existing on fetched main. Log: local `baseline-test.log` (ignored); do not treat them as new regression. Required fix must first determine rights eligibility; no restoring disallowed scraping just to satisfy obsolete behavior.

Browser, restore and container baseline have not yet been executed; no baseline PASS claimed. Node22 parity and final container are release checks. `npm` on PATH points at a broken Windows shim; use `C:/Program Files/nodejs/npm.cmd` locally.

## Existing strong primitives → small delta

Reuse JobDatabase migration runner, sessions/passwords, HttpError/readJson bounds, notification dedupe, audit/analytics persistence, private file boundary and existing test fixtures. New domain modules are necessary where the old entity represents a different concept (personal application versus organization recruitment). Avoid replacing the whole server or adding another SPA framework.

## Visual lock

Auth markup, original styles.css and login-background.png remain source-of-truth assets. Founder explicitly approved only changing registration button text from the 7-day trial message to “Załóż bezpłatne konto”. Add workspace styling in a separate stylesheet scoped to authenticated body/root; no unauthenticated selector changes. Visual reference is inspiration only; Faro uses Night/Cloud/Gold, not JobNest branding.
