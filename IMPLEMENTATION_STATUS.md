# MVP 0.1 — implementation status

Last refreshed: 2026-09-05

This file tracks the executable MVP against the master implementation plan. It records what is evidenced in the repository today and keeps production/external dependencies explicit rather than treating planned work as complete.

## Current gate

**EXECUTABLE MVP CORE: PASS**

**REPOSITORY QUALITY / RECOVERY GATES: PASS**

**LIVE INTERNAL STAGING ACCEPTANCE: NOT YET EVIDENCED**

**MASTER PLAN MVP 0.1 ACCEPTANCE GATE: NOT YET COMPLETE**

The core candidate journey is implemented and repeatedly green in GitHub CI. Later roadmap phases such as Today Engine, Strategy, Skill ROI and native mobile remain intentionally blocked until the MVP acceptance gate is closed.

## Implemented product scope

### Identity, onboarding and Career Truth
- Registration/login with scrypt password hashing, opaque hashed sessions and HttpOnly cookies.
- CareerProfile onboarding without requiring a CV.
- Career Truth Lite with explicit status, provenance and confidence semantics.
- User-confirmed facts remain distinct from inferred/unknown/not-possessed/conflicting/expired states.
- CV inference never auto-confirms a fact and inferred facts are never automatically allowed into generated CV content.
- Experiences, education and practical Polish occupation/skill normalization foundations.

### Job understanding and decision support
- Paste-job workflow.
- Deterministic Polish Job Parser for practical offer fields and MUST/NICE/UNKNOWN requirements.
- Explainable deterministic Decision Engine with fit dimensions, uncertainty and Polish recommendations.
- Decision Card and explicit user override path.
- Optional AI Gateway boundary exists, but core MVP behavior does not depend on AI credentials.

### Application execution and learning loop
- Career-Truth-grounded Application Package.
- Base CV generation and real server-side PDF export with Polish characters.
- Application Tracker with guarded state transitions.
- One-tap recruitment Outcome Capture.
- Data export and account deletion.
- FREE/TRIAL/PRO/JOB_SPRINT product configuration and local trial state; live paid checkout is not implemented.

### Interface and administration
- Polish mobile-first responsive PWA/web interface.
- Install manifest and service worker.
- Protected minimal admin diagnostics controlled through `ADMIN_EMAILS`.
- Database-aware `/api/health` returns 503 when the application schema is unavailable instead of reporting a false healthy state.

## Privacy and security implemented

- Security headers including CSP, frame protection, referrer policy and permissions policy.
- Same-origin mutation guard.
- Basic rate limiting on sensitive endpoints.
- Cross-user record isolation regression coverage.
- Upload size, extension, MIME, PDF signature and DOCX structure validation.
- Private upload filesystem permissions for the current single-instance architecture.
- Portable upload keys in the form `uploads/<user>/<file>` rather than host-specific absolute paths.
- Traversal-safe upload path resolution before deletion.
- Migration of legacy Linux and Windows absolute upload paths.
- Analytics property minimization/redaction.
- Versioned TERMS and PRIVACY acceptance at registration.
- Optional analytics consent with a database-level persistence gate: analytics events cannot be stored when the latest ANALYTICS consent is not granted.
- Test-version Privacy and Terms surfaces are present and linked; they are explicitly not final legal documents.

## Persistence, migrations and recovery

Executable SQLite migrations are applied sequentially and validated against a fresh database in CI:

- `0001_init.sql` — initial executable SQLite schema.
- `0002_hardening.sql` — hardening/index changes.
- `0003_analytics_consent.sql` — analytics-consent persistence enforcement.
- `0004_portable_upload_storage_keys.sql` — portable upload references and legacy-path migration.

`postgres_0001_reference.sql` remains a production target/reference only and is not claimed as an executed PostgreSQL migration.

Recovery evidence now includes:
- consistent SQLite snapshot via `VACUUM INTO`,
- upload-directory backup,
- versioned backup manifest,
- restore command with SQLite integrity validation,
- automated semantic backup → restore exercise in CI,
- restore into a deliberately different filesystem root,
- verification after restore of user/profile, Career Truth, consents, job, application, outcome and uploaded CV bytes/hash.

This proves the current local/single-instance recovery semantics. Managed encrypted off-host backups for future production infrastructure remain open.

## Automated quality evidence

GitHub CI currently gates merges on:

