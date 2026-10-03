# Local operations and recovery

Build with `npm run build`, then start `node dist/server/index.js` with `NODE_ENV=development`, `APP_ORIGIN`, `DATA_DIR` and `DATABASE_PATH` pointing to the chosen local environment. Never reuse real production data for fixtures. `/api/health` verifies availability; it does not certify completed legal/product gates.

`npm run backup:data -- --data-dir <dir> --database <db> --output <new-backup-dir>` uses the existing consistent SQLite snapshot utility. Keep backup access restricted. Upload copies are separate from database snapshot; write quiescence is needed for consistent file/database recovery.

Restore only to a new explicit rehearsal target first. The legacy restore utility has a destructive `--force` option; do not use it on the current workspace/database without a verified fresh backup and an explicit target. Validate integrity/FKs, account/process counts, immutable versions and files before cutover. Merge current erasure-ledger entries before restoring access to an older snapshot; automated reconciliation is not yet implemented.

Notifications use durable outbox dedupe/retry/dead-letter state. The current worker is manually invoked by authenticated admin at `/api/faro/worker/tick`; scheduled delivery and dead-letter administration remain open. Stale intake is paused without destroying candidate process history.

For a failed checkpoint, revert its code commit or close Canonical activation; keep additive tables. Do not drop domain history as a rollback shortcut. Production data retention and legal holds require approved policy before launch.
