# Verification

Use `npm run build`, `npm run lint`, `npm run typecheck`, `npm run validate:migrations`. Canonical API contracts are `src/tests/faro-*.test.ts`; authentication/security contracts remain relevant. On this Windows sandbox the subprocess-isolated Node runner can fail with EPERM; `node --test --test-isolation=none dist/tests/faro-*.test.js` runs the same test files locally.

`npx playwright test e2e/faro.spec.ts --workers=1` runs actual HTTP/SQLite/browser journeys on desktop and mobile. It covers profile, watch vs interest, projection, persisted employer progression, economics/comparison, accessibility checks, 320px reflow and privacy controls. Browser launch may need sandbox escalation. Synthetic fixtures are isolated and removed after use. Screenshots live in ignored `test-results`.

The 2026-09-17 checkpoint had 9 Canonical API scenarios and 2 browser projects passing. New data-rights scenarios require fresh results; use IMPLEMENTATION_STATUS.md for exact per-delivery evidence. Historical OLX/LinkedIn importer fixture failures are known; no test is silently skipped to claim a green full suite. Legacy browser suites target the retired client and require an explicit archival/test-scope decision.

Required release evidence still includes full relevant regression, restart/backup restore with Canonical data, account erasure reconciliation, complete actor/transition coverage, final browser workflows and deployment persistence. A helper passing is not checkpoint completion.
