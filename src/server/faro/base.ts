import { randomUUID } from 'node:crypto';
import type { JobDatabase } from '../db.js';
import { HttpError } from '../http.js';
export class FaroStore {
  constructor(readonly database: JobDatabase, readonly clock: () => Date = () => new Date()) {}
  get db() { return this.database.db; }
  now() { return this.clock().toISOString(); }
  transaction<T>(fn: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try { const result = fn(); this.db.exec('COMMIT'); return result; }
    catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }
  member(userId: string, orgId: string, roles = ['OWNER', 'ADMIN', 'RECRUITER', 'HIRING_MANAGER']) {
    const row = this.db.prepare('SELECT role FROM faro_members WHERE user_id=? AND organization_id=? AND active=1').get(userId, orgId) as { role: string } | undefined;
    if (!row || !roles.includes(row.role)) throw new HttpError(404, 'Nie znaleziono zasobu.', 'NOT_FOUND');
    return row;
  }
  audit(actor: string | null, action: string, entityId: string) {
    this.db.prepare('INSERT INTO audit_logs(id,user_id,action,entity_type,entity_id,metadata,created_at) VALUES(?,?,?,?,?,?,?)').run(randomUUID(), actor, action, 'faro', entityId, '{}', this.now());
  }
}
