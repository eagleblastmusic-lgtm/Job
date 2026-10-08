# CP11-CB — Private storage readiness

Both SQLite and opt-in native PostgreSQL health now require a real private storage probe in addition to database readiness. Probe creates only an exclusive random synthetic file under uploads with private0600 mode, writes and syncs it, closes and unlinks it. Overlapping probes share one operation; no successful result is cached after storage loss. Redirected root/upload symlinks and non-directory paths fail closed; errors return neutral storage unavailable without paths/records. Retained files are never opened by the probe. PostgreSQL probes the users relation without reading rows, instead of a connection-only SELECT1.

Regressions cover healthy storage, obstruction503 with database ok, recovery without restart, retained sentinel preservation, overlapping requests, redirected directories and existing database failure. Actual PostgreSQL HTTP proof adds storage loss/recovery and application table loss/recovery in the disposable schema. Full local acceptance and actual PostgreSQL acceptance pending. No Render resources changed, no deployment, no migration.

This proves local runtime access to the configured directory, not durable platform mounting, power-loss durability, uploaded-file backup/restore, independent key custody or RPO/RTO. Probe cannot fence a concurrently compromised filesystem operator. Production release gates remain closed and SQLite remains default. Whole plan/release PARTIAL; continue operational and external acceptance work.


CB full local check PASS173 Node/37 migrations/lint/typecheck/both restore exercises/38 desktop-mobile browser cases. Final native-health change is compiled by the last full-check build; final typecheck/lint/script syntax/diff PASS. Actual PostgreSQL HTTP storage/schema regression pending remote acceptance.
