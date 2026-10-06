# CP11-W — Shared atomic offer lifecycle and outbox (2026-10-06)

Existing OfferService.lifecycle and actual PostgreSQL staging consume shared revision/state checks and parameterized command plans. Assignment, current active creator/recruiter role, VERIFIED organization, explicit confirmed current version and future closing date are checked within the owned transaction. SQLite keeps its synchronous API; PostgreSQL uses SERIALIZABLE with no automatic retry.

Publishing records EXPLICIT proof and pins approved version. Reconfirmation preserves original publication time/author while updating confirmation time, bounded by closing time and the existing14-day rule. Pause, close and archive keep established transitions. Minimal audit, proof/status and notifications are atomic. Watch/interest recipients are unioned; repeated version/action delivery is deduplicated using the existing key. ON CONFLICT targets only recipient/dedupe key: other integrity failures roll back instead of being silently ignored.

Real PostgreSQL18 Node22/24 must prove stale/foreign/invalid-state refusal, missing explicit confirmation/unverified organization denial, publication/intake, retained original publication after reconfirmation, duplicate recipient/reconfirmation suppression, closed intake and archive. A real NOT VALID CHECK preserves retained outbox history but rejects all new offer notifications; the complete failed publication must roll back status and version proof. Prior70-table hashes/counts/constraints/rollback/current-authority proofs remain required.

Full local application and actual PostgreSQL acceptance pending. Runtime remains SQLite; remaining discovery/process/assessment/auth/privacy repositories and production cutover/external gates open. Locked login, CV/EHV exclusion and production release refusal retained. Not full plan or release DONE.

CP11-W full local npm run check PASS154 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips; source-only70/35 and diff-check PASS. Exact actual PostgreSQL and remote acceptance pending.
