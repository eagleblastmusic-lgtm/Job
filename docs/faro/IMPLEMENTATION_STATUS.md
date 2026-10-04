# IMPLEMENTATION STATUS

Source 2026-09-16.1; audited main ae4af4e. Initial plan 1.0 preserved in 8b2524a; current plan 1.1. Implementation is in progress on codex/faro-canonical. Backend deliveries through ea50b36 are partial checkpoints, not a completed Canonical product.

Current product gap: CP08 has not replaced the legacy authenticated client, which still calls retired endpoints. This branch is not ready for user-facing release. CP11 data export/deletion coverage, persistence/recovery and release verification also remain open. The login layout stays locked; the approved registration CTA was changed in a18b25d.

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

## CP07/CP09/CP10 backend delivery — ea50b36 (PARTIAL)

DONE: private reports and moderation cases with human review and appeal; stale-offer signals and organization pause; private manual economics scenarios; approved quiz definitions, assignment, server timing, deterministic scoring and human result review. CP08 was not implemented in this commit, despite the CP07–CP10 range in its title.
TESTED (prior delivery): build PASS; migration validation PASS (22); 3 assessment/economics/trust API scenarios PASS. The original assessment test created a HUMAN draft and checked approval sequencing; it did not test AI-origin draft assignment. It checked expiry by editing fixture state/timestamps, not by waiting through a real browser session. The new follow-up below adds the missing AI-origin contract evidence.
CHANGED FILES: migrations/0022_faro_assessment_trust_economics.sql; src/domain/faro/economics.ts; src/server/faro/{assessmentService,economicsService,trustService,api}.ts; src/tests/faro-assessment-economics-trust.test.ts.
MIGRATIONS: 0022 additive.
RISKS: definitions use DRAFT → IN_REVIEW → APPROVED; attempts use INVITED → STARTED → SCORED_PENDING_REVIEW → FINALIZED. Submit records ATTEMPT_SUBMITTED but does not persist a separate SUBMITTED state. Other schema states are not proof of implemented transitions. Worker execution is a manual authenticated admin call; no scheduled worker is wired.
DEFERRED: role-specific UI, comparison UI, definition editing/versioning through HTTP, attempt discovery route, broader lifecycle paths, file/code tasks, AI-assisted grading, automated tax/routing, production persistence and legal gates.
NEXT CHECKPOINT: CP08 original workspace consuming real APIs, with CP09/CP10 integration remaining open; then CP11 hardening.

## CP10-V1 — AI draft approval evidence and status correction

GOAL / SCOPE: verify the existing assignment guard through HTTP for an AI-origin draft and report checkpoint readiness accurately.
CLASSIFICATION: ALREADY_CLOSED for the service approval guard; DELTA_REQUIRED for its missing AI-origin API evidence and inaccurate completion statuses. No production implementation change is needed for this guard.
DEPENDENCIES: ea50b36 assessment API, existing faroFixture and lifecycle test; initial plan remains in Git.
IMPLEMENTATION: extend the existing lifecycle scenario with AI origin and client-supplied approval fields. Attempt assignment in DRAFT, IN_REVIEW and after approval without confirmation; require rejection with zero attempts and unchanged process stage/revision. Retain the successful explicitly confirmed approval → assignment → scoring path. Correct checkpoint statuses to PARTIAL and distinguish implemented transitions from schema-only states.
CHANGED FILES: src/tests/faro-assessment-economics-trust.test.ts; docs/faro/{FARO_CANONICAL_IMPLEMENTATION_MASTER_PLAN,08_CHECKPOINT_REGISTER,IMPLEMENTATION_STATUS}.md.
MIGRATIONS / API / FRONTEND: none.
TESTED (2026-09-17): npm run build, npm run lint and npm run typecheck PASS; node --test --test-isolation=none dist/tests/faro-assessment-economics-trust.test.js: 3 PASS / 0 FAIL; git diff --check PASS. This follow-up does not claim a fresh full-suite or browser result; production code and migrations are unchanged.
ACCEPTANCE CRITERIA: the expanded API scenario passes; false checkpoint completion claims are removed; the initial plan commit and existing production behavior remain intact.
LEGAL STATUS: local synthetic testing only; production gates unchanged.
RISKS: proves server review requirements for labelled AI material, not a live AI integration or complete assessment lifecycle. Historical full-suite importer failures remain open.
ROLLBACK: revert this test/documentation commit; no data or runtime rollback required.
STATUS: DONE for this bounded evidence/status correction only; CP10 remains PARTIAL.
DEFERRED: CP08 workspace, remaining CP09/CP10 integration and CP11 release hardening.
NEXT CHECKPOINT: CP08; user requested this continuation only through the nearest commit.
