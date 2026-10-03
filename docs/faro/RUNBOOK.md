# Local operations and recovery

Build with `npm run build`, then start `node dist/server/index.js` with `NODE_ENV=development`, `APP_ORIGIN`, `DATA_DIR` and `DATABASE_PATH` pointing to the chosen local environment. Never reuse real production data for fixtures. `/api/health` verifies availability; it does not certify completed legal/product gates.

`npm run backup:data -- --data-dir <dir> --database <db> --output <new-backup-dir>` uses the existing consistent SQLite snapshot utility. Keep backup access restricted. Upload copies are separate from database snapshot; write quiescence is needed for consistent file/database recovery.

Restore only to a new explicit rehearsal target first. The legacy restore utility has a destructive `--force` option; do not use it on the current workspace/database without a verified fresh backup and an explicit target. Validate integrity/FKs, account/process counts, immutable versions and files before cutover. Merge current erasure-ledger entries before restoring access to an older snapshot; automated reconciliation is not yet implemented.

Notifications use durable outbox dedupe/retry/dead-letter state. Development runs one in-process worker every 60 seconds; `FARO_WORKER_ENABLED=false` disables it and `FARO_WORKER_INTERVAL_MS` changes the interval (minimum 1000 ms). Tests default to disabled. Production always disables it while release gates are open, even with an enable override. Closing the app stops the timer before database closure. No external email/SMS is sent.

Authenticated ADMIN can invoke POST `/api/faro/worker/tick` and inspect GET `/api/faro/worker/status`: running state, last success, opaque error code and aggregate outbox states only. Failure preserves durable work for the next cycle; bounded per-message retries end in DEAD_LETTER. There is no automatic dead-letter replay or deletion endpoint. Restart picks up pending durable obligations on the first scheduled cycle. Do not run multiple SQLite app instances; leased multi-instance scheduling remains part of the production persistence gate. Stale intake is paused without destroying candidate process history, and closing uses the last published deadline rather than draft values.

For a failed checkpoint, revert its code commit or close Canonical activation; keep additive tables. Do not drop domain history as a rollback shortcut. Production data retention and legal holds require approved policy before launch.
