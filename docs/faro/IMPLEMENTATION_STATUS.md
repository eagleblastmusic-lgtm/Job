# IMPLEMENTATION STATUS

Source 2026-09-16.1; audited main ae4af4e. Initial plan 1.0 preserved in 8b2524a; current plan 1.2. Implementation is in progress on codex/faro-canonical. Backend deliveries and workspace b7d93b8 are partial checkpoints, not a completed Canonical product.

Current product gap: CP08 now replaces the legacy authenticated client with the Canonical workspace. Full lifecycle and CP11 data export/deletion coverage, persistence/recovery and release verification remain open. This branch is not ready for public release. The login layout stays locked; the approved registration CTA was changed in a18b25d.

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

## CP08-A — Real workspace and two-sided process

GOAL / SCOPE: replace retired post-login client with an original Night/Gold workspace using persisted Canonical APIs. User has resumed the full plan beyond the earlier nearest-commit boundary.
CLASSIFICATION: DELTA_REQUIRED for authenticated client and assessment discovery; existing auth/offer/profile/process services reused.
DEPENDENCIES: CP02–CP07 service foundations; CP09/CP10 APIs.
IMPLEMENTATION: role switch, desktop split/mobile single pane, profile four layers, local proposal confirmation, private watch, exact projection dialog, interest, process clocks/reason/history/diff/contact controls, organization/invites, offer editor/publication, quiz overview/start/save/review, manual economics/comparison, inbox and moderation forms. Static PWA cache is now an exact public-asset allowlist. Async navigation aborts pending fetches and rejects stale renders; logout clears private client state. No mock inventory, CV client or billing upsell is mounted.
CHANGED FILES: src/client/faro{,Types,Ui,Views}.ts; public/{index.html,faro.css,sw.js}; src/server/faro/api.ts; e2e/faro.spec.ts; docs/faro progress files.
MIGRATIONS: none. API: scoped GET attempts and process-assessment discovery reuse the assessment authorization service.
TESTED: build/lint/typecheck PASS; 9 targeted Canonical node tests PASS; Playwright desktop and mobile scenarios 2 PASS, covering real candidate/employer data and persisted progression, private watch distinct from interest, economics, comparison, no calls to retired APIs, no browser errors, axe violations zero on offer workspace, 320px horizontal reflow, mobile back. Screenshots inspected. Exact auth markup and original styles compared with a18b25d: unchanged.
ACCEPTANCE: delivered browser path is verified; the broader CP08 contract remains open for remaining workflows and their browser verification.
LEGAL STATUS: local/test only; runtime production gate remains closed.
RISKS / DEFERRED: broader assessment/editor/moderation tests, profile-preview concurrency, structured clarification, appointment lifecycle and CP11 data rights still require work. Existing historical importer failures remain disclosed.
ROLLBACK: revert this checkpoint code; additive APIs have no schema change. Existing canonical data remains.
STATUS: DONE for CP08-A; CP08 remains PARTIAL.
NEXT CHECKPOINT: complete recruitment/privacy boundaries and assessment lifecycle, then data rights and operational release checks. Continue without waiting for another user instruction.

## CP11-A — Own data export, account erasure and ownership continuity (2026-10-03)

