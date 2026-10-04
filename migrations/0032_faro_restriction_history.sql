CREATE TABLE faro_restrictions (
 id TEXT PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES faro_organizations(id) ON DELETE CASCADE,
 source_case_id TEXT UNIQUE REFERENCES faro_cases(id) ON DELETE SET NULL,
 source_reporter_id TEXT REFERENCES users(id) ON DELETE SET NULL,
 source_candidate_id TEXT REFERENCES users(id) ON DELETE SET NULL,
 scope TEXT NOT NULL DEFAULT 'NEW_INTAKE' CHECK(scope='NEW_INTAKE'),
 state TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(state IN ('ACTIVE','RESTORED')),
 reason_code TEXT NOT NULL, restoration_condition TEXT, created_at TEXT, review_at TEXT,
 revision INTEGER NOT NULL DEFAULT 1 CHECK(revision>=1),
 appeal TEXT, appealed_at TEXT, appeal_by TEXT REFERENCES users(id) ON DELETE SET NULL,
 restoration_reason TEXT, restored_at TEXT, restored_by TEXT REFERENCES users(id) ON DELETE SET NULL,
 CHECK((state='ACTIVE' AND restoration_reason IS NULL AND restored_at IS NULL) OR
       (state='RESTORED' AND restoration_reason IS NOT NULL AND restored_at IS NOT NULL))
);
INSERT INTO faro_restrictions(id,organization_id,reason_code)
 SELECT 'legacy:'||id,id,'LEGACY_RESTRICTION_REVIEW_REQUIRED' FROM faro_organizations WHERE verification='RESTRICTED';
CREATE INDEX faro_restrictions_active ON faro_restrictions(organization_id,state);
