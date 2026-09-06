# MVP 0.1 — implementation status

Last refreshed: 2026-09-06

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
- Registration validation returns controlled client errors rather than converting invalid credentials into internal-server failures.
- E-mail/password input sizes are bounded before expensive credential work.
- Unknown-account and wrong-password login attempts use the same external error contract; unknown accounts receive a dummy scrypt verification to reduce the account-existence timing distinction.
- Irreversible account deletion requires the current password in addition to the explicit confirmation phrase and is separately rate-limited.
- CareerProfile onboarding without requiring a CV.
- Career Truth Lite with explicit status, provenance and confidence semantics.
- User-confirmed facts remain distinct from inferred/unknown/not-possessed/conflicting/expired states.
- CV inference never auto-confirms a fact and inferred facts are never automatically allowed into generated CV content.
- User-entered career experience and education, with institution, field/degree, dates and optional descriptions preserved for CV generation and export.
- Career Truth correction controls allow a user to mark facts as not possessed, remove manually entered facts, and remove their own experience/education records; rejected foreign IDs are not distinguishable from nonexistent IDs through the public API contract.
- Current employment is explicitly supported: selecting “pracuję tu obecnie” clears/disables the end date in the UI and the API enforces `endDate=null` whenever `current=true`.
- Practical Polish occupation/skill normalization foundations.

### Job understanding and decision support
- Paste-job workflow.
- Deterministic Polish Job Parser for practical offer fields and MUST/NICE/UNKNOWN requirements.
- Explainable deterministic Decision Engine with fit dimensions, uncertainty and Polish recommendations.
- Decision Card and explicit user override path.
- Optional AI Gateway boundary exists, but core MVP behavior does not depend on AI credentials.

### Application execution and learning loop
- Career-Truth-grounded Application Package.
- Base CV generation and real server-side PDF export with Polish characters.
- Education entered in Career Truth is carried into the Application Package and rendered in HTML/PDF CV output with degree/field, dates and description when supplied.
- Removed Career Truth facts, experience and education no longer enter a newly generated Application Package/CV.
- Application Tracker with guarded state transitions.
- Invalid tracker transitions are returned as controlled client validation errors and are not persisted.
- One-tap recruitment Outcome Capture.
- Data export and re-authenticated account deletion.
- FREE/TRIAL/PRO/JOB_SPRINT product configuration and local trial state; live paid checkout is not implemented.

### Interface and administration
- Polish mobile-first responsive PWA/web interface.
- Install manifest and service worker.
- Protected minimal admin diagnostics controlled through `ADMIN_EMAILS`.
- Database-aware `/api/health` returns 503 when the application schema is unavailable instead of reporting a false healthy state.

## Privacy and security implemented

- Security headers including CSP, frame protection, referrer policy, permissions policy and same-origin resource isolation.
- HSTS on production-mode responses.
- `Cache-Control: no-store` and `Pragma: no-cache` on all API responses, including authenticated/profile/export surfaces.
- Same-origin mutation guard plus Fetch Metadata rejection for browser mutations classified as cross-site or same-site.
- Basic rate limiting on sensitive endpoints, including a dedicated deletion re-authentication limit.
- Rate-limit state is scoped to one running application instance rather than shared as process-global module state.
- Forwarded client IP addresses are ignored by default; they are considered only when `TRUST_PROXY=true` is explicitly configured.
- Trusted-proxy mode validates the first forwarded address as IPv4/IPv6 and falls back to the socket peer address when forwarded data is invalid or missing.
- Render disposable staging explicitly enables the trusted-proxy boundary so rate limiting can distinguish clients behind platform ingress.
- Ordinary non-upload JSON requests are limited to 64 KiB by default instead of the previous multi-megabyte generic allowance.
- Paste-job parsing has a deliberate larger 256 KiB JSON budget but caps the actual offer text at 100,000 characters and validates a minimum useful length before parser execution.
- Profile arrays, Career Truth facts, experience/education fields, decision overrides, application/outcome fields and destructive-action confirmation values are length/count bounded before persistence.
- Analytics event names and property objects are bounded by name length, top-level property count and serialized size before sanitization/storage.
- User-owned Career Truth facts, experiences, education, decisions and applications use stable 404 contracts for both nonexistent IDs and IDs owned by another user; API callers cannot distinguish those cases through status/code/message.
- Career Truth deletion SQL is scoped by both record ID and authenticated `user_id`; known misses are translated to 404 without masking unrelated database/runtime failures.
- Invalid application status transitions use a stable 400 `INVALID_STATUS_TRANSITION` contract and regression tests verify that rejected transitions do not mutate the stored application.
- Cross-user record isolation regression coverage.
- Controlled 4xx validation for malformed registration credentials.
- Bounded e-mail/password inputs and generic login-failure responses.
- Dummy scrypt verification for normal-sized unknown-account login attempts; this reduces but does not claim to eliminate all possible timing side channels.
- Current-password re-authentication before irreversible account deletion.
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
- proxy trust, Fetch Metadata, API cache-control and transport-header regression tests,
- API payload/field boundary tests covering oversized generic JSON, oversized/too-short job text, profile list counts, Career Truth values, experience/education descriptions and analytics property/name limits,
- API critical-flow coverage that creates education, reads it through Career Truth, verifies it in the Application Package and checks it in the data export,
- Career Truth correction tests proving own-record removal, foreign/nonexistent delete-contract equivalence, `current=true` end-date clearing, and exclusion of removed data from subsequent Application Package CV content,
- browser critical-flow coverage that enters education through the UI and verifies it remains visible after navigating away and back,
- browser correction coverage for manual fact removal, current employment, experience removal and education removal,
- a dedicated Playwright technical time-to-first-Decision-Card gate on mobile and desktop that fails above 180 seconds and logs `FIRST_DECISION_TECHNICAL_MS`,
- resource isolation/error-contract tests comparing foreign vs nonexistent Career Truth facts, decision overrides and application outcomes,
- invalid application-transition regression verifying a controlled 400 and no state mutation,
- semantic backup/restore exercise,
- Playwright Chromium browser E2E on mobile and desktop profiles,
- axe automated WCAG 2.2 A/AA checks on public and authenticated MVP surfaces,
- accessibility regressions for labels, keyboard focus, target sizing and reduced motion,
- a committed npm lockfile with `npm ci` used for CI installation,
- the same locked dependency graph used inside the Docker build,
- production Docker image build,
- booted production-container `/api/health` smoke test.