GOAL / SCOPE: complete the existing account export/deletion path for Canonical records; provide actual workspace controls and safe organization continuity.
CLASSIFICATION: DELTA_REQUIRED. Existing session/password/rate-limit/file-removal mechanisms are reused. External retention/legal-hold and persistent restore reconciliation remain SPEC_BLOCKED until approved policy/operational evidence.
DEPENDENCIES: existing account handlers, CP02 organizations, CP06 process/outbox and CP08 workspace.
IMPLEMENTATION: export own Canonical profile/history, events, attempts, grants, watches, economics and cases without other candidates or answer keys. Deletion cascades personal records, removes shared process notifications, redacts linked case free text and records an erasure hash. Solo-owned organization closes offers, cancels active processes and revokes grants/attempts; shared organization requires explicit owner transfer with password. Deleted responsible recruiter pauses remaining intake without deleting candidate histories. Workspace exposes download, consent, deletion, member revocation and ownership transfer.
CHANGED FILES: src/server/{app,store}.ts; src/server/faro/{api,privacyService}.ts; src/client/faro.ts; src/tests/faro-privacy.test.ts; e2e/faro.spec.ts; runtime documents under docs/faro.
MIGRATIONS: 0023_faro_data_rights.sql, additive local erasure ledger. No existing user database was deleted during implementation; tests delete only their generated fixtures.
TESTED: 6 data-rights/auth scenarios PASS; build/lint/typecheck PASS; 23 migrations validated; 4 desktop/mobile browser scenarios PASS including download contents, failed reauthentication without logout, successful deletion and revoked session. Final owner-recruiter pause correction is covered by the targeted API scenario.
ACCEPTANCE: own export, candidate erasure, solo organization closure and shared owner transfer verified through real HTTP and SQLite; workspace download/delete verified in both viewports.
LEGAL STATUS: local synthetic implementation; production/privacy legal gates remain open. Erasure ledger is not yet an external durable tombstone service.
RISKS / DEFERRED: backup restoration must reconcile current deletion ledger; purpose-specific retention/legal holds and production persistence remain release gates. No claim of complete GDPR compliance.
ROLLBACK: revert code; retain additive ledger; do not reverse completed account erasures from backups.
STATUS: DONE for CP11-A; CP11 remains PARTIAL.
NEXT CHECKPOINT: preview/confirmation consistency, structured process responses, interview lifecycle and full assessment workflow. Continue full plan.
# CP06-B — Confirmed preview consistency (2026-10-03)

GOAL / SCOPE: prevent profile changes in another tab from changing the data shared by a confirmed interest submission.
DEPENDENCIES: CP03 projection, CP06 transactional commands, CP08 preview dialog.
IMPLEMENTATION / FILES: ProfileService issues a digest of the user-scoped allowlisted projection; RecruitmentService compares it and inserts the same projection within commandOnce. API and workspace transmit the confirmation token. Existing preview-only contract remains unchanged. Updated recruitment, assessment and privacy test fixtures.
DB CHANGE / MIGRATIONS: none.
TESTED: build, lint, typecheck; all 13 Faro API/domain scenarios; all 4 desktop/mobile browser scenarios PASS.
ACCEPTANCE: missing/stale preview rejects without side effects; learning changes invalidate confirmation; stored data equals approved preview; later changes cannot mutate it; successful command replay remains idempotent.
LEGAL STATUS: engineering privacy boundary; external release gates remain open.
RISK: clients using the old interest payload must fetch the new confirmation token.
ROLLBACK: revert this isolated change together with client contract; no data migration required.
STATUS: DONE for CP06-B; overall CP06 remains PARTIAL.
DEFERRED / NEXT CHECKPOINT: interview lifecycle, structured clarification and outstanding assessment/operational work.
# CP06-C — Manual interview lifecycle (2026-10-03)

GOAL / SCOPE: real workspace proposal, confirmation, cancellation/rescheduling, completion reports, private ICS and review signal.
DEPENDENCIES: process commandOnce, organization assignments, outbox, CP08 workspace and CP11 erasure.
IMPLEMENTATION / FILES: new InterviewService and 0024 table with state constraints and single live slot per process; scoped API; client process controls; TrustService reminder recipient correction; RecruitmentService terminal obligation cancellation; privacy export/erasure integration; targeted API/domain and browser tests.
DB CHANGE / MIGRATIONS: 0024_faro_interviews.sql additive; old data retained.
ACCEPTANCE: both participant reservations checked in one SQLite write transaction; expected versions and idempotent replay; tenant isolation; spring/autumn DST; neutral proposal expiration; two-party completion; withdrawal releases slots; no-show only opens a review case; ICS has no contact/attendee fields. Candidate confirmation does not reveal phone.
LEGAL STATUS: manual scheduling foundation; moderation grace/appeal policy and production gates remain LEGAL REVIEW / TEST FIRST.
RISK / DEFERRED: external calendar integration deferred; reminders use existing admin tick until the operational worker checkpoint. No-show case bilateral explanations and approved policy deadlines remain for CP07; no automatic sanction is implemented. Browser local input is explicitly labelled; stored/displayed slot uses UTC / Europe/Warsaw.
ROLLBACK: revert code, preserve additive interview data; stop scheduling before rollout reversal.
TESTED: build/lint/typecheck PASS; 24 migrations PASS; all 15 Faro scenarios PASS; all 4 desktop/mobile browser scenarios PASS including real proposal/confirmation/ICS/reschedule. Final review additionally enforces the interview count from the original offer version, covered in the interview domain scenario.
STATUS: DONE for CP06-C manual interview foundation. Overall CP06 remains PARTIAL (structured clarification and repeat-interest history still open).
NEXT CHECKPOINT: structured privacy-safe clarification and bilateral moderation explanations, then assessment lifecycle and operations.
# CP06-D — Structured clarification and process actions (2026-10-03)

