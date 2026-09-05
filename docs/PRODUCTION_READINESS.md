# Production readiness checklist

## Functional

- [x] signup/login
- [x] onboarding/profile without CV
- [x] Career Truth Lite
- [x] CV upload
- [x] paste-job workflow
- [x] deterministic Job Parser
- [x] Decision Engine and Decision Card
- [x] user override
- [x] Application Package
- [x] CV generation
- [x] direct PDF export when ReportLab is installed
- [x] application tracker
- [x] outcome capture
- [x] data export/delete
- [x] trial state and product configuration
- [x] admin diagnostics
- [x] versioned required legal consent at signup
- [x] user-managed optional analytics consent
- [ ] live paid checkout — external payment credentials/provider not configured

## Quality

- [x] strict TypeScript configuration
- [x] unit tests
- [x] critical API E2E test
- [x] production build command
- [x] responsive mobile-first UI
- [x] browser-level Playwright E2E on desktop and mobile Chromium profiles
- [x] automated axe WCAG 2.2 A/AA scan for public and authenticated MVP surfaces
- [x] accessibility regression gate for labels, keyboard focus, target size and reduced motion
- [x] committed npm dependency lockfile with `npm ci` enforced in CI and Docker builds
- [x] API payload/field boundary regression tests for oversized JSON, job text, profile, Career Truth, experience and analytics inputs
- [ ] manual WCAG 2.2 AA review with assistive technology

## Security / operations

- [x] secure password hashing and HttpOnly sessions
- [x] controlled 4xx registration validation with bounded e-mail/password input sizes
- [x] generic login failure contract with dummy scrypt verification for unknown accounts
- [x] password re-authentication and rate limiting before irreversible account deletion
- [x] ordinary JSON request bodies capped at 64 KiB unless an endpoint has a documented larger requirement
- [x] paste-job endpoint capped at 256 KiB JSON / 100,000 characters of job text, with minimum useful-length validation before parsing
- [x] bounded profile, Career Truth, experience, decision override, application/outcome and analytics fields/lists before persistence
- [x] analytics event properties capped by property count and serialized size before sanitization/storage
- [x] private local uploads
- [x] upload extension/MIME/signature/size validation
- [x] portable relative upload storage keys with traversal-safe resolution
- [x] legacy Linux/Windows absolute upload path migration
- [x] rate limiting on vulnerable endpoints
- [x] instance-local rate-limit state with explicit trusted-proxy client-IP handling
- [x] spoofed forwarded IP ignored unless `TRUST_PROXY` is explicitly enabled
- [x] security headers and same-origin mutation guard
- [x] Fetch Metadata rejection for cross-site/same-site browser mutations
- [x] `Cache-Control: no-store` / `Pragma: no-cache` on API responses
- [x] production HSTS and same-origin resource isolation header
- [x] sensitive analytics minimization
- [x] analytics storage blocked when optional analytics consent is not active
- [x] versioned database migrations with CI validation
- [x] local backup/restore tooling
- [x] automated backup → restore-to-different-root semantic exercise in CI
- [x] production Docker build and container smoke test in CI
- [x] reproducible free Render Blueprint for disposable test staging with CI-gated deploy trigger
- [ ] live disposable Render staging deployment and environment-level acceptance run
- [ ] PostgreSQL production database
- [ ] managed encrypted backups + restore exercise against hosted infrastructure
- [ ] S3-compatible private storage
- [ ] malware scanning
- [ ] managed error monitoring (Sentry or equivalent)
- [ ] production product analytics provider, if retained after privacy review
- [ ] payment provider
- [ ] penetration test before broad launch

## Legal / privacy

- [x] test-version privacy and terms surfaces
- [x] versioned consent history in the database
- [x] data export and re-authenticated account deletion path
- [ ] final controller/service-provider identity and contact data
- [ ] final legal bases, processors/subprocessors and retention schedule
- [ ] final legal review before public beta

Current readiness: **repository and container are ready for disposable closed test staging; live staging has not yet been evidenced. Render is test-only and not a production durability target. Not ready for broad public launch.**
