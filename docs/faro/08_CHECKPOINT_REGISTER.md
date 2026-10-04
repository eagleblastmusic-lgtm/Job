# CHECKPOINT REGISTER

All rows retain their initial execution contracts; live status is updated with evidence. CP00: audit + complete saved plan, DONE in 8b2524a before production edits. As reviewed on 2026-09-17 against ea50b36, CP01–CP07 and CP09–CP10 have partial backend deliveries, not complete checkpoint acceptance. CP08 and CP11 remain planned. A delivery commit is not evidence of a working two-role workspace or release readiness. See IMPLEMENTATION_STATUS.md for verification and remaining scope.

## CP01 — Foundation and retirement of rejected paths
- ID: CP01
- TITLE: Foundation and retirement of rejected paths
- GOAL / PURPOSE: Disconnect canonical runtime from CV recruitment, EHV, trial products and unauthorized import; fix fixture defects without enabling prohibited fetch
- CURRENT GAP: Existing security primitives plus prohibited live legacy routes
- CLASSIFICATION: DELTA_REQUIRED for engineering foundation; SPEC_BLOCKED for external decisions explicitly listed.
- SCOPE: Disconnect canonical runtime from CV recruitment, EHV, trial products and unauthorized import; fix fixture defects without enabling prohibited fetch
- FILES / MODULES: src/server/app.ts; extendedApp.ts; store.ts; publicJobIngestionService.ts; src/tests; public/index.html; public/sw.js
- DEPENDENCIES: CP00
- IMPLEMENTATION: Explicit retired-route response; free billing response; canonical gate; enforce layer boundaries and transactional behavior from master plan.
- DB CHANGE / MIGRATIONS: None; existing subscriptions remain historical; newly created accounts free
- API CHANGE: Explicit retired-route response; free billing response; canonical gate
- FRONTEND CHANGE: Only approved registration CTA; auth visual asset lock
- TESTS: Baseline fixtures, auth regression, retirement/no candidate checkout, cache allowlist
- ACCEPTANCE CRITERIA: Legacy route no longer callable in canonical runtime; fixture intent retained in isolated historical tests
- LEGAL STATUS: LEGAL CLEAR for local removal; source fetch LEGAL REVIEW
- RISK: Legacy consumers expect old routes
- ROLLBACK: Revert checkpoint commit; no data deletion
- STATUS: PARTIAL (runtime retirement/free-first in a18b25d; service-worker cache allowlist and historical fixture failures unresolved).