GOAL / SCOPE: close candidate free-text identity leakage and distinguish a meaningful question from empty acknowledgment.
DEPENDENCIES: original offer requirement snapshot, profile validators, process state machine and workspace.
IMPLEMENTATION / FILES: RecruitmentService validates typed question/response, derives safe question text and preserves profile/snapshot boundaries; API filters historical raw answer text; ProfileService shares strict availability validation; workspace renders structured response controls and history; available commands come from the server state machine. Changed client views/types/controller/labels and recruitment/browser tests.
DB CHANGE / MIGRATIONS: none; structured question/response lives in existing immutable process events. Historical private data is not destructively overwritten.
ACCEPTANCE: empty acknowledgment and unknown requirement do not close Clock A; extra surname/photo/phone/company/verification fields cannot cross the API; explicit answer resumes employer Clock B; declaration cannot create a verified profile fact. Invalid calendar dates reject; availability response is separate from profile data.
LEGAL STATUS: privacy boundary foundation; production gates unchanged.
RISK / DEFERRED: in-flight pre-upgrade free-text questions require recruiter replacement; open-ended candidate messaging is outside this current structured contract. Repeated-interest history and scheduled delivery remain for CP06.
ROLLBACK: coordinated client/server revert; preserve event history and keep privacy filtering if rolling back UI.
TESTED: build/lint/typecheck; all 16 Faro scenarios PASS; all 6 desktop/mobile browser scenarios PASS. The browser cleanup timeout was diagnosed from trace as fixture connection shutdown and repaired in the disposable test helper. Final legacy-question replacement is additionally covered by the targeted recruitment test.
STATUS: DONE for CP06-D; overall plan remains in progress.
NEXT CHECKPOINT: repeated-interest history, bilateral case explanations and assessment lifecycle.
# CP06-E — Explicit repeated-interest history (2026-10-03)

GOAL / SCOPE: make repeat interest a conscious new relation, preserving existing history and privacy.
DEPENDENCIES: terminal state machine, exact preview confirmation, private own-interest lookup and workspace.
IMPLEMENTATION / FILES: RecruitmentService validates latest candidate/offer link and explicit renewal, inserts a self-linked new process and event without rewriting old records; OfferService returns only the reader's own latest interest; client renders active-process action or explicit renewal preview and previous-process link. Targeted recruitment and real browser tests updated.
DB CHANGE / MIGRATIONS: additive 0025_faro_interest_history.sql, self FK with erasure-safe SET NULL and lookup index.
ACCEPTANCE: missing/wrong link rejected; active duplicate blocked; old status/clocks/events preserved; exact replay idempotent; employer own-interest field never reveals candidate interest identities.
TESTED: build/lint/typecheck PASS; 25 migrations PASS; all 17 Faro scenarios PASS; all 6 desktop/mobile browser scenarios PASS including explicit renewal and linked history.
LEGAL STATUS: engineering history foundation; production/retention gates remain open.
RISK / DEFERRED: pattern analysis operates over retained history in CP07; no automatic reputation reset or penalty is created here.
ROLLBACK: revert coordinated client/server contract, retain additive FK/history data.
STATUS: DONE for CP06-E; CP06 operational scheduled delivery remains open.
NEXT CHECKPOINT: bilateral no-show explanations/moderation, full assessment lifecycle and worker operations.
# CP07-B — Bilateral explanations and independent moderation (2026-10-03)

