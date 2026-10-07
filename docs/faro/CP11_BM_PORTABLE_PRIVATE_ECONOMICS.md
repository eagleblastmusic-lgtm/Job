# CP11-BM — Portable private offer economics (2026-10-07)

Shared SQLite/PostgreSQL validation and calculation plans preserve private manual estimates, pinned visible offer version, explicit salary and commute units, unknown net values and unsupported automatic tax calculation. Native reads and writes recheck current authority and offer access inside their owned transaction. SQLite save now reads the offer, calculates and persists atomically.

Full local check PASS: 168 Node tests, 35 migrations, lint/typecheck, both backup/restore exercises and 38 desktop/mobile browser tests. Added real HTTP persistence-failure regression. Native exercise covers private wire parity, authorization refusal, unit validation and PostgreSQL constraint rollback; actual PostgreSQL acceptance pending. Source-only rehearsal pending.

BL8cef85a actual FARO37662893498 and CI37662893383 SUCCESS, including PostgreSQL18 Node22/24. Runtime remains SQLite until HTTP integration and cutover acceptance. External acceptance gates remain open; whole plan/release PARTIAL.

BM source-only rehearsal PASS70 tables/35 migrations; script syntax and git diff checks PASS. Actual PostgreSQL acceptance pending.

Native BM acceptance exposed a fixture interaction: an initial private commute estimate made an existing unknown-commute offer assertion known. Removed only that early seed; final native save/get/privacy/constraint proofs remain intact. No product criteria changed. Corrected native acceptance pending.