## CP02 — Organization scope and candidate projection
- ID: CP02
- TITLE: Organization scope and candidate projection
- GOAL / PURPOSE: Create membership/assignment authorization and exact minimized projection
- CURRENT GAP: No organization or employer service in baseline
- CLASSIFICATION: DELTA_REQUIRED for engineering foundation; SPEC_BLOCKED for external decisions explicitly listed.
- SCOPE: Create membership/assignment authorization and exact minimized projection
- FILES / MODULES: src/domain/faro/privacy.ts; src/server/faro/*; migrations/0020*; src/tests/faro*
- DEPENDENCIES: CP01
- IMPLEMENTATION: Org create/list; authorized offer/process access; preview; later contact grant; enforce layer boundaries and transactional behavior from master plan.
- DB CHANGE / MIGRATIONS: Organizations/members/assignments/profiles/claims; additive FKs
- API CHANGE: Org create/list; authorized offer/process access; preview; later contact grant
- FRONTEND CHANGE: Role switch, org setup, same preview as employer
- TESTS: Two-tenant reads/mutations, inactive member, nested PII, CV/phone/history exclusion
- ACCEPTANCE CRITERIA: All employer output crosses allowlist; no watcher/private profile in organization DTO
- LEGAL STATUS: LEGAL CLEAR local; real-data/public LEGAL BLOCKER
- RISK: Owner privileges must not imply process access
- ROLLBACK: Disable canonical namespace; retain added tables
- STATUS: PARTIAL (organization/projection foundation in 20263a6, assignments in de1d3ec; role-switch/setup/preview UI and full projection audit remain).

## CP03 — Four-part skills profile and decomposition
- ID: CP03
- TITLE: Four-part skills profile and decomposition
- GOAL / PURPOSE: Persist activities, pending proposals and explicit versioned claims
- CURRENT GAP: Legacy facts distinguish inference but CV/title history dominates
- CLASSIFICATION: DELTA_REQUIRED for engineering foundation; SPEC_BLOCKED for external decisions explicitly listed.
- SCOPE: Persist activities, pending proposals and explicit versioned claims
- FILES / MODULES: src/domain/faro/skills.ts; src/server/faro/profileService.ts; src/client/faro*.ts
- DEPENDENCIES: CP02
- IMPLEMENTATION: Own profile/activities/proposals accept/reject/claims/learning; enforce layer boundaries and transactional behavior from master plan.
- DB CHANGE / MIGRATIONS: Activities/proposals/claims/learning; skill concept provenance
- API CHANGE: Own profile/activities/proposals accept/reject/claims/learning
- FRONTEND CHANGE: Four sections, descriptive levels, source/practice/evidence and declaration labels
- TESTS: Pending/rejected never match; accept replay; invalid source/level; no auto verification
- ACCEPTANCE CRITERIA: Candidate with no experience can proceed; acceptance stored with actor/date/version
- LEGAL STATUS: LEGAL CLEAR manual/local; AI provider and taxonomy import LEGAL REVIEW
- RISK: Free text can leak identity; do not expose raw descriptions
- ROLLBACK: Disable proposal generation, preserve manual profile
- STATUS: PARTIAL (profile/confirmation API in 20263a6; four-section UI absent, decomposition uses local rules; live AI and taxonomy mapping remain gated).

## CP04 — Native offers, salary and immutable versions
- ID: CP04
- TITLE: Native offers, salary and immutable versions
- GOAL / PURPOSE: Build actual employer publishing and update lifecycle
- CURRENT GAP: Imported per-user jobs are not native offers
- CLASSIFICATION: DELTA_REQUIRED for engineering foundation; SPEC_BLOCKED for external decisions explicitly listed.
- SCOPE: Build actual employer publishing and update lifecycle
- FILES / MODULES: src/domain/faro/offers.ts; src/server/faro/offerService.ts; migrations/0021*
- DEPENDENCIES: CP02,CP03
- IMPLEMENTATION: Create/edit/review/publish/pause/close/archive/reconfirm/list/diff; enforce layer boundaries and transactional behavior from master plan.
- DB CHANGE / MIGRATIONS: Offers/versions and review state, responsible assignment, active confirmation
- API CHANGE: Create/edit/review/publish/pause/close/archive/reconfirm/list/diff
- FRONTEND CHANGE: Structured wizard and exact conditions, missing salary errors
- TESTS: Money basis/period/range, review invalidation, immutable baseline, stale intake
- ACCEPTANCE CRITERIA: Published offers complete; changed material data generates immutable version; stale/paused blocked
- LEGAL STATUS: LEGAL CLEAR local; public marketplace LEGAL BLOCKER
- RISK: Silent editing could erase applied conditions
- ROLLBACK: Pause canonical intake and revert routes; preserve versions
- STATUS: PARTIAL (offer/version/review API in de1d3ec; structured employer wizard and browser acceptance remain).

## CP05 — Explainable matching and constraints
- ID: CP05
- TITLE: Explainable matching and constraints
- GOAL / PURPOSE: Explain every requirement and learning path without score
- CURRENT GAP: Legacy aggregates and no WILL_TEACH semantics
- CLASSIFICATION: DELTA_REQUIRED for engineering foundation; SPEC_BLOCKED for external decisions explicitly listed.
- SCOPE: Explain every requirement and learning path without score
- FILES / MODULES: src/domain/faro/matching.ts; src/server/faro/offerService.ts; src/tests/faro-domain*
- DEPENDENCIES: CP03,CP04
- IMPLEMENTATION: Offer detail includes deterministic explanation and explicit constraints; enforce layer boundaries and transactional behavior from master plan.
- DB CHANGE / MIGRATIONS: No billing join or score storage
- API CHANGE: Offer detail includes deterministic explanation and explicit constraints
- FRONTEND CHANGE: Why this offer/road to job panels, unknown distinct from failure
- TESTS: Billing metamorphism, WILL_TEACH, unknown, levels, no unconfirmed proposals
- ACCEPTANCE CRITERIA: Same relevant inputs yield same explanations/order across billing; no match %
- LEGAL STATUS: LEGAL CLEAR deterministic local; deployment GDPR review
- RISK: Unknown incorrectly rendered as not capable
- ROLLBACK: Revert matching presentation; preserve offer conditions
- STATUS: PARTIAL (requirement explanation and workspace delivered; CP05-A adds explicit private model/contract/night/weekend boundaries and unknown states. Salary/commute/unit constraints and broader skills graph validation remain).

## CP06 — Recruitment, clocks, watch and outbox
- ID: CP06
- TITLE: Recruitment, clocks, watch and outbox
- GOAL / PURPOSE: Complete interest→human response with privacy and concurrency
- CURRENT GAP: Personal application statuses and pull-only notifications
- CLASSIFICATION: DELTA_REQUIRED for engineering foundation; SPEC_BLOCKED for external decisions explicitly listed.
- SCOPE: Complete interest→human response with privacy and concurrency
- FILES / MODULES: src/domain/faro/recruitment.ts; src/server/faro/recruitmentService.ts; worker; tests
- DEPENDENCIES: CP04,CP05
- IMPLEMENTATION: Preview/interest/process/command/watch/grant/inbox/offer diff; enforce layer boundaries and transactional behavior from master plan.
- DB CHANGE / MIGRATIONS: Interest/snapshot/events/grants/watch/outbox/idempotency
- API CHANGE: Preview/interest/process/command/watch/grant/inbox/offer diff
- FRONTEND CHANGE: Exact preview, interest action, timeline, reason form, watch alerts
- TESTS: Version conflict, duplicate key, actor matrix, original clocks, requirement snapshot, private watch, grant revoke
- ACCEPTANCE CRITERIA: Transaction state+audit+outbox; meaningful response only closes Clock A; Clock B independent
- LEGAL STATUS: LEGAL CLEAR local; real data LEGAL BLOCKER
- RISK: Competing terminal decisions, retry duplications, contact grant race
- ROLLBACK: Stop worker and intake; rollback code without dropping events
- STATUS: PARTIAL (transactional process/watch/grants/outbox, workspace, exact preview, manual interview/ICS, structured clarification, repeated-interest history and single-process development scheduler delivered. Production leased execution, channel/preferences and complete obligation policy remain; CP06-B/C/D/E/F evidence in IMPLEMENTATION_STATUS.md).

## CP07 — Trust and moderation foundations
- ID: CP07
- TITLE: Trust and moderation foundations
- GOAL / PURPOSE: Record signals, review and proportional decisions
- CURRENT GAP: No case/appeal/reconfirmation persistence
- CLASSIFICATION: DELTA_REQUIRED for engineering foundation; SPEC_BLOCKED for external decisions explicitly listed.
- SCOPE: Record signals, review and proportional decisions
- FILES / MODULES: src/domain/faro/trust.ts; src/server/faro/trustService.ts; worker
- DEPENDENCIES: CP06
- IMPLEMENTATION: Report own process; admin review; appeal; overdue task handling; enforce layer boundaries and transactional behavior from master plan.
- DB CHANGE / MIGRATIONS: Cases/evidence/appeals/policy version, no candidate score
- API CHANGE: Report own process; admin review; appeal; overdue task handling
- FRONTEND CHANGE: Private report/case state and honest overdue display
- TESTS: No automatic fake-company verdict; withdrawal/low score neutral; pause keeps existing access
- ACCEPTANCE CRITERIA: Reviewable evidence and human reasons; no fixed multiplier or immediate no-show sanction
- LEGAL STATUS: LEGAL REVIEW operational policy; local case structure clear
- RISK: False signal or punishing candidates for platform failure
- ROLLBACK: Disable signal creation; retain review history
- STATUS: PARTIAL (case/review/appeal and manual worker tick in ea50b36; UI, scheduled execution and broader overdue/pattern handling remain).

## CP08 — Original authenticated Faro workspace
- ID: CP08
- TITLE: Original authenticated Faro workspace
- GOAL / PURPOSE: Deliver both roles with desktop split and mobile single pane
- CURRENT GAP: DOM UI centered on CV wizard
- CLASSIFICATION: DELTA_REQUIRED for engineering foundation; SPEC_BLOCKED for external decisions explicitly listed.
- SCOPE: Deliver both roles with desktop split and mobile single pane
- FILES / MODULES: src/client/faro.ts; public/faro.css; public/index.html script wiring; e2e/faro.spec.ts
- DEPENDENCIES: CP03,CP04,CP05,CP06,CP07
- IMPLEMENTATION: Consume actual canonical endpoints; no mock production state; enforce layer boundaries and transactional behavior from master plan.
- DB CHANGE / MIGRATIONS: None
- API CHANGE: Consume actual canonical endpoints; no mock production state
- FRONTEND CHANGE: Night/Gold token shell, navigation/list/detail/profile/organization/process, forms/loading/empty/error
- TESTS: Desktop/mobile end-to-end, axe, 320px overflow, keyboard/back/focus, login source lock
- ACCEPTANCE CRITERIA: Login preserved except approved text; real persisted two-sided process; no fake inventory
- LEGAL STATUS: LEGAL CLEAR local; no public activation before gates
- RISK: Login selector bleed or stale requests across session
- ROLLBACK: Restore prior app script reference; leave canonical data intact
- STATUS: PARTIAL (real workspace and candidate/employer process delivered; desktop/mobile profile/watch/interest/economics/advance and axe verified. Assessment/editor/privacy/interview completion follows).

## CP09 — Private Job Economics and comparison
- ID: CP09
- TITLE: Private Job Economics and comparison
- GOAL / PURPOSE: Separate money/time and provide honest manual fallback
- CURRENT GAP: Rejected effective wage; no validated tax rules
- CLASSIFICATION: DELTA_REQUIRED for engineering foundation; SPEC_BLOCKED for external decisions explicitly listed.
- SCOPE: Separate money/time and provide honest manual fallback
- FILES / MODULES: src/domain/faro/economics.ts; src/server/faro/economicsService.ts; client compare
- DEPENDENCIES: CP04,CP08
- IMPLEMENTATION: Own scenario calculate/save/get; no employer read; enforce layer boundaries and transactional behavior from master plan.
- DB CHANGE / MIGRATIONS: Private scenarios/version provenance
- API CHANGE: Own scenario calculate/save/get; no employer read
- FRONTEND CHANGE: Comparison table and inputs with source/date/assumptions/unknown
- TESTS: Minor units/null/basis incompatibility/transport alternatives/privacy/no EHV
- ACCEPTANCE CRITERIA: Gross/net/commute/remainder distinct, unknown stays null; tax unsupported explicitly
- LEGAL STATUS: LEGAL CLEAR manual local; automated tax/routing LEGAL REVIEW
- RISK: Misleading UOP/B2B comparison and false precision
- ROLLBACK: Disable calculator, keep direct offer conditions
- STATUS: PARTIAL (private manual scenarios and comparison UI delivered; CP09-B aligns selected basis/period and records explicit units. Automatic tax/routing and validated source integrations remain gated).

## CP10 — Assessment foundations with real lifecycle
- ID: CP10
- TITLE: Assessment foundations with real lifecycle
- GOAL / PURPOSE: Build approved version→assignment→server timer→score→review
- CURRENT GAP: No definition/attempt engine
- CLASSIFICATION: DELTA_REQUIRED for engineering foundation; SPEC_BLOCKED for external decisions explicitly listed.
- SCOPE: Build approved version→assignment→server timer→score→review
- FILES / MODULES: src/domain/faro/assessment.ts; src/server/faro/assessmentService.ts; migrations/0022*; client
- DEPENDENCIES: CP06,CP08
- IMPLEMENTATION: Create/configure/review/approve/assign/overview/start/save/submit/review/result; enforce layer boundaries and transactional behavior from master plan.
- DB CHANGE / MIGRATIONS: Definitions/version approval/assignments/attempts/answer revisions/results
- API CHANGE: Create/configure/review/approve/assign/overview/start/save/submit/review/result
- FRONTEND CHANGE: Overview before Start, tasks, timer/reconnect, human result review
- TESTS: AI draft cannot assign, edits invalidate, server expiry, GET no start, scope/answer key hidden, no auto decision
- ACCEPTANCE CRITERIA: One exact-answer task works; manual review tracked; no person ranking; extension to file/code remains gated
- LEGAL STATUS: LEGAL BLOCKER production scoring/ranking until review; foundations local
- RISK: Timer/answers lost, keys exposed, rubric incomparable
- ROLLBACK: Disable assignment/start; retain completed records for scoped export
- STATUS: PARTIAL (approved quiz service/API and workspace verified; CP10-B protects assignment/replay and idle expiry with employer deadlines. CP10-C delivers immutable definition editing and renewed approval; technical incident policy and result correction remain).

## CP11 — Privacy, operations and release hardening
- ID: CP11
- TITLE: Privacy, operations and release hardening
- GOAL / PURPOSE: Complete exports/deletion/recovery and document public release blockers
- CURRENT GAP: SQLite, old partial export, ephemeral free deployment, no MFA/Postgres
- CLASSIFICATION: DELTA_REQUIRED for engineering foundation; SPEC_BLOCKED for external decisions explicitly listed.
- SCOPE: Complete exports/deletion/recovery and document public release blockers
- FILES / MODULES: src/server/faro/privacyService.ts; tests; scripts; CI; docs/faro runtime docs
- DEPENDENCIES: CP01–CP10
- IMPLEMENTATION: Scoped export/delete; safe operational health; enforce layer boundaries and transactional behavior from master plan.
- DB CHANGE / MIGRATIONS: Deletion request/tombstone hooks; PostgreSQL requires separate rehearsed adapter
- API CHANGE: Scoped export/delete; safe operational health
- FRONTEND CHANGE: Data rights controls and session/offline behavior
- TESTS: All project checks, restore/restart, deletion/FKs, final browser, Docker if available
- ACCEPTANCE CRITERIA: Local verified release artifacts plus explicit unmet external gates; no production launch claim
- LEGAL STATUS: LEGAL REVIEW retention/launch; irreversible operations require explicit scope
- RISK: Data loss, incomplete privacy erasure, false production readiness
- ROLLBACK: Verified backup and read-only downtime; never destructive migration shortcut
- STATUS: PARTIAL (CP11-A own export/deletion, member controls and owner transfer delivered; persistence, restore reconciliation and full release verification remain).

## CP12 — External gates and post-MVP register
- ID: CP12
- TITLE: External gates and post-MVP register
- GOAL / PURPOSE: Preserve accepted vision and truthful research/launch status
- CURRENT GAP: No counsel opinion, user validation, supply or tax/provider rights evidence
- CLASSIFICATION: DELTA_REQUIRED for engineering foundation; SPEC_BLOCKED for external decisions explicitly listed.
- SCOPE: Preserve accepted vision and truthful research/launch status
- FILES / MODULES: docs/faro; future approved integrations and tools only
- DEPENDENCIES: CP11 plus K dependencies in matrix
- IMPLEMENTATION: No unapproved outbound/provider/source endpoints; enforce layer boundaries and transactional behavior from master plan.
- DB CHANGE / MIGRATIONS: No live billing/schema import without approval
- API CHANGE: No unapproved outbound/provider/source endpoints
- FRONTEND CHANGE: Inclusive brand copy; future tools only after value validation
- TESTS: User studies, counsel memo, tax golden cases, provider license, CI/production evidence
- ACCEPTANCE CRITERIA: Written gates resolved; staffed moderation and real supply; no unauthorized outreach
- LEGAL STATUS: LEGAL REVIEW / TEST FIRST / DEFER as matrix
- RISK: Premature launch or invented evidence
- ROLLBACK: Pause launch; preserve free local core
- STATUS: PLANNED

## CP11-B — Fail-closed Canonical DB-only recovery (2026-10-04)
ID / TITLE: CP11-B, isolated recovery with current erasure and access authority.
GOAL / PURPOSE / CURRENT GAP: a legacy snapshot could resurrect erased subjects, old credentials/privileges and disclosures.
SCOPE / IMPLEMENTATION / FILES: recoveryService.ts, privacyService.ts internal recovery reuse, db.ts constructor cleanup, restore-faro.mjs, faro-backup-restore-exercise.mjs, package.json and operational documentation. New absent target only; integrity/FK validation; current consistent read-only authority snapshot captured after copying/migration; transactionally replay deletions and restrict stale authority/disclosure/intake. No sensitive ledger output.
DB CHANGE / MIGRATIONS: none; existing erasure/member/grant/audit records reused.
API CHANGE / FRONTEND CHANGE: none; no offline override reachable from API.
DEPENDENCIES: CP11-A erasure/ownership, CP02 RBAC, CP04 versioning, CP06 processes, CP10 attempts.
TESTS / TESTED: real-file restore rehearsal PASS including current credentials, owner transfer/fallback closure, erasure replay and failure cleanup; build/typecheck/lint, 27 migrations and 28 Faro Node scenarios PASS. Final authority-capture script change verified by recovery rehearsal.
ACCEPTANCE CRITERIA: no erased account/attempt/watch/grant resurrection; current passwords/roles/restrictions win; historical survivor process/version/first clock retained; no sessions or automatic phone/analytics disclosure; existing target refused; failed ledger validation leaves no database; replay has no duplicate erasure; source unchanged.
LEGAL STATUS: local synthetic foundation only; retention/legal hold and public release gates unresolved.
RISK / DEFERRED: DB-only; uploads refused. Current authoritative source must survive and be quiescent; independent durable journal, file recovery, PostgreSQL/multi-instance persistence, production cutover and external legal decisions remain. No distributed source/target transaction claimed.
ROLLBACK: revert offline helper/service only; preserve erasure history and safe default API deletion. Do not activate failed or unreconciled snapshots.
STATUS: DONE for bounded CP11-B foundation; overall CP11 PARTIAL.
NEXT CHECKPOINT: explicit confirmation of exact phone number and revocation on profile change.

## CP06-H — Conscious exact-number phone disclosure (2026-10-04)
ID / TITLE: CP06-H, phone preview and consent consistency.
GOAL / PURPOSE / CURRENT GAP: profile edits could expose a replacement phone under an old grant; workspace granted immediately without showing the number.
SCOPE / IMPLEMENTATION / FILES: profileService.ts transactional save/version check/revocation, recruitmentService.ts scoped preview and transactional grant, api.ts, client faro.ts, recruitment/privacy/recovery/browser fixtures and docs.
DB CHANGE / MIGRATIONS: none; existing revoked_at and audit reused.
API CHANGE: candidate-only GET phone-preview and explicit phoneConfirmed/current token POST phone-grant. No employer access to preview. Existing DELETE unchanged.
FRONTEND CHANGE: workspace modal shows actual number, explains revocation, requires conscious confirmation; no login change.
DEPENDENCIES: CP03 private profile, CP06 recruitment/contact grants, CP08 dialogs, CP11-B recovery.
TESTS / TESTED: build/typecheck/lint PASS; 11 recruitment + 3 privacy scenarios PASS; real DB recovery PASS; expanded actual candidate/employer browser journey PASS mobile/desktop (2).
ACCEPTANCE CRITERIA: stage advance never discloses; stale/missing/cross-process confirmation cannot grant; wrong actors receive 404; changed or removed number revokes all active grants atomically; unchanged number preserves consent; grant audit has no phone/token; candidate can revoke.
LEGAL STATUS: local privacy foundation; wider retention/production legal gates remain open.
RISK / DEFERRED: revocation cannot erase a previously observed number from human memory. No automatic contact exchange or external messaging.
ROLLBACK: revert UI/API together while retaining revoke-on-number-change protection; never restore immediate unconfirmed disclosure.
STATUS: DONE for CP06-H; overall CP06 PARTIAL.
NEXT CHECKPOINT: malformed request URL boundary and relevant CI release verification.

## CP11-C — Malformed request boundary (2026-10-04)
ID / TITLE: CP11-C, contain invalid URL parsing.
GOAL / PURPOSE / CURRENT GAP: URL parsing ran before the async handler catch and could reject without an HTTP response.
SCOPE / IMPLEMENTATION / FILES: faroApp.ts request boundary and faro-runtime.test.ts raw HTTP counterexample.
DB CHANGE / MIGRATIONS / FRONTEND CHANGE: none.
API CHANGE: malformed URLs return 400 INVALID_URL, no-store and standard security headers.
DEPENDENCIES: CP01 runtime allowlist.
TESTS / TESTED: build and both runtime scenarios PASS; lint/typecheck PASS.
ACCEPTANCE CRITERIA: malformed raw target produces a stable error, does not leak parse details or terminate service; subsequent health remains 200; retirement/auth contract retained.
LEGAL STATUS: local security fix; production gates remain closed.
RISK: parser rejection is intentionally limited to URL validation, other internal errors remain opaque 500.
ROLLBACK: revert handler/test together; preserve safe security headers.
STATUS: DONE for CP11-C; overall CP11 PARTIAL.
NEXT CHECKPOINT: relevant CI and regression evidence.

## CP11-D — Explicit Canonical CI and aggregate regression (2026-10-04)
ID / TITLE: CP11-D, executable current-system quality scope.
GOAL / PURPOSE / CURRENT GAP: CI lacked canonical recovery and codex branch push coverage; old browser contracts targeted retired product.
SCOPE / IMPLEMENTATION / FILES: package.json new test:faro/test:browser:faro scripts; .github/workflows/faro.yml; testing/operations docs. Keep original CI/tests and container unchanged and visibly unresolved.
DB CHANGE / MIGRATIONS / API CHANGE / FRONTEND CHANGE: none.
DEPENDENCIES: CP01 runtime, CP08 workspace, CP11-B recovery and CP06-H consent.
TESTS / TESTED: local Node24 aggregate 50/50 Node, 20/20 browser, lint/typecheck and 27 migrations PASS; recovery PASS at current relevant code. Remote Node22/24 execution pending; no Docker available locally.
ACCEPTANCE CRITERIA: CI explicitly exercises all Canonical invariant suites and shared auth/privacy/security contracts; actual real-file recovery; both roles/mobile/desktop and retained public accessibility; no hidden legacy failures/skips/continue-on-error; workflow least-privilege contents:read.
LEGAL STATUS: synthetic CI only; release gates unchanged.
RISK / DEFERRED: original full legacy CI has known OLX/LinkedIn fixture failures and obsolete browser expectations. These and Node22/container/persistence validation remain gates; this bounded CI addition is not full CP11 completion.
ROLLBACK: revert additive workflow/scripts; historical pipeline remains intact.
STATUS: DONE for local aggregate verification and CI definition; remote verification pending, overall CP11 PARTIAL.
NEXT CHECKPOINT: publish reviewable dependent drafts and continue remaining invariant/security/domain gaps.

## CP07-C — Independent verification and moderation (2026-10-04)
ID / TITLE: CP07-C, preserve conflicts after membership revocation.
GOAL / PURPOSE / CURRENT GAP: platform-admin members could verify their own organization; revoked staff became eligible to read/review private moderation evidence; generic verify could clear restrictions.
SCOPE / IMPLEMENTATION / FILES: FaroStore affiliation helper, profileService transactional verification, trustService involved guard, profile API counterexample and privacy/API/status docs.
DB CHANGE / MIGRATIONS / FRONTEND CHANGE: none; historical membership already retained.
API CHANGE: verification conflict/restriction errors; former affiliated admins cannot acquire moderator view or review authorization by revoking membership.
DEPENDENCIES: CP02 membership, CP07 private cases and CP11-B recovery preserving current restrictions.
TESTS / TESTED: build/typecheck/lint and 12 profile/assessment-trust/interview scenarios PASS. New API counterexample checks active owner/staff and revoked staff, no private case read, no state mutation on denial, independent review success and restricted verification refusal.
ACCEPTANCE CRITERIA: reviewer has no current/historical affiliation; conflicted caller never receives third-party evidence; verification cannot lift moderation restrictions; authorization/update/audit atomic.
LEGAL STATUS: local safe foundation; staffed moderation, approved conflict/retention policy and proportional restoration remain gates.
RISK / DEFERRED: historical affiliation conservatively remains a conflict while membership record is retained; external undisclosed relationships cannot be inferred. Dedicated restriction restoration is not invented here.
ROLLBACK: retain stricter conflict/restriction guards; revert feature entry points if necessary without exposing private evidence.
STATUS: DONE for CP07-C; overall CP07 PARTIAL.
NEXT CHECKPOINT: mobile checkbox hit-target failure discovered by actual Ubuntu CI.

## CP08-B — Workspace checkbox geometry and mobile scroll clearance (2026-10-04)
ID / TITLE: CP08-B, fix actual Ubuntu browser failure.
GOAL / PURPOSE / CURRENT GAP: legacy/native checkbox dimensions conflicted with generic workspace input padding; normal320px click hit fieldset/navigation; fieldsets inherited a pale legacy surface.
SCOPE / IMPLEMENTATION / FILES: public/faro.css scoped to workspace only, e2e/faro.spec.ts pointer geometry assertion and operational status.
DB CHANGE / MIGRATIONS / API CHANGE: none.
FRONTEND CHANGE: native24px checkbox/radio with zero padding, mobile100px scroll margin; transparent workspace fieldsets keep dark parent surface. Login CSS/markup unchanged.
DEPENDENCIES: CP08 shell, CP11-D actual remote browser evidence.
TESTS / TESTED: build/typecheck/lint and affected workflow PASS mobile/desktop locally; visual screenshot inspected. Test uses ordinary click, asserts actual geometry/padding; Ubuntu rerun pending.
ACCEPTANCE CRITERIA: normal touch/pointer confirmation at320px is reachable above nav; no forced click/skip/timeout masking; original auth visuals retained; dark form surface and no horizontal overflow.
LEGAL STATUS: accessibility/runtime fix, production gates unchanged.
RISK: native controls vary by OS; remote Linux evidence required. Shared workspace CSS affects all forms; complete remote browser suite will rerun.
ROLLBACK: revert scoped CSS/test together; do not accept the known obstructed checkbox.
STATUS: local fix DONE; remote acceptance pending, overall CP08 PARTIAL.
NEXT CHECKPOINT: remote browser acceptance and assessment final review concurrency.

## CP10-D — Transactional and idempotent human result review (2026-10-04)
ID / TITLE: CP10-D, protect result finalization against stale reviews/retries.
GOAL / PURPOSE / CURRENT GAP: finalize read state before its transaction and lacked version/idempotency guards; concurrent review could silently overwrite/duplicate events.
SCOPE / IMPLEMENTATION / FILES: assessmentService.ts overview and commandOnce finalization, client faro.ts/types, assessment API test, documentation.
DB CHANGE / MIGRATIONS: none; existing revisions/idempotency/audit reused.
API CHANGE: result review requires current attempt and process versions and idempotency key; rechecks assigned employer and active process inside transaction. Overview exposes processVersion only, no extra identity.
FRONTEND CHANGE: existing conscious-review form sends current versions/key; no redesign/login change.
DEPENDENCIES: CP10-B/C pinned attempt, CP06 transaction/revision/idempotency, CP08 review form.
TESTS / TESTED: build/typecheck/lint and6 assessment/economics/trust scenarios PASS; actual review browser journey PASS mobile/desktop (2). New API scenario checks wrong actors, missing conscious confirmation, stale attempt/process, exact replay, changed payload conflict, one audit/event, unchanged first clock and terminal denial.
ACCEPTANCE CRITERIA: no stale result publication/overwrite; unauthorized or terminal attempt review has no side effects; exact replay returns same result; explicit human review stays required; no auto-hire/reject/ranking.
LEGAL STATUS: local synthetic assessment foundation; production scoring/AI/legal validation remain gated.
RISK / DEFERRED: immutable result correction, accommodation/retry and complex/manual task engine remain open. Pending historical score after withdrawal stays private/unfinalized rather than becoming a new decision.
ROLLBACK: revert API/client together while retaining transactional stale/result guards and immutable event history.
STATUS: DONE for CP10-D; overall CP10 PARTIAL.
NEXT CHECKPOINT: final CI for this checkpoint and remaining trust/assessment/domain engineering.

## CP07-D — Private factual reliability report (2026-10-04)
ID / TITLE: CP07-D, explicit response/progression cohorts.
GOAL / PURPOSE / CURRENT GAP: deadline history existed but had no inspectable denominator/median/censored-wait report; fast rejections could look like complete success without progression context.
SCOPE / IMPLEMENTATION / FILES: domain/faro/reliability.ts pure calculation; TrustService scoped consistent report; api.ts; client types/views/controller portal organization section; new reliability tests and expanded existing browser journey.
DB CHANGE / MIGRATIONS: none; original dueAt and immutable events reused.
API CHANGE: owner/admin organization reliability GET, explicit past window or server last30days; max366days/10000records, no silent truncation; private aggregates only.
FRONTEND CHANGE: original organization portal shows window/asOf/sample/matured denominator, early withdrawals, median answered n, unanswered/current waits/overdue age and distinct progression/assessment/confirmed-interview/rejection counts. No percentage headline or global score.
DEPENDENCIES: CP06 immutable clocks/events, CP07 private scope, CP08 components, CP11-A erasure limits acknowledged.
TESTS / TESTED: build/typecheck/lint and2 reliability scenarios PASS; expanded candidate/employer browser workflow PASS mobile/desktop with actual sample and axe. Historical unaffected contracts retain prior evidence; new remote CI pending.
ACCEPTANCE CRITERIA: exact original dueAt; early withdrawal never credited as response; unanswered censoring beside median; empty denominator/null median is insufficient data; deduped progression distinct from rejection; no private identities/watchers, no automatic sanction/case/ranking change; no hidden truncation.
LEGAL STATUS: local private factual report; public metrics/small-sample disclosure and operational/legal policy remain review gates.
RISK / DEFERRED: retained records only, erasure changes cohorts; no public reputation, fraud inference, approved pattern threshold, similar-offer/repost linkage or automatic consequences. Default30days is reporting presentation, not sanction policy; custom window API supported, UI selector pending.
ROLLBACK: remove report endpoint/portal section together; underlying immutable clocks/events retained.
STATUS: DONE for CP07-D private foundation; full K041/K082 and CP07 remain PARTIAL.
NEXT CHECKPOINT: new CI acceptance, remaining trust/moderation and assessment engineering.

## CP10-E — Meaningful review of pinned submitted answers (2026-10-04)
ID / TITLE: CP10-E, make human review inspectable.
GOAL / PURPOSE / CURRENT GAP: employer result page showed points without submitted choice/key/question; oversight could become a blind checkbox. Candidate pre-Start lacked exact disclosure/help and employer could see candidate-only buttons.
SCOPE / IMPLEMENTATION / FILES: assessmentService overview allowlist; client types/attemptView role-aware actions and pinned response/key display; assessment API/browser assertions; documentation.
DB CHANGE / MIGRATIONS: none; immutable attempt definition/answers reused.
API CHANGE: viewer and submitted-only employer reviewTasks. Candidate remains key-free; employer draft answers remain private.
FRONTEND CHANGE: assigned employer sees question/chosen answer/key/possible points and rubric before finalizing; before Start candidate sees disclosure and existing private technical help path. No timer reset or automated penalty promise.
DEPENDENCIES: CP10-C pinned definitions, CP10-D guarded human review, CP07 private reports, CP08 forms.
TESTS / TESTED: build/typecheck/lint,6 assessment/economics/trust scenarios and expanded real review journey desktop/mobile(2) PASS. Candidate reviewTasks empty even after result; employer before submission gets no chosen answer; unanswered differs from wrong choice.
ACCEPTANCE CRITERIA: reviewer can inspect actual submitted answer against original rubric/key; no live draft monitoring or candidate key response; explicit pre-Start disclosure and technical help; candidate-only actions not shown to employer.
LEGAL STATUS: local foundation; production scoring/quality/fairness gates unchanged.
RISK / DEFERRED: objective quiz only; missing answer is null. Structured technical incident/retry policy and immutable correction remain separate pending requirements; no AI/manual complex scoring is implied.
ROLLBACK: revert DTO/UI together, retain candidate/draft answer boundary and human review gate.
STATUS: DONE for CP10-E; overall CP10 PARTIAL.
NEXT CHECKPOINT: stable curated skill identities independent of legacy ontology ordering; current CI acceptance.

## CP03-B — Stable authored skill identities (2026-10-04)
ID / TITLE: CP03-B, remove positional identity coupling.
GOAL / PURPOSE / CURRENT GAP: skill IDs came from legacy ontology array indices, so historical insertion/reorder could reinterpret persisted claims/requirements without a migration or user confirmation.
SCOPE / IMPLEMENTATION / FILES: domain/faro/skillCatalog.ts explicit23-node frozen seed; skills.ts same catalog reexport and unchanged suggestion/projection algorithms; isolated import regression; architecture/domain/status docs.
DB CHANGE / MIGRATIONS: none; every existing identifier/label/alias/version/license preserved, no rekeying.
API CHANGE: same catalog endpoint; additive kind/family descriptive metadata, no official taxonomy claim.
FRONTEND CHANGE: none; same choices/labels and matching meanings.
DEPENDENCIES: CP03 confirmed claims, CP04 requirements, CP05 exact matching.
TESTS / TESTED: build/typecheck/lint and15 skills/profile/recruitment scenarios PASS. Isolated subprocess imports reordered/extended historical ontology first and confirms stable IDs plus no automatic new node; actual profile/matching/phone/publication contracts retained.
ACCEPTANCE CRITERIA: persisted identity independent of unrelated ontology ordering; no new concepts introduced without explicit curated release; readonly frozen seed/aliases; confirmation semantics and exact matching unchanged; ESCO URI remains null rather than guessed.
LEGAL STATUS: repository-authored local taxonomy; ESCO/license/provider mapping remains REVIEW before use.
RISK / DEFERRED: only23 authored nodes, no complete ESCO graph/validated equivalences or semantic entailment. Existing family metadata never restricts occupations/geography or certifies an ability. Future labels/relations require reviewed versioning, never ID recycling.
ROLLBACK: retain stable seed; revert consumers together without restoring index-derived identity or rekeying claims.
STATUS: DONE for CP03-B identity integrity; overall CP03 graph integration PARTIAL.
NEXT CHECKPOINT: updated CI acceptance; remaining skills/evidence/privacy and operational gates.

## CP11-E — Full retained Node compatibility and production-image CI (2026-10-04)
ID / TITLE: CP11-E, validate retained modules and actual image alongside Canonical contracts.
GOAL / PURPOSE / CURRENT GAP: two historical ingestion fixtures mocked transports the existing connector no longer calls; Canonical CI lacked full retained Node and actual Docker acceptance.
SCOPE / IMPLEMENTATION / FILES: public-job-ingestion.test.ts fixtures now serve real listing links and detail contracts; faro.yml adds Ubuntu compatibility/image job; scripts/faro-container-smoke.mjs verifies isolated production boundary.
DB CHANGE / MIGRATIONS / API CHANGE / FRONTEND CHANGE: none; no production importer changes or retired routes reactivation.
DEPENDENCIES: CP11-D CI, CP03-B stable identities, CP01 retirement/free-first, existing Dockerfile and recovery helpers.
TESTS / TESTED: exact npm test PASS127/127, zero failures/skips; focused ingestion8/8; lint/typecheck/diff checks PASS; historical real-file backup-restore exercise PASS. Remote Canonical run37188962130 at0ca9676 PASS Node22/24, Canonical recovery and20 browser checks. New compatibility/container job pending actual remote result; local Docker unavailable.
ACCEPTANCE CRITERIA: no weakened assertions/skips; OLX detail traversal and LinkedIn standard search/detail verified; every retained Node test executes; production image builds its own tests; isolated synthetic account FREE/ACTIVE and secure session; production Canonical remains503 and CV/EHV/billing/imports410.
LEGAL STATUS: synthetic isolated engineering validation; release gates unchanged.
RISK / DEFERRED: old full browser suite still describes retired product flows and remains separate unresolved scope; npm check is not claimed green. Container result is pending until remote completion. This is not deployment or permission to activate production.
ROLLBACK: revert CI/helper and fixture delta together; keep Canonical boundary contracts and existing tests enabled.
STATUS: implementation DONE; container acceptance PENDING; overall CP11 and master plan PARTIAL.
NEXT CHECKPOINT: actual container CI, then remaining assessment/trust/domain engineering.

## CP10-F — Immutable result validity history (2026-10-04)
ID / TITLE: CP10-F, withdraw validity of an erroneous reviewed objective result.
GOAL / PURPOSE / CURRENT GAP: Canonical report10 requires original values/reason and bilateral notice for material corrections; finalized score had no way to mark detected error without overwriting evidence.
SCOPE / IMPLEMENTATION / FILES: migration0028; assessmentService/API; own privacy export; client types/controller/view/labels; assessment API/migration and real browser tests.
DB CHANGE / MIGRATIONS:0028_faro_result_validity.sql adds append-only service history with VALID/INVALIDATED snapshots, constrained technical reason codes, version PK, attempt cascade. Existing finalized scores backfilled unchanged with actual reviewed_at (null remains unknown); no guessed timestamps. Rollout requires backup and migration validation.
API CHANGE: overview adds resultValidity/resultHistory; invalid current result=null, original points only in explicitly historical snapshots. POST attempt invalidate-result requires active assigned employer, attempt/process revisions, idempotency key, confirmed=true, technical reason code and >=10-character shared justification. Revocation denies replay. No arbitrary point editing, key replacement or AI action.
FRONTEND CHANGE: employer explicit invalidation form; both roles see invalidity warning and history/reason. Candidate cannot invalidate; initial login unchanged. Marking invalid preserves lifecycle FINALIZED (review already completed), separate validity prevents presenting historical points as current ability.
DEPENDENCIES: CP10-C pinned evidence, CP10-D guarded review, CP10-E inspectable answers, CP06 durable bilateral outbox, CP11-A erasure/export.
TESTS / TESTED: build/typecheck/lint PASS;28 migrations PASS;57 Canonical/shared scenarios (56 before added migration regression; targeted8 then PASS); meaningful invalidation API counterexamples, snapshot fidelity, clocks unchanged, one event/two recipient outbox entries, isolation/revoked replay, own export/cascade erased. Extended browser assessment journey desktop/mobile2 PASS. Canonical real-file recovery PASS before timestamp-only migration refinement; remote current-input acceptance pending.
ACCEPTANCE CRITERIA: erroneous score cannot appear as valid current result; original score/answers/rubric/review retained; explicit technical explanation accessible to both parties; no candidate-key or reviewer identity leak; no clock/recruitment-state/ranking alteration; failed/stale commands atomic; idempotent retry does not create duplicate correction.
LEGAL STATUS: synthetic local foundation; production scoring/fairness/DPIA/recruitment gates unchanged.
RISK / DEFERRED: invalidation is a corrective safeguard, not complete score amendment/whole-cohort repair, technical retry engine or complex task scoring. A new approved definition/review is needed for later reassessment; never silently reset timer. Correction of factual history may happen after process closure and never reopens or changes a hiring decision. Justification is shared; UI asks for no personal data. Historical result is not transferable certification.
ROLLBACK: remove invalidation UI/endpoint together only with invalid-score guard retained; do not drop history or recycle snapshot versions. Forward migration preferred; database rollback must preserve newly recorded corrections.
STATUS: DONE for bounded validity correction; full CP10 and master plan PARTIAL.
NEXT CHECKPOINT: current CI and remaining assessment technical incidents/valid score amendment, skills integration and operational requirements.

CP11-E acceptance DONE: actual remote run37189804326 at9889288 SUCCESS, including all127 Node tests on Ubuntu, historical storage exercise, actual Docker build and isolated production smoke, Node22/24 Canonical/recovery and20 browser checks. This does not certify old historical browser flows or authorize production activation.

## CP11-F — Default Canonical browser acceptance (2026-10-04)
ID / TITLE: CP11-F, account for historical scenarios and retain consent/public axe in real browser CI.
GOAL / PURPOSE / CURRENT GAP: default browser/check and original CI expected retired CV/Decision Card/EHV screens; Canonical selection lacked registration/analytics consent and public axe evidence.
SCOPE / IMPLEMENTATION / FILES: BROWSER_ACCEPTANCE_SCOPE.md per-scenario disposition; 15 original specs archived unchanged; current browser consent/reflow and public axe; Playwright default discovery excludes historical only; package alias/default check; original CI scope/recovery/closed-boundary container smoke and failure artifacts.
DB CHANGE / MIGRATIONS / API CHANGE / FRONTEND CHANGE: none; auth markup/styles, Canonical runtime and release gates unchanged.
DEPENDENCIES: CP01 retirement/free-first, CP08 workspace, CP11-A/B data rights/recovery, CP11-D/E actual compatibility/image CI.
TESTS / TESTED: complete npm run check PASS on local Node24.19.0: lint/typecheck including archive,28 migrations,129/129 Node tests (zero skipped), historical and Canonical real-file restore drills,26/26 browser executions (13 scenarios in desktop/mobile). New targeted6/6 passed before aggregate. All15 archive contents verified byte-for-byte against pre-checkpoint Git blobs. git diff --check PASS; review confirms no public/src delta, no skip/continue-on-error/rule suppression. Current remote CI pending, prior1816066 run37192917300 SUCCESS does not certify this patch.
ACCEPTANCE CRITERIA: all22 historical scenarios explicitly accounted for; required unchecked consent blocks registration; optional analytics false by default and opt-in/withdrawal persists over reload with actual API; public axe login/register/privacy/terms preserved; real reauthentication/erasure and workspace axe/reflow retained; default and FARO commands share current scope; all retained Node tests/recovery and actual image remain required.
LEGAL STATUS: synthetic engineering acceptance only; no permission to activate production, scoring, external providers or legal gates.
RISK / DEFERRED: automated scans cover bounded current surfaces, not complete manual WCAG/usability/offline acceptance. Historical preferences/learning/market/import features are not falsely credited as delivered. Original/full Docker remote result pending; local Docker unavailable. Remaining legal/persistence/assessment/provider gates unchanged.
ROLLBACK: revert config/scripts/CI and test locations together, preserve explicit disposition and retirement/runtime guards; never enable CV/EHV to satisfy historical assertions.
STATUS: local acceptance DONE; remote acceptance PENDING; overall CP11/master plan PARTIAL.
NEXT CHECKPOINT: verify exact remote checkpoint, then explicit private salary constraints with comparable declared units/basis, no tax inference.

CP11-F remote acceptance DONE: exact6a4be07 [FARO run37194266418](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37194266418) and [original CI run37194266464](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37194266464) SUCCESS. This includes Node22/24 Canonical/recovery,26 browser executions, all129 retained Node tests and actual Docker/closed-release smoke. [Draft44](https://github.com/eagleblastmusic-lgtm/Job/pull/44) reviews only this slice against pinned1816066 integration baseline; it is unmerged and depends on prior unmerged implementation. Overall CP11/master plan and external gates remain PARTIAL.

## CP05-B — Explicit private comparable salary minimum (2026-10-04)
ID / TITLE: CP05-B, salary constraint using declared comparable amounts.
GOAL / PURPOSE / CURRENT GAP: existing private constraints cover work model/contracts/nights/weekends but not explicit salary; incomparable bases cannot be coerced into a universal minimum.
SCOPE / IMPLEMENTATION / FILES: domain offers.ts SalaryMinimum/explainConditions, existing ProfileService JSON preferences/versioning, current client form/types/labels/controller, recruitment API/domain counterexamples and expanded real browser journey.
DB CHANGE / MIGRATIONS: none; existing private preferences and erasure/export reused.
API CHANGE: existing PUT profile/constraints accepts salaryMinimum {amount minor units,currency PLN,basis,period,hoursPerPeriod,ftePercent} or null. Omission by old clients preserves an existing minimum; explicit null removes it. Validation allowlists and rejects unsafe/non-integer/unsupported inputs before write.
FRONTEND CHANGE: opt-in private salary minimum with explicit basis/period/hours/FTE, persists after reload; candidate detail shows separate condition, no global score or auth change.
DEPENDENCIES: CP04 native declared salary versions, CP05-A constraints, CP08 real profile/offer workspace, CP11-A own export.
TESTS / TESTED: build and13 focused recruitment scenarios PASS. Full npm run check PASS:131/131 Node tests,28 migrations, both real-file recovery drills,26/26 mobile/desktop browsers, lint/typecheck; zero skips. Review/diff checks PASS. Remote acceptance pending for new commit.
ACCEPTANCE CRITERIA: range floor not maximum; identical basis/currency/period/hours/FTE only; accepted-contract alternatives checked together; incompatible alternative stays UNKNOWN instead of invented success/failure; active filter never relaxes; direct own saved/process views remain; employer projection/snapshot/clock/order unchanged; old callers cannot erase minimum silently; private own export includes it.
LEGAL STATUS: deterministic declared salary comparison, no financial advice/tax/net inference, provider or production gate opened.
RISK / DEFERRED: strict exact-unit comparison intentionally returns UNKNOWN for other hours/FTE/periods; it does not normalize these or treat B2B invoice as take-home. Commute constraints need source-backed estimates and remain open. General matching/skills and product usability remain partial.
ROLLBACK: remove UI/domain consumer together; preserve stored private preferences and rights controls; do not expose or coerce values into employer view.
STATUS: bounded local salary implementation/acceptance DONE; remote PENDING; overall CP05 PARTIAL.
NEXT CHECKPOINT: attempt-bound technical incident with immutable observed times and explicit human handling; full retry/reassessment remains separate.

CP05-B remote acceptance DONE atd75bc7f: [FARO37194738492](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37194738492) and [original CI37194738451](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37194738451) SUCCESS; all131 retained Node tests, both recoveries,26 browsers and actual image smoke. [Draft45](https://github.com/eagleblastmusic-lgtm/Job/pull/45) remains dependent/unmerged.

## CP10-G — Attempt-bound technical incident and human handling (2026-10-04)
ID / TITLE: CP10-G, preserve concrete technical evidence and conscious neutral resolution.
GOAL / PURPOSE / CURRENT GAP: generic process report did not identify attempt/timing/revision; technical failure could not be handled without losing original answer/time context.
SCOPE / IMPLEMENTATION / FILES: migration0029 incidents, existing AssessmentService commands/overview and API, own privacy export/cascade, current attempt forms/help/labels/types, new actual browser incident journey, API counterexamples and restore rehearsal. One scoped issue per attempt, one immutable observation and resolution.
DB CHANGE / MIGRATIONS:0029_faro_attempt_incidents adds attempt/user cascade, original state/revision/deadline/start/expiry, bounded structured category and shared technical statement, OPEN/RESOLVED constraints, human outcome/reason/time; old attempts/definitions remain unchanged.
API CHANGE: POST attempts/:id/incident (own candidate, expected attempt/process revision,idempotencyKey,confirmed,category,statement); POST incident/resolve (active assigned human reviewer, expected attempt/process/incident revisions,confirmed,resolution,reason). Auth checked before replay; cache stores opaque attempt acknowledgement only, response is freshly authorized overview/serverNow. No raw statement in events, notifications, audit metadata or employer replay cache.
FRONTEND CHANGE: current attempt help/technical report, original observed timing, shared human explanation, no candidate key/draft-monitoring leak; confirmed technical state has no current score/edit/start. Workspace legend uses existing light text token after actual axe contrast failure1.66:1; auth markup/styles unaffected.
DEPENDENCIES: CP10 server timer/pinned evidence, CP06 revisions/transaction/outbox/clocks, CP11-A/B rights/recovery, CP08 workspace.
TESTS / TESTED: complete npm run check PASS:134/134 Node tests,29 migrations, both real-file recovery drills,28/28 browser executions desktop/mobile, lint/typecheck; zero skipped. Three new API/domain scenarios prove observation fidelity, changed/stale/revoked/foreign/duplicate/confirmation failures, no blind result finalization with open issue, terminal preservation, original saved pending score/time, newer active assignment protection, NOT_ESTABLISHED neutral handling, export/cascade/cache minimization. Real incident journey includes both-role axe,320px reflow, ordinary controls, no timer reset/draft exposure. Initial axe regression fixed, no suppressed rule; replay test explicitly checks fresh monotonic serverNow and all persistent fields unchanged. Review/diff check PASS. Current remote CI pending.
ACCEPTANCE CRITERIA: candidate report never pauses time or certifies failure; immutable observed attempt/times/revision; only human confirmation neutralizes unfinalized attempt to TECHNICAL_ISSUE; saved evidence preserved, current result hidden; original Clock A/terminal recruitment decision/newer active attempt untouched; no automatic no-show/hire/reject; bilateral durable event; own export and erasure/restore reconcile incident; no sensitive replay derivative.
LEGAL STATUS: synthetic/local technical safeguard; production assessment/fairness/legal/help staffing and operational policy remain gates; no health diagnosis requested.
RISK / DEFERRED: bounded pre-finalization issue intake (INVITED/STARTED/EXPIRED/SCORED_PENDING_REVIEW). Existing finalized validity correction remains separate. One report/resolution, no new dedicated appeals/accommodations product; broader complaints use private process report. Same-version retry remains open: existing unique process/definition/version contract requires deliberate additive lineage migration and acceptance; this checkpoint never resets an original attempt. Snapshot records revision/times, not a claim of verified infrastructure cause.
ROLLBACK: disable incident entrypoints together, preserve table/evidence and TECHNICAL_ISSUE current-result guard; do not reclassify confirmed failure as a score. Keep scoped contrast fix. Forward migration preferred; no destructive history rollback.
STATUS: bounded local incident/review foundation DONE; remote PENDING; full CP10/master plan PARTIAL.
NEXT CHECKPOINT: exact current remote acceptance; durable outbox claims/expired-worker fencing without activating production scheduler/providers.

## CP06-I — Durable SQLite outbox leases and controlled retry (2026-10-04)
ID / TITLE: CP06-I, persist reservations and fence expired workers without opening production execution.
GOAL / PURPOSE / CURRENT GAP: durable dedupe did not reserve work across competing processes; a crashed worker had no bounded claim budget or conscious dead-letter recovery.
SCOPE / IMPLEMENTATION / FILES: migration0030; existing RecruitmentService claim/delivery/retry; worker API aggregate diagnostics; recovery reconciliation; worker/recruitment counterexamples and real-file restore exercise. Existing producers and inbox reused.
DB CHANGE / MIGRATIONS:0030 adds claim_token, lease_until paired constraint, max_attempts default5 and due-lease index. Claim uses BEGIN IMMEDIATE, consumes an attempt before work and persists a UUID lease. Historical attempts are preserved, not reset.
API CHANGE: ADMIN POST /api/faro/worker/outbox/:id/retry requires expectedAttempts,idempotencyKey,confirmed=true,reasonCode TRANSIENT_FAILURE_RESOLVED or LEASE_RECOVERY_REVIEWED. Current platform role checked before replay and inside transaction. DEAD_LETTER only; each distinct consciously reviewed retry grants five additional attempts, never resets total count, logs one safe audit. GET worker/status adds aggregate active lease count, no tokens/recipient IDs/messages.
FRONTEND CHANGE: none; login and workspace visuals unchanged.
DEPENDENCIES: CP06 transactional producers/dedupe, CP06 watch preferences, CP11-A erasure and CP11-B authoritative restore.
TESTS / TESTED: final complete npm run check PASS:137/137 Node tests,30 migrations, both real-file restore drills,28/28 desktop/mobile browser executions, lint/typecheck, zero skipped. git diff --check PASS. Tests cover two actual child processes sharing one SQLite file, restart/expiry/new-owner fencing, unique inbox effect, forced delivery failures/backoff/five-attempt dead-letter, five abandoned claims, authorized confirmed idempotent retry and role revocation, erasure after claim, watch mute after claim, dead-letter preference recheck and applicant/optional reminder distinction. Restore snapshot contains a real active lease and rejects its historical token after reconciliation. No skipped tests or assertion/rule suppression.
ACCEPTANCE CRITERIA: exactly one competing claim; late/wrong/replaced/expired token cannot deliver or mutate newer claim; failures and crashes consume bounded budget; delivery and acknowledgement atomic; stale/unauthorized/unconfirmed/changed-payload retries fail; erasure/mute cannot resurrect cached recipient content. Optional offer alerts recheck current watch choice at retry AND delivery; applicant offer updates remain independent, closing-soon stays optional. Restore clears old leases without erasing attempts.
LEGAL STATUS: local synthetic technical foundation only; production Canonical503 and disabled scheduler remain. No external email/SMS/provider activated; no moderation/hiring/billing effect.
RISK / DEFERRED: SQLite write serialization is not PostgreSQL/distributed deployment acceptance. One in-process development scheduler remains the supported app topology. Runtime claims default30 seconds/batch100; internal lease bounds1–300 seconds. In-app inbox only; external channels need separate delivery contracts. Operator IDs are obtained through authorized local operations, not a new global private-data browser. Full retention policy, independent authority journal and external gates remain open.
ROLLBACK: disable retry entrypoint and revert claim/delivery together only with all workers stopped; preserve outbox evidence/attempt counts and additive columns. Never clear budgets or replay all dead letters. Forward migration preferred.
STATUS: bounded lease local implementation/acceptance DONE; exact remote acceptance PENDING; overall CP06/master plan PARTIAL.
NEXT CHECKPOINT: exact local/remote acceptance, then assessment retry lineage without resetting original evidence/timers or inventing approved definition versions.

CP10-G remote acceptance DONE at e42798e: [FARO37195761518](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37195761518) and [original CI37195761529](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37195761529) SUCCESS, including actual Docker smoke, all134 retained Node tests,29 migrations, both recovery drills and28 browsers. [Draft46](https://github.com/eagleblastmusic-lgtm/Job/pull/46) remains unmerged/dependent. Same-version retry and full CP10/master release remain PARTIAL.

CP06-I remote acceptance DONE for code checkpoint a4755a6bce1b1ce54bfd141f7edebefd2b0601a6: [FARO37196636236](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37196636236) and [original CI37196636227](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37196636227) SUCCESS. Includes Node22/24 contracts/recovery, all137 retained Node tests,30 migrations, both restore drills,28 browser executions and actual image/smoke in both workflows. [Draft47](https://github.com/eagleblastmusic-lgtm/Job/pull/47) is unmerged and depends on draft46. Subsequent PR-sequence/handoff/evidence documentation changes do not change tested implementation, migrations or inputs. Bounded CP06-I local/remote acceptance DONE; full CP06/master plan/release remain PARTIAL. Continue with explicit assessment retry lineage and current gates; no deployment or production scheduler activation.

## CP10-H — Separate pinned retry after confirmed technical incident (2026-10-04)
ID / TITLE: CP10-H, conscious retry lineage, never resetting original attempt.
GOAL / PURPOSE / CURRENT GAP: confirmed TECHNICAL_ISSUE could not receive a new same-version invitation because old process/definition/version unique contract prevented it.
SCOPE / IMPLEMENTATION / FILES: migration0031, controlled migration runner/validator, AssessmentService/API, own export, existing attempt UI/controller/types/labels, API/migration/browser/restore tests. No parallel assessment engine.
DB CHANGE / MIGRATIONS:0031 copies every original attempt column unchanged into rebuilt table inside one transaction, adds attempt_number/retry_of unique child and explicit reason/authorization time/actor; historical roots default1. Root uniqueness retained; sequence uniqueness and FK cascade. Marked rebuild disables FK enforcement only before transaction; foreign_key_check before commit, rollback on mismatch, FK reenabled finally. Both runtime and validator support LF/CRLF marker. Rehearsed populated pre0031 table preserves incident/result-history children, restores enforced FK and cascade. Stop app/writers and backup before rollout; no evidence deletion/reset.
API CHANGE: POST /api/faro/attempts/:id/retry requires expectedVersion,processVersion,idempotencyKey,confirmed:true,reason,deadline. Assigned active OWNER/ADMIN/RECRUITER, excluding own applicant/unassigned platform ADMIN/HIRING_MANAGER. Only source TECHNICAL_ISSUE with resolved ISSUE_CONFIRMED, ACTIVE process/accepted stage, no previous child or other active attempt. Exact pinned approved version reused even if unrelated newer draft exists. New INVITED row has empty answers/null timer/result; original unchanged. Updates current stage/Clock B only, retains original Clock A/snapshot. One safe bilateral event/outbox. Replay caches only new id, reauthorizes and returns fresh scoped overview.
FRONTEND CHANGE: original/new attempt links, shared reason/date/number, conscious employer invite and candidate Start. Original technical attempt stays uneditable. Actual desktop axe found legacy hover label contrast1.03:1; one workspace-only color override fixes it, no auth/style redesign or rule suppression.
DEPENDENCIES: CP10-C pinned definitions/timer, CP10-G incident human handling, CP06 transaction/idempotency/clocks/outbox, CP11 erasure/recovery.
TESTS / TESTED: final full npm run check PASS139/139 Node,31 migrations, both real-file restore drills,28/28 desktop/mobile browser executions, lint/typecheck; zero skipped. Two new focused cases prove retry history/approval/auth/HIRING_MANAGER/terminal/version/confirmation/deadline/replay/export/erasure and populated migration fidelity/cascades. Real browser performs human resolution→separate retry→candidate conscious Start→original history and axe/reflow; restore snapshot contains root+retry and erases both. git diff --check PASS after LF normalization. Exact remote acceptance pending.
ACCEPTANCE CRITERIA: no old timer/answers/result/revision rewrite; distinct invitation same definition/rubric/tasks; no fake definition version; one child per source, no simultaneous active obligation; neutral technical failure not no-show/ability score; current scope rechecked on replay, no candidate key/reviewer identity leak; clocks/history preserved; rollback-safe populated migration and erasure of whole lineage.
LEGAL STATUS: local synthetic engineering only. Production503/scheduler remain closed; external legal/assessment quality/oversight gates have no supplied evidence and are not certified by CI.
RISK / DEFERRED: pinned retry repeats known tasks, is explicitly technical recovery and not a cheating/psychometric equivalence claim. General reassessment/credential/whole-cohort score correction and advanced tasks remain separate. Table rebuild requires offline backup/rehearsal; avoid destructive rollback or dropping new lineage data.
ROLLBACK: disable retry UI/API together; retain lineage/table/history, use forward correction. Never restore old unique schema over existing retries or reset first attempt. Keep hover contrast fix.
STATUS: bounded retry local implementation/acceptance DONE; remote PENDING; full CP10/master plan PARTIAL.
NEXT CHECKPOINT: current CI; explicit human restriction restoration with conflict/version/history guards; remaining full-plan legal-safe deltas continue.

## CP07-E — Explicit restriction history, appeal and independent restoration (2026-10-04)
ID / TITLE: CP07-E, close missing organization restoration path without silent verification bypass.
GOAL / PURPOSE / CURRENT GAP: moderation could set RESTRICTED but had no inspectable scoped condition/history, organization appeal or controlled restoration; ordinary verification correctly refused bypass.
SCOPE / IMPLEMENTATION / FILES: migration0032; existing TrustService moderation producer/appeal/restore/list; API; current workspace; own appeal export/erasure; authoritative restore ledger; API/browser/real-file recovery tests.
DB CHANGE / MIGRATIONS:0032 records NEW_INTAKE restriction ACTIVE→RESTORED, source case, minimal conflict subject references with erasure SET NULL, safe reason code, user-authored restoration condition, actual creation/review date, version, own appeal and human restoration reason/date. Existing RESTRICTED organizations backfill explicitly LEGACY_RESTRICTION_REVIEW_REQUIRED with unknown case/condition/dates NULL, never fabricated facts.
API CHANGE: GET /organizations/:id/restrictions only active organization OWNER/ADMIN or independent platform ADMIN; allowlist DTO omits identities/private case statement/decision. POST /restrictions/:id/appeal {expectedVersion,idempotencyKey,reason} once by active org OWNER/ADMIN. POST /restore additionally confirmed:true, independent current platform ADMIN; conflicts include affiliations even revoked and original reporter/candidate even after source case deletion/recovery. Scope/version/replay guarded before cache, one safe audit and durable notification. New restriction requires explicit restorationCondition and future reviewAt inside existing ACTION/restrict command; transaction rolls back missing condition.
FRONTEND CHANGE: existing moderation review accepts condition; organization link and scope/review/history with appeal; independent moderator can consciously end one restriction. Notifications open organization restriction view. Private underlying report/evidence never exposed; auth/login unchanged.
DEPENDENCIES: CP07-C independence, CP06 revision/idempotency/outbox/intake, CP11 rights and current-authority recovery.
TESTS / TESTED: final current-input full npm run check PASS:140/140 Node tests,32 migrations,both actual restore drills,30/30 mobile/desktop browser executions,lint/typecheck; zero skipped. New API case proves two overlapping restrictions, candidate/affiliated-admin/old-source reporter conflicts, revoked-role replay, stale/unconfirmed/changed payload failures, unchanged process/paused vacancy, one audit/effect, own export and erasure of transferred owner's private appeal. Real browser restrict→org appeal→independent restore with both-role axe/reflow. Real restore replays RESTORED latest authority and ACTIVE post-backup restriction; original reporter cannot restore despite missing source case, old decision is never revived. No skipped tests or suppressed axe; diff check PASS after LF normalization.
ACCEPTANCE CRITERIA: reason/scope/condition/review inspectable without reporter/evidence disclosure; explicit independent human action only; one restoration cannot clear another ACTIVE restriction; final clearance returns organization PENDING for fresh verification, never VERIFIED or automatic republish; old process/Clock A unaffected; appeal/history survive authorized scope and current authority, erased statement cannot return from snapshot.
LEGAL STATUS: synthetic technical foundation only. Sanction proportionality/duration/staffing/legal appeal policy and production activation remain gates; reviewAt is human scheduling, not an automatic expiry or research-certified threshold.
RISK / DEFERRED: current bounded scope is NEW_INTAKE; no candidate restriction/rating, automatic fraud finding, public score or arbitrary punishment policy. Legacy unknown evidence is visibly identified for conscious manual reconstruction. Actual platform MFA, complete moderation policy/research and retention still separate. Restore requires current schema0032 authority; absent current restriction ledger fails closed. Independent authority disaster recovery remains open.
ROLLBACK: disable new restoration/appeal UI/API together while retaining restriction evidence and RESTRICTED intake guard. Do not clear ACTIVE rows or republish as rollback. Forward migration preferred; current-authority replay must remain paired with schema/ledger.
STATUS: bounded local implementation/acceptance DONE; remote PENDING; full CP07/master plan PARTIAL.
NEXT CHECKPOINT: exact local/remote evidence; explicit commute constraint with existing private source-backed estimate and separate unknown listing; remaining legal-safe plan continues.

CP10-H remote acceptance DONE at40b0e6a: [FARO37197978434](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37197978434) and [original CI37197978428](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37197978428) SUCCESS, including actual Docker smoke/full retained Node,31 migrations,both restores and28 browsers. [Draft48](https://github.com/eagleblastmusic-lgtm/Job/pull/48) remains unmerged/dependent; full CP10/master plan/release PARTIAL.

CP07-E remote acceptance DONE at6be3d1e: [FARO37215164691](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37215164691) and [CI37215164741](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37215164741) SUCCESS, including actual Docker smoke, Node22/24 contracts/recovery and30 browsers. [Draft49](https://github.com/eagleblastmusic-lgtm/Job/pull/49) stays dependent/unmerged. Full CP07/master plan/release PARTIAL.
## CP05-C — Private commute boundary and explicit unknown listing (2026-10-04)
GOAL / DELTA: candidate can declare maximum round-trip minutes per work day; existing own economics estimate is the sole producer, without route inference or remote=zero assumptions.
IMPLEMENTATION: optional maxCommuteMinutes integer0..1440/null in existing revisioned private preferences; omitted field preserves existing value. Current offer-version estimate requires exact ROUND_TRIP_MINUTES_PER_WORK_DAY, nonnegative integer, named source and nonfuture source date. Missing/old/incompatible evidence yields UNKNOWN; above bound KNOWN_NOT_MET. Default listing requires SATISFIED; explicit includeUnknown=true admits UNKNOWN only and labels it, never a known failed condition. Employer projections and process snapshots/clocks remain unchanged; no CV/EHV/net conversion/login delta.
API / UI: GET /api/faro/offers?includeUnknown=true|false (invalid values400); candidate checkbox defaults off/reset on logout. Own preferences enable/disable bound; detail explains three states. No migration; existing private JSON and economics version remain authoritative.
TEST / REVIEW / ACCEPTANCE: full current-input npm run check PASS:142 Node tests,32 migrations,both real restore drills,30 mobile/desktop browser executions,lint/typecheck, zero skips. Two new tests cover exact boundary/zero, wrong basis, negative/fractional/future/old estimates, unknown opt-in, other-user isolation, employer/process unchanged, omitted preference preservation and invalid input. Existing real browser journey covers save/reload, strict exclusion, explicit unknown label, own estimate and strict admission; axe remains enabled. git diff --check PASS.
PRIVACY / LEGAL: candidate-only estimates/constraints; cards carry only own unknown marker. Engineering comparison of self-declared evidence is not verified routing or assessment validity. External provider/legal/research gates remain open; production503 and scheduler disabled.
ROLLBACK / RISK: disable commute filter/UI together while preserving private declarations; do not reinterpret missing evidence as zero or hide failures under unknown. Actual routing/provider freshness policy remains separate.
STATUS: bounded local acceptance DONE; exact remote PENDING; full CP05/master plan/release PARTIAL. Continue remaining legal-safe deltas.