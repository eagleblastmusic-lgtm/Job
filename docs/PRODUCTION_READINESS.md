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
- [ ] live paid checkout — external payment credentials/provider not configured

## Quality

- [x] strict TypeScript configuration
- [x] unit tests
- [x] critical API E2E test
- [x] production build command
- [x] responsive mobile-first UI
- [ ] browser-level Playwright E2E — deferred until package registry/dependency install is available
- [ ] WCAG 2.2 AA audit with automated + manual tooling

## Security / operations

- [x] secure password hashing and HttpOnly sessions
- [x] private local uploads
- [x] upload type/size validation
- [x] rate limiting on vulnerable endpoints
- [x] security headers
- [x] sensitive analytics minimization
- [ ] PostgreSQL production database
- [ ] managed encrypted backups + restore exercise
- [ ] S3-compatible private storage
- [ ] malware scanning
- [ ] managed error monitoring (Sentry or equivalent)
- [ ] production product analytics (PostHog or equivalent)
- [ ] payment provider
- [ ] penetration test before broad launch

Current readiness: **closed local/internal MVP testing**, not broad public launch.
