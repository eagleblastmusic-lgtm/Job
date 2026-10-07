# CP11-BB — Portable atomic interview timed tasks (2026-10-07)

SQLite/native share pending reads, pinned neutral proposal expiry and exact reminder plans. Proposal expiry/event/audit/notifications are atomic. Active processes only; confirmed appointments retain state and never become automatic no-show/completion. Candidate and currently assigned original recruiter reminders dedupe by interview/state/deadline; revoked membership suppresses recruiter delivery. Worker authority is checked inside the native SERIALIZABLE transaction. Repeated ticks preserve event/revision/deadline. Source regression adds failed delivery rollback and retry; native covers worker refusal, upcoming reminders, expiry rollback, original decision policy, restored membership delivery, outcome reminders and terminal refusal.

Targeted local interviews/session/MFA PASS9. Full local and actual PostgreSQL acceptance pending. Runtime SQLite; full plan/release PARTIAL. Continue remaining native authentication/MFA/privacy/moderation/worker/HTTP/recovery/cutover and external gates. Work continues directly on main at user direction; no new branch/PR.


CP11-BB/BC full local check2026-10-07 PASS162 Node/35 migrations/both actual restores/38 real desktop/mobile browsers/lint/typecheck, zero skips. Targeted interviews/session/MFA PASS9; source70/35 and syntax/diff PASS. Native real PostgreSQL18 Node22/24 and remote acceptance pending. Direct main checkpoint at user direction; runtime SQLite, whole plan/release PARTIAL. Continue native MFA writes and remaining runtime integration.


CP11-BB/BC0111676 real PostgreSQL failed23505 because new tick fixture created two simultaneous active appointments in one process, contrary to existing faro_one_active_interview. Corrected proof expires the proposal before inserting the confirmed appointment, retaining all expiry/reminder/rollback/authority/terminal assertions and the UNIQUE index. Full local162/35/both restores/38 browsers remains valid; actual corrected PostgreSQL/remote acceptance pending.
