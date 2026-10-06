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

Continuation slices (all draft/unmerged):
| Checkpoint | Draft | Branch | Base | Code |
| --- | --- | --- | --- | --- |
| CP10-H explicit technical retry | [#48](https://github.com/eagleblastmusic-lgtm/Job/pull/48) | codex/faro-cp10h-retry | codex/faro-cp06i-outbox |40b0e6a|
| CP07-E independent restriction restoration | [#49](https://github.com/eagleblastmusic-lgtm/Job/pull/49) | codex/faro-cp07e-restoration | codex/faro-cp10h-retry |6be3d1e|
| CP05-C private commute/unknown listing | [#50](https://github.com/eagleblastmusic-lgtm/Job/pull/50) | codex/faro-cp05c-commute | codex/faro-cp07e-restoration |76dde71|
These bounded slices have exact successful CI evidence in the checkpoint register. Earlier integration dependencies still require review before main; no merge/deploy/release occurred.
| CP10-I individual human amendments | [#51](https://github.com/eagleblastmusic-lgtm/Job/pull/51) | codex/faro-cp10i-amendment | codex/faro-cp05c-commute |c250d35|
| CP10-J previewed cohort key correction | [#52](https://github.com/eagleblastmusic-lgtm/Job/pull/52) | codex/faro-cp10j-cohort | codex/faro-cp10i-amendment |dbfe763|
Both exact workflow pairs SUCCESS; evidence in checkpoint register. All draft/unmerged; release gates remain open.
CP11-G draft [#53](https://github.com/eagleblastmusic-lgtm/Job/pull/53): codex/faro-cp11g-analytics base codex/faro-cp10j-cohort, code ed9b811. FARO37379479424 SUCCESS; original CI37379479463 still in progress at this observation, not accepted yet. All draft/unmerged, production gated.
CP03-D draft [#54](https://github.com/eagleblastmusic-lgtm/Job/pull/54): codex/faro-cp03d-guidance base codex/faro-cp11g-analytics, code6e702c8. Full local evidence in CP03_D_ACTIVITY_GUIDANCE.md, exact remote acceptance pending. CP11-G both37379479424/37379479463 SUCCESS ated9b811 supersedes prior pending note. All draft/unmerged.
CP03-D both37380022904/37380022974 SUCCESS at6e702c8 supersedes pending note. CP07-F draft [#55](https://github.com/eagleblastmusic-lgtm/Job/pull/55): codex/faro-cp07f-completion base codex/faro-cp03d-guidance, code4577587. Both37380483247/37380483273 SUCCESS. All draft/unmerged.

CP09-B draft [#56](https://github.com/eagleblastmusic-lgtm/Job/pull/56): codex/faro-cp09b-comparison base codex/faro-cp07f-completion, code4d15f5b. Both37381779711/37381779799 SUCCESS. All draft/unmerged.

CP11-H draft [#57](https://github.com/eagleblastmusic-lgtm/Job/pull/57): codex/faro-cp11h-session base codex/faro-cp09b-comparison, coded340f83. Both37382563175/37382563222 SUCCESS. All draft/unmerged.

CP02-G draft [#58](https://github.com/eagleblastmusic-lgtm/Job/pull/58): codex/faro-cp02g-sessions base codex/faro-cp11h-session, code44bf3ca. FARO37383213563 SUCCESS; CI37383213360 pending at this observation. All draft/unmerged.

CP07-G draft [#59](https://github.com/eagleblastmusic-lgtm/Job/pull/59): codex/faro-cp07g-gaps base codex/faro-cp02g-sessions, codea81e015. Both37383663019/37383663160 SUCCESS. CP02-G CI37383213360 SUCCESS supersedes pending note. All draft/unmerged.

CP10-K draft [#60](https://github.com/eagleblastmusic-lgtm/Job/pull/60): codex/faro-cp10k-open-answer base codex/faro-cp07g-gaps, code66635b4. Both37384886723/37384886582 SUCCESS. All draft/unmerged.


CP02-H draft [#61](https://github.com/eagleblastmusic-lgtm/Job/pull/61): codex/faro-cp02h-mfa base codex/faro-cp10k-open-answer, code2f90e5b. Both37387892167/37387892042 SUCCESS. All draft/unmerged.


CP06-J draft [#62](https://github.com/eagleblastmusic-lgtm/Job/pull/62): codex/faro-cp06j-employment base codex/faro-cp02h-mfa, code6def302. Both37389049374/37389047911 SUCCESS. All draft/unmerged.


CP11-I draft [#63](https://github.com/eagleblastmusic-lgtm/Job/pull/63): codex/faro-cp11i-postgres base codex/faro-cp06j-employment, codefe39731 + fix7c05f87. Both37389939763/37389940077 SUCCESS at7c05f87; real PostgreSQL18 Node22/24 PASS. All draft/unmerged.


CP11-J exact remote acceptance at01e33b6: [FARO37391162935](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37391162935) and [CI37391162982](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37391162982) SUCCESS. CP11-K exact remote acceptance atbd8b141: [FARO37391574567](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37391574567) and [CI37391574640](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37391574640) SUCCESS, including real PostgreSQL18 Node22/24 transaction/scope/conflict proof. Draft64/65 remain dependent/unmerged. Full plan/release PARTIAL.

CP11-J draft [#64](https://github.com/eagleblastmusic-lgtm/Job/pull/64): codex/faro-cp11j-offer-analytics base codex/faro-cp11i-postgres, code01e33b6. CP11-K draft [#65](https://github.com/eagleblastmusic-lgtm/Job/pull/65): codex/faro-cp11k-pg-boundary base codex/faro-cp11j-offer-analytics, codebd8b141. Both exact remote checks SUCCESS above; drafts unmerged.

CP11-L exact remote acceptance at207adcd: [FARO37440425309](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37440425309) and [CI37440425276](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37440425276) SUCCESS. Actual PostgreSQL18 Node22/24 profile-wire/read-only-batch/safe-integer and preceding staging proof PASS. Draft66 remains dependent/unmerged; runtime SQLite, full plan/release PARTIAL.

CP11-L draft [#66](https://github.com/eagleblastmusic-lgtm/Job/pull/66): codex/faro-cp11l-profile-read base codex/faro-cp11k-pg-boundary, code207adcd. Both exact remote checks SUCCESS above; unmerged.

CP11-M exact remote acceptance at9beab73: [FARO37441227370](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37441227370) and [CI37441227307](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37441227307) SUCCESS. Actual PostgreSQL18 Node22/24 published/current wire parity, unpublished draft isolation and intake proof regressions PASS. Draft67 remains dependent/unmerged; runtime SQLite, whole plan/release PARTIAL.

CP11-M draft [#67](https://github.com/eagleblastmusic-lgtm/Job/pull/67): codex/faro-cp11m-offer-read base codex/faro-cp11l-profile-read, code9beab73. Both exact remote checks SUCCESS above; unmerged.

CP11-N atfd9ee0e: [FARO37441865147](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37441865147) SUCCESS, including actual PostgreSQL18 Node22/24 profile writes and atomic phone-grant/audit/profile rollback. [CI37441865183](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37441865183) still in progress at this observation. Draft68 dependent/unmerged; runtime SQLite, whole plan/release PARTIAL.

CP11-N draft [#68](https://github.com/eagleblastmusic-lgtm/Job/pull/68): codex/faro-cp11n-profile-write base codex/faro-cp11m-offer-read, codefd9ee0e. Exact FARO SUCCESS, CI pending above; unmerged.

CP11-N final CI37441865183 SUCCESS atfd9ee0e supersedes the previous pending note; FARO37441865147 also SUCCESS. CP11-O exact acceptance at7526d41: [FARO37442510890](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37442510890) and [CI37442510741](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37442510741) SUCCESS, including PostgreSQL18 Node22/24 private constraints save/preserve/remove/refusal proof. Draft68/69 dependent/unmerged; runtime SQLite, full plan/release PARTIAL.

CP11-O draft [#69](https://github.com/eagleblastmusic-lgtm/Job/pull/69): codex/faro-cp11o-private-constraints base codex/faro-cp11n-profile-write, code7526d41. Both exact remote checks SUCCESS above; unmerged.

CP11-P exact remote acceptance at951682f: [FARO37443239641](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37443239641) and [CI37443239626](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37443239626) SUCCESS. Actual PostgreSQL18 Node22/24 private claims/learning/activity/proposal history, ownership, confirmation, pinned-skill and rollback regressions PASS. Draft70 dependent/unmerged; runtime SQLite, full plan/release PARTIAL.

CP11-P draft [#70](https://github.com/eagleblastmusic-lgtm/Job/pull/70): codex/faro-cp11p-profile-evidence base codex/faro-cp11o-private-constraints, code951682f. Both exact remote checks SUCCESS above; unmerged.

CP11-Q exact remote acceptance at6728484: [FARO37443951948](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37443951948) and [CI37443951915](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37443951915) SUCCESS. Actual PostgreSQL18 Node22/24 membership/list parity, exact role allowlists, revoked access and retained affiliation proof PASS. Draft71 dependent/unmerged; runtime SQLite, full plan/release PARTIAL.

CP11-Q draft [#71](https://github.com/eagleblastmusic-lgtm/Job/pull/71): codex/faro-cp11q-organization-access base codex/faro-cp11p-profile-evidence, code6728484. Both exact remote checks SUCCESS above; unmerged.

CP11-R exact remote acceptance at3e76704: [FARO37444776127](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37444776127) and [CI37444776137](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37444776137) SUCCESS. Actual PostgreSQL18 Node22/24 create/FK rollback, independent moderator/historical conflict/restriction and audit rollback proof PASS. Draft72 dependent/unmerged; runtime SQLite, full plan/release PARTIAL.

CP11-R draft [#72](https://github.com/eagleblastmusic-lgtm/Job/pull/72): codex/faro-cp11r-organization-verification base codex/faro-cp11q-organization-access, code3e76704. Both exact remote checks SUCCESS above; unmerged.

CP11-S exact remote acceptance atb1f6b8f: [FARO37445963925](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37445963925) and [CI37445963899](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37445963899) SUCCESS. CP11-T exact acceptance atc446669: [FARO37446143207](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37446143207) and [CI37446143344](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37446143344) SUCCESS. Real PostgreSQL18 Node22/24 membership/hash/expiry/role/rollback and actual idle backend termination proof PASS; full154 Node/both restores/38 browser CI retained, no skips. Draft73/74 dependent/unmerged; runtime SQLite, whole plan/release PARTIAL.

CP11-S draft [#73](https://github.com/eagleblastmusic-lgtm/Job/pull/73): codex/faro-cp11s-membership base codex/faro-cp11r-organization-verification, codeb1f6b8f. CP11-T draft [#74](https://github.com/eagleblastmusic-lgtm/Job/pull/74): codex/faro-cp11t-pg-connection-loss base codex/faro-cp11s-membership, codec446669. Exact remote checks SUCCESS above; unmerged.

CP11-U fixed61cc962 exact acceptance: [FARO37447143779](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37447143779) and [CI37447143553](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37447143553) SUCCESS. CP11-V abdf320 exact acceptance: [FARO37447404367](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37447404367) and [CI37447404336](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37447404336) SUCCESS, including PostgreSQL18 Node22/24 atomic create/edit, retained publication/history, no-op and real audit rollback. Initial U failure remains recorded; fixed injection enforces new writes without invalidating retained history. Draft75/76 dependent/unmerged; runtime SQLite, full plan/release PARTIAL.

CP11-U draft [#75](https://github.com/eagleblastmusic-lgtm/Job/pull/75): codex/faro-cp11u-offer-draft base codex/faro-cp11t-pg-connection-loss, initial94cbb07/fix61cc962. CP11-V draft [#76](https://github.com/eagleblastmusic-lgtm/Job/pull/76): codex/faro-cp11v-offer-edit base codex/faro-cp11u-offer-draft, codeabdf320. Exact remote checks SUCCESS above; unmerged.

CP11-W draft [#77](https://github.com/eagleblastmusic-lgtm/Job/pull/77): codex/faro-cp11w-offer-lifecycle base codex/faro-cp11v-offer-edit, code46ffc46. Local154 Node/35 migrations/both restores/38 browser executions/source70 PASS. Actual PostgreSQL18 Node22/24 lifecycle/outbox rollback proof PASS in FARO37448510362; full FARO/CI acceptance pending. Unmerged; runtime SQLite and full plan/release PARTIAL.