GOAL / SCOPE: provide symmetric private explanation and appeal after a confirmed appointment dispute, preserving employer privacy boundaries and concurrent case integrity.
DEPENDENCIES: CP06-C interview case, scoped assignments, process commandOnce/outbox, data rights and workspace.
IMPLEMENTATION / FILES: TrustService scopes case reads, immutable private explanations, versioned/idempotent review/appeal/report commands, explicit explanation deadline, independent moderator check, safe public reason and restriction-target guard. InterviewService notifies both parties/moderation without private statements. API/client expose explain/review/appeal and proper case notification links. PrivacyService own export/redaction follows the new evidence boundary. Domain/API/browser tests updated.
DB CHANGE / MIGRATIONS: 0026_faro_case_explanations.sql; case revision/deadline/public reason/appeal author, FK-cascaded private explanation records.
ACCEPTANCE: candidate can explain and appeal an employer report; employer cannot read candidate health text or appeal through list/export; moderator can read both sides with audit; involved moderator cannot read the other party's private evidence or decide the case; stale command conflicts; replay is idempotent; review waits for both sides or explicit deadline. No automatic sanction after timer expiry.
LEGAL STATUS: engineering workflow; production grace/retention/consequence policy remains LEGAL REVIEW / TEST FIRST. No default research-backed grace period is invented; independent moderator chooses a visible deadline.
RISK / DEFERRED: production staffed moderation and purpose-specific retention; candidate restrictions; proportional organization restriction restoration and pattern metrics remain open CP07 tasks. No portable reputation score.
ROLLBACK: coordinated API/client revert, keep additive evidence table and keep employer projection filtering; preserve legitimate case history subject to approved retention.
TESTED: build/lint/typecheck PASS; 26 migrations PASS; all 19 Faro scenarios PASS; all 8 desktop/mobile browser scenarios PASS, including both explanations, independent review, safe public reason and candidate appeal. Final own-export scope correction rechecked in privacy/interview scenarios.
STATUS: DONE for CP07-B; CP07 remains PARTIAL for pattern metrics, proportional restriction restoration and production policy gates.
NEXT CHECKPOINT: offer publication boundary, assessment lifecycle, worker scheduling and operational release evidence; continue the master plan.
# CP04-B — Published offer facts and active recruiter boundary (2026-10-03)

GOAL / SCOPE: protect candidate/watch projections from unapproved material offer edits and prevent intake after responsible recruiter revocation.
DEPENDENCIES: immutable offer versions, review/publication lifecycle, private watch and process snapshot.
IMPLEMENTATION / FILES: OfferService separates assigned draft reads and latest published reads with explicit version proof; candidate list/detail/watch/process diff follow published facts. Publishing stamps a version atomically; intake checks active role/assignment and publication. Edit/lifecycle rechecks revision inside transaction. RecruitmentService candidate comparisons use published facts; tests verify salary/title drafts stay private, diff after publication and revoked recruiter intake closure.
DB CHANGE / MIGRATIONS: 0027_faro_offer_publication.sql, additive publication proof/date/actor and reconfirmation timestamp. Legacy approval/interest witnesses establish visibility without inventing publication dates; unproven watched drafts stay quarantined until review.
ACCEPTANCE: assigned employer sees v2 draft while candidate/watch sees v1; outsider cannot read draft; candidate diff only changes after explicit publish; original interest remains on v1; responsible recruiter revocation removes public intake.
LEGAL STATUS: manual publication/privacy foundation; salary law and production gates remain open.
RISK / DEFERRED: legacy watcher-only versions without proof require operator review; no speculative backfill. Wider quality review and future AI offer generation are separate checkpoints.
ROLLBACK: preserve additive publication history; coordinated code rollback must retain candidate draft filtering.
TESTED: build/lint/typecheck PASS; 27 migrations PASS; all 20 Faro scenarios PASS; all 8 desktop/mobile browser scenarios PASS.
STATUS: DONE for CP04-B publication boundary; wider CP04/CP08 acceptance remains in progress.
NEXT CHECKPOINT: assessment lifecycle, scheduled delivery/worker operation and remaining release foundations.

