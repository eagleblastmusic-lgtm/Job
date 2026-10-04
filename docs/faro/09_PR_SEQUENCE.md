# PR SEQUENCE

Each checkpoint is a separate review/revert unit. Initial plan commit must stay in history. Never force-push shared history; no bulk PR covering all implementation. These are local planned PR IDs, not fabricated GitHub PRs.

## PR-01 — Foundation and retirement of rejected paths
- BRANCH: codex/faro-01
- SCOPE: Disconnect canonical runtime from CV recruitment, EHV, trial products and unauthorized import; fix fixture defects without enabling prohibited fetch
- DEPENDENCY: CP00
- EXPECTED DIFF: src/server/app.ts; extendedApp.ts; store.ts; publicJobIngestionService.ts; src/tests; public/index.html; public/sw.js; cohesive domain/API slice, no unrelated formatting.
- TESTS: Baseline fixtures, auth regression, retirement/no candidate checkout, cache allowlist
- MIGRATION: None; existing subscriptions remain historical; newly created accounts free
- RISK: Legacy consumers expect old routes
- MERGE GATE: Legacy route no longer callable in canonical runtime; fixture intent retained in isolated historical tests; review privacy boundary; required project checks; legal activation separate.
- STATUS: NOT OPENED; split from checkpoint commits when ready for remote review.

