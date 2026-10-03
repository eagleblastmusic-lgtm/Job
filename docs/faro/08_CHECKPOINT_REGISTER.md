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
- STATUS: PARTIAL (requirement explanation in de1d3ec; explicit candidate constraints and explanation UI remain).

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
- STATUS: PARTIAL (private manual economics API in ea50b36; comparison/input UI and complete unit/basis validation remain; automatic tax/routing gated).

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