The technical `<3 min` test proves only that the implemented browser/system path can complete within the target under automation. `docs/FIRST_DECISION_ACCEPTANCE.md` defines the separate representative-user acceptance protocol; that product/usability evidence remains open and is not replaced by CI timing.

The authentication regression suite additionally checks controlled registration validation, identical unknown-account/wrong-password login error contracts, failed deletion re-authentication preserving the account, successful re-authenticated deletion and old-session invalidation. Browser E2E also covers the destructive-action re-authentication path.

The HTTP/proxy suite verifies that untrusted forwarded addresses do not split rate-limit buckets, trusted validated addresses do, invalid forwarded values fall back safely, limiter state is isolated per app instance, API responses are non-cacheable, production HSTS is emitted, and browser Fetch Metadata blocks non-same-origin mutation contexts.

The HTTP hardening work also exposed and fixed an existing configuration defect: explicit `nodeEnv` overrides supplied to `loadConfig` / `createJobApp` were previously ignored in favor of the process environment. The override contract is now tested.

The input-boundary work also closes a prior error-contract gap: too-short pasted job text is rejected as a controlled client validation error before `parseJobText` can throw a generic server-side exception.

Resource-error hardening preserves the domain/store separation: the API layer translates only known ownership/not-found store outcomes into 404 and uses domain transition predicates for client-visible 400 validation; unrelated database/runtime failures still surface as internal server errors rather than being masked.

Career Truth correction hardening follows the same boundary: store deletion operations are user-scoped and HTTP-agnostic, while the API maps only the exact known missing-record outcomes to stable public 404 responses.

The repository has repeatedly passed the full CI chain after hardening changes; an individual feature is not marked merged until its own PR run is green.

## Render test staging decision

Render is intentionally treated only as a **free disposable test environment**, not as production hosting.

`render.yaml` now specifies:
- Docker runtime from the repository Dockerfile,
- Frankfurt region,
- free web-service plan,
- deploy from `main` after CI checks,
- `/api/health` health check,
- ephemeral SQLite/upload paths under `/app/data`,
- `TRUST_PROXY=true` for platform ingress client-IP handling,
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
- Current executable MVP: first-party email/password, scrypt and opaque server sessions with bounded credential inputs, generic failure responses and destructive-action re-authentication.
- Status: functional with security regression coverage; production choice remains either additional hardening or migration to the selected managed provider.

### PDF
- Current implementation: server-side ReportLab with DejaVu Sans.
- Status: deterministic real PDF generation with Polish characters and Career Truth education rendering.

## Remaining MVP work

Before calling the master-plan MVP 0.1 gate complete:

1. **Live disposable staging acceptance** — apply the existing free Render Blueprint and run health, automated staging smoke, browser sanity and log review against the deployed commit.
2. **Representative-user first Decision Card time-to-value evidence** — execute the protocol in `docs/FIRST_DECISION_ACCEPTANCE.md` and validate the `<3 min` happy-path target with representative users; the automated technical 180-second gate is now present but is not a substitute for this product metric.
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
- Render test-staging Blueprint,
- deterministic npm dependency installation in CI and Docker via lockfile + `npm ci`,
- explicit trusted-proxy handling for single-instance rate limiting,
- API no-store cache policy and production transport/resource security headers,
- bounded ordinary JSON bodies and persistence-facing MVP input fields,
- stable resource-not-found contracts for foreign/nonexistent user-owned records,
- controlled non-mutating invalid application-transition handling,
- end-to-end user-entered education flow from Career Truth through package/CV/export,
- user-controlled Career Truth correction/removal for facts, experience and education, including current-employment representation,
- automated technical browser gate proving the first Decision Card path stays below 180 seconds in CI.

## Phase result

**PHASE 1 EXECUTABLE MVP CORE: PASS**

**MVP HARDENING / CI / LOCAL RECOVERY: PASS**

**LIVE STAGING: PENDING**

**MASTER PLAN MVP 0.1 ACCEPTANCE GATE: NOT YET COMPLETE**

No Today Engine / Strategy / Skill ROI / native mobile milestone is marked complete or allowed to supersede the remaining MVP gate work.
