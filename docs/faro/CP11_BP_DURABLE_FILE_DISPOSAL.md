# CP11-BP — Durable private file disposal (2026-10-07)

Migration0036 adds a private disposal queue independent of the deleted account FK. PostgreSQL and SQLite erasure enqueue validated owner-relative storage keys in the same account transaction. No unlink happens before commit; a queue-write failure rolls back account deletion and preserves the file. Successful erasure survives a later transient disposal failure. Missing files are idempotent success; filesystem failures retain a neutral code and bounded retry delay. Worker restart reclaims expired leases, and parallel PostgreSQL claims use SKIP LOCKED. No path/credential/payload appears in operational errors.

Added real SQLite HTTP queue-failure rollback and physical-unlink regression, queue transaction/cascade and path ownership checks, native failure/retry and abandoned-lease proof, and native HTTP actual retained-file deletion with forced queue rollback. Source rehearsal intentionally upgraded to the reviewed0036 schema. SQLite worker drains the same durable obligation after normal event tick.

First native-only full local check PASS169 Node/36 migrations/lint/typecheck/both restores/38 browsers. Full final SQLite/native integration check pending. Actual native PostgreSQL disposal acceptance pending.

BO712d838 exact FARO37668365491 and CI37668365334 SUCCESS, including actual HTTP/PostgreSQL18 Node22/24 and reused candidate/employer/privacy desktop/mobile scenarios plus production container. Native restore/cutover, independent persistent authority, deployment secrets/key lifecycle, provider integrations and external acceptance remain open. SQLite default; production gate closed; whole plan/release PARTIAL.

BP final full local check PASS170 Node/36 migrations/lint/typecheck/both actual restores/38 desktop-mobile browsers. Source-only PASS71/36, script syntax/diff PASS. Added native parallel-disposal proof and bounded transaction conflict retry; actual PostgreSQL acceptance pending. Continue native current-authority recovery/cutover.
