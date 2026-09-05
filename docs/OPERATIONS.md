# Operations — MVP 0.1

## Quality gate

The branch/release gate is executed with:

```bash
npm run check
```

This runs project policy lint, strict TypeScript checks, migration validation, a production build and all Node tests. GitHub CI additionally builds the production Docker image and boots it for a `/api/health` smoke check.

## Database migrations

Executable SQLite migrations are files named `NNNN_name.sql` in `migrations/`. `JobDatabase` discovers and applies every not-yet-recorded migration in lexical order inside its own transaction. `postgres_*.sql` files are references only and are never applied to SQLite.

Before merging a migration:

```bash
npm run validate:migrations
```

The validator creates a fresh in-memory database, applies all executable migrations and runs foreign-key and integrity checks.

## Backup

For the current single-instance SQLite/local-storage phase, create a consistent snapshot with:

```bash
npm run backup:data -- --data-dir ./data --output ./backups/manual-YYYYMMDD
```

The database snapshot uses SQLite `VACUUM INTO`, so the copied database is internally consistent. User uploads are copied into the same backup directory and a versioned manifest is written.

Backups can contain personal and professional data. Store them encrypted outside the application host, limit access, and apply the same deletion/retention policy as production data.

## Restore drill

Stop application writes before restore. Restore into an empty target whenever possible:

```bash
npm run restore:data -- --source ./backups/manual-YYYYMMDD --data-dir ./restore-test
```

To replace an existing local target after taking a fresh backup:

```bash
npm run restore:data -- --source ./backups/manual-YYYYMMDD --data-dir ./data --force
```

The restore command runs `PRAGMA integrity_check` before reporting success. A production rollout must additionally automate encrypted off-host backups and scheduled restore drills.

## Current retention behavior

- expired authentication sessions are purged when the application starts;
- account deletion removes database rows through foreign-key cascades and deletes that user's private upload directory;
- active career/application data is not silently deleted on an arbitrary timer in MVP 0.1;
- data export is available before deletion;
- production policy/consent surfaces and legally approved retention periods remain required before an external beta.

## Incident basics

1. stop writes if data integrity is in doubt;
2. preserve application/audit evidence without copying raw CV content into general logs;
3. take a fresh snapshot before destructive recovery;
4. restore into a separate target and run integrity/application checks;
5. document the incident, impact and corrective action.
