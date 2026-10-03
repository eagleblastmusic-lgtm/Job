# Faro implementation architecture

`src/server/index.ts` starts `createFaroApp`, a Canonical allowlist around the existing Node HTTP authentication/static server. `/api/faro/*` dispatches to authorized services; retired CV/import/EHV/billing routes return 410. Production Canonical requests return `RELEASE_GATES_OPEN` while launch gates are unresolved.

The modular monolith uses pure domain modules under `src/domain/faro`, services under `src/server/faro`, and SQLite through `JobDatabase`. Services reuse active membership, offer assignment and transactional helpers. Offer versions and process snapshots are distinct immutable records. Recruitment commands persist state, event and outbox together, with optimistic version checks and per-user idempotency keys.

`src/client/faro.ts` owns auth wiring, routes, requests and session cleanup. `faroViews.ts` renders domain screens; `faroUi.ts` provides shared escaped controls, labels and projections; `faroTypes.ts` declares client DTOs. `public/faro.css` scopes Night/Gold tokens and desktop/mobile layouts to the workspace. Original auth markup/styles are retained.

Migrations 0020–0022 provide the domain foundations; 0023 adds a minimal erasure ledger. SQLite remains the implemented adapter. PostgreSQL, persistent production deployment, restore reconciliation, scheduled workers and final operational acceptance are still open. No claim of multi-instance readiness is made.
