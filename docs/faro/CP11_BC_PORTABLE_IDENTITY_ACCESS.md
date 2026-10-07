# CP11-BC — Portable current session and MFA access (2026-10-07)

Shared explicit identity/MFA queries and policy preserve current session expiry, optional/mandatory privileged step-up, session-bound verification and minimized status. SQLite session lookup, MFA status/authorization and reauthenticated own revoke-all consume the same plans as native PostgreSQL. Native owned authority can be called inside service transactions; standalone reads own READ ONLY SERIALIZABLE transactions. Revoke-all requires current session/MFA/password/confirmation and atomically cascades own session verifications plus minimized audit, refusing client-selected identity. Native exercise verifies source wire parity, missing/expired sessions, mandatory privileged enrollment, isolated token-bound verification/exact expiry, reauthentication refusal, audit rollback and foreign-session preservation. MFA enroll/confirm/verify/recover writes, native registration/login and HTTP integration remain open.

Targeted local interviews/session/MFA PASS9. Full local and actual PostgreSQL acceptance pending. Runtime SQLite; full plan/release PARTIAL. Continue remaining native authentication/MFA/privacy/moderation/worker/HTTP/recovery/cutover and external gates. Work continues directly on main at user direction; no new branch/PR.


CP11-BB/BC full local check2026-10-07 PASS162 Node/35 migrations/both actual restores/38 real desktop/mobile browsers/lint/typecheck, zero skips. Targeted interviews/session/MFA PASS9; source70/35 and syntax/diff PASS. Native real PostgreSQL18 Node22/24 and remote acceptance pending. Direct main checkpoint at user direction; runtime SQLite, whole plan/release PARTIAL. Continue native MFA writes and remaining runtime integration.


CP11-BB/BC0111676 real PostgreSQL failed23505 because new tick fixture created two simultaneous active appointments in one process, contrary to existing faro_one_active_interview. Corrected proof expires the proposal before inserting the confirmed appointment, retaining all expiry/reminder/rollback/authority/terminal assertions and the UNIQUE index. Full local162/35/both restores/38 browsers remains valid; actual corrected PostgreSQL/remote acceptance pending.


CP11-BB/BCf3fffd4 actual PostgreSQL passed corrected tick fixtures then refused identity fixture because its candidate had already been erased by the earlier cascade test. Moved the complete identity/revocation proof before deliberate candidate deletion; no erased account/session is recreated, no authority guard relaxed, and the original deletion cascade proof remains. Real corrected acceptance pending.
