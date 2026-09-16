CREATE TABLE faro_assessments (
 id TEXT NOT NULL, version INTEGER NOT NULL, offer_id TEXT NOT NULL REFERENCES faro_offers(id) ON DELETE CASCADE,
 state TEXT NOT NULL CHECK(state IN ('DRAFT','IN_REVIEW','APPROVED')), content TEXT NOT NULL,
 origin TEXT NOT NULL CHECK(origin IN ('HUMAN','AI')), approved_by TEXT REFERENCES users(id) ON DELETE SET NULL,
 approved_at TEXT, created_at TEXT NOT NULL, PRIMARY KEY(id,version)
);
CREATE TABLE faro_attempts (
 id TEXT PRIMARY KEY, process_id TEXT NOT NULL REFERENCES faro_interests(id) ON DELETE CASCADE,
 assessment_id TEXT NOT NULL, assessment_version INTEGER NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('INVITED','STARTED','SUBMITTED','SCORED_PENDING_REVIEW','FINALIZED','EXPIRED','TECHNICAL_ISSUE','WITHDRAWN')),
 deadline TEXT NOT NULL, started_at TEXT, expires_at TEXT, answers TEXT NOT NULL DEFAULT '{}', revision INTEGER NOT NULL DEFAULT 1,
 result TEXT, reviewer_id TEXT REFERENCES users(id) ON DELETE SET NULL, reviewed_at TEXT,
 FOREIGN KEY(assessment_id,assessment_version) REFERENCES faro_assessments(id,version),
 UNIQUE(process_id,assessment_id,assessment_version)
);
CREATE TABLE faro_cases (
 id TEXT PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES faro_organizations(id),
 process_id TEXT REFERENCES faro_interests(id) ON DELETE SET NULL,
 reporter_id TEXT REFERENCES users(id) ON DELETE SET NULL, kind TEXT NOT NULL,
 state TEXT NOT NULL DEFAULT 'OPEN' CHECK(state IN ('OPEN','EVIDENCE_REVIEW','ACTION','NO_ACTION','APPEAL','RESOLVED')),
 statement TEXT NOT NULL, decision TEXT, review_at TEXT, appeal TEXT,
 dedupe_key TEXT UNIQUE, created_at TEXT NOT NULL
);
CREATE TABLE faro_economics (
 candidate_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 offer_id TEXT NOT NULL REFERENCES faro_offers(id) ON DELETE CASCADE,
 offer_version INTEGER NOT NULL, scenario TEXT NOT NULL, result TEXT NOT NULL, updated_at TEXT NOT NULL,
 PRIMARY KEY(candidate_id,offer_id)
);
