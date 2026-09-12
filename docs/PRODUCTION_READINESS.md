# Production readiness checklist

## Functional MVP core

- [x] signup/login
- [x] onboarding/profile without CV
- [x] Career Truth Lite
- [x] user-entered/correctable facts, experience and education
- [x] explicit current employment with end-date clearing
- [x] education carried into Application Package, CV and export
- [x] CV upload
- [x] paste-job workflow and deterministic Job Parser
- [x] explainable Decision Engine / Decision Card / user override
- [x] Application Package and server-side PDF CV
- [x] application tracker with guarded transitions
- [x] outcome capture
- [x] data export and re-authenticated deletion
- [x] trial/product configuration
- [x] admin diagnostics with persisted ADMIN role and audited out-of-band provisioning
- [x] required legal consent and user-managed optional analytics consent
- [ ] live paid checkout/provider lifecycle

## Post-MVP staged features

- [x] deterministic persisted feature flags with 0/10/50/100 rollout and immediate fail-closed rollback
- [x] audited operator feature-flag command
- [x] Today / Action Priority implementation behind the disabled-by-default `today` flag
- [x] Today supports 10/30/60/120-minute budgets, max three actions, accept/complete/outcome persistence and calm no-guilt UX
- [x] Today API ownership/flag/input tests and Playwright/axe UI coverage
- [ ] Today real-user/product acceptance and staged rollout evidence
- [ ] Notifications
- [ ] Interview Prep Pack V1
- [ ] Job Sources / Feed / Dedupe
- [ ] Bottleneck / Confidence
- [ ] Local Labour Intelligence / Effective Wage
- [ ] Skill ROI / JIT Learning
- [ ] Career Transition / Outcome Inbox / Strategy
- [ ] Native/mobile and later data-moat phases

## Quality

- [x] strict TypeScript server/client/E2E checks
- [x] unit/API/security tests
- [x] fresh migration validation
- [x] critical Career Truth/education/Application Package/export coverage
- [x] correction/ownership/error-contract coverage
- [x] browser Playwright E2E on mobile and desktop Chromium
- [x] technical first Decision Card <=180s CI gate
- [x] automated axe WCAG 2.2 A/AA and accessibility regressions
- [x] locked npm dependency graph with `npm ci` in CI/Docker
- [x] semantic backup/restore exercise
- [x] production Docker build and running-container health smoke
- [ ] representative-user first Decision Card validation under 3 minutes
- [ ] manual WCAG 2.2 AA/assistive-technology review

## Security / operations

- [x] scrypt passwords, opaque hashed sessions and HttpOnly cookies
- [x] public registration cannot self-provision ADMIN through an email allow-list
- [x] audited out-of-band admin promotion
- [x] bounded authentication and application inputs
- [x] generic login failure + dummy verification path
- [x] re-authentication/rate limit before irreversible account deletion
- [x] same-origin/Fetch Metadata mutation defenses
- [x] security headers, production HSTS, API no-store
- [x] explicit trusted-proxy boundary and instance-local rate limiting
- [x] user-scoped data mutations and stable foreign/nonexistent error contracts
- [x] private portable upload storage and path/signature/MIME/size validation
- [x] shell-free malware scanner boundary with timeout and required-mode fail-closed behavior
- [x] analytics persistence blocked without active optional analytics consent
- [x] public generic client analytics ingestion removed
- [x] versioned migrations and local backup/restore tooling
- [x] reproducible free Render Blueprint for disposable test staging
- [ ] live disposable Render staging deployment + environment acceptance
- [ ] PostgreSQL production database
- [ ] private S3-compatible production object storage
- [ ] managed encrypted off-host backups and hosted restore drill
- [ ] live required malware scanner deployment/evidence
- [ ] managed error monitoring
- [ ] shared/distributed rate limiting if deployment becomes multi-instance
- [ ] payment provider
- [ ] penetration/security review before broad launch

## Legal / privacy

- [x] test-version privacy/terms surfaces and versioned consent history
- [x] data export and re-authenticated account deletion
- [ ] final controller/service-provider identity/contact data
- [ ] final legal bases, processors/subprocessors/transfers and retention schedule
- [ ] final legal review before public beta

## Current readiness

The repository/container is suitable for **closed disposable testing**, not broad public production. Render remains test-only and ephemeral. Today is implemented behind a feature flag but the Master Plan product gate requiring real usage is not claimed as passed. Public production still requires the external/manual/legal/provider/infrastructure items above.
