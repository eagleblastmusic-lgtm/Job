# FARO audit remediation — 2026-10-13

Current technical reacceptance,2026-10-18: **FARO-AUDIT-001/002/003/004 FIXED_VERIFIED** on `1e8d7041cbbfcf7551a91176bd98e92549f9ac3e`. [FARO39166787707](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/39166787707) and [CI39166787717](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/39166787717) both SUCCESS, all required jobs. Historical pending statements below describe their original verification stage. Full plan and production release remain PARTIAL.

Baseline: `6d0c000ab64489f5abde88e6c87ab1ec3453a1fc`, clean canonical worktree and identical remote main verified before changes. The independent report and audit-evidence were read in full; findings 001–004 are accepted as confirmed. This is remediation and technical reacceptance, not a replacement audit or production approval.

## Journal package (001 + 002)

Root cause: finalize/invalidate persisted the full current DTO as the idempotency result. The foreign actor's FK did not identify the candidate whose answer was copied. Interview propose/change were the other full DTO producers. All remaining producers were inspected: interest, process commands, definition edit, assignment, amendment, incidents, retries, cohort correction, cases, restrictions and outbox retry already return bounded acknowledgements.

Finalize/invalidate and all interview commands now retain `{id}` and project fresh authorized state after execution or replay. Input hash, command key, creation time, event/outbox effect and authority-before-replay remain intact. The journal refuses saving a recognized full private projection.

`commandPayloads.ts` implements an idempotent data backfill without changing schema version. It reduces only known historical assessment/interview DTO shapes across all actors, preserving unrelated acknowledgement bytes and every hash/key/date. SQLite open and validated PostgreSQL startup run it transactionally before serving. Erasure and isolated recovery invoke it inside their transactions, including recovery with no newly erased live subject. Approved definitions, interest snapshots and result history are not modified. Historical backups remain historical artifacts; their operational restore is minimized and reconciled against current authority before activation.

New `scripts/faro-command-journal-proof.mjs`: real OPEN_ANSWER submission → owner review → another assigned reviewer's amendment/invalidation → exact replay/current revision/validity → revoked authority/input conflict/no repeated effects → historical payloads → cleanup failure rollback → startup backfill → candidate HTTP deletion → every operational table scanned → actual old-backup restore/current authority → repeat scan and retained unrelated history. SQLite uses VACUUM backup/restore; PostgreSQL uses AES-GCM artifacts and the actual isolated restore CLI. Synthetic cleanup is mandatory. Two Node regressions separate privacy and replay; native rehearsal runs the full proof.

Initial targeted acceptance: SQLite proof PASS; PostgreSQL18.6/Node24 native rehearsal PASS, including encrypted restore and cleanup; existing assessment/interview and new regressions 25/25 PASS. Fresh `serverNow` is asserted separately from all unchanged domain fields in two existing exact-replay tests. Final full suites, counterproof and exact new CI are required before closure.

## Autosave (003)

The backend revision/expiry contract drives a 400ms in-memory queue. Input/change events save without a click. One request runs at a time; confirmation updates revision without repainting newer edits. Submit and in-app navigation drain the queue. Offline drafts stay in the active form; reconnect reads current state. An uncertain committed write reconciles without a repeated write. A 409 with competing answers requires explicit local/remote choice. Errors/expiry never claim successful saving. Confirmed reload preserves exact text, including whitespace, and original expiry. No localStorage/sessionStorage/Service Worker private draft persistence was introduced.

Initial real Chromium desktop/mobile acceptance: 10/10 PASS for the existing open-answer journey plus no-click exact reload/privacy, delayed serialization/submit, offline/reconnect/uncertain result/navigation, and 409/server timeout. Native browser/full CI acceptance remain pending.

Final local acceptance adds delayed acknowledgement after timer expiry:48/48 default browsers and38/38 native PostgreSQL/Node24 browsers PASS; full native PostgreSQL18.6 rehearsal/restore PASS on Node22.23.3 and24.19.0, both clusters stopped/cleaned. The new public JavaScript module joins the existing public-shell allowlist with a cache-version update; no API/answer is cached. Exact new remote CI acceptance remains pending.

## OSRM (004)

The transport reads a bounded HTTP400 body only for OSRM and accepts only `code: NoRoute` as an unknown route. Other 400 codes/malformed JSON refuse; 429/5xx remain controlled errors. Byte/time/cancellation/redirect restrictions and Nominatim behavior remain intact. The wrong HTTP200 NoRoute fixture is corrected to 400; incompatible 200 NoRoute is rejected.

