import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

export class JobDatabase {
  readonly db: DatabaseSync;

  constructor(path: string) {
    mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000;');
    this.migrate();
  }

  private migrate(): void {
    this.db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (datetime('now')));`);
    const version = '0001_init';
    const applied = this.db.prepare('SELECT version FROM schema_migrations WHERE version = ?').get(version);
    if (!applied) {
      const sql = readFileSync(resolve(process.cwd(), 'migrations/0001_init.sql'), 'utf8');
      this.db.exec('BEGIN IMMEDIATE;');
      try {
        this.db.exec(sql);
        this.db.prepare('INSERT OR IGNORE INTO schema_migrations(version) VALUES (?)').run(version);
        this.db.exec('COMMIT;');
      } catch (error) {
        this.db.exec('ROLLBACK;');
        throw error;
      }
    }
  }

  close(): void {
    this.db.close();
  }
}
