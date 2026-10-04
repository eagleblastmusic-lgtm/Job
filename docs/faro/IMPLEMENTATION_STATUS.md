# IMPLEMENTATION STATUS

Initial plan version: 1.0, source 2026-09-16.1; main ae4af4e. No implementation yet.

## CP00

DONE: inspected actual main, preserved canonical source, saved full master plan/current system map/gap matrix/checkpoint register/PR sequence/coverage.
TESTED: baseline build PASS; node suite 90 PASS / 2 existing importer failures out of 92. Sandbox EPERM resolved by reviewed local test execution.
CHANGED FILES: docs/faro only.
MIGRATIONS: none.
RISKS: production legal/persistence gates unresolved; working parent contains separate user changes.
DEFERRED: production launch, counsel opinions, full taxonomy import, payroll rules/provider licenses, external research/outreach.
NEXT CHECKPOINT: CP01 after initial plan commit and completeness verification.

No checkpoint may be marked complete based only on documentation, schema or helper existence. Report partial end-to-end scope precisely.

## CP01 delivery 1

DONE: canonical runtime allowlist; legacy CV/EHV/billing/import handlers unreachable through production entrypoint. New accounts FREE/ACTIVE; approved registration copy changed only.
TESTED: build PASS; 4 targeted runtime/auth tests PASS.
CHANGED FILES: src/server/faroApp.ts, index.ts, store.ts; public/index.html; src/tests/faro-runtime.test.ts.
MIGRATIONS: none.
RISKS: workspace replacement and canonical APIs are next; intermediate commit is not a deployable product release. Legacy modules remain testable for migration evidence, not mounted.
DEFERRED: baseline 2 importer failures caused by historical connector/fixture disagreement (generic connector no longer uses dedicated OLX/LinkedIn parsing); restoring these external fetch capabilities without rights would violate Canonical. They remain disclosed, not hidden or skipped.
NEXT CHECKPOINT: CP02 + CP03 organization/projection/profile foundation.

## CP02/CP03 foundation delivery

DONE: persistent organizations, scoped memberships/invitations/revocation/manual verification; four-part profile storage, explicit first name, private activities and contact, pending question proposals, versioned confirmed claims, learning intents, one allowlisted nested employer projection and preview. Proposals currently use transparent local question rules, not a claim of live AI.
TESTED: build PASS; migration validation PASS (20); 3 API/auth contract tests PASS including tenant denial, proposal confirmation/replay, malicious extra metadata, no private history/phone leak.
CHANGED FILES: migrations/0020_faro_foundation.sql; src/domain/faro/skills.ts; src/server/faro/{api,base,validation,profileService}.ts; app.ts/faroApp.ts; src/tests/faro-{fixture,profile}.ts.
MIGRATIONS: 0020 additive; existing data untouched.
RISKS: ESCO licensed mapping, MFA/recovery, full UI, process assignments and backup owner transfer remain open; local authored labels explicitly not labelled ESCO.
DEFERRED: external AI provider activation, real-data production (runtime returns RELEASE_GATES_OPEN in production).
NEXT CHECKPOINT: CP04/CP05 native offers and deterministic matching; then CP06 transactional recruitment.

## CP04–CP06 native process delivery

DONE: typed salary-required native offers with human review and immutable versions; material diff; deterministic requirement matching; transactional interest, original snapshot, actor/state/version/idempotency checks, structured rejection bound to original requirement, separate clocks, private watch, explicit phone grant/revoke, durable deduplicated outbox/inbox.
TESTED: build PASS; 21 migrations PASS; 3 end-to-end API contract tests PASS covering full interest/advance/withdraw flow, foreign organization denial, salary/paused/stale restrictions, missing rejection requirement, immutable diff, billing invariance and notification replay.
CHANGED FILES: migrations/0021_faro_recruitment.sql; domain/faro/{offers,recruitment}.ts; server/faro/{offerService,recruitmentService,api}.ts; tests/faro-{fixture,recruitment}.ts.
MIGRATIONS: 0021 additive.
RISKS: periodic worker, moderation, UI and appointments not yet delivered; active confirmation interval 14 elapsed days is provisional local policy TEST FIRST, not a release-approved standard.
DEFERRED: production legal gates; business-day SLA calendar (current contract explicitly elapsed calendar hours).
NEXT CHECKPOINT: CP07 trust worker; CP08 workspace; CP09/CP10 economics and assessments.