- static project-policy lint,
- strict server/client/browser TypeScript checks,
- fresh-database migration validation,
- Node unit/API/security tests,
- semantic backup/restore exercise,
- Playwright Chromium browser E2E on mobile and desktop profiles,
- axe automated WCAG 2.2 A/AA checks on public and authenticated MVP surfaces,
- accessibility regressions for labels, keyboard focus, target sizing and reduced motion,
- production Docker image build,
- booted production-container `/api/health` smoke test.

Latest hardening run for the backup/restore change on 2026-09-05: **18 Node tests, 18 passed, 0 failed**, followed by a successful semantic restore exercise, browser E2E, Docker build and container smoke test.

The repository has also repeatedly passed the same full CI chain after subsequent staging-configuration changes.

## Render test staging decision

Render is intentionally treated only as a **free disposable test environment**, not as production hosting.

`render.yaml` now specifies:
- Docker runtime from the repository Dockerfile,
- Frankfurt region,
- free web-service plan,
- deploy from `main` after CI checks,
- `/api/health` health check,
- ephemeral SQLite/upload paths under `/app/data`,
- no persistent disk.

A Render restart/redeploy may erase all staging state. This is expected. Real candidate CVs, production credentials and irreplaceable data must not be used there.

The Render connector is connected, but its direct web-service creation action does not support the repository's required Docker deployment path. The Blueprint therefore still has to be applied once through the Render Dashboard before live environment checks can be evidenced. No live staging PASS is claimed yet.

## Deliberate technical deviations from the recommended baseline

### Database
- Recommended baseline: PostgreSQL with Drizzle/Prisma.
- Current executable MVP: Node 22 built-in SQLite with committed SQL migrations.
- Status: suitable for local/disposable single-instance validation; PostgreSQL is still required before production-scale/stateless deployment.

### File storage
- Recommended baseline: private S3-compatible object storage.
- Current executable MVP: private local filesystem below `DATA_DIR` with portable relative storage keys.
- Status: secure enough for the current closed single-instance test architecture; external object storage remains required before horizontal/public deployment.

### Web stack
- Recommended baseline: Next.js/React/TypeScript/Tailwind.
- Current executable MVP: framework-free TypeScript client served by the Node modular monolith.
- Status: functional and browser-tested; domain/server modules remain isolated so a future UI migration does not require rewriting the decision logic.

### Authentication
- Recommended baseline: managed authentication.
- Current executable MVP: first-party email/password, scrypt and opaque server sessions.
- Status: functional with security regression coverage; production choice remains either additional hardening or migration to the selected managed provider.

### PDF
- Current implementation: server-side ReportLab with DejaVu Sans.
- Status: deterministic real PDF generation with Polish characters and contract coverage.

## Remaining MVP work

Before calling the master-plan MVP 0.1 gate complete:

1. **Live disposable staging acceptance** — apply the existing free Render Blueprint and run health, automated staging smoke, browser sanity and log review against the deployed commit.
2. **First Decision Card time-to-value evidence** — validate the `<3 min` happy-path target with representative users/usability sessions; automated E2E duration alone is not a substitute for this product metric.
3. **Manual accessibility review** — perform assistive-technology/manual WCAG 2.2 AA checks in addition to the existing automated axe gate.
4. **Final privacy/legal readiness** — real controller/contact identity, final legal bases, subprocessors/transfers, retention schedule and legal review before public beta.
5. **Live payments** — integrate the selected provider, subscription lifecycle and BLIK where practical; current billing is configuration/trial only.
6. **Production persistence architecture** — PostgreSQL plus private S3-compatible storage before stateless/horizontally scaled public deployment.
7. **Production operations** — managed encrypted off-host backups/restore drills, managed error monitoring, stronger shared rate limiting and production analytics only if retained after privacy review.
8. **Upload malware scanning and security validation** before broad public launch.
9. **Penetration/security review** before broad launch.

## What is no longer an open item

The following items were listed as missing in the original status file but are now implemented and must not be re-opened without new evidence:

- browser-level Playwright E2E,
- automated accessibility/axe gate,
- consent UI and versioned consent history,
- analytics opt-out enforcement,
- privacy/terms test surfaces,
- reproducible multi-step migrations,
- backup/restore tooling,
- semantic restore drill,
- database-aware health endpoint,
- production-container smoke test,
- Render test-staging Blueprint.

## Phase result

**PHASE 1 EXECUTABLE MVP CORE: PASS**

**MVP HARDENING / CI / LOCAL RECOVERY: PASS**

**LIVE STAGING: PENDING**

**MASTER PLAN MVP 0.1 ACCEPTANCE GATE: NOT YET COMPLETE**

No Today Engine / Strategy / Skill ROI / native mobile milestone is marked complete or allowed to supersede the remaining MVP gate work.
