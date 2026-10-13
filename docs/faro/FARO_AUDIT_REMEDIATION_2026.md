# FARO audit remediation — 2026-10-13

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
