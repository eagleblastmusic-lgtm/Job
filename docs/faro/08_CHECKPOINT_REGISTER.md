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
CP05-C exact remote acceptance DONE at76dde71: [FARO37216061628](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37216061628) and [CI37216061412](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37216061412) SUCCESS including actual Docker smoke. [Draft50](https://github.com/eagleblastmusic-lgtm/Job/pull/50) depends on draft49 and remains unmerged. Full plan/release PARTIAL.
## CP10-I — Individual human score amendment (2026-10-04)
GOAL / DELTA: finalized quiz scores now permit explicit task-by-task human correction with reason; this is individual review, not shared answer-key/cohort repair or psychometric validation.
IMPLEMENTATION / MIGRATION:0033 preserves all existing result-history rows and timestamps, extends VALID history with HUMAN_AMENDMENT and rejects invalid validity/reason combinations. Original attempts.result/answers/definition/reviewer/timing stay unchanged; only attempt revision increments. Current finalized result reads latest history, invalidation copies latest corrected evidence. Pinned task maximums, exact task set and integer points required; unanswered stays NULL, not zero. Explicit comparisonStatus INDIVIDUAL_HUMAN_AMENDMENT prevents claims of common deterministic grading.
API / UI: POST /api/faro/attempts/:id/amend-result {expectedVersion,processVersion,idempotencyKey,confirmed:true,reason,scores:{taskId:number|null}} by currently assigned organization member; no candidate/unassigned platform administrator. Before-cache and transactional authorization, stale input/changed key/unconfirmed/no-change denied; cached acknowledgement freshly projects current authorized evidence so subsequent invalidation never revives valid result. Current workspace exposes reason and reviewed points/history; candidate sees corrected score and comparison limitation without answer key/reviewer identity. No locked login delta.
TEST / ACCEPTANCE: full npm run check PASS143 Node/33 migrations/both real restores/30 desktop-mobile browser executions/lint/typecheck, zero skips. New API regression covers pinned original evidence, terminal withdrawal/clock preservation, scope/stale/version/invalid points/missing answers, one bilateral notification/event, fresh replay after invalidation, export/erasure. Actual backup restores original2 and amendment1; actual browser corrects then invalidates with axe. Added populated0033 upgrade assertions were separately executed after final build:1 selected test PASS, zero skips. diff check PASS.
PRIVACY / LEGAL: own process result/reason only; shared-case actor remains audit evidence, not candidate DTO. No hiring automation, global score or certified fairness claim. User has no external legal/assessment/provider/research evidence; gates remain open, production503/scheduler disabled.
ROLLBACK / RISKS: retain additive history and latest-history projection; disabling amendment API/UI together must not resurrect original score as current. Offline backup/controlled migration rehearsal required. Per-recruitment cohort repair/ranking, formal measurement validity and appeals policy remain separate; full CP10/master plan PARTIAL. Local bounded acceptance DONE; exact remote PENDING.
NEXT: shared pinned-key/cohort correction after explicit preview; other legal-safe technical gaps continue.
CP10-I exact remote acceptance DONE atc250d35: [FARO37216770693](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37216770693) and [CI37216770743](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37216770743) SUCCESS including actual Docker smoke. [Draft51](https://github.com/eagleblastmusic-lgtm/Job/pull/51) depends on draft50; full CP10/master plan/release PARTIAL.
## CP10-J — Previewed common-key cohort correction (2026-10-04)
GOAL / DELTA: an authorized human can correct objective accepted-answer options consistently for all current VALID finalized attempts of one pinned company-assessment version, with inspectable effects instead of silent key mutation.
IMPLEMENTATION / MIGRATION:0034 records immutable separate key-correction revision/id, accepted-option sets, reason/date and actor with erasure SET NULL; original definition/rubric/tasks/weights and attempts.result/answers/reviewer/timing are untouched. Append-only result history holds prior individual/common scores; current score uses latest VALID history and shared scoringRevision. This does not equate different tests or different correction revisions.
API / UI: POST /assessments/:id/versions/:version/key-correction/preview {acceptedOptions:{taskId:number[]},reason}; POST same path without /preview {same payload,previewToken,confirmed:true,replaceIndividualAmendments,idempotencyKey}. Existing assigned-member scope before cache and transaction. Snapshot fingerprint uses whole exact group/definition/current correction/current process revisions and proposed key/reason/actor; stale preview409. Preview includes every attempt with before/after/state, including invalid or unfinished results. Any INVITED/STARTED/SCORED_PENDING_REVIEW blocks apply, never change key mid-attempt. INVALIDATED stays invalid; EXPIRED/TECHNICAL_ISSUE untouched. Individual score replacement requires additional explicit acknowledgement; all VALID finalized rows receive shared revision atomically, including terminal processes whose decisions/clocks remain unchanged. Limit500 is operational review capacity, not a quality/fraud threshold; over-limit fails closed. Corrected versions no longer accept fresh assignment/technical retry; new candidates require a genuinely new reviewed/approved definition version. Employer review labels original pinned key, current result labels common correction. Candidate DTO has no accepted options/keys/actors. Locked login unchanged.
TEST / ACCEPTANCE: final npm run check PASS144 Node/34 migrations/both real restore drills/30 browser executions/lint/typecheck, zero skips; diff check PASS. New multi-candidate API regression: incomplete live group block, stale group/manual revision, malformed options, current scopes/replay/revocation, explicit manual replacement, invalidated and unanswered retention, unchanged original evidence and process decisions, distinct later common revision, future assignment refusal, erasure. Actual browser preview/ack/apply→visible corrected result→invalidation with axe/reflow320. Actual restore keeps original2/individual1/common2, archived key and scoringRevision; erased author remains NULL.
PRIVACY / LEGAL / LIMITS: own per-process history only, common reason safe template events to each involved candidate/assigned team; no global ranking, automatic hiring decision or psychometric/legal certification. Full CP10 includes further advanced tasks/assessment wallet/ranking validation and external gates; these are not marked DONE. Source/header correction reason must omit private identities. Production503/scheduler remain closed.
ROLLBACK: disable correction UI/API together, retain header/history/latest result projection and corrected-version assignment fence. Never revert to uncorrected score as current or erase old evidence. Offline backup/rehearsal required for migration. Bounded local acceptance DONE; exact remote PENDING; full CP10/master plan/release PARTIAL.
NEXT: current remote acceptance, then consent-gated minimal Canonical product analytics/meaningful progression and remaining legal-safe gaps.
CP10-J exact remote acceptance DONE atdbfe763: [FARO37217842454](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37217842454) and [CI37217842483](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37217842483) SUCCESS. Draft52 depends on draft51; all remain unmerged. No release/deploy; full plan PARTIAL.
## CP11-G — Optional product progression, 2026-10-05
Closed existing-store producer derives one consenting candidate-offer pair/week from actual bilateral completed interview; payload only version/week/stage. No invitations/rejections/client properties. Revocation/erasure/recovery remove product telemetry; security audit stays independent. Full check145 Node/34 migrations/both restores/30 browsers/lint/typecheck PASS, zero skips. See [implementation and limits](CP11_G_PRODUCT_ANALYTICS.md). Local bounded acceptance DONE, exact remote PENDING; full CP11/master plan/release PARTIAL. Next: authored task-level guidance for existing activity nodes, without ESCO/license/measurement certification. Locked login/invariants remain unchanged.
## CP03-D — Authored activity guidance, 2026-10-06
Five existing activity nodes now expose immutable versioned task examples for three descriptive levels in the catalog and actual declaration/proposal/offer editor. AUTHOR_DRAFT, optional help, not validated anchors/certification/ESCO mapping. Stored claims/snapshots/matching/projections unchanged. [Scope and evidence](CP03_D_ACTIVITY_GUIDANCE.md): full check146 Node/34 migrations/both restores/30 browsers/lint/typecheck PASS, zero skips. Bounded local acceptance DONE; exact remote PENDING; full CP03/master plan/release PARTIAL. Next: distinct operational count of mutually completed interviews using existing reliability producer, not invitations/rejections as success.
CP11-G exact remote acceptance DONE ated9b811: [FARO37379479424](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37379479424) and [CI37379479463](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37379479463) SUCCESS. [Draft53](https://github.com/eagleblastmusic-lgtm/Job/pull/53) stays dependent/unmerged; no external gate/release certification.
## CP07-F — Distinct mutually completed stage, 2026-10-06
Existing own-organization operational report now verifies mutual completion against actual interview flags/completion event and counts distinct processes separately from invitation/confirmed appointment/rejection. [Scope and evidence](CP07_F_COMPLETED_STAGE_FACTS.md): full check147 Node/34 migrations/both restore drills/30 browsers/lint/typecheck PASS, zero skips. Local bounded acceptance DONE; exact remote PENDING; full CP07/master plan/release PARTIAL. Next: expose existing full native conditions/process/economics provenance in comparison; no tax/routing invention.
CP03-D exact remote acceptance DONE at6e702c8: [FARO37380022904](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37380022904) and [CI37380022974](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37380022974) SUCCESS. Draft54 remains dependent/unmerged. Author guidance is still awaiting actual user validation and does not close licensed taxonomy/evidence gates.
CP07-F exact remote acceptance DONE at4577587: [FARO37380483247](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37380483247) and [CI37380483273](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37380483273) SUCCESS. Draft55 remains dependent/unmerged; full plan/release PARTIAL.

## CP09-B — Native comparison and scenario provenance, 2026-10-06
Existing authorized Offer/Economics DTOs now expose all salary variants, current offer version/native conditions/process promises, selected private scenario version and source/date/assumptions/calculation version. No tax/route provider, EHV, winner or employer disclosure. Stale scenario warnings only accompany scenario-derived cells, never current conditions. [Scope](CP09_B_NATIVE_COMPARISON.md). Full npm run check PASS147 Node/34 migrations/both actual restore drills/30 browser executions/lint/typecheck, zero skips; exact remote pending; full CP09/master plan/release PARTIAL. Next: browser offline/session-expiry boundary and remaining legal-safe gaps. Locked login preserved; external gates remain open.

## CP11-H — Real network loss and expired-session boundary, 2026-10-06
Existing API client distinguishes connection failure/offline without replaying commands, preserves abort behavior, and puts expired-session notice on the locked login after clearing private state. Real Chromium mobile/desktop test: offline PUT fails and original profile persists, read retry recovers, keyboard skip focuses content, actual public-shell CacheStorage contains no API entries, actual expired sessions row yields401/cleared workspace/empty password and axe PASS. No auth markup/style change, offline write queue, private cache or MFA claim.
Full npm run check PASS147 Node/34 migrations/both actual restore drills/32 browser executions/lint/typecheck, zero skips. Exact remote pending. Full CP11/master plan/release PARTIAL; manual accessibility acceptance, MFA/recovery, PostgreSQL and external gates remain open. Next: current authority session revocation with reauthentication, using existing sessions/security path.

CP09-B exact remote acceptance DONE at4d15f5b: FARO37381779711 and CI37381779799 SUCCESS (also push FARO37381743126 SUCCESS). Draft56 stays dependent/unmerged; no release approval.

CP11-H exact remote acceptance DONE atd340f83: [FARO37382563175](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37382563175) and [CI37382563222](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37382563222) SUCCESS. Draft57 remains dependent/unmerged; full plan/release PARTIAL.

## CP02-G — Reauthenticated revoke-all sessions, 2026-10-06
Existing privacy workspace and sessions table now support confirmed exact-current-password revocation of every own session, including current, with atomic minimal security audit and cookie expiry. Wrong password keeps workspace; foreign origin/target denied or ignored. [Scope](CP02_G_SESSION_REVOCATION.md). Full check148 Node/34 migrations/both actual restores/32 browsers PASS. After final password-preservation and audit-rollback regression changes: typecheck/full148 Node/targeted2 browsers/current lint/diff-check PASS; unchanged migrations/restore inputs retain preceding proof. Zero skips. Bounded local acceptance DONE; exact remote pending. MFA/recovery/privileged step-up and full CP02/K019/master plan/release PARTIAL. Next: descriptive process progression gaps through existing own-organization report, no fraud thresholds or automatic sanctions.

## CP07-G — Recorded progression gaps, 2026-10-06
Existing own-organization aggregate report response-cohort-v3 shows exact distinct-process complements for no recorded ADVANCE/no recorded confirmed interview, denominator all retained cohort including rejection/withdrawal/immature cases. UI explicitly distinguishes absence of an event from fraud, missing external interview or overdue next stage. [Scope](CP07_G_PROGRESSION_GAPS.md). Full npm run check PASS148 Node/34 migrations/both actual restores/32 browsers/lint/typecheck, zero skips; diff check PASS. No thresholds, automatic cases/restrictions, public reputation or ranking input. Local bounded acceptance DONE; exact remote pending; full CP07/master plan/release PARTIAL. Next: manual open-answer assessment foundation with pinned rubric, no automatic grading or executable uploads.

CP02-G exact remote acceptance DONE at44bf3ca: [FARO37383213563](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37383213563) and [CI37383213360](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37383213360) SUCCESS. CP07-G exact remote acceptance DONE ata81e015: [FARO37383663019](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37383663019) and [CI37383663160](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37383663160) SUCCESS. Draft58/59 remain dependent/unmerged; full plan/release PARTIAL.

## CP10-K — Manual open-answer foundation, 2026-10-06
Extends existing approved pinned definitions/attempts with explicit OPEN_ANSWER/HUMAN, authored per-task criteria, bounded private text save/reconnect, no automatic points, exact human review of every answered task and null for missing answers. Original rubric/text/score survive new drafts and amendments; quiz-key correction forbidden. [Scope and limits](CP10_K_MANUAL_OPEN_ANSWER.md). Final npm run check PASS149 Node/34 migrations/both actual restore drills/34 desktop/mobile browser executions/lint/typecheck, zero skips; diff check PASS. Real create/edit/start/save/reload/submit/manual score and both-role axe/reflow320; export/erasure and actual restored original2/amendment1, pinned text/rubric and erased reviewer NULL. Local bounded acceptance DONE; exact remote pending. Full CP10 assessment validation/advanced tasks/wallet and master plan/release PARTIAL. Next: privileged MFA/recovery using existing identity/session boundary, with fail-closed protected secret configuration.

CP10-K exact remote acceptance DONE at66635b4: [FARO37384886723](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37384886723) and [CI37384886582](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37384886582) SUCCESS. Draft60 remains dependent/unmerged; full plan/release PARTIAL.

## CP02-H — Protected MFA and one-use recovery, 2026-10-06
Extends existing sessions with encrypted TOTP setup, mandatory production privileged MFA, five-minute session verification and one-use password-confirmed recovery. Private API gates recheck authorization after request body; active secret replacement requires current second factor. Current-authority restore preserves consumed counters/recovery codes and drops session grants. Locked login unchanged. [Scope](CP02_H_PROTECTED_MFA.md). Full npm run check PASS152 Node/35 migrations/both actual restore drills/36 desktop/mobile browser executions/lint/typecheck, zero skips; diff check PASS. RFC vectors, actual HTTP expiry during body, replay/rate limits, private export and real accessible enrollment/recovery covered. Local bounded acceptance DONE; exact remote pending. Protected operator key lifecycle, independent security review, PostgreSQL, external acceptance and full master plan/release remain PARTIAL. Next: remaining canonical plan delta using existing authoritative service, without bypassing external gates.

CP02-H exact remote acceptance DONE at2f90e5b: [FARO37387892167](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37387892167) and [CI37387892042](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37387892042) SUCCESS. Draft61 remains dependent/unmerged; full plan/release PARTIAL.


## CP06-J — Concrete pinned employment offer, 2026-10-06
Existing OFFER/ACCEPT_OFFER now require confirmed published native conditions, exact selected salary amount, start/response dates and candidate confirmation of exact unexpired revision. Private event snapshot survives new drafts and actual recovery; legacy free-text offer cannot be silently accepted. Existing HIRED enum UI means confirmed offer acceptance, not proof of employment commencement. [Scope](CP06_J_EMPLOYMENT_TERMS.md). Full check PASS153 Node/35 migrations/both actual restore drills/38 desktop/mobile browsers/lint/typecheck, zero skips. Final added account-erasure assertion targeted regression/typecheck/lint PASS; unchanged production code and preceding broader evidence retained. Diff check PASS. Bounded local acceptance DONE; exact remote pending. Full CP06/master plan/release PARTIAL. Next: executable PostgreSQL staging data rehearsal, with application runtime cutover kept explicit and uncompleted.


CP06-J exact remote acceptance DONE at6def302: [FARO37389049374](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37389049374) and [CI37389047911](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37389047911) SUCCESS. Draft62 remains dependent/unmerged; full plan/release PARTIAL.


## CP11-I — Executable PostgreSQL staging rehearsal, 2026-10-06
Read-only current-schema snapshot feeds new isolated PostgreSQL schema via pinned pg8.23.1, one client/transaction and parameterized values. Counts/hashes, source row order/consent trigger, FKs/CHECKs/indexes, rollback and source unchanged are required. [Scope and open runtime work](CP11_I_POSTGRES_REHEARSAL.md). Local source-only PASS70 tables/35 migrations, lint/typecheck/syntax/diff-check PASS. Real PostgreSQL18/Node22+24 CI defined; actual acceptance PENDING, not DONE. Application runtime remains SQLite and production Canonical503/worker gates remain closed. Broader unchanged153 Node/both restores/38 browsers have CP06-J exact remote acceptance; new-head full remote checks pending. Continue from actual PostgreSQL errors if any, then production runtime adapter/rehearsal; no audit restart or fake cutover.


CP11-I exact remote acceptance DONE for staging-data scope at7c05f87: [FARO37389939763](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37389939763) and [CI37389940077](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37389940077) SUCCESS. Actual PostgreSQL18 jobs Node22/24 PASS70 tables/35 migrations/counts/hashes/FKs/checks/consent/rollback/source-readonly. Earlierfe39731 failure fixed, no skips or criterion changes. Draft63 dependent/unmerged. Application runtime is SQLite; full CP11/master plan/release PARTIAL.


## CP11-J — Confirmed offer stage telemetry, 2026-10-06
Extends the existing closed optional progression producer with actual owning-candidate acceptance of matching published/pinned human offer terms. Definition v2 shares stable v1 pair/week dedupe namespace; existing v1 interview evidence remains unchanged and cannot gain a second count from accepted offer. Minimal payload, candidate consent/withdrawal/erase/recovery default-off and operational separation preserved. [Scope](CP11_J_OFFER_STAGE_ANALYTICS.md). Full check PASS153 Node/35 migrations/both actual restores/38 browsers/lint/typecheck, zero skips; targeted cross-stage/historical-v1 and actual offer/absence-of-consent regressions PASS. Restore fixture now requires both legitimate new accepted-offer and synthetic old telemetry before backup, still zero after fresh-consent recovery. Diff check PASS. Bounded local acceptance DONE, exact remote pending; full NSM/CP11/master plan/release PARTIAL. [External acceptance packet](EXTERNAL_ACCEPTANCE_PACKET.md) records user-reported missing evidence, exact scopes/reviewer artifacts/retention decision sheet without fabricated approvals. Next: async PostgreSQL transaction boundary consumed by real staging rehearsal, then remaining runtime/cutover deltas.


## CP11-K — Async PostgreSQL transaction boundary, 2026-10-06
Real staging importer now consumes PgJobDatabase: owner-scoped async single-connection transactions, serialization, SERIALIZABLE isolation, timeout/rollback, safe SQLSTATE and late-scope/nested protection. [Scope](CP11_K_ASYNC_POSTGRES_BOUNDARY.md). Source-only70 tables/35 migrations/syntax/typecheck/lint PASS; actual two-connection conflict/caught-failure/late-write and broader CI acceptance PENDING. Runtime remains SQLite and all external/release gates open. Continue with actual CI root causes if any before production repository adaptation; no synchronous worker bridge or shadow store introduced.


CP11-J exact remote acceptance at01e33b6: [FARO37391162935](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37391162935) and [CI37391162982](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37391162982) SUCCESS. CP11-K exact remote acceptance atbd8b141: [FARO37391574567](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37391574567) and [CI37391574640](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37391574640) SUCCESS, including real PostgreSQL18 Node22/24 transaction/scope/conflict proof. Draft64/65 remain dependent/unmerged. Full plan/release PARTIAL.

## CP11-L — Shared profile read model, 2026-10-06
Existing Canonical SQLite producer and real async PostgreSQL staging share explicit queries/mapping; synchronous commands preserved. Read-only snapshot batch and safe integer conversion have real database regression requirements. [Scope](CP11_L_PORTABLE_PROFILE_READ.md). Source-only70/35 PASS; full application and exact remote evidence pending. Runtime remains SQLite; whole CP11/master plan/release PARTIAL. Continue from actual acceptance, then remaining async repository/current-authority/cutover deltas.

CP11-L full local npm run check PASS153 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips; source-only70/35 and diff-check PASS. Exact real PostgreSQL and remote checks pending.

## CP11-M — Shared published offer read, 2026-10-06
Existing offer producer and PostgreSQL staging share explicit current/published reads and unchanged intake gates in an owned snapshot. Pending draft content stays private; missing proof/revoked membership/expiry cannot enable intake. [Scope](CP11_M_PORTABLE_OFFER_READ.md). Source-only70/35 PASS; full application and actual PostgreSQL acceptance pending. Runtime SQLite, whole CP11/master plan/release PARTIAL.

CP11-L exact remote acceptance at207adcd: [FARO37440425309](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37440425309) and [CI37440425276](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37440425276) SUCCESS. Actual PostgreSQL18 Node22/24 profile-wire/read-only-batch/safe-integer and preceding staging proof PASS. Draft66 remains dependent/unmerged; runtime SQLite, full plan/release PARTIAL.

CP11-M full local npm run check PASS153 Node/35 migrations/both actual restores/38 desktop/mobile browser executions/lint/typecheck, zero skips; source-only70/35 and diff-check PASS. Actual PostgreSQL and exact remote acceptance pending.

## CP11-N — Shared profile save command, 2026-10-06
Existing synchronous profile save and real async PostgreSQL staging share validation/parameterized write plan, guarded revision and atomic phone-grant revocation/audit. Structured clarification keeps existing availability parser semantics. [Scope](CP11_N_PORTABLE_PROFILE_WRITE.md). Source-only70/35 PASS; full application and actual PostgreSQL acceptance pending. Runtime remains SQLite; whole CP11/master plan/release PARTIAL. Continue with actual database errors if any, then remaining command/current-authority conversion.

CP11-M exact remote acceptance at9beab73: [FARO37441227370](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37441227370) and [CI37441227307](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37441227307) SUCCESS. Actual PostgreSQL18 Node22/24 published/current wire parity, unpublished draft isolation and intake proof regressions PASS. Draft67 remains dependent/unmerged; runtime SQLite, whole plan/release PARTIAL.

CP11-N full local npm run check PASS153 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips; source-only70/35 and diff-check PASS. Exact actual PostgreSQL and remote acceptance pending.

## CP11-O — Shared private constraints write, 2026-10-06
Existing constraints command and actual PostgreSQL staging share guarded validation/update, preserving omitted salary/commute and requiring explicit null to remove. [Scope](CP11_O_PORTABLE_PRIVATE_CONSTRAINTS.md). Source-only70/35 PASS; full application and actual PostgreSQL acceptance pending. Runtime SQLite; whole CP11/master plan/release PARTIAL. Continue remaining profile commands/repositories and current-authority conversion after actual acceptance.

CP11-N atfd9ee0e: [FARO37441865147](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37441865147) SUCCESS, including actual PostgreSQL18 Node22/24 profile writes and atomic phone-grant/audit/profile rollback. [CI37441865183](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37441865183) still in progress at this observation. Draft68 dependent/unmerged; runtime SQLite, whole plan/release PARTIAL.

CP11-O full local npm run check PASS153 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips; source-only70/35 and diff-check PASS. Exact actual PostgreSQL and remote acceptance pending.

## CP11-P — Shared profile evidence commands, 2026-10-06
Existing own claim/revoke/learning/activity/proposal producers and real PostgreSQL staging share validation and parameterized commands. Retained claim history, owning pending decisions, explicit confirmation and DECLARED verification preserved; local questions do not become competence automatically. [Scope](CP11_P_PORTABLE_PROFILE_EVIDENCE.md). Full application and actual PostgreSQL acceptance pending. Runtime SQLite; full CP11/master plan/release PARTIAL. Continue actual acceptance then remaining organization/offer/process/assessment/privacy/current-authority repositories.

CP11-N final CI37441865183 SUCCESS atfd9ee0e supersedes the previous pending note; FARO37441865147 also SUCCESS. CP11-O exact acceptance at7526d41: [FARO37442510890](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37442510890) and [CI37442510741](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37442510741) SUCCESS, including PostgreSQL18 Node22/24 private constraints save/preserve/remove/refusal proof. Draft68/69 dependent/unmerged; runtime SQLite, full plan/release PARTIAL.

CP11-P full local npm run check PASS153 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips; final source-only70/35 and diff-check PASS. Exact actual PostgreSQL and remote acceptance pending.

## CP11-Q — Shared organization access reads, 2026-10-06
Existing FaroStore membership/affiliation and own organization list share explicit queries with actual PostgreSQL. Exact active role scopes and opaque404 retained; historical affiliation survives revocation for moderator independence. [Scope](CP11_Q_PORTABLE_ORGANIZATION_ACCESS.md). Source-only70/35 PASS; full application and actual PostgreSQL acceptance pending. Runtime SQLite; whole CP11/master plan/release PARTIAL. Continue organization writes and remaining repositories/current-authority work after real acceptance.

CP11-P exact remote acceptance at951682f: [FARO37443239641](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37443239641) and [CI37443239626](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37443239626) SUCCESS. Actual PostgreSQL18 Node22/24 private claims/learning/activity/proposal history, ownership, confirmation, pinned-skill and rollback regressions PASS. Draft70 dependent/unmerged; runtime SQLite, full plan/release PARTIAL.

CP11-Q full local npm run check PASS153 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips; source-only70/35 and diff-check PASS. Exact actual PostgreSQL and remote acceptance pending.

## CP11-R — Shared organization create/verify commands, 2026-10-06
Existing create and independent moderator verification share parameterized plans with real PostgreSQL staging. Owner/audit transaction, current ADMIN, historical affiliation and RESTRICTED separation preserved; synthetic fixture is not external qualification. [Scope](CP11_R_PORTABLE_ORGANIZATION_VERIFICATION.md). Source-only70/35 PASS; full application and actual PostgreSQL acceptance pending. Runtime SQLite; full CP11/master plan/release PARTIAL. Continue invites/membership and remaining repositories/current-authority conversion after actual acceptance.

CP11-Q exact remote acceptance at6728484: [FARO37443951948](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37443951948) and [CI37443951915](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37443951915) SUCCESS. Actual PostgreSQL18 Node22/24 membership/list parity, exact role allowlists, revoked access and retained affiliation proof PASS. Draft71 dependent/unmerged; runtime SQLite, full plan/release PARTIAL.

CP11-R full local npm run check PASS153 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips; source-only70/35 and diff-check PASS. Exact actual PostgreSQL and remote acceptance pending.

## CP11-S — Shared invitations and atomic membership revoke, 2026-10-06
Existing invite/accept/revoke and real PostgreSQL share parameterized plans. Closes actual SQLite revoke-before-audit transaction gap; new real API failure regression PASS. Exact email/unused/expiry, hash-only token, owner protection, approved reactivation and historical affiliation retained. [Scope](CP11_S_PORTABLE_MEMBERSHIP_COMMANDS.md). Source-only70/35 and targeted4 API tests PASS; full application and PostgreSQL acceptance pending. Runtime SQLite; whole CP11/master plan/release PARTIAL. Continue remaining offer/process/assessment/auth/privacy/current-authority repositories after actual acceptance.

CP11-R exact remote acceptance at3e76704: [FARO37444776127](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37444776127) and [CI37444776137](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37444776137) SUCCESS. Actual PostgreSQL18 Node22/24 create/FK rollback, independent moderator/historical conflict/restriction and audit rollback proof PASS. Draft72 dependent/unmerged; runtime SQLite, full plan/release PARTIAL.

CP11-S full local npm run check PASS154 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips; source-only70/35, targeted4 API tests and diff-check PASS. Exact actual PostgreSQL and remote acceptance pending.

## CP11-T — Controlled PostgreSQL connection loss, 2026-10-06
Consumed adapter handles idle driver errors/end, fails closed and rechecks readiness for queued scopes. Real PostgreSQL must terminate an isolated backend and prove controlled refusal without losing healthy connection. [Scope](CP11_T_POSTGRES_CONNECTION_LOSS.md). Source-only70/35/typecheck/lint/diff-check PASS; exact remote pending. Runtime remains SQLite; previous CP11-S full154/both restores/38 browsers retained. Whole plan/release PARTIAL; continue actual acceptance then remaining repositories/current-authority conversion.

## CP11-U — Shared atomic offer draft create, 2026-10-06
Existing parseOffer and draft producer remain authoritative; PostgreSQL consumes the same native validation/write plan under SERIALIZABLE, with current own creator/recruiter role checks and atomic version/assignment/audit. [Scope](CP11_U_PORTABLE_OFFER_DRAFT.md). Source-only70/35 PASS; full application and actual PostgreSQL acceptance pending. Runtime SQLite; full CP11/master plan/release PARTIAL. Continue actual acceptance then offer edit/lifecycle and remaining repositories/current-authority conversion.

CP11-S exact remote acceptance atb1f6b8f: [FARO37445963925](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37445963925) and [CI37445963899](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37445963899) SUCCESS. CP11-T exact acceptance atc446669: [FARO37446143207](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37446143207) and [CI37446143344](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37446143344) SUCCESS. Real PostgreSQL18 Node22/24 membership/hash/expiry/role/rollback and actual idle backend termination proof PASS; full154 Node/both restores/38 browser CI retained, no skips. Draft73/74 dependent/unmerged; runtime SQLite, whole plan/release PARTIAL.

CP11-U full local npm run check PASS154 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips; source-only70/35 and diff-check PASS. Exact actual PostgreSQL and remote acceptance pending.

## CP11-V — Shared atomic offer version edit, 2026-10-06
Existing edit and actual PostgreSQL share guarded native version write plan, current assignment/creator/recruiter checks, immutable prior content and approval reset. [Scope](CP11_V_PORTABLE_OFFER_EDIT.md). Source-only70/35 PASS; full application and actual PostgreSQL acceptance pending. CP11-U actual failure94cbb07 fixed at61cc962: fault-injection CHECK now enforces new inserts without rejecting retained history; rollback criterion unchanged. Runtime SQLite; whole plan/release PARTIAL. Continue actual acceptance then lifecycle/outbox and remaining repositories/current-authority conversion.

CP11-V full local npm run check PASS154 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips; source-only70/35 and diff-check PASS. Exact actual PostgreSQL and remote acceptance pending. CP11-U fix61cc962 actual PostgreSQL18 Node22/24 PASS; full FARO37447143779/CI37447143553 still pending at this observation.

CP11-U fixed61cc962 exact acceptance: [FARO37447143779](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37447143779) and [CI37447143553](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37447143553) SUCCESS. CP11-V abdf320 exact acceptance: [FARO37447404367](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37447404367) and [CI37447404336](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37447404336) SUCCESS, including PostgreSQL18 Node22/24 atomic create/edit, retained publication/history, no-op and real audit rollback. Initial U failure remains recorded; fixed injection enforces new writes without invalidating retained history. Draft75/76 dependent/unmerged; runtime SQLite, full plan/release PARTIAL.

## CP11-W — Shared atomic offer lifecycle/outbox, 2026-10-06
Existing publication/reconfirmation/pause/close/archive producer and real PostgreSQL share revision/status checks, explicit confirmation, current organization/recruiter authority and atomic version-proof/audit/outbox commands. Recipient union and exact dedupe key retained; unrelated outbox errors now fail the entire command rather than being ignored. [Scope](CP11_W_PORTABLE_OFFER_LIFECYCLE.md). Full application and actual PostgreSQL acceptance pending. Runtime SQLite; full CP11/master plan/release PARTIAL. Continue actual acceptance then remaining offer discovery/process/assessment/auth/privacy/current-authority repositories.

CP11-W full local npm run check PASS154 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips; source-only70/35 and diff-check PASS. Exact actual PostgreSQL and remote acceptance pending.

## CP11-X — Shared offer listing/private conditions, 2026-10-06
Existing public/own-organization listing and actual PostgreSQL consume shared explicit queries and the existing private condition evaluator. Only current intake-approved publications enter candidate results; unknown opt-in never admits a known failure. Own organization lists remain role scoped and show current drafts. [Scope](CP11_X_PORTABLE_OFFER_LIST.md). Full application and actual PostgreSQL acceptance pending. Runtime SQLite; whole CP11/master plan/release PARTIAL. Continue actual acceptance then remaining detail/process/assessment/auth/privacy/current-authority work.

CP11-X full local npm run check PASS154 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips; source-only70/35 and diff-check PASS. Exact actual PostgreSQL and remote acceptance pending.

CP11-W46ffc46 exact remote acceptance: [FARO37448510362](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37448510362) and [CI37448510341](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37448510341) SUCCESS. Real PostgreSQL18 Node22/24 publication/explicit confirmation/current authority/outbox rollback/dedupe/original publication time/close/archive proof PASS; full application/browser/image proof retained. Draft77 dependent/unmerged; runtime SQLite, full plan/release PARTIAL.

## CP11-Y — Shared private offer detail/history read, 2026-10-06
Existing detail and actual PostgreSQL share active assignment, own process/watch, native profile explanation and private conditions. Candidate viewers see proven publication; assigned members keep current draft visibility. Native insertion order for latest own process is retained with reviewed target identity, including backdated/equal clocks. [Scope](CP11_Y_PORTABLE_OFFER_DETAIL.md). Full application and actual PostgreSQL acceptance pending. Runtime SQLite; whole CP11/master plan/release PARTIAL. Continue actual acceptance then remaining process/assessment/auth/privacy/current-authority conversion.

CP11-X0e9c483 exact acceptance: [FARO37449170085](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37449170085) and [CI37449170043](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37449170043) SUCCESS. Actual PostgreSQL18 Node22/24 public/organization list wire parity, foreign-org refusal, known-failure exclusion and private commute current/stale/unknown proof PASS. Draft78 dependent/unmerged; runtime SQLite, full plan/release PARTIAL.

CP11-Y full local npm run check PASS154 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips; source-only70/35 and diff-check PASS. Exact actual PostgreSQL and remote acceptance pending.

## CP11-Z — Shared atomic command journal, 2026-10-06
Existing recruitment/interview/assessment/trust commandOnce consumes shared key/hash/read/replay/save plans. Real async PostgreSQL owns SERIALIZABLE command/work/journal scope and requires current-authority callback before every replay. Existing synchronous callers keep their current authorization checks and command contract. [Scope](CP11_Z_PORTABLE_COMMAND_JOURNAL.md). Full application and actual PostgreSQL acceptance pending. Runtime SQLite; whole CP11/master plan/release PARTIAL. Continue actual acceptance then remaining native process commands/assessment/auth/privacy/current-authority conversion.

CP11-Z full local npm run check PASS154 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips; source-only70/35 and diff-check PASS. Exact actual PostgreSQL and remote acceptance pending.

CP11-Z initial9b09124 real PostgreSQL failed retained hash comparison after the new journal proof: the synthetic successful acknowledgement was not removed alongside its temporary process/outbox changes. Fix removes only the exact synthetic employer/key journal row after all replay/rollback/current-authority assertions, restoring the original snapshot before the unchanged70-table comparison. No assertion skipped or relaxed; full real PostgreSQL rerun required. Local application154/35/both restores/38 browser proof remains valid because runtime code is unchanged.

CP11-Y48b227e exact acceptance: [FARO37449975250](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37449975250) and [CI37449975261](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37449975261) SUCCESS. CP11-Z fixe6cba56 exact acceptance: [FARO37450962160](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37450962160) and [CI37450962143](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37450962143) SUCCESS. Actual PostgreSQL18 Node22/24 private detail/history ordering and journal rollback/replay/current-authority proof PASS with original70-table hash comparison retained. Initial Z9b09124 fixture failure remains recorded and is superseded by the fixed full rerun. Draft79/80 dependent/unmerged; runtime SQLite, whole plan/release PARTIAL.

## CP11-AA — Shared native interest/projection/event commands, 2026-10-06
Existing interest producer and actual PostgreSQL share explicit projection preview/hash, intake/version/confirmation/active/history checks, immutable minimized snapshot/response clock and event/audit/outbox plans. Idempotent async command owns all writes under current-authority callback. [Scope](CP11_AA_PORTABLE_INTEREST.md). Full application and actual PostgreSQL acceptance pending. Runtime SQLite; whole CP11/master plan/release PARTIAL. Continue actual acceptance then remaining native process transitions/read/assessment/auth/privacy/current-authority conversion.

CP11-AA local full npm run check PASS154 retained Node tests/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips. Added real API regression then rebuilt and ran the complete recruitment file:17/17 PASS, including the new rollback/retry/replay test (155 distinct Node tests covered across retained full run plus new targeted regression). No runtime change after the full run. Source-only70/35 and diff-check PASS. Exact actual PostgreSQL and remote155-test acceptance pending.

CP11-AA5fece10 [FARO37451873621](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37451873621) SUCCESS: actual PostgreSQL18 Node22/24 native interest/projection/history/event/outbox/journal rollback proof, all preceding70-table hashes/constraints/current-authority proofs, contracts, full155 Node compatibility,38 desktop/mobile browser executions and actual container closed-release smoke PASS, no skips. [CI37451873766](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37451873766) still in progress at this observation. Local full154 retained Node/both restores/38 browsers plus17/17 recruitment including new API regression PASS. Draft81 dependent/unmerged; runtime SQLite, whole CP11/master plan/release PARTIAL.

Continuation: retain this accepted code head and existing shared command/projection/event plans. Next CP11-AB is remaining native process read/transition commands and current-authority async conversion, then assessment/interview/auth/privacy/worker/target recovery/operator cutover work already listed. Do not restart audit/project or rerun valid proof without a concrete invalidating delta. Independent review of draft chain and external legal/provider/research/measurement/manual gates remain open.

CP11-AA final acceptance observed2026-10-07: CI37451873766 SUCCESS at5fece10, superseding the previous pending note; FARO37451873621 also SUCCESS. All required155 Node/35 migrations/both actual restore drills/38 real browser executions/actual PostgreSQL18 Node22/24/image closed-release proof PASS. Runtime SQLite; draft81 remains unmerged and full plan/release PARTIAL.

## CP11-AB — Shared private process view/context, 2026-10-07
Existing process row/view, pinned offer-version and latest clarification/employment terms consume shared explicit query/response plans with actual PostgreSQL. Active current membership/assignment and owning candidate access remain scoped; immutable projection/history and original clocks retained. Historical ANSWER free-text action stays redacted and latest-event insertion order still controls generic next action even under backdated clocks. [Scope](CP11_AB_PORTABLE_PROCESS_VIEW.md). Full application and real PostgreSQL acceptance pending. Runtime SQLite; full CP11/master plan/release PARTIAL. Continue actual acceptance then native process transitions and remaining assessment/interview/auth/privacy/worker/current-authority conversion.

CP11-AB full local npm run check PASS155 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips; source-only70/35 and diff-check PASS. Exact real PostgreSQL and remote acceptance pending.

CP11-AB393990e exact acceptance2026-10-07: [FARO37604279915](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37604279915) and [CI37604279941](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37604279941) SUCCESS. Actual PostgreSQL18 Node22/24 candidate/employer wire parity, current-authority refusal and backdated private ANSWER chronology/redaction proof PASS with preceding70-table hash/constraint/rollback proof unchanged. Full155 Node/35 migrations/both actual restores/38 desktop/mobile browsers/lint/typecheck/actual image closed-release smoke PASS, zero skips. Draft82 dependent/unmerged; runtime SQLite, whole CP11/master plan/release PARTIAL.

Continue from CP11-AC native process transitions using the accepted row/context, command journal, projection and event plans. Preserve current authority before replay, immutable pinned conditions and clocks, terminal obligation cancellation and exact optional accepted-stage telemetry. Remaining assessment/interview/auth/privacy/worker/target recovery/cutover and independent draft-chain/external gates stay open. Do not rerun accepted proof or restart audit without an invalidating delta.

## CP11-AC — Shared native process transition commands, 2026-10-07
Existing SQLite change/cancel producer and actual PostgreSQL staging consume one native validation/update plan for ADVANCE, CLARIFY, ANSWER, REJECT, CANCEL, WITHDRAW, OFFER and ACCEPT_OFFER. Owning candidate or current active assigned employer authority is checked inside the owned transaction before journal replay; new employer writes retain OWNER/ADMIN/RECRUITER restriction. Pinned published conditions, exact concrete employment revision/expiry, structured declarations, immutable projection and original response/first-response clocks remain intact. Terminal contact/attempt/interview cancellation, event/minimized audit/outbox and acknowledgement are atomic. SQLite retains its actual accepted-stage telemetry producer; the async producer requires an explicit owned-transaction callback, with the native PostgreSQL telemetry implementation still open. [Scope](CP11_AC_PORTABLE_PROCESS_COMMANDS.md).

Local full npm run check PASS155 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips. Added real API terminal-audit rollback/retry/replay regression and rebuilt complete recruitment file18/18 PASS (156 distinct Node tests covered across retained full run plus new regression). Source-only70/35 and script syntax PASS; actual PostgreSQL and remote156-test acceptance pending. Runtime SQLite; full CP11/master plan/release PARTIAL. Continue actual acceptance, then native accepted-stage telemetry and remaining process/watch/contact/assessment/interview/auth/privacy/worker/target recovery/cutover work. Independent draft-chain review and external gates remain open.

CP11-AC0e05186 exact acceptance2026-10-07: [FARO37606546036](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37606546036) and [CI37606545823](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37606545823) SUCCESS. Actual PostgreSQL18 Node22/24 native process transitions, terminal audit rollback with STARTED assessment, current authority before replay, pinned clarification/terms/clocks and accepted-hook rollback PASS with preceding70-table comparison retained. Full156 Node/35 migrations/both actual restores/38 desktop/mobile browsers/lint/typecheck/actual image closed-release proof PASS, zero skips. Draft83 dependent/unmerged; runtime SQLite and whole plan/release PARTIAL. Continue CP11-AD native consented accepted-stage producer and remaining native conversion/cutover/external gates.

## CP11-AD — Native consented accepted-stage telemetry, 2026-10-07
Shared pair-week consent/write plan now serves the existing SQLite interview/accepted-offer producer and native async accepted-offer producer. The owned process hook retains HIRED + owning candidate ACCEPT_OFFER + separate employer OFFER + published source version + non-null revision + exact lexical terms proof; an isolated entry point owns its own transaction without nesting the command transaction. JSON key order, numeric spelling, escapes and first duplicate-key behavior remain significant; whitespace outside strings alone is compacted. No jsonb semantic equality loosening. Latest consent including insertion ties must be granted and no later than the source event. Existing v1 pair/week namespace prevents double counting either stage or historical v1 rows; properties remain minimal v2/week/stage. Analytics integrity failure must roll back the entire acceptance/event/outbox/journal. [Scope](CP11_AD_NATIVE_ACCEPTED_STAGE.md).

Full local and actual PostgreSQL18 Node22/24 acceptance pending. Runtime SQLite; full CP11/master plan/release PARTIAL. Continue acceptance then remaining native process lists/watch/contact, assessment/interview/auth/privacy/worker and target recovery/cutover/independent review/external gates. This is optional consenting-pair telemetry, not full-population NSM or evidence of employment commencement.

CP11-AD local full npm run check PASS158 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips. Target-only hook ownership was then separated to avoid nested command transactions; rebuilt native target, reran both SQLite lexical/dedupe regression tests PASS, source-only70/35 and syntax/diff checks PASS. No SQLite runtime behavior changed after the full run. Exact real PostgreSQL and remote acceptance pending.

## CP11-AE — Shared private process lists, 2026-10-07
Existing RecruitmentService.list and native PostgreSQL list use a shared scoped query and the already accepted private process view mapping. Candidate lists contain only owning candidate history; offer-scoped lists require current active membership and assignment even when empty. Target rows and all per-process views are read in one owned SERIALIZABLE READ ONLY snapshot without nested transactions. Existing created_at directions remain (candidate descending, employer ascending), with an explicit insertion-order tie breaker instead of an unspecified timestamp tie. Both backends use their reviewed physical/source-order metadata internally; none is returned. [Scope](CP11_AE_PORTABLE_PROCESS_LIST.md).

Full local and real PostgreSQL acceptance pending. Runtime SQLite; full plan/release PARTIAL. Continue actual acceptance then native watch/contact and assessment/interview/auth/privacy/worker/target recovery/cutover, independent draft-chain review and external gates.

CP11-AE local full npm run check PASS158 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips. Source-only70/35, script syntax and diff-check PASS. Exact actual PostgreSQL and remote acceptance pending.

CP11-AD6584e3d exact acceptance2026-10-07: [FARO37607617234](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37607617234) and [CI37607617199](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37607617199) SUCCESS. Actual PostgreSQL18 Node22/24 consented acceptance producer, whole-command analytics failure rollback, unchanged SQLite source-query lexical oracle, latest/equal-time/later consent and retained historical v1 dedupe PASS. Full158 Node/35 migrations/both actual restores/38 desktop/mobile browsers/lint/typecheck/actual image closed-release proof PASS, zero skips. Draft84 dependent/unmerged; runtime SQLite, whole plan/release PARTIAL. CP11-AE list conversion is now in draft85 with local full PASS and remote acceptance pending; continue remaining native watch/contact/assessment/interview/auth/privacy/worker/recovery/cutover and external gates.

CP11-AE initialee8b2a4 actual PostgreSQL failed a new fixture assertion: list expected the two native interest/history rows under targetDraft.id, while submitInterest created them under the separate published interestOffer.id. Fix uses the actual owning published offer for the same full history/current-authority assertions; the unchanged SQLite source-proof oracle now also carries that exact offer ID. Safe failure stack parsing now selects stack frames before limiting, so multiline assertion differences cannot suppress diagnostic locations. No criteria skipped/relaxed. Local full158/35/both restores/38 browser proof remains valid; full actual PostgreSQL/remote rerun required.

## CP11-AF — Shared private watches and atomic alert cancellation, 2026-10-07
Existing SQLite watch/create/remove/mute/list now consumes the same private query/write plans as native PostgreSQL. Current-session authority runs inside each owned target write; create requires active proven intake, while existing historical watches retain last published conditions without unpublished draft leakage. Preference/write and pending optional alert deletion are atomic. Closing reminders are removed on mute/unwatch; other offer updates are removed only when no applicant history exists. Process updates, applicant condition updates and already delivered messages remain independent. Public response excludes watch-owner identity and import-order metadata. [Scope](CP11_AF_PORTABLE_PRIVATE_WATCHES.md).

Full local and real PostgreSQL acceptance pending. Runtime SQLite; full CP11/master plan/release PARTIAL. Continue acceptance then native explicit contact preview/grant/read/revoke and remaining assessment/interview/auth/privacy/worker/target recovery/cutover; independent draft-chain review and external gates remain open.

CP11-AF local full npm run check PASS159 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips. New real API watch mute cancellation rollback/retry/applicant-independence regression PASS. Source-only70/35, script syntax and diff-check PASS. Exact actual PostgreSQL18 Node22/24 and remote acceptance pending.

CP11-AF initial1463bdd and diagnostica091a19 PostgreSQL runs failed a new fixture baseline assertion: the original source snapshot already contains candidate watch for offer.id. Fix retains and asserts this imported watch, scopes new-watch assertions to interestOffer.id and checks the complete original list after removal/session refusal. Historical draft lookup selects its own offer instead of relying on timestamp position. No production criteria skipped or relaxed, and no imported row removed to manufacture empty state. Runtime local159/35/both restores/38 browser evidence remains valid; full real PostgreSQL rerun required.

CP11-AE7aaa3ce exact acceptance2026-10-07: [FARO37608760521](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37608760521) and [CI37608760647](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37608760647) SUCCESS. Real PostgreSQL18 Node22/24 private scoped process lists/wire parity/equal-date history/current-authority refusal PASS. Full158 Node/35 migrations/both restores/38 desktop/mobile browsers/actual image closed-release proof PASS; initial fixture failure is superseded by corrected full rerun. Draft85 unmerged; runtime SQLite, whole plan/release PARTIAL.

## CP11-AG — Shared explicit private contact consent and audited read, 2026-10-07
Existing SQLite phone preview/grant/revoke/read consume shared native ownership/status/confirmation/query/audit plans with PostgreSQL staging. Preview token remains bound to exact candidate/process/current phone; fresh explicit confirmation is required, private read requires current active assignment/membership plus unrevoked grant and ACTIVE/OFFERED status. Target authority callbacks run inside the transaction and privileged read explicitly requires session/MFA authority supplied by its caller; native authentication/MFA integration remains open. Private phone read and its minimized audit now share a write transaction in both backends, with no contact returned on audit failure. [Scope](CP11_AG_PORTABLE_EXPLICIT_CONTACT.md).

Full local and actual PostgreSQL acceptance pending. Runtime SQLite; full CP11/master plan/release PARTIAL. Continue acceptance then remaining assessment/interview/auth/MFA/privacy/worker/target recovery/cutover; independent draft-chain review and external gates remain open.

CP11-AF12ebcc3 actual PostgreSQL18 Node22/24 watch/current authority/pending alert FK rollback/applicant independence/imported baseline preservation proof PASS in FARO37611303930. Remaining full FARO/browser and CI37611303919 acceptance pending at this observation. Prior fixture baseline failures remain recorded; no production criterion was relaxed.

CP11-AG local full npm run check PASS160 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips. New real API grant/read audit failure regression PASS; original new-test endpoint typo was corrected to existing phone-grant before this complete rerun. Source-only70/35, syntax and diff-check PASS. Exact actual PostgreSQL and remote acceptance pending.

CP11-AF12ebcc3 exact acceptance2026-10-07: [FARO37611303930](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37611303930) and [CI37611303919](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37611303919) SUCCESS. Actual PostgreSQL18 Node22/24 watch authority/atomic optional cancellation/imported-history preservation PASS; full159 Node/35 migrations/both actual restores/38 desktop/mobile browsers/actual image closed-release proof PASS. Recorded initial fixture failures superseded by fixed full rerun. Draft86 unmerged; runtime SQLite, whole plan/release PARTIAL.

## CP11-AH — Shared native assessment definition/read/create/review, 2026-10-07
Existing SQLite definition/list/native parse/create/review/approval consume shared explicit query/validation/write/audit plans with PostgreSQL staging. Assigned current active organization members retain employer-only rubric/key access; candidate/foreign/revoked access remains refused. Native QUIZ/OBJECTIVE and OPEN_ANSWER/HUMAN, required rubric/time/task/right confirmation, latest-version review and immutable historical versions stay unchanged. SQLite standalone create and approval now own atomic write+audit transactions; existing idempotent version edit reuses the owned creation helper without nested transactions. Target create/read/approval use owned SERIALIZABLE transactions and write-authority callbacks. [Scope](CP11_AH_PORTABLE_ASSESSMENT_DEFINITIONS.md).

Full local and actual PostgreSQL acceptance pending. Runtime SQLite; full plan/release PARTIAL. Native idempotent definition-edit command, assignment/attempt lifecycle/incidents/results/retries/cohort correction, interview/auth/MFA/privacy/worker/recovery/cutover, independent draft review and external gates remain open. No advanced execution, AI provider call, automatic open-answer grade or release enablement.

CP11-AG419dfc3 [FARO37611991331](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37611991331) SUCCESS: actual PostgreSQL18 Node22/24 explicit contact ownership/confirmation/current membership/session-MFA callback refusal/audit rollback and full160 Node/35 migrations/both restores/38 desktop/mobile browsers/actual image closed-release evidence PASS. CI37611991336 still in progress at this observation. Draft87 dependent/unmerged; runtime SQLite, full plan/release PARTIAL.

CP11-AG419dfc3 exact final acceptance2026-10-07: CI37611991336 SUCCESS, superseding the pending note; FARO37611991331 also SUCCESS. All required actual PostgreSQL18 Node22/24 contact proof/160 Node/35 migrations/both restores/38 real browsers/image closed-release evidence PASS, zero skips. Runtime SQLite; draft87 unmerged and full CP11/master plan/release PARTIAL. Continue assessment definitions and remaining native conversion/cutover/external gates.

CP11-AH local full npm run check PASS161 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips. New real API definition create/approval audit rollback/retry/frozen version edit regression PASS. Source-only70/35, syntax and diff-check PASS. Exact actual PostgreSQL18 Node22/24 and remote acceptance pending.

## CP11-AI — Native idempotent assessment definition edit, 2026-10-07
Existing SQLite definition edit and native PostgreSQL command share expected/latest-version validation and preserve original origin, ignoring client attempts to relabel provenance. Required current authority and assigned membership run inside the owned transaction before replay. New immutable version, minimized audit and command acknowledgement are atomic; audit failure leaves no version or journal row, and exact replay creates no second version. Prior approved and draft versions remain unchanged. [Scope](CP11_AI_PORTABLE_ASSESSMENT_EDIT.md).

Full local and actual PostgreSQL acceptance pending. Runtime SQLite; full CP11/master plan/release PARTIAL. Continue acceptance then native assignment/attempt clocks/private drafts/submit/incidents/review/validity/retries/corrections, interview/auth/MFA/privacy/worker/recovery/cutover, independent draft-chain review and external gates. Checkpoint suffix AI does not enable AI providers or automatic grading.

CP11-AHcb88774 [FARO37612720333](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37612720333) SUCCESS: actual PostgreSQL18 Node22/24 definition/list wire parity, native task/scoring validation, scoped authority, draft/approval audit rollback and frozen version proof PASS. Full161 Node/35 migrations/both restores/38 real desktop/mobile browsers/actual image closed-release proof PASS, zero skips. CI37612720164 pending at this observation. Draft88 dependent/unmerged; runtime SQLite and whole plan/release PARTIAL. Continue native idempotent definition edit then assignment/attempt/review and remaining conversion/external gates.

CP11-AI local full npm run check PASS161 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips. Extended real API definition-edit audit rollback/retry/replay/frozen history regression PASS. Source-only70/35, syntax and diff-check PASS. Exact actual PostgreSQL18 Node22/24 and remote acceptance pending.

CP11-AI448dcfa exact acceptance 2026-10-07: [FARO37613303718](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37613303718) and [CI37613303714](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37613303714) SUCCESS. Actual PostgreSQL18 Node22/24 immutable edit/audit rollback/current authority before replay PASS; full161 Node/35 migrations/both actual restores/38 browsers/image closed-release proof PASS. Draft89 unmerged; runtime SQLite and whole plan/release PARTIAL. CP11-AH CI37612720164 also SUCCESS, superseding its pending note.

## CP11-AJ — Portable pinned assessment assignment, 2026-10-07

Shared SQLite/native assignment validation and exact pinned version; invitation, process stage/deadline, event/audit/outbox and idempotent acknowledgement are atomic. Current authority precedes replay. Full local162 Node/35 migrations/both restores/38 browsers/lint/typecheck PASS, zero skips; actual PostgreSQL18 Node22/24 acceptance pending. [Scope](CP11_AJ_PORTABLE_ASSESSMENT_ASSIGNMENT.md). Runtime SQLite, full plan/release PARTIAL. Continue attempt lifecycle and remaining native conversion/external gates.

## CP11-AK — Portable private assessment attempt views, 2026-10-07

Existing SQLite/native explicit reads and role-aware attempt mapping are shared. Candidate keys and employer draft answers stay private; submitted review, immutable result history/validity and retry/incident context retain current behavior. Native current-authority/assigned membership checked in owned read-only transaction, including empty scoped list. [Scope](CP11_AK_PORTABLE_ASSESSMENT_ATTEMPT_VIEWS.md). Local/actual PostgreSQL acceptance pending; runtime SQLite, whole plan/release PARTIAL. Continue native attempt writes and remaining conversion/external gates.

CP11-AK full local npm run check PASS162 Node/35 migrations/both actual restores/38 real desktop/mobile browser executions/lint/typecheck, zero skips. Source-only70/35, syntax and diff check PASS. Existing native read fixtures require real PostgreSQL acceptance; runtime SQLite, whole plan/release PARTIAL.

CP11-AJa21a81b exact acceptance2026-10-07: [FARO37614506206](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37614506206) and [CI37614506118](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37614506118) SUCCESS. Actual PostgreSQL18 Node22/24 pinned assignment/guards/notification rollback/current authority before replay PASS. Full162 Node/35 migrations/both restores/38 browsers/actual image closed-release proof PASS, zero skips. Draft90 unmerged; runtime SQLite, full plan/release PARTIAL.

## CP11-AL — Portable neutral attempt expiry, 2026-10-07

Shared SQLite/native due query and expiry plan preserve private answers, deadline/start/expiry evidence and original process response clocks. Required event/audit/outbox and neutral next-step deadline from the pinned offer version are atomic; newer/terminal process stages are retained. Native worker-authority callback runs inside the owned SERIALIZABLE transaction. [Scope](CP11_AL_PORTABLE_ASSESSMENT_EXPIRY.md). Local/actual PostgreSQL acceptance pending; runtime SQLite and whole plan/release PARTIAL. Continue candidate start/save/submit and remaining native lifecycle/integration/external gates.

CP11-AK58df3f5 exact acceptance2026-10-07: [FARO37615169333](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37615169333) and [CI37615169487](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37615169487) SUCCESS. Actual PostgreSQL18 Node22/24 private views/lists/source wire parity/current scoped refusal/draft-key privacy/finalized-invalidation history PASS. Full162 Node/35 migrations/both actual restores/38 browsers/actual image closed-release proof PASS, zero skips. Draft91 unmerged; runtime SQLite and full plan/release PARTIAL.

CP11-AL5b6de94 corrected local full check PASS162 Node/35 migrations/both actual restores/38 browsers/lint/typecheck, zero skips. Targeted exact UTF-8 neutral expiry/rollback regression PASS1. [FARO37616219738](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37616219738) SUCCESS including actual PostgreSQL18 Node22/24 worker refusal/delivery rollback/retry once/private evidence/pinned neutral clock/newer-stage proof and actual image closed release. CI37616219838 pending. Original encoding/fixture failures retained and superseded only by corrected proof; no loosened assertions. Runtime SQLite, draft92 unmerged and whole plan/release PARTIAL.

## CP11-AM — Portable candidate attempt start, 2026-10-07

Existing SQLite/native candidate-only start share ownership/terminal guard and server-timer/audit plan. Timer is limited by the pinned definition and original invitation deadline; repeated start preserves clocks/revision and adds no audit. Required current authority checked before expiry and again inside start transaction; committed expiry remains neutral on refused late start. [Scope](CP11_AM_PORTABLE_ASSESSMENT_START.md). Targeted real API start audit rollback/retry/replay regression PASS1; full local/actual PostgreSQL acceptance pending. Runtime SQLite, full plan/release PARTIAL; continue private save/submit and remaining lifecycle/integration/external gates.

CP11-AL5b6de94 exact final acceptance2026-10-07: CI37616219838 SUCCESS, superseding the pending note; FARO37616219738 also SUCCESS. Corrected actual PostgreSQL18 Node22/24 expiry and full162 Node/35 migrations/both actual restores/38 browsers/image closed-release proof PASS, zero skips. Earlier encoding regression is documented and not hidden. Runtime SQLite, draft92 unmerged; whole CP11/master plan/release PARTIAL.

CP11-AM7ab0678 local full check PASS162 Node/35 migrations/both actual restores/38 browsers/lint/typecheck, zero skips. Targeted real API timer/start audit rollback/retry/replay PASS1; source70/35 and syntax/diff PASS. [FARO37616934104](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37616934104) SUCCESS including actual PostgreSQL18 Node22/24 current authority/candidate/terminal guards, audit rollback, pinned timer/repeat/deadline clamp/expired refusal and actual image closed release. CI37616934177 pending. Runtime SQLite, draft93 unmerged; full plan/release PARTIAL.

## CP11-AN — Portable private answer save/submit, 2026-10-07

Shared pinned native answer validation and write plan preserve candidate-only drafts and original timer. Submit/result proposal, process decision deadline from pinned offer, event/audit/outbox are atomic. Open answers remain unscored until human review; candidate provisional result is hidden. SQLite now checks ownership/terminal status before expiry, matching native current authority before mutation. [Scope](CP11_AN_PORTABLE_ASSESSMENT_ANSWERS.md). Targeted/full/actual PostgreSQL acceptance pending; runtime SQLite and whole plan/release PARTIAL. Continue incidents/review/validity/retries/cohort corrections and remaining native integration/external gates.

CP11-AM7ab0678 exact final acceptance2026-10-07: CI37616934177 SUCCESS, superseding the pending note; FARO37616934104 also SUCCESS. Actual PostgreSQL18 Node22/24 candidate clock/authority/audit rollback/replay/deadline/expired refusal and full162 Node/35 migrations/both restores/38 browsers/image closed-release proof PASS, zero skips. Runtime SQLite; draft93 unmerged, whole plan/release PARTIAL.

CP11-AN1b5a5d5 exact acceptance2026-10-07: [FARO37617622891](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37617622891) and [CI37617622766](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37617622766) SUCCESS. Actual PostgreSQL18 Node22/24 private answer/task/session/revision guards, unchanged clocks, draft privacy, actual notification rollback/retry once, unscored human proposal and pinned deadline PASS. Full162 Node/35 migrations/both restores/38 browsers/actual image closed-release proof PASS, zero skips. Runtime SQLite, draft94 unmerged; whole plan/release PARTIAL.

## CP11-AO — Portable human result finalization, 2026-10-07

Shared pinned definition/rubric and attempt/process revision guards retain explicit human confirmation, pending-only review and open incident refusal. Result/reviewer timestamp/history/minimized audit/event/outbox/command acknowledgement are atomic. Current assigned employer authority runs inside native transaction before replay; SQLite also rechecks scoped authority before replay. [Scope](CP11_AO_PORTABLE_ASSESSMENT_REVIEW.md). Targeted real API review rollback/retry/replay and open-answer/missing-answer review PASS2; full local/actual PostgreSQL acceptance pending. Runtime SQLite, whole plan/release PARTIAL. Continue incidents/validity/amendments/retries/cohort correction and remaining conversion/cutover/external gates.

CP11-AO2dba1dc exact acceptance2026-10-07: [FARO37618499208](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37618499208) and [CI37618499128](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37618499128) SUCCESS. Actual PostgreSQL18 Node22/24 pinned human rubric/revision/incident/authority guards, audit and delivery rollback/history/journal/replay once PASS. Full162 Node/35 migrations/both restores/38 browsers/actual image closed-release proof PASS, zero skips. Runtime SQLite, draft95 unmerged; whole plan/release PARTIAL.

## CP11-AP — Portable result invalidation, 2026-10-07

Shared latest history/state/revision/explicit-confirmation/reason validation and writes append INVALIDATED evidence without overwriting original answers/result or process clocks/decision. Required notifications/event/audit and command acknowledgement are atomic. Current assigned employer authority runs inside native transaction before replay; SQLite rechecks inside command as well. [Scope](CP11_AP_PORTABLE_ASSESSMENT_INVALIDATION.md). Targeted real API notification rollback/history/export/erasure and history migration PASS2; full local/actual PostgreSQL acceptance pending. Runtime SQLite, whole plan/release PARTIAL; continue amendments/incidents/retries/cohort correction and remaining conversion/cutover/external gates.

CP11-APd687189 full corrected local npm run check PASS162 Node/35 migrations/both actual restores/38 real desktop/mobile browsers/lint/typecheck, zero skips. Targeted actual API invalidation rollback/history/export/erasure and legacy migration PASS2; source70/35, syntax/diff PASS. [FARO37619483825](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37619483825) SUCCESS including actual PostgreSQL18 Node22/24 immutable validity history/current authority/delivery rollback/replay and actual image closed release. CI37619483655 still running at this observation; not full acceptance. Runtime SQLite, draft96 unmerged and whole plan/release PARTIAL.

CP11-APd687189 exact final acceptance2026-10-07: CI37619483655 SUCCESS, superseding the pending note; FARO37619483825 also SUCCESS. Actual PostgreSQL18 Node22/24 invalidation/privacy/history/current authority/atomic delivery and full162 Node/35 migrations/both actual restores/38 browsers/image closed-release proof PASS, zero skips. Runtime SQLite; draft96 unmerged, whole plan/release PARTIAL.

## CP11-AQ — Portable human result amendment, 2026-10-07

Shared pinned rubric/revision/confirmation/reason/score validation appends an immutable human amendment, preserves original answers/result and process clocks/decision, and retains missing-answer nulls. History/revision/event/audit/outbox/command acknowledgement are atomic. Current assigned employer authority is checked before replay; returned view is freshly projected after command replay to respect later invalidation. [Scope](CP11_AQ_PORTABLE_ASSESSMENT_AMENDMENT.md). Targeted API amendment rollback/fresh validity replay and open-answer review PASS2; full local/actual PostgreSQL acceptance pending. Runtime SQLite, whole plan/release PARTIAL; continue incidents/retries/cohort correction and remaining conversion/external gates.

CP11-AQa3bf5d8 local full check PASS162 Node/35 migrations/both actual restores/38 browsers/lint/typecheck, zero skips. Targeted amendment/open-answer PASS2; source70/35, syntax/diff PASS. [FARO37621061975](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37621061975) SUCCESS including real PostgreSQL18 Node22/24 immutable amendment/delivery rollback/fresh validity replay/current authority and actual image closed-release proof. CI37621061928 pending; runtime SQLite, draft97 unmerged and whole plan/release PARTIAL.

## CP11-AR — Portable candidate technical report, 2026-10-07

Shared candidate scope/revision/confirmation/category/statement validation and original-evidence write plan; incident/revision/event/audit/outbox/command acknowledgement atomic. Statement remains only in owned incident data; event payload and journal exclude private answers/statement. Required current candidate authority precedes replay, then a fresh view rechecks authority. [Scope](CP11_AR_PORTABLE_ASSESSMENT_INCIDENT_REPORT.md). Rebuilt existing actual API report/resolve/privacy/older-stage regressions PASS3; full local/actual PostgreSQL acceptance pending. Runtime SQLite, whole plan/release PARTIAL; continue native incident resolution/retries/cohort corrections and remaining conversion/external gates.

CP11-AQa3bf5d8 exact final acceptance2026-10-07: CI37621061928 SUCCESS, superseding pending; FARO37621061975 also SUCCESS. Actual PostgreSQL18 Node22/24 immutable human amendment/fresh validity replay/current authority and full162 Node/35 migrations/both restores/38 browsers/image closed-release proof PASS, zero skips. Runtime SQLite, draft97 unmerged; whole plan/release PARTIAL.

CP11-ARae8f21a local full check PASS162 Node/35 migrations/both actual restores/38 browsers/lint/typecheck, zero skips. Targeted report/incident/privacy/newer-stage regressions PASS3; source70/35, syntax/diff PASS. Actual PostgreSQL18 Node22/24 candidate report/evidence/delivery rollback/privacy proof PASS in FARO37621657225; full FARO and CI37621657237 acceptance still pending. Runtime SQLite, draft98 unmerged; whole plan/release PARTIAL.

## CP11-AS — Portable human incident resolution, 2026-10-07

Shared assigned employer/revision/confirmation/native resolution validation and incident/attempt/neutral process write plans preserve original evidence. Newer or terminal process decisions and another active attempt are retained; confirmed affected attempts become TECHNICAL_ISSUE with pinned neutral next-step deadline only where applicable. Writes/event/audit/outbox/command acknowledgement atomic; fresh view and current authority protect replay. [Scope](CP11_AS_PORTABLE_ASSESSMENT_INCIDENT_RESOLUTION.md). Full local/actual PostgreSQL acceptance pending; runtime SQLite, whole plan/release PARTIAL. Continue technical retries/cohort correction and remaining conversion/external gates.

CP11-ARae8f21a exact final acceptance2026-10-07: [FARO37621657225](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37621657225) and [CI37621657237](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37621657237) SUCCESS. Actual PostgreSQL18 Node22/24 candidate report/evidence/current authority/delivery rollback/minimized journal/event and full162 Node/35 migrations/both restores/38 browsers/image closed-release proof PASS, zero skips. Runtime SQLite, draft98 unmerged; whole plan/release PARTIAL.

CP11-ASd68cdc7 local full check PASS162 Node/35 migrations/both actual restores/38 browsers/lint/typecheck, zero skips. Targeted incident rollback/evidence/privacy/newer-stage PASS3; source70/35, syntax/diff PASS. [FARO37622192234](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37622192234) SUCCESS including actual PostgreSQL18 Node22/24 human resolution/delivery rollback/pinned neutral deadline/terminal and newer-stage proof/image closed release. CI37622192262 pending; runtime SQLite, draft99 unmerged and whole plan/release PARTIAL.

## CP11-AT — Portable pinned technical retry, 2026-10-07

Shared current recruiter scope/revision/confirmed incident/state/active attempt/corrected version/confirmation/deadline validation creates a separate pinned retry lineage. Original attempt/evidence/clocks stay unchanged; retry/process deadline/event/audit/outbox/journal atomic, current authority before replay and fresh view. [Scope](CP11_AT_PORTABLE_ASSESSMENT_RETRY.md). Rebuilt actual API rollback/lineage/privacy and0031 migration regressions PASS2; full local/actual PostgreSQL acceptance pending. Runtime SQLite, whole plan/release PARTIAL; continue cohort correction and remaining native integration/external gates.

CP11-ASd68cdc7 exact final acceptance2026-10-07: CI37622192262 SUCCESS, superseding pending; FARO37622192234 also SUCCESS. Actual PostgreSQL18 Node22/24 human incident resolution and full162 Node/35 migrations/both restores/38 browsers/image closed-release proof PASS, zero skips. Draft99 unmerged; runtime SQLite, whole plan/release PARTIAL.

CP11-ATb584a1e exact acceptance2026-10-07: [FARO37622886147](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37622886147) and [CI37622886042](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37622886042) SUCCESS. Actual PostgreSQL18 Node22/24 pinned retry/role/current authority/original evidence/delivery rollback/replay PASS. Full local162 Node/35 migrations/both actual restores/38 browsers/lint/typecheck PASS, zero skips. Draft100 unmerged; runtime SQLite and whole plan/release PARTIAL.

## CP11-AU — Portable scoped cohort correction preview, 2026-10-07

SQLite/native PostgreSQL share pinned QUIZ key validation, sorted capped cohort query, private effect calculation, revision/history fencing token and minimized public preview. Current session plus assigned membership are checked inside owned read-only SERIALIZABLE transaction. Active attempts block application; invalidated results are excluded and manual amendments require deliberate replacement. Preview does not write results, reset timers or change decisions. [Scope](CP11_AU_PORTABLE_COHORT_PREVIEW.md). Existing real API cohort regression PASS1 and source70/35 PASS; full local/actual PostgreSQL acceptance pending. Runtime SQLite, whole plan/release PARTIAL; continue atomic cohort correction write and remaining native integration/external gates.

CP11-AU draft [#101](https://github.com/eagleblastmusic-lgtm/Job/pull/101): codex/faro-cp11au-cohort-preview base codex/faro-cp11at-technical-retry, codef2e21fb plus fixture fix7789815. Local full162/35/both restores/38 browsers PASS; initial PostgreSQL23514 from missing synthetic invalidation reason retained, corrected fixture CI running. No loosened constraint; runtime SQLite and whole plan/release PARTIAL.

## CP11-AV — Portable atomic cohort key correction, 2026-10-07

Shared SQLite/native pinned token/active/manual confirmation and effect write plan appends immutable key/result history, advances only affected attempt revisions and retains original answers/result/clocks/definition/process decisions. Current assigned authority applies before command replay; correction/history/events/audit/notifications/journal are atomic. [Scope](CP11_AV_PORTABLE_COHORT_CORRECTION.md). Existing real API cohort regression extended with actual delivery failure/complete rollback/retry PASS1; source70/35 and syntax/diff PASS. Full local/actual PostgreSQL acceptance pending. Runtime SQLite, whole plan/release PARTIAL; continue remaining native interviews/auth/privacy/worker integration and external gates.

CP11-AU7789815 exact corrected acceptance2026-10-07: [FARO37624399179](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37624399179) and [CI37624398832](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37624398832) SUCCESS. Actual PostgreSQL18 Node22/24 private scoped cohort preview/active block/history fences/current authority PASS; full local162 Node/35 migrations/both restores/38 browsers PASS, zero skips. Original23514 fixture failure retained; reason evidence corrected without loosening CHECK. Draft101 unmerged; runtime SQLite and whole plan/release PARTIAL.

CP11-AV2aecadd full local check PASS162 Node/35 migrations/both actual restores/38 browsers/lint/typecheck, zero skips. Targeted actual API cohort delivery rollback/retry/history/privacy PASS1; source70/35 and syntax/diff PASS. [FARO37624773821](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37624773821) SUCCESS including actual PostgreSQL18 Node22/24 token/manual/current authority/atomic delivery rollback/replay/evidence/privacy and actual image closed release. CI37624773883 pending. Draft102 unmerged, runtime SQLite and whole plan/release PARTIAL.

## CP11-AW — Portable private interview views/calendar, 2026-10-07

Shared SQLite/native explicit interview and list queries, scoped view, confirmed-only UTF-8 folded/escaped ICS and exact participant collision query retain candidate ownership/current assigned membership. Native reads require current session inside owned read-only SERIALIZABLE transaction. [Scope](CP11_AW_PORTABLE_INTERVIEW_VIEWS.md). Existing real API interview calendar/DST/slot/scoped completion regression PASS1; source70/35 and syntax/diff PASS. Full local/actual PostgreSQL acceptance pending. Runtime SQLite, whole plan/release PARTIAL; continue atomic interview scheduling/change/worker and remaining integration/external gates.

CP11-AV2aecadd exact final acceptance2026-10-07: CI37624773883 SUCCESS, superseding pending; FARO37624773821 also SUCCESS. Actual PostgreSQL18 Node22/24 atomic cohort correction and full162 Node/35 migrations/both restores/38 browsers/image closed-release proof PASS, zero skips. Draft102 unmerged; runtime SQLite, whole plan/release PARTIAL.

CP11-AW7ff9387 full local check PASS162 Node/35 migrations/both actual restores/38 browsers/lint/typecheck, zero skips. Targeted interview calendar/DST/private scope PASS1; source70/35 and syntax/diff PASS. [FARO37625449062](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37625449062) SUCCESS including actual PostgreSQL18 Node22/24 scoped detail/list/calendar/current authority/collision boundary and actual image closed release. CI37625448959 pending. Draft103 unmerged, runtime SQLite and whole plan/release PARTIAL.

## CP11-AX — Portable atomic interview proposal, 2026-10-07

Shared SQLite/native current recruiter role, process revision/active state, pinned interview count, explicit availability, IANA/offset/DST/time/duration/HTTPS and participant slot guards. Proposal/process deadline/events/audit/outbox/journal atomic; current recruiter role now applies on cached replay in both backends. [Scope](CP11_AX_PORTABLE_INTERVIEW_PROPOSAL.md). Rebuilt actual API delivery rollback/current replay role/calendar/DST/expiry regressions PASS2; source70/35 and syntax/diff PASS. Full local/actual PostgreSQL acceptance pending. Runtime SQLite, whole plan/release PARTIAL; continue interview confirmation/completion/dispute/worker and remaining integration/external gates.

CP11-AW7ff9387 exact final acceptance2026-10-07: CI37625448959 SUCCESS, superseding pending; FARO37625449062 also SUCCESS. Actual PostgreSQL18 Node22/24 private interview views/calendar and full162 Node/35 migrations/both restores/38 browsers/image closed-release proof PASS, zero skips. Draft103 unmerged; runtime SQLite, whole plan/release PARTIAL.

CP11-AX16f08d1 full local check PASS162 Node/35 migrations/both actual restores/38 browsers/lint/typecheck, zero skips. Targeted real API delivery rollback/current replay role/DST/neutral expiry PASS2; source70/35 and syntax/diff PASS. Actual PostgreSQL18 Node22/24 proposal/guards/atomic delivery/original clocks PASS in FARO37626238389; full FARO/CI37626238345 final acceptance pending. Draft104 unmerged, runtime SQLite and whole plan/release PARTIAL.

## CP11-AY — Portable atomic interview confirmation/cancellation, 2026-10-07

Shared SQLite/native interview/process revisions, active state, explicit action and current participant/recruiter authority protect confirmation and neutral cancellation. Confirmation requires candidate, current assigned original recruiter, future confirmation cutoff and participant slot availability. Cancellation pins neutral decision clock to original offer. Interview/process/event/audit/outbox/journal atomic; current role checked before cached replay. [Scope](CP11_AY_PORTABLE_INTERVIEW_SCHEDULE.md). Rebuilt actual API confirmation/cancellation delivery rollback/retry, slot/DST/expiry regressions PASS2; source70/35 and syntax/diff PASS. Full local/actual PostgreSQL acceptance pending. Runtime SQLite, whole plan/release PARTIAL; continue mutual completion/discrepancy/worker and remaining native integration/external gates.

CP11-AX16f08d1 exact final acceptance2026-10-07: [FARO37626238389](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37626238389) and [CI37626238345](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37626238345) SUCCESS. Actual PostgreSQL18 Node22/24 atomic interview proposal and full162 Node/35 migrations/both restores/38 browsers/image closed-release proof PASS, zero skips. Draft104 unmerged; runtime SQLite, whole plan/release PARTIAL.

CP11-AYf98735f local full check PASS162 Node/35 migrations/both actual restores/38 browsers/lint/typecheck, zero skips; targeted actual API confirmation/cancellation rollback/retry/DST/neutral clock PASS2. [FARO37626987773](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37626987773) and CI37626987787 did not start jobs: GitHub account payments failed or spending limit requires increase. One failed-job rerun2026-10-07 reproduced the same billing annotation. Native PostgreSQL18 acceptance is NOT established for AY. This requires repository account owner action in Billing & plans; no local Docker/psql is available and source-only rehearsal is not a substitute. Draft105 unmerged, runtime SQLite; full plan/release PARTIAL.

## CP11-AZ — Portable consented mutual interview stage producer, 2026-10-07

SQLite keeps its existing evidence query, extracted to shared model. Native PostgreSQL producer requires COMPLETED interview/both participant reports plus matching completed operational event; first duplicate JSON key semantics match SQLite. Current/latest consent must precede event; shared private pair/week-v1 dedupe with v2 definition avoids duplicate completed stages and late-consent backfill. [Scope](CP11_AZ_PORTABLE_MUTUAL_STAGE.md). Targeted existing optional progression/private interview regressions PASS2; source70/35 and syntax/diff PASS. Full local verification pending. Real PostgreSQL18/remote acceptance blocked by confirmed GitHub account billing failure; no native acceptance claim. Native completion integration remains next stage. Runtime SQLite, whole plan/release PARTIAL.

CP11-AZ6d0e0a3 local full check PASS162 Node/35 migrations/both actual restores/38 real desktop/mobile browsers/lint/typecheck, zero skips. Rebuilt extended SQLite duplicate-key evidence/consent/dedupe/privacy/erasure oracle PASS1; earlier existing progression/private interview PASS2. Source70/35 and syntax/diff PASS. Draft [#106](https://github.com/eagleblastmusic-lgtm/Job/pull/106): codex/faro-cp11az-mutual-stage base codex/faro-cp11ay-interview-schedule. Actual PostgreSQL18/remote acceptance remains OPEN because GitHub account billing/spending prevented AY jobs from starting even after one rerun. No completion/release claim; runtime SQLite and full plan PARTIAL. Resume real AY/AZ acceptance before native completion/discrepancy/worker integration; repository owner must resolve Billing & plans.

CP11-AYf98735f exact final acceptance2026-10-07: [FARO37626987773](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37626987773) and [CI37626987787](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37626987787) SUCCESS after user-requested rerun. Actual PostgreSQL18 Node22/24 confirmation/cancellation/slot/current authority/delivery rollback/pinned neutral clock PASS; full local162 Node/35 migrations/both restores/38 browsers and actual image closed-release proof PASS, zero skips. Prior account billing failure is retained as historical and superseded by this real successful acceptance; billing gate resolved. Draft105 unmerged, runtime SQLite; whole plan/release PARTIAL.

CP11-AZ43365c1 exact final acceptance2026-10-07: [FARO37645803759](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37645803759) and [CI37645803771](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37645803771) SUCCESS after user-requested rerun. Actual PostgreSQL18 Node22/24 mutual evidence/first duplicate JSON key/consent/dedupe/analytics rollback/private payload PASS; full local162 Node/35 migrations/both actual restores/38 browsers and actual image closed-release proof PASS, zero skips. Prior account billing failure remains historical; real AY/AZ acceptance supersedes pending/blocking notes. Draft106 unmerged, runtime SQLite; whole plan/release PARTIAL. Continue native mutual completion/discrepancy/tick and remaining auth/MFA/privacy/worker/recovery/operator integration, independent review and external gates.


## CP11-BA — Portable atomic interview outcome, 2026-10-07

Shared SQLite/native COMPLETE/DISPUTE guards and writes preserve single-report clocks and require both reports before completion. Private discrepancy case/notifications and process/interview/event/audit/journal are atomic; native mutual completion invokes consented AZ analytics inside the owned transaction. Current assigned recruiter authority precedes replay. [Scope](CP11_BA_PORTABLE_INTERVIEW_OUTCOME.md). Source70/35 PASS; full local/actual PostgreSQL acceptance pending. Runtime SQLite, full plan/release PARTIAL; continue native timed tasks and remaining auth/MFA/privacy/worker/HTTP/recovery/cutover, independent review and external gates.


CP11-BA0971493 exact acceptance2026-10-07: [FARO37648693704](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37648693704) and [CI37648693808](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37648693808) SUCCESS. Push FARO37648639587 also SUCCESS. Actual PostgreSQL18 Node22/24 native mutual completion/discrepancy/current authority/atomic notification and analytics rollback/retry/replay/pinned clocks PASS. Full local check162 Node/35 migrations/both actual restores/38 real desktop/mobile browsers/lint/typecheck PASS, zero skips; source70/35 and syntax/diff PASS. Earlier local harness build collision and misplaced fixture revision were corrected and superseded by this full rerun without weakening criteria.

User directed2026-10-07 that subsequent work use main directly, commit locally and push to GitHub, with integration after larger verified stages and no new branches. Completed Canonical dependency chain through CP11-BA is integrated to main by fast-forward after the complete above acceptance (112 commits beyond previous origin/main). PR107 was retargeted to main; this supersedes historical unmerged-chain status for integrated code. Independent security/privacy/permissions/manual accessibility review remains OPEN; integration is not external acceptance or release. Runtime SQLite; whole CP11/master plan/release PARTIAL. Next native interview timed tasks, then auth/MFA/privacy/moderation/worker/HTTP/recovery/cutover and external gates.


## CP11-BB — Portable atomic interview timed tasks, 2026-10-07

SQLite/native share pending reads, pinned neutral proposal expiry and exact reminder plans. Proposal expiry/event/audit/notifications are atomic. Active processes only; confirmed appointments retain state and never become automatic no-show/completion. Candidate and currently assigned original recruiter reminders dedupe by interview/state/deadline; revoked membership suppresses recruiter delivery. Worker authority is checked inside the native SERIALIZABLE transaction. Repeated ticks preserve event/revision/deadline. Source regression adds failed delivery rollback and retry; native covers worker refusal, upcoming reminders, expiry rollback, original decision policy, restored membership delivery, outcome reminders and terminal refusal. [Scope](CP11_BB_PORTABLE_INTERVIEW_TICK.md). Targeted local PASS9; full local/actual PostgreSQL acceptance pending. Runtime SQLite; full plan/release PARTIAL. Work directly on main; continue remaining native services/runtime/recovery and external gates.


## CP11-BC — Portable current session and MFA access, 2026-10-07

Shared explicit identity/MFA queries and policy preserve current session expiry, optional/mandatory privileged step-up, session-bound verification and minimized status. SQLite session lookup, MFA status/authorization and reauthenticated own revoke-all consume the same plans as native PostgreSQL. Native owned authority can be called inside service transactions; standalone reads own READ ONLY SERIALIZABLE transactions. Revoke-all requires current session/MFA/password/confirmation and atomically cascades own session verifications plus minimized audit, refusing client-selected identity. Native exercise verifies source wire parity, missing/expired sessions, mandatory privileged enrollment, isolated token-bound verification/exact expiry, reauthentication refusal, audit rollback and foreign-session preservation. MFA enroll/confirm/verify/recover writes, native registration/login and HTTP integration remain open. [Scope](CP11_BC_PORTABLE_IDENTITY_ACCESS.md). Targeted local PASS9; full local/actual PostgreSQL acceptance pending. Runtime SQLite; full plan/release PARTIAL. Work directly on main; continue remaining native services/runtime/recovery and external gates.


CP11-BB/BC full local check2026-10-07 PASS162 Node/35 migrations/both actual restores/38 real desktop/mobile browsers/lint/typecheck, zero skips. Targeted interviews/session/MFA PASS9; source70/35 and syntax/diff PASS. Native real PostgreSQL18 Node22/24 and remote acceptance pending. Direct main checkpoint at user direction; runtime SQLite, whole plan/release PARTIAL. Continue native MFA writes and remaining runtime integration.


CP11-BB/BC0111676 real PostgreSQL failed23505 because new tick fixture created two simultaneous active appointments in one process, contrary to existing faro_one_active_interview. Corrected proof expires the proposal before inserting the confirmed appointment, retaining all expiry/reminder/rollback/authority/terminal assertions and the UNIQUE index. Full local162/35/both restores/38 browsers remains valid; actual corrected PostgreSQL/remote acceptance pending.


## CP11-BD — Portable encrypted MFA mutations, 2026-10-07

Shared SQLite/native crypto and MFA write plans implement setup/activation/counter verification/one-use recovery with current-session authority, atomically persisted failure evidence, secret-bound encryption and other-session revocation. [Scope](CP11_BD_PORTABLE_MFA_WRITES.md). Targeted MFA/session PASS4; full local and actual PostgreSQL acceptance pending. Direct main; runtime SQLite, whole plan/release PARTIAL. Continue native auth registration/login/privacy/moderation/worker/HTTP/recovery/cutover and external gates.


CP11-BB/BCf3fffd4 actual PostgreSQL passed corrected tick fixtures then refused identity fixture because its candidate had already been erased by the earlier cascade test. Moved the complete identity/revocation proof before deliberate candidate deletion; no erased account/session is recreated, no authority guard relaxed, and the original deletion cascade proof remains. Real corrected acceptance pending.


CP11-BD full local2026-10-07 check PASS162 Node/35 migrations/both actual restores/38 real desktop/mobile browsers/lint/typecheck, zero skips. Targeted MFA/session PASS4 includes real failure/enrollment audit rollback; source70/35 and syntax/diff PASS. Actual native PostgreSQL18 Node22/24 acceptance pending. BB/BC63f914a corrected PostgreSQL18 Node22/24 PASS in FARO37652009031; full FARO/CI37652008809 acceptance pending. Original fixture failures retained; UNIQUE/current identity/source deletion guards unchanged. Runtime SQLite and whole plan/release PARTIAL. Continue native durable outbox/worker and remaining auth/privacy/moderation/HTTP/recovery/cutover.


## CP11-BE — Portable durable outbox and async scheduler, 2026-10-07

Shared lease/budget/delivery/eligibility/backoff/reviewed retry plans; native SERIALIZABLE SKIP LOCKED claim and owned delivery, bounded conflict retry and authority-before-replay. Async scheduler fences overlap and drains active work before DB closure. [Scope](CP11_BE_PORTABLE_OUTBOX_WORKER.md). Targeted worker/recruitment PASS26 and rebuilt async worker PASS7; full local/actual PostgreSQL acceptance pending. Runtime SQLite; full plan/release PARTIAL. Continue native privacy/moderation/auth/worker/HTTP/recovery/cutover/external gates.


CP11-BE full local2026-10-07 check PASS163 Node/35 migrations/both actual restores/38 browsers/lint/typecheck, zero skips. Worker/recruitment targeted26 and rebuilt async worker7 PASS; source70/35 and syntax/diff PASS. Actual PostgreSQL/remote acceptance pending. CP11-BD2d20ff2 exact FARO37652974322 and CI37652973856 SUCCESS, including native PostgreSQL18 Node22/24 encrypted setup/activation/OTP/recovery/rate/audit rollback proofs. Initial MFA fixture counter assertion was corrected for direct driver bigint string without changing stored evidence; full rerun supersedes failure at5f5bcbc. BB/BC63f914a FARO37652009031 and CI37652008809 SUCCESS; earlier fixture errors retained. Runtime SQLite, whole plan/release PARTIAL; continue native privacy/moderation/auth/worker/HTTP/recovery/cutover and external gates.


## CP11-BF — Portable own export and ownership transfer, 2026-10-07

Shared 23 explicit export reads preserve own scoped evidence and exclude import-order/MFA/session/password secrets. Native snapshot requires current authority. Shared owner deletion guard and owner transfer require active owner/successor and atomically write roles/audit. [Scope](CP11_BF_PORTABLE_PRIVATE_EXPORT_OWNERSHIP.md). Local/actual PostgreSQL acceptance pending; runtime SQLite, full plan/release PARTIAL. Continue native erasure/moderation/auth/worker/HTTP/recovery/cutover and external gates.


## CP11-BG — Portable transactional account erasure, 2026-10-07

Shared erasure plans and native owned session/MFA/password checks atomically preserve owner-transfer rules, close sole-owner intake, cancel obligations, scrub private statements and record hashed deletion tombstones with account cascades. [Scope](CP11_BG_PORTABLE_ACCOUNT_ERASURE.md). Local/actual PostgreSQL acceptance pending. BF02ce2de actual PostgreSQL18 Node22/24 FARO37654718227 SUCCESS; CI pending. Runtime SQLite; whole plan/release PARTIAL. Continue native auth/moderation/remaining worker/HTTP/recovery/cutover and external gates.


CP11-BG local2026-10-07 full check PASS164 Node/35 migrations/lint/typecheck/both restores/38 browsers; final native validation rebuild/targeted privacy4/source70/35 PASS. Actual PostgreSQL acceptance pending. BF02ce2de exact FARO37654718227 and CI37654717684 SUCCESS. Runtime SQLite; whole plan/release PARTIAL.


## CP11-BH — Portable atomic registration/login/consent, 2026-10-07

Shared credential/legal-consent/user/defaults/session/audit plans make existing HTTP registration and login atomic; analytics revocation is atomic and latest-consent reads resolve tied timestamps by newest append. Native sessions preserve private credentials, controlled concurrent registration, current authority/MFA, and own-session logout. [Scope](CP11_BH_PORTABLE_AUTH_CONSENT_WRITES.md). Local/actual PostgreSQL acceptance pending; BGdb0334c published after alternate HTTP/1.1 no-thin Git transfer resolved server push failures. Runtime SQLite; whole plan/release PARTIAL. Continue native moderation/remaining worker/HTTP/recovery/cutover and external gates.


CP11-BH local2026-10-07 full check PASS166 Node/35 migrations/lint/typecheck/both restores/38 browsers; source70/35 and syntax/diff PASS. Existing auth/consent/privacy targeted8 PASS; new actual HTTP registration/login/consent audit rollback tests included in full check. Actual PostgreSQL acceptance pending. BGdb0334c remote FARO37655614735 and CI37655614342 queued, no remote PASS claimed. Runtime SQLite; whole plan/release PARTIAL.


## CP11-BI — Portable deadlines and composed async worker, 2026-10-07

Shared stale/close/watch/process deadline plans, native owned SERIALIZABLE phase with conflict retry and composed async worker retain clock/role/dedupe boundaries. [Scope](CP11_BI_PORTABLE_WORKER_DEADLINES.md). Worker/recruitment targeted27 PASS; local full and actual PostgreSQL acceptance pending. BG actual fixture failed23502 because its synthetic inbox omitted notification_type/dedupe_key/updated_at; correction d037202 supplies original required fields, no constraint changes. BH0a88065 native/CI still require corrected complete acceptance. Runtime SQLite; whole plan/release PARTIAL; continue native moderation/HTTP/recovery/cutover/external gates.


CP11-BI local2026-10-07 full check PASS167 Node/35 migrations/lint/typecheck/both restores/38 browsers. Worker/recruitment targeted27 PASS before added rollback regression; source70/35 and syntax/diff PASS. Phase-only native diagnostics retain no SQL, credentials or record values. BG/BH original runs refused incomplete notification fixture23502; corrected d037202 acceptance pending. Runtime SQLite; whole plan/release PARTIAL.


## CP11-BJ — Portable private moderation/restriction/reliability reads, 2026-10-07

Shared explicit reads and case masking, native current-authority/audited access and historical conflict exclusion; shared descriptive reliability with wire casing, first JSON keys and no truncated samples. [Scope](CP11_BJ_PORTABLE_MODERATION_RELIABILITY_READS.md). Targeted private moderation24 and rebuilt reliability/restriction/assessment22 PASS; full local/actual PostgreSQL acceptance pending. Corrected BG/BH d037202 FARO37656902529/CI37656902613 SUCCESS; BI5de2b8a FARO37657263026 SUCCESS, CI pending. Runtime SQLite; whole plan/release PARTIAL; continue native moderation writes/HTTP/recovery/cutover/external gates.


CP11-BJ local full check PASS168 Node/35 migrations/lint/typecheck/both restores/38 browsers; source70/35 and diff PASS. Actual PostgreSQL acceptance pending. BI5de2b8a exact FARO37657263026 and CI37657262955 SUCCESS. Runtime SQLite; whole plan/release PARTIAL.


## CP11-BK — Portable restriction appeal/restoration, 2026-10-07

Shared revision/reason/confirmation/mutation/audit plans and native journal require current owner/admin or independent moderator authority before replay. One restored restriction never clears another or republishes intake. [Scope](CP11_BK_PORTABLE_RESTRICTION_WRITES.md). Original targeted restriction1 PASS; full local/actual PostgreSQL acceptance pending. Runtime SQLite; whole plan/release PARTIAL; continue native case writes/HTTP/recovery/cutover/external gates.


CP11-BK full local check PASS168 Node/35 migrations/lint/typecheck/both restores/38 desktop-mobile browsers; source70/35, syntax/diff PASS. Actual native PostgreSQL acceptance pending. BJ0aff381 exact FARO37659409429 and CI37659409358 SUCCESS including native private moderation/restriction/reliability proofs. Runtime SQLite; whole plan/release PARTIAL.


## CP11-BL — Portable private case writes, 2026-10-07

Shared report/explanation/review/appeal plans preserve private boundaries, manual explanation windows, source restriction scope, atomic audits/delivery/journal and current moderation independence before replay. [Scope](CP11_BL_PORTABLE_PRIVATE_CASE_WRITES.md). Local/native acceptance pending. BK40f53a2 FARO37660164466 and CI37660164532 SUCCESS. Runtime SQLite; whole plan/release PARTIAL; continue economics/HTTP/recovery/cutover/external gates.


CP11-BL full local check PASS168 Node/35 migrations/lint/typecheck/both restores/38 browsers; existing targeted moderation24 PASS, source70/35/syntax/diff PASS. Actual native case-write PostgreSQL acceptance pending. BK40f53a2 FARO37660164466/CI37660164532 SUCCESS. Runtime SQLite; whole plan/release PARTIAL.


## CP11-BM — Portable private offer economics, 2026-10-07

Shared private manual economics plans and atomic native current-authority/visible-offer scope. [Scope](CP11_BM_PORTABLE_PRIVATE_ECONOMICS.md). Full local check PASS168 Node/35 migrations/lint/typecheck/both restores/38 browsers. Source-only and actual PostgreSQL acceptance pending. BL8cef85a FARO37662893498/CI37662893383 SUCCESS. Runtime SQLite; continue HTTP/recovery/cutover. External gates open; whole plan/release PARTIAL.

BM source-only rehearsal PASS70 tables/35 migrations; script syntax and git diff checks PASS. Actual PostgreSQL acceptance pending.


## CP11-BN — Shared canonical HTTP / PostgreSQL runtime, 2026-10-07

[Scope](CP11_BN_POSTGRES_HTTP_RUNTIME.md). One awaited route contract, owned native identity/MFA checks, auth/account/private export and worker runtime. Initial local full check PASS168 Node/35 migrations/lint/typecheck/both restores/38 browsers; final follow-up verification and actual HTTP/PostgreSQL acceptance pending. Corrected BM cd15634 FARO37665201228/CI37665201181 SUCCESS. SQLite remains default; native physical upload disposal fails closed, native browser/cutover/recovery/production and external gates remain open. Whole plan/release PARTIAL; continue.

BN final full local check PASS168 Node/35 migrations/lint/typecheck/both restores/38 desktop-mobile browsers. Source-only PASS70/35; script syntax and diff PASS. Actual HTTP/PostgreSQL acceptance pending; continue native browser and durable file disposal.


## CP11-BO — PostgreSQL browser acceptance, 2026-10-07

[Scope](CP11_BO_POSTGRES_BROWSER_ACCEPTANCE.md). Reused existing candidate/employer and privacy scenarios against native HTTP/PostgreSQL, desktop/mobile Node22/24. Local reuse PASS4, typecheck/lint/syntax/diff PASS; actual PostgreSQL acceptance pending. BN container dependency corrected5095dee, native HTTP requires continued remediation. Whole plan/release PARTIAL; continue file disposal/recovery/cutover.


## CP11-BP — Durable private file disposal, 2026-10-07

[Scope](CP11_BP_DURABLE_FILE_DISPOSAL.md). Account erasure transaction preserves validated physical-disposal obligations on PostgreSQL and SQLite; restart/lease/retry and actual HTTP rollback/physical-file proofs added. Final local/native acceptance pending. BO712d838 FARO37668365491/CI37668365334 SUCCESS with actual PostgreSQL HTTP and desktop/mobile browser acceptance. Default SQLite, production closed; continue native recovery/cutover/operations. Whole plan/release PARTIAL.

BP final full local check PASS170 Node/36 migrations/lint/typecheck/both actual restores/38 desktop-mobile browsers. Source-only PASS71/36, script syntax/diff PASS. Added native parallel-disposal proof and bounded transaction conflict retry; actual PostgreSQL acceptance pending. Continue native current-authority recovery/cutover.


## CP11-BQ — PostgreSQL logical backup and current-authority recovery, 2026-10-07

[Scope](CP11_BQ_POSTGRES_AUTHORITY_RECOVERY.md). Shared sensitive operator ledger, consistent native logical backup and atomic fail-closed recovery in isolated schemas. Existing SQLite restore shares ledger reads. Local/native acceptance pending; BP disposal acceptance pending. Retained file restoration remains separately fail-closed; production protected authority/backup/RPO/RTO and cutover still open. Whole plan/release PARTIAL; continue.

BQ full local check PASS170 Node/36 migrations/lint/typecheck/both restores/38 desktop-mobile browsers; source-only71/36 and scripts/diff PASS. Native backup/recovery acceptance pending. BP27a7dc5 FARO37669744080 SUCCESS including actual PostgreSQL disposal/HTTP/browser tests, CI37669744085 pending. Continue cutover rehearsal; production RPO/RTO and external gates open.


## CP11-BR — HTTP PostgreSQL cutover/rollback rehearsal, 2026-10-07

[Scope](CP11_BR_POSTGRES_CUTOVER_REHEARSAL.md). Actual isolated listener switch preserves existing read contracts; complete native hash comparison permits read-only rollback and refuses stale-source rollback after native writes. Syntax/lint/diff PASS; actual native acceptance pending. BQ native recovery acceptance pending. BP27a7dc5 FARO37669744080/CI37669744085 SUCCESS. No production deployment/migration; default SQLite and external gates unchanged. Whole plan/release PARTIAL; continue.


## CP11-BS — Offline MFA key rotation, 2026-10-07

[Scope](CP11_BS_OFFLINE_MFA_KEY_ROTATION.md). Shared authenticated active/pending rewrap, atomic audit, preserved counters/recovery and invalidated session step-up; offline CLI takes protected env keys without logging. Node171 PASS; remaining static/native acceptance pending. BQ0ffd608 FARO37670340034 SUCCESS, CI pending. BR cutover acceptance pending. Actual operator custody/rollout/rescue and external gates remain open; whole plan/release PARTIAL; continue.


CP11-BS final local Node171/lint/typecheck/36 migrations/source-only71 tables PASS; syntax/diff PASS. BQ0ffd608 FARO37670340034 and CI37670339981 SUCCESS. BR valid-name fixture corrected ed7130e; actual cutover and BS native acceptance pending. Production custody and external gates remain open.


## CP11-BT — Enlarged PostgreSQL workspace browser acceptance

[Scope](CP11_BT_POSTGRES_WORKSPACE_MATRIX.md). Existing six workspace plus employment/session desktop/mobile scenarios reuse native runtime (16 cases per Node22/24). Local full browsers38/follow-up4/typecheck/lint/diff PASS; actual enlarged matrix pending. BS1266fc2 FARO37671648181 SUCCESS; CI pending. Default SQLite, production/external gates open; whole plan/release PARTIAL; continue.


## CP11-BU — PostgreSQL security and assessment browser acceptance

[Scope](CP11_BU_POSTGRES_SECURITY_ASSESSMENT_BROWSER.md). All13 authenticated browser scenarios reuse native PostgreSQL26 desktop/mobile cases per Node22/24, plus retained public reflow2. Local follow-ups12/typecheck/lint/diff PASS; actual enlarged acceptance pending. BTb9fd8b5 FARO37672177171 SUCCESS, CI pending; BS1266fc2 FARO37671648181/CI37671648045 SUCCESS. Whole plan/release PARTIAL; production/external gates open; continue.


## CP11-BV — Ordered PostgreSQL read batches

[Scope](CP11_BV_ORDERED_POSTGRES_BATCHES.md). Sequential owned-connection dispatch stops on first error; native fail-fast/rollback regression added. Local full Node171/lint/typecheck/source71 tables36 migrations/syntax/diff PASS; native pending. BU CI37672827564 SUCCESS; FARO37672827477 cancelled with native Node22 PASS, Node24 cancelled. Whole plan/release PARTIAL; continue.


## CP11-BW — Encrypted durable PostgreSQL backup artifact

[Scope](CP11_BW_ENCRYPTED_POSTGRES_BACKUP_ARTIFACT.md). Consistent native logical snapshot has authenticated exclusive durable file writer and protected-env CLI. Wrong-key/tamper/overwrite regression PASS; actual native CLI roundtrip/current-authority recovery pending. Populated uploads refuse incomplete backup. Independent custody/storage/current authority/PITR/RPO/RTO remain open. Whole plan/release PARTIAL; continue.


## CP11-BX — Encrypted current-authority artifact

[Scope](CP11_BX_ENCRYPTED_CURRENT_AUTHORITY_ARTIFACT.md). Existing CLI authority-only captures protected current ledger; actual-file native recovery proof added. Local envelope2/lint/syntax/diff PASS; native pending. BV57f6f49 FARO37763865493 SUCCESS with native26 browsers Node22/24; CI pending. BW metadata wire comparison fixed. Independent custody/physical storage/RPO/RTO/external gates remain open; whole plan/release PARTIAL; continue.