# CP06-F — Scheduled local obligations and durable delivery (2026-10-03)
ID / TITLE: CP06-F, single-process Canonical worker.
GOAL / PURPOSE / CURRENT GAP: reminders and outbox previously required an admin tick or notification GET; idle users must receive durable in-app notifications.
SCOPE / IMPLEMENTATION / FILES: src/server/faro/worker.ts, faroApp.ts, config.ts, faro/api.ts, trustService.ts; tests faro-worker.test.ts, faro-recruitment.test.ts, fixture config overrides. One development timer calls existing TrustService.tick; app.close stops it before DB closure. Opaque failure status, next-cycle recovery, ADMIN-only aggregate diagnostics. Closing respects published deadlines.
DEPENDENCIES: existing transactional clocks, interview reminders, outbox dedupe/retry and publication proof.
DB CHANGE / MIGRATIONS: none; 27 existing migrations unchanged.
API CHANGE: GET /api/faro/worker/status; POST /worker/tick now uses the same worker and returns 503 on failure.
FRONTEND CHANGE: none; existing notification list reads delivered records.
ACCEPTANCE: pending notification delivered without GET, repeated cycles create no duplicate, transient error does not expose payload and recovers, close prevents future cycles, non-admin denied, production override cannot enable scheduler, draft deadline cannot close published offer.
TESTED: build/lint/typecheck PASS; all 24 Canonical scenarios PASS. No browser rerun: no client change, browser fixtures default to disabled worker. Previous 8 browser scenarios remain recorded for their unchanged inputs.
LEGAL STATUS: local foundations; production gate remains closed.
RISK / DEFERRED: no distributed lease, external channel delivery, dead-letter replay administration or production monitor; bounded 100-message batches and five delivery attempts are existing local policy.
ROLLBACK: disable FARO_WORKER_ENABLED or revert code; preserve outbox and immutable history.
STATUS: DONE for CP06-F local scheduler; CP06 overall PARTIAL.
NEXT CHECKPOINT: assessment assignment concurrency/idempotency and server expiry.

# CP10-B — Transactional assignment, server expiry and review deadline (2026-10-04)
ID / TITLE: CP10-B, assessment obligation integrity.
GOAL / PURPOSE / CURRENT GAP: assignment lacked concurrency/idempotency and idle attempts never expired; submitted results removed employer deadline.
SCOPE / IMPLEMENTATION / FILES: assessmentService.ts, trustService.ts, client faro.ts/faroUi.ts, assessment/privacy tests and e2e/faro.spec.ts. Assignment uses expected process revision and durable command key; definition/process checks, attempt, event and notification are one transaction. Save checks current answers inside transaction. Scheduled expiry preserves answers, creates one event/outbox and returns ACTIVE process to employer next step without automatic rejection/scoring. Clock B uses original offer decisionHours after expiry or submission. Start replay never restarts an expired attempt.
DEPENDENCIES: CP06-F worker, CP06 immutable original conditions, CP10 approved quiz foundation, CP08 workspace.
DB CHANGE / MIGRATIONS: none; additive existing schema supports states.
API CHANGE: POST /processes/:id/assessment now requires expectedVersion and idempotencyKey; stale assignment 409, exact replay returns same attempt, duplicate version gets a domain conflict.
FRONTEND CHANGE: assignment carries process revision/key; timeline labels expiry.
TESTS / TESTED: build/lint/typecheck PASS; all 25 Canonical scenarios PASS; new real quiz create/review/assign/start/submit/human-result workflow PASS on desktop and mobile (2 scenarios). Initial browser run omitted the required review confirmation; test corrected, both reruns PASS. Existing 8 browser workflows were not repeated for this bounded delta.
ACCEPTANCE: one assignment on replay, stale revision changes nothing, unstarted/started expiry without GET, saved answers retained, late writes denied, first-response clock unchanged, employer gets next deadline, no candidate-global ranking or automated employment decision.
LEGAL STATUS: local synthetic foundation; production assessment/scoring gate remains blocked.
RISK / DEFERRED: quiz only; definition editing, technical incident/retry policy, immutable result corrections and complex/manual scoring remain. Expiry does not infer skill absence or misconduct. No new global timeout policy is invented.
ROLLBACK: revert code/API+client together; retain attempt/event history. Disable local worker if needed.
STATUS: DONE for CP10-B; overall CP10 remains PARTIAL.
NEXT CHECKPOINT: immutable edited definitions and renewed approval.

# CP10-C — Immutable assessment editing and meaningful review (2026-10-04)
ID / TITLE: CP10-C, versioned assessment configuration.
GOAL / PURPOSE / CURRENT GAP: only service-internal version creation existed; employer could tick approval without seeing task content on the review screen.
SCOPE / IMPLEMENTATION / FILES: assessmentService.ts/API, faro.ts/faroTypes.ts/faroViews.ts, API tests and assessment browser journey. Scoped version read; idempotent editing creates next DRAFT version, validates current latest version, retains AI origin and rejects client-asserted approval. Historical approved versions remain immutable and existing attempts pinned; new assignment/review uses latest definition. Editor supports all existing quiz tasks, addition/removal (1–50), options/answer/points and rubric/time settings. Review exposes complete tasks, answer key, points, rubric and durations to assigned employer only.
DEPENDENCIES: CP10-B assignment/revision integrity, CP02 organization isolation, CP08 forms and state handling.
DB CHANGE / MIGRATIONS: none; existing composite definition/version FK pins attempts.
API CHANGE: GET /assessments/:id/versions/:version is employer scoped; PUT requires expectedVersion/idempotencyKey/data and returns 201 DRAFT. Superseded versions cannot receive new assignments or approval; stale edits return 409.
FRONTEND CHANGE: latest definition has a create-new-version action; edit saves back to recruitment assessment list for fresh review; historical versions have read-only preview. Multi-task fieldsets use existing workspace components.
TESTS / TESTED: build/lint/typecheck PASS; all 5 scenarios in faro-assessment-economics-trust.test PASS (new immutable edit/replay/isolation scenario included). Expanded quiz browser journey PASS on desktop/mobile: approve v1, edit/add second task, approve v2, assign/submit/review result. Other unchanged contracts retain prior checkpoint evidence; no claim of full legacy suite pass.
ACCEPTANCE: attempts keep v1 tasks/expiry/rubric, v2 starts DRAFT even with asserted APPROVED/origin HUMAN, edit replay creates one version, stale edit fails, candidate cannot retrieve answer keys, v2 assignment waits for fresh approval, v1 new assignment denied.
LEGAL STATUS: local synthetic foundation; production scoring/ranking review remains blocked.
RISK / DEFERRED: objective quiz only, no arbitrary file upload or automated complex scoring; incident accommodation/retry and immutable result corrections remain. Human approval checkbox records a conscious declaration, not proof of external task quality validation.
ROLLBACK: revert client/API together; retain additive version/attempt history and latest-version assignment guard.
STATUS: DONE for CP10-C; overall CP10 PARTIAL.
NEXT CHECKPOINT: remaining candidate constraints/watch preferences and operations/release foundations.

# CP06-G — Private watch alert preference and closing reminder (2026-10-04)
ID / TITLE: CP06-G, private watch controls.
GOAL / PURPOSE / CURRENT GAP: alerts flag existed without API/UI; no reminder before offer closure.
SCOPE / IMPLEMENTATION / FILES: recruitmentService.ts, trustService.ts, API, client faro.ts/faroTypes.ts/faroViews.ts; recruitment and browser tests. Watch list returns own watchAlerts only. Candidate can mute/enable alerts while keeping watch. Mute/unwatch removes pending optional offer alerts; applicant condition/process updates remain independent. Worker queues one upcoming-close reminder per published deadline within 24 hours, deduplicated across cycles; no pending draft deadline is used.
DEPENDENCIES: CP06-F scheduler/outbox and CP04-B publication proofs.
DB CHANGE / MIGRATIONS: none; existing private alerts field and outbox keys.
API CHANGE: PUT /offers/:id/watch with boolean alerts, own record only; absent own watch is 404 even if a candidateId is asserted. GET /watches exposes own flag, no employer watcher endpoint/count.
FRONTEND CHANGE: explicit mute/enable actions next to private watch; existing observation remains saved.
TESTS / TESTED: build/lint/typecheck PASS; 12 recruitment/worker scenarios PASS. Expanded real candidate/employer workflow PASS on desktop/mobile including alert toggles, axe check and 320px reflow. Unchanged other contracts retain previous evidence.
ACCEPTANCE: private owner scope, no employer watchers, mute keeps saved offer, pending optional alert removed, candidate process updates retained, closing reminder delivered once, alerts true restores eligibility, malformed preference rejected.
LEGAL STATUS: local in-app notifications; external messaging/consent and production gates remain open.
RISK / DEFERRED: 24-hour reminder window follows existing local reminder convention and remains TEST FIRST; no email/SMS or per-category channel selector. Already delivered notices remain own history; pending optional notices are cancelled.
ROLLBACK: revert preference UI/API/worker together; retain existing watches/alerts flags and delivered history.
STATUS: DONE for CP06-G; overall CP06 remains PARTIAL.
NEXT CHECKPOINT: explicit private candidate constraints in matching.

# CP05-A — Explicit private work condition constraints (2026-10-04)
ID / TITLE: CP05-A, user-controlled condition boundaries.
GOAL / PURPOSE / CURRENT GAP: preferences existed as unused JSON; offer list ignored explicit candidate boundaries.
SCOPE / IMPLEMENTATION / FILES: domain/faro/offers.ts condition explanation, profileService.ts preference validation/versioned persistence, offerService.ts list/detail, API, client profile/detail and tests. Private active flag, work models, contract types, no-nights/no-weekends. Server list includes only known-satisfied selected conditions; zero results never relax criteria. Detail states SATISFIED/KNOWN_NOT_MET/UNKNOWN separately. Watches/process history/direct permitted detail remain accessible outside list filters.
DEPENDENCIES: CP03 private profile, CP04 published structured conditions, CP08 workspace.
DB CHANGE / MIGRATIONS: none; existing preferences JSON and profile revision.
API CHANGE: PUT /profile/constraints requires expectedVersion and allowlisted constraints. Unknown client fields/candidateId discarded; stale revision 409. Candidate offer detail includes own conditionExplanation; assigned employer view does not receive candidate preferences.
FRONTEND CHANGE: private condition settings in saved profile, explicit activate/deactivate, empty selections mean all models/contracts; detail explains selected conditions and unknowns. Profile link from offer list.
TESTS / TESTED: build/lint/typecheck PASS; 10 recruitment scenarios PASS including 4-offer counterexample (satisfied/unknown/night/onsite), no-results stability, stale writes, employer unaffected and no projection leak. Expanded candidate/employer browser journey PASS desktop/mobile including preference persistence/explanation, axe and 320px reflow. Unchanged other contracts retain previous evidence.
ACCEPTANCE: unknown is not a failed ability or a satisfied condition; no automatic relaxation, billing never enters decisions, saved watch/process remains accessible, settings never enter initial employer projection, deactivate requires explicit user action.
LEGAL STATUS: deterministic user-selected local filters; external GDPR/fairness/production gates remain open.
RISK / DEFERRED: salary thresholds, commute-distance/time and exact hours need comparable money/unit/geography contracts; current scope never infers them from free text or converts B2B/UOP bases. Salary conditions stay fully visible in offers.
ROLLBACK: disable own active preference or revert list/client/API together; preserve private settings/history.
STATUS: DONE for CP05-A scoped condition filters; overall CP05 PARTIAL.
NEXT CHECKPOINT: offer salary variant preservation and economics comparison units; operational release foundations.
