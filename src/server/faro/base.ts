import { membershipReadQuery,membershipFromRows,affiliationReadQuery } from './organizationReadModel.js';
import { randomUUID } from 'node:crypto';
import type { JobDatabase } from '../db.js';
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
    const query=membershipReadQuery(userId,orgId);
    return membershipFromRows(this.db.prepare(query.text).all({$1:userId,$2:orgId}),roles);
  }
  affiliated(userId:string,orgId:string) {
    // Revocation removes access, not historical conflicts of interest.
    const query=affiliationReadQuery(userId,orgId);
    return Boolean(this.db.prepare(query.text).get({$1:userId,$2:orgId}));
  }

  audit(actor: string | null, action: string, entityId: string) {
    this.db.prepare('INSERT INTO audit_logs(id,user_id,action,entity_type,entity_id,metadata,created_at) VALUES(?,?,?,?,?,?,?)').run(randomUUID(), actor, action, 'faro', entityId, '{}', this.now());
  }
}