## PR-02 — Organization scope and candidate projection
- BRANCH: codex/faro-02
- SCOPE: Create membership/assignment authorization and exact minimized projection
- DEPENDENCY: CP01
- EXPECTED DIFF: src/domain/faro/privacy.ts; src/server/faro/*; migrations/0020*; src/tests/faro*; cohesive domain/API slice, no unrelated formatting.
- TESTS: Two-tenant reads/mutations, inactive member, nested PII, CV/phone/history exclusion
- MIGRATION: Organizations/members/assignments/profiles/claims; additive FKs
- RISK: Owner privileges must not imply process access
- MERGE GATE: All employer output crosses allowlist; no watcher/private profile in organization DTO; review privacy boundary; required project checks; legal activation separate.
- STATUS: NOT OPENED; split from checkpoint commits when ready for remote review.

## PR-03 — Four-part skills profile and decomposition
- BRANCH: codex/faro-03
- SCOPE: Persist activities, pending proposals and explicit versioned claims
- DEPENDENCY: CP02
- EXPECTED DIFF: src/domain/faro/skills.ts; src/server/faro/profileService.ts; src/client/faro*.ts; cohesive domain/API slice, no unrelated formatting.
- TESTS: Pending/rejected never match; accept replay; invalid source/level; no auto verification
- MIGRATION: Activities/proposals/claims/learning; skill concept provenance
- RISK: Free text can leak identity; do not expose raw descriptions
- MERGE GATE: Candidate with no experience can proceed; acceptance stored with actor/date/version; review privacy boundary; required project checks; legal activation separate.
- STATUS: NOT OPENED; split from checkpoint commits when ready for remote review.

## PR-04 — Native offers, salary and immutable versions
- BRANCH: codex/faro-04
- SCOPE: Build actual employer publishing and update lifecycle
- DEPENDENCY: CP02,CP03
- EXPECTED DIFF: src/domain/faro/offers.ts; src/server/faro/offerService.ts; migrations/0021*; cohesive domain/API slice, no unrelated formatting.
- TESTS: Money basis/period/range, review invalidation, immutable baseline, stale intake
- MIGRATION: Offers/versions and review state, responsible assignment, active confirmation
- RISK: Silent editing could erase applied conditions
- MERGE GATE: Published offers complete; changed material data generates immutable version; stale/paused blocked; review privacy boundary; required project checks; legal activation separate.
- STATUS: NOT OPENED; split from checkpoint commits when ready for remote review.

## PR-05 — Explainable matching and constraints
- BRANCH: codex/faro-05
- SCOPE: Explain every requirement and learning path without score
- DEPENDENCY: CP03,CP04
- EXPECTED DIFF: src/domain/faro/matching.ts; src/server/faro/offerService.ts; src/tests/faro-domain*; cohesive domain/API slice, no unrelated formatting.
- TESTS: Billing metamorphism, WILL_TEACH, unknown, levels, no unconfirmed proposals
- MIGRATION: No billing join or score storage
- RISK: Unknown incorrectly rendered as not capable
- MERGE GATE: Same relevant inputs yield same explanations/order across billing; no match %; review privacy boundary; required project checks; legal activation separate.
- STATUS: NOT OPENED; split from checkpoint commits when ready for remote review.

## PR-06 — Recruitment, clocks, watch and outbox
- BRANCH: codex/faro-06
- SCOPE: Complete interest→human response with privacy and concurrency
- DEPENDENCY: CP04,CP05
- EXPECTED DIFF: src/domain/faro/recruitment.ts; src/server/faro/recruitmentService.ts; worker; tests; cohesive domain/API slice, no unrelated formatting.
- TESTS: Version conflict, duplicate key, actor matrix, original clocks, requirement snapshot, private watch, grant revoke
- MIGRATION: Interest/snapshot/events/grants/watch/outbox/idempotency
- RISK: Competing terminal decisions, retry duplications, contact grant race
- MERGE GATE: Transaction state+audit+outbox; meaningful response only closes Clock A; Clock B independent; review privacy boundary; required project checks; legal activation separate.
- STATUS: NOT OPENED; split from checkpoint commits when ready for remote review.

## PR-07 — Trust and moderation foundations
- BRANCH: codex/faro-07
- SCOPE: Record signals, review and proportional decisions
- DEPENDENCY: CP06
- EXPECTED DIFF: src/domain/faro/trust.ts; src/server/faro/trustService.ts; worker; cohesive domain/API slice, no unrelated formatting.
- TESTS: No automatic fake-company verdict; withdrawal/low score neutral; pause keeps existing access
- MIGRATION: Cases/evidence/appeals/policy version, no candidate score
- RISK: False signal or punishing candidates for platform failure
- MERGE GATE: Reviewable evidence and human reasons; no fixed multiplier or immediate no-show sanction; review privacy boundary; required project checks; legal activation separate.
- STATUS: NOT OPENED; split from checkpoint commits when ready for remote review.

## PR-08 — Original authenticated Faro workspace
- BRANCH: codex/faro-08
- SCOPE: Deliver both roles with desktop split and mobile single pane
- DEPENDENCY: CP03,CP04,CP05,CP06,CP07
- EXPECTED DIFF: src/client/faro.ts; public/faro.css; public/index.html script wiring; e2e/faro.spec.ts; cohesive domain/API slice, no unrelated formatting.
- TESTS: Desktop/mobile end-to-end, axe, 320px overflow, keyboard/back/focus, login source lock
- MIGRATION: None
- RISK: Login selector bleed or stale requests across session
- MERGE GATE: Login preserved except approved text; real persisted two-sided process; no fake inventory; review privacy boundary; required project checks; legal activation separate.
- STATUS: NOT OPENED; split from checkpoint commits when ready for remote review.

## PR-09 — Private Job Economics and comparison
- BRANCH: codex/faro-09
- SCOPE: Separate money/time and provide honest manual fallback
- DEPENDENCY: CP04,CP08
- EXPECTED DIFF: src/domain/faro/economics.ts; src/server/faro/economicsService.ts; client compare; cohesive domain/API slice, no unrelated formatting.
- TESTS: Minor units/null/basis incompatibility/transport alternatives/privacy/no EHV
- MIGRATION: Private scenarios/version provenance
- RISK: Misleading UOP/B2B comparison and false precision
- MERGE GATE: Gross/net/commute/remainder distinct, unknown stays null; tax unsupported explicitly; review privacy boundary; required project checks; legal activation separate.
- STATUS: NOT OPENED; split from checkpoint commits when ready for remote review.

## PR-10 — Assessment foundations with real lifecycle
- BRANCH: codex/faro-10
- SCOPE: Build approved version→assignment→server timer→score→review
- DEPENDENCY: CP06,CP08
- EXPECTED DIFF: src/domain/faro/assessment.ts; src/server/faro/assessmentService.ts; migrations/0022*; client; cohesive domain/API slice, no unrelated formatting.
- TESTS: AI draft cannot assign, edits invalidate, server expiry, GET no start, scope/answer key hidden, no auto decision
- MIGRATION: Definitions/version approval/assignments/attempts/answer revisions/results
- RISK: Timer/answers lost, keys exposed, rubric incomparable
- MERGE GATE: One exact-answer task works; manual review tracked; no person ranking; extension to file/code remains gated; review privacy boundary; required project checks; legal activation separate.
- STATUS: NOT OPENED; split from checkpoint commits when ready for remote review.

## PR-11 — Privacy, operations and release hardening
- BRANCH: codex/faro-11
- SCOPE: Complete exports/deletion/recovery and document public release blockers
- DEPENDENCY: CP01–CP10
- EXPECTED DIFF: src/server/faro/privacyService.ts; tests; scripts; CI; docs/faro runtime docs; cohesive domain/API slice, no unrelated formatting.
- TESTS: All project checks, restore/restart, deletion/FKs, final browser, Docker if available
- MIGRATION: Deletion request/tombstone hooks; PostgreSQL requires separate rehearsed adapter
- RISK: Data loss, incomplete privacy erasure, false production readiness
- MERGE GATE: Local verified release artifacts plus explicit unmet external gates; no production launch claim; review privacy boundary; required project checks; legal activation separate.
- STATUS: NOT OPENED; split from checkpoint commits when ready for remote review.

## PR-12 — External gates and post-MVP register
- BRANCH: codex/faro-12
- SCOPE: Preserve accepted vision and truthful research/launch status
- DEPENDENCY: CP11 plus K dependencies in matrix
- EXPECTED DIFF: docs/faro; future approved integrations and tools only; cohesive domain/API slice, no unrelated formatting.
- TESTS: User studies, counsel memo, tax golden cases, provider license, CI/production evidence
- MIGRATION: No live billing/schema import without approval
- RISK: Premature launch or invented evidence
- MERGE GATE: Written gates resolved; staffed moderation and real supply; no unauthorized outreach; review privacy boundary; required project checks; legal activation separate.
- STATUS: NOT OPENED; split from checkpoint commits when ready for remote review.

## Actual dependent draft stack (2026-10-04)
Initial planned PR IDs above remain the intended capability sequence, not a claim of completion. Actual checkpoint slices preserve original commits without rewriting main or the user's login-editor branch:

| Slice | Draft | Branch | Base | Commit | Migration | Merge gate |
| --- | --- | --- | --- | --- | --- | --- |
| Original plan and immutable source | [#39](https://github.com/eagleblastmusic-lgtm/Job/pull/39) | codex/faro-00-plan | main | 8b2524a | none | source/coverage review |
| Runtime retirement and free-first | [#40](https://github.com/eagleblastmusic-lgtm/Job/pull/40) | codex/faro-01-runtime | previous | a18b25d | none | auth/retirement and full CI scope review |
| Organization and confirmed skills | [#41](https://github.com/eagleblastmusic-lgtm/Job/pull/41) | codex/faro-02-profile | previous | 20263a6 | 0020 | tenant/PII/confirmation review |
| Versioned offers and interest | [#42](https://github.com/eagleblastmusic-lgtm/Job/pull/42) | codex/faro-03-recruitment | previous | de1d3ec | 0021 | concurrency/clock/version review; later hardening required before activation |

All are draft and unmerged. Each compares only its checkpoint with the previous branch. Later checkpoint commits remain on codex/faro-canonical for integration CI; no giant implementation PR was opened. Original historical CI failures are disclosed in each body. Later phone/publication/preview fixes do not retroactively certify intermediate snapshots. Revert code/runtime changes together; keep initial plan and additive data history. Main remains ae4af4e.

## Current dependent checkpoint slices (2026-10-04, supersedes older table scope)
| Slice | Draft | Branch | Base | Code checkpoint | Migration |
| --- | --- | --- | --- | --- | --- |
| Assessment/trust/economics foundations | [#43](https://github.com/eagleblastmusic-lgtm/Job/pull/43) | codex/faro-04-foundations | codex/faro-03-recruitment | 82bdb1a | 0022 |
| CP11-F default browser and historical disposition | [#44](https://github.com/eagleblastmusic-lgtm/Job/pull/44) | codex/faro-cp11f-browser | codex/faro-cp11f-base | 6a4be07 | none |
| CP05-B explicit private comparable salary minimum | [#45](https://github.com/eagleblastmusic-lgtm/Job/pull/45) | codex/faro-cp05b-salary | codex/faro-cp11f-browser | d75bc7f | none |
| CP10-G attempt technical incident/human resolution | [#46](https://github.com/eagleblastmusic-lgtm/Job/pull/46) | codex/faro-cp10g-incidents | codex/faro-cp05b-salary | e42798e | 0029 |
| CP06-I durable outbox lease/conscious retry | [#47](https://github.com/eagleblastmusic-lgtm/Job/pull/47) | codex/faro-cp06i-outbox | codex/faro-cp10g-incidents | a4755a6 | 0030 |

All five are verified OPEN/DRAFT/unmerged. CP11-F base pins the existing integration at1816066; it is deliberately not main and not a claim that earlier hardening was merged. Earlier integration checkpoints remain dependencies that need their own review/slicing before main integration. This table records bounded review diffs, not a release-ready stack. Later documentation-only acceptance updates do not change the listed code checkpoints. Current main must be rechecked at integration time; the historical ae4af4e statement above is not a current-main assertion. No force push, merge or deployment performed.
