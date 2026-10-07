# CP11-BQ — PostgreSQL logical backup/current-authority recovery (2026-10-07)

Shared explicit current-authority ledger reads keep account credentials, encrypted MFA, recovery-code uses, roles, owners/members/assignments, organization verification, restrictions and erasures in one consistent snapshot. SQLite existing restore reads now consume the same ledger projection. Never expose this sensitive operator data through public export/diagnostics.

Native recovery is restricted to new rehearsal/recovery schemas and operator authorization. One SERIALIZABLE transaction replays current erasures and ownership continuity, current surviving credentials and MFA, roles/membership/assignments/restrictions, invalidates sessions and invites, releases stale delivery/file claims, revokes contact grants, defaults optional analytics off and pauses intake. Failed/currently incomplete authority or audit/constraint failure rolls back the whole target. Retained upload snapshots fail closed until separately reviewed physical-file recovery exists.

Added consistent native logical backup capture and two-schema actual PostgreSQL roundtrip: stale native backup vs latest native account deletion/credential change, operator refusal, unresolved deletion refusal, forced audit rollback, no resurrection, current credentials, invalid sessions, paused intake and replay. Restores verify counts/hashes/constraints through the existing reviewed schema importer. This is a logical staging exercise, not a deployed backup service or confirmed RPO/RTO.

Local/full/actual PostgreSQL acceptance pending. BP27a7dc5 native disposal acceptance pending. Default SQLite; cutover/rollback/production authority storage, protected backup/key management and all external gates remain open. Whole plan/release PARTIAL; continue.

BQ full local check PASS170 Node/36 migrations/lint/typecheck/both restores/38 desktop-mobile browsers; source-only71/36 and scripts/diff PASS. Native backup/recovery acceptance pending. BP27a7dc5 FARO37669744080 SUCCESS including actual PostgreSQL disposal/HTTP/browser tests, CI37669744085 pending. Continue cutover rehearsal; production RPO/RTO and external gates open.
