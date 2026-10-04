# Verification

Use `npm run build`, `npm run lint`, `npm run typecheck`, `npm run validate:migrations`. Canonical API contracts are `src/tests/faro-*.test.ts`; authentication/security contracts remain relevant. On this Windows sandbox the subprocess-isolated Node runner can fail with EPERM; `node --test --test-isolation=none dist/tests/faro-*.test.js` runs the same test files locally.

`npx playwright test e2e/faro.spec.ts --workers=1` runs actual HTTP/SQLite/browser journeys on desktop and mobile. It covers profile, watch vs interest, projection, persisted employer progression, economics/comparison, accessibility checks, 320px reflow and privacy controls. Browser launch may need sandbox escalation. Synthetic fixtures are isolated and removed after use. Screenshots live in ignored `test-results`.

The 2026-09-17 checkpoint had 9 Canonical API scenarios and 2 browser projects passing. New data-rights scenarios require fresh results; use IMPLEMENTATION_STATUS.md for exact per-delivery evidence. Historical OLX/LinkedIn importer fixture failures are known; no test is silently skipped to claim a green full suite. Legacy browser suites target the retired client and require an explicit archival/test-scope decision.

Required release evidence still includes full relevant regression, restart/backup restore with Canonical data, account erasure reconciliation, complete actor/transition coverage, final browser workflows and deployment persistence. A helper passing is not checkpoint completion.

CP11-B: `npm run verify:faro-recovery` builds and exercises the actual restore helper against real isolated SQLite files, then reopens the result. Evidence: two erased subjects/derivatives absent; confirmed successor preserved; unresolved ownership closed; stale sessions/invites/grants and revoked roles/assignments not restored; changed password used; survivor process/version/first clock preserved; intake paused; original erasure times retained; replay idempotent; FK check clean; existing target refused; unknown ledger policy leaves no target DB. Source files remain unchanged. 28 Faro Node scenarios, migration validation, build, typecheck and lint passed during this checkpoint. No unchanged browser rerun or full legacy-suite pass is claimed.

CP06-H: 11 recruitment scenarios and 3 privacy scenarios PASS; actual DB recovery rehearsal PASS after updating its explicit consent setup. Expanded candidate/employer browser journey PASS desktop/mobile (2): exact number preview, no grant before confirmation, grant/read and revoke/403. Build/typecheck/lint PASS. API counterexamples cover initial stage, wrong actors, absent/stale/cross-process token, two grants revoked on number change, same-number edit retention and removal.

CP11-C: both runtime scenarios PASS after build, including an actual node:http raw absolute malformed request target that bypasses client URL validation, followed by a successful health request. No frontend or schema change.
