# CP11-BK — Portable restriction appeal and independent restoration (2026-10-07)

Shared SQLite/native plans preserve explicit reason/confirmation/revision checks, immutable restriction history, reviewed owner/admin appeal and independent human restoration. Native command journal checks current session authority, active membership and historical moderation conflicts before exact replay. Clearing one restriction cannot clear another or republish offers; final restoration only returns a restricted organization to PENDING.

Audit, restriction mutation, organization status, notification and command acknowledgment commit in one owned SERIALIZABLE transaction. Existing real API restriction regression now injects appeal/restoration audit failure and proves state/revision/journal rollback before retry. Extended disposable native moderation proof covers audit rollback, stale/confirmation refusal, changed payload replay conflict, revoked owner appeal replay refusal, source candidate/historical member conflicts, two retained restrictions, unchanged paused offer and moderator role revocation before replay.

Targeted original restriction PASS1; full local/actual PostgreSQL acceptance pending. Native case report/explanation/review/appeal writes and HTTP/runtime/recovery/cutover remain open; runtime SQLite, whole plan/release PARTIAL. Direct main.


CP11-BK full local check PASS168 Node/35 migrations/lint/typecheck/both restores/38 desktop-mobile browsers; source70/35, syntax/diff PASS. Actual native PostgreSQL acceptance pending. BJ0aff381 exact FARO37659409429 and CI37659409358 SUCCESS including native private moderation/restriction/reliability proofs. Runtime SQLite; whole plan/release PARTIAL.
