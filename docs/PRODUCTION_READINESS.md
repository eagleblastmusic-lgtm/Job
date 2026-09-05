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
- [ ] manual WCAG 2.2 AA review with assistive technology

## Security / operations

- [x] secure password hashing and HttpOnly sessions
- [x] private local uploads
- [x] upload extension/MIME/signature/size validation
- [x] rate limiting on vulnerable endpoints
- [x] security headers and same-origin mutation guard
- [x] sensitive analytics minimization
- [x] analytics storage blocked when optional analytics consent is not active
- [x] versioned database migrations with CI validation
- [x] local backup/restore tooling
- [x] production Docker build and container smoke test in CI
- [x] reproducible Render staging Blueprint with persistent data disk and CI-gated deploy trigger
- [ ] live internal staging deployment and environment-level acceptance run
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
- [x] data export and account deletion path
- [ ] final controller/service-provider identity and contact data
- [ ] final legal bases, processors/subprocessors and retention schedule
- [ ] final legal review before public beta

Current readiness: **repository and container are ready for closed internal staging; live staging has not yet been evidenced. Not ready for broad public launch.**