Contract verified without public router requests: [OSRM v5.24 API](https://project-osrm.org/docs/v5.24.0/api/) and [upstream status mapping](https://github.com/Project-OSRM/osrm-backend/blob/v5.24.0/src/server/request_handler.cpp). New regression covers valid400, invalid400/code/JSON, wrong200, 429, 500/503, oversized/stalled bodies and unchanged geocoder refusal. Targeted PASS; final acceptance pending.

## Status authority

K039/K047/K048 stay DELTA_REQUIRED until final required verification; K077 stays EXTERNAL_BLOCKED with an explicit technical delta. The generator validates an explicit reviewed classification, reason and evidence for each K001–K086. Missing, duplicate, unknown or unsupported entries fail closed. It cannot manufacture zero deltas from an empty pending set. No founder decision or external boundary changes.

## Counterproof and final local verification

Safe `git archive 6d0c000` in an owned Temp directory retained the old runtime/migrations and received only the new tests/proof plus an isolated browser port. New001 fails because journal retains full private DTO;002 fails on replay revision4 versus current5;004 and corrected original routing test fail with GEO_PROVIDER_UNAVAILABLE on real400. New003 fails in both desktop/mobile because there is no automatic persistence/confirmation. These are expected failures of old code. Current tests all pass without skip/assertion relaxation.

Local build/lint/typecheck/38 migrations PASS, full212/212 Node PASS,6/6 tooling PASS, historical and Canonical actual backup/restore PASS. Generator fail-closed test PASS after correcting inherited nested test-runner context (no application/assertion change). Detailed original logs live in the local `evidence/audit-remediation-20261013` directory; sanitized verification metadata is committed. No paid resource, production activation, provider egress, real candidate data or secret change occurred.

## Continued acceptance — 2026-10-18

Initial remote runs [FARO Canonical 38424718200](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/38424718200) and [CI 38424718195](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/38424718195) failed an immediate URL assertion after asynchronous blocked offline navigation. The regression now waits for the same required attempt URL and still checks the retained exact draft. Six repeated desktop/mobile runs passed; no acceptance criterion was relaxed.

A narrow independent code review additionally reproduced loss of an accepted submit's HTTP response: retry incorrectly treated the submitted state as expiry and blocked navigation. Recovery now settles the fresh authorized terminal state, clears uncertain/pending recovery, disables obsolete editing and refreshes the view without another submit. Both retry and explicit load use this path. The new real-browser regression checks pending review, unchanged revision/answers/expiry, exactly one submit/event and working navigation. Before the fix it failed on both viewports (`lost-submit-counterproof.log`). Final replacement CI is still required before technical closure.

## Final verification and change index

Final exact-code CI: build/lint/typecheck/38 migration validation PASS; full212 Node tests,zero failures/skips;52 SQLite browser tests PASS;42 native PostgreSQL18 browser tests on each of Node22 and24 PASS. Both native jobs pass encrypted backup/actual restore/current authority, cross-actor journal cleanup failure rollback and single-event/outbox replay. Historical backup/restore, private-file envelope/bundle tests, production-image build and isolated closed-release smoke PASS. This supplements the earlier local PostgreSQL18.6 Node22.23.3/24.19.0 proofs and real Chromium desktop/mobile tests. No test was disabled or weakened. All four new finding regressions fail on isolated6d0c000 and pass on the corrected code; the additional lost-submit counterproof also fails beforeacc7926.

| Finding/status | Changed files (relative to repository) | Fix commit and exact regression |
|---|---|---|
|001 FIXED_VERIFIED|`src/server/faro/commandPayloads.ts`, `commandJournal.ts`, `assessmentService.ts`, `assessmentReviewModel.ts`, `assessmentInvalidationModel.ts`, `interviewService.ts`, `interviewProposalModel.ts`, `interviewScheduleModel.ts`, `interviewOutcomeModel.ts`, `privacyService.ts`, `privacyErasureModel.ts`, `recoveryService.ts`, `recoveryWriteModel.ts`; `src/server/db.ts`, `pgFaroApp.ts`; `scripts/faro-command-journal-proof.mjs`, `faro-postgres-exercise.mjs`; `src/tests/faro-command-journal.test.ts`|0968e86; `FARO-AUDIT-001: real SQLite HTTP command journal regression`; native `FARO_AUDIT_001_ERASURE_RESTORE_PASS backend=postgresql` on both Node versions|
|002 FIXED_VERIFIED|Same journal/assessment/proof files; `src/tests/faro-assessment-economics-trust.test.ts` asserts fresh serverNow separately from unchanged domain fields|0968e86; `FARO-AUDIT-002: real SQLite HTTP command journal regression`; native `FARO_AUDIT_002_REPLAY_PASS backend=postgresql` on both Node versions|
|003 FIXED_VERIFIED|`src/client/assessmentAutosave.ts`, `faro.ts`; `src/server/faro/assessmentAnswerModel.ts`; `public/sw.js`; `e2e/faro-open-answer.spec.ts`|2e83166,c9f3607,acc7926; no-click exact reload/unchanged expiry, delayed serialization/submit, offline/reconnect/uncertain response/navigation,409 explicit choice, server timeout, late timer acknowledgement, lost-submit retry and explicit load.16 real browser cases across desktop/mobile in each backend suite|
|004 FIXED_VERIFIED|`src/server/faro/geographyProviders.ts`; `src/tests/faro-geography-providers.test.ts`|71875bb,c9f3607; `FARO-AUDIT-004: OSRM HTTP400 NoRoute alone is unknown; status/body errors retain bounds and Nominatim semantics`, including actual loopback HTTP400 transport|

Status tooling inb864bd4 validates explicit K001–K086 authority and fails missing/duplicate/unclassified/invalid entries; `scripts/faro-current-scope.test.mjs` and `src/tests/faro-current-scope.test.ts` prove it. K039/K047/K048 close only after the above exact CI; K077's technical OSRM subitem closes while its independent provider/data terms remain EXTERNAL_BLOCKED. Current classification is44 DONE,0 DELTA_REQUIRED,28 EXTERNAL_BLOCKED,14 DEFERRED.

No locally resolvable technical delta from001–004 remains. Independent legal/KRAZ/service/DPA/DPIA/AI/privacy/retention, assessment validity/fairness, anti-commercial-work review, security/manual accessibility/user research, provider production rights, staffed moderation/incident response, production storage/backup/key/current-authority custody and measured RPO/RTO remain open. Main protection needs an owner decision consistent with the authorized direct-main procedure. These are separate acceptance requirements; no founder decision was changed.

## All86 requirement classifications — 2026-10-18

| Status | Explicit requirement IDs |
|---|---|
|DONE (44)|K005, K010, K011, K012, K013, K014, K015, K016, K017, K018, K019, K020, K022, K024, K025, K027, K028, K029, K030, K031, K032, K033, K034, K035, K036, K037, K039, K040, K041, K042, K045, K047, K048, K060, K061, K066, K073, K074, K075, K078, K079, K080, K081, K084|
|DELTA_REQUIRED (0)|None|
|EXTERNAL_BLOCKED (28)|K001, K002, K003, K004, K006, K007, K008, K009, K021, K023, K026, K038, K043, K044, K046, K049, K050, K051, K052, K062, K063, K064, K065, K072, K077, K082, K083, K085|
|DEFERRED (14)|K053, K054, K055, K056, K057, K058, K059, K067, K068, K069, K070, K071, K076, K086|

K077 remains EXTERNAL_BLOCKED with technicalStatus DONE. The JSON register preserves individual requirement text, checkpoint, reason and evidence.

## Hosted reacceptance — 2026-10-18

Existing Free Render service srv-db3pb9rncjis73banf90 and PostgreSQL18 database dpg-db3u3su7bikc73ado7v0-a were retained. Auto-deploy off, production intake/worker gates closed, network rules/secrets/configuration unchanged. Exact1e8d704 passed both complete workflows before manual deploy dep-dbajfiuq1p3s73btoav0; Live2026-10-18T21:20:03.970125Z. New instance v4mp4 logged retained0038/schema, PRIVATE_FILES_ZERO and listener21:19:59.664729247Z. Startup guard refuses nonzero file references before readiness and the native test proves metadata preservation. No schema reset/drop/downgrade.

Actual HTTPS restart proof kept one synthetic account, original session and changed optional consent across the observed new listener; fresh login and own export PASS; release remains503 RELEASE_GATES_OPEN. Smoke PASS and account deletion/stale-session rejection cleanup PASS. No real candidate data was used. See evidence/audit-remediation-20261013/staging-rollout-20261018.json and verification.json; original local logs remain alongside their committed hashes.

Rollback is a forward client-only repair from0968e86 retaining current privacy001/002,OSRM004 and file guard; use a new public-shell cache version and fresh build/tests/both CI before deploy. No ready fallback image is claimed; returning to manual save temporarily reopens003. Never select the previous720b7a5 image or restore stale DB merely to roll back this client.

OSRM004 is storage-independent bounded HTTP transport; its native loopback/negative contract tests execute on Node22 and24. It has no separate SQL mutation to prove. SQLite and native PostgreSQL application suites remain green.

Exact003 regression names in `e2e/faro-open-answer.spec.ts` (each runs desktop/mobile against SQLite and native PostgreSQL):

- `FARO-AUDIT-003: no-click autosave confirms a revision, exact private text survives reload and expiry is unchanged`
- `autosave serializes delayed snapshots with newer edits and submit; stale response never repaints the draft`
- `autosave offline/reconnect and uncertain committed response preserve the draft; navigation waits for confirmation`
- `autosave 409 requires a choice between concurrent answers; server timeout stops saving and submission`
- `autosave confirmation arriving after the timer expires cannot reactivate editing or submit`
- `autosave reconciles an accepted submit after a lost response via Ponów zapis without resubmission or a false expiry`
- `autosave reconciles an accepted submit after a lost response via Wczytaj zapisaną odpowiedź without resubmission or a false expiry`
