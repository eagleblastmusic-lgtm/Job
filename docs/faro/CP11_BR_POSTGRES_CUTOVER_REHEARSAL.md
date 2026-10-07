# CP11-BR — Actual HTTP cutover/rollback rehearsal (2026-10-07)

Added an isolated actual HTTP switch from current synthetic SQLite to a prepared PostgreSQL schema through one disposable listener. Existing authenticated account/profile/process reads must preserve wire parity. The exercise returns to SQLite only after complete native count/hash comparison proves no native writes. It then performs a native profile mutation and verifies stale-source rollback refusal while the listener retains the newer PostgreSQL data and source SQLite remains unchanged.

No production traffic, deployment settings or actual user records are changed. This verifies a staging boundary, not an approved production migration. A rollback after native writes still requires a reviewed transfer/recovery procedure; switching to stale SQLite would lose data and is explicitly refused.

Script syntax/lint/diff PASS; source rehearsal and actual PostgreSQL acceptance pending. BQ current-authority recovery acceptance pending; BP27a7dc5 FARO37669744080/CI37669744085 SUCCESS including native disposal/HTTP/browser/container. Default SQLite, production release gates closed. Production migration, persistent protected backup/current authority, confirmed RPO/RTO, key lifecycle/provider/independent external acceptance remain open; whole plan/release PARTIAL. Continue.

Native cutover correctly rejected an invalid synthetic first name containing spaces. Corrected the fixture to a valid single first name; profile validation and all rollback criteria retained. Corrected actual acceptance pending.
