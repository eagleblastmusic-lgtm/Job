# CP11-BN — Shared canonical HTTP routing and explicit PostgreSQL runtime (2026-10-07)

Extracted one canonical route contract with awaited service operations. SQLite and PostgreSQL adapters share every FARO route and wire shape. Native adapters recheck current session, MFA and required administrator authority inside each owned operation transaction; adapters for earlier models add authority at their existing transaction boundary. Password reauthentication for ownership uses current stored credentials. Session revocation clears Secure cookies in production.

Explicit `FARO_DATABASE_ENGINE=postgresql`, `FARO_PG_URL` and `FARO_PG_SCHEMA` select a prepared PostgreSQL schema. Startup validates the migration version set, rejects invalid schema identifiers and closes failed connections. Registration/login/consents, account/me, private exports, MFA, profile/organizations/offers/processes/interviews/assessments/economics/moderation and worker dispatch use native models. Export uses explicit legacy columns without internal import ordering or credentials. Owned connection closes after worker drain. SQLite stays the default pending cutover acceptance. Production release gates remain closed.

Added actual HTTP/PostgreSQL exercise: public legal/health, controlled role assignment, private native offer creation/publication/interest/watch/economics, account and own export, consent, worker, expiry/revocation, logout and password-protected erasure. This runs in the existing PostgreSQL18 Node22/24 workflow. Native acceptance pending.

Initial shared-routing full local check PASS168 Node/35 migrations/lint/typecheck/both restores/38 desktop-mobile browser tests. Follow-up worker authority, secure logout and erasure guard need final verification. Corrected BM cd15634 actual FARO37665201228 and CI37665201181 SUCCESS.

Remaining limits: native browser matrix, cutover/rollback/recovery and production operations remain open. Retained upload accounts fail closed inside the erasure transaction until durable physical disposal is integrated. This stage does not perform production migration/deployment or close external acceptance gates. Whole plan/release PARTIAL; continue next technical stages.

BN final full local check PASS168 Node/35 migrations/lint/typecheck/both restores/38 desktop-mobile browsers. Source-only PASS70/35; script syntax and diff PASS. Actual HTTP/PostgreSQL acceptance pending; continue native browser and durable file disposal.
