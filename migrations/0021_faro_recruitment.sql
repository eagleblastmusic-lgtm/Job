CREATE TABLE faro_offers (
 id TEXT PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES faro_organizations(id),
 status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT','IN_REVIEW','PUBLISHED','PAUSED','CLOSED','ARCHIVED','REMOVED')),
 current_version INTEGER NOT NULL DEFAULT 1, revision INTEGER NOT NULL DEFAULT 1,
 approved_version INTEGER, confirmed_until TEXT, created_at TEXT NOT NULL
);
CREATE TABLE faro_offer_versions (
 offer_id TEXT NOT NULL REFERENCES faro_offers(id) ON DELETE CASCADE, version INTEGER NOT NULL,
 content TEXT NOT NULL, author_id TEXT REFERENCES users(id) ON DELETE SET NULL, created_at TEXT NOT NULL,
 PRIMARY KEY(offer_id,version)
);
CREATE TABLE faro_assignments (
 offer_id TEXT NOT NULL REFERENCES faro_offers(id) ON DELETE CASCADE,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, PRIMARY KEY(offer_id,user_id)
);
CREATE TABLE faro_interests (
 id TEXT PRIMARY KEY, candidate_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 offer_id TEXT NOT NULL, offer_version INTEGER NOT NULL,
 snapshot TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('INTERESTED','ACTIVE','OFFERED','HIRED','REJECTED','WITHDRAWN','CANCELLED')),
 stage TEXT NOT NULL CHECK(stage IN ('AWAITING_EMPLOYER','CLARIFICATION_REQUESTED','ACCEPTED_TO_NEXT_STAGE','ASSESSMENT_REQUESTED','ASSESSMENT_COMPLETED','INTERVIEW_PROPOSED','INTERVIEW_CONFIRMED','INTERVIEW_COMPLETED','OFFERED','TERMINAL')),
 revision INTEGER NOT NULL DEFAULT 1, response_due_at TEXT NOT NULL, first_response_at TEXT, stage_due_at TEXT,
 next_action TEXT, reason TEXT, created_at TEXT NOT NULL,
 FOREIGN KEY(offer_id,offer_version) REFERENCES faro_offer_versions(offer_id,version)
);
CREATE UNIQUE INDEX faro_one_active_interest ON faro_interests(candidate_id,offer_id) WHERE status IN ('INTERESTED','ACTIVE','OFFERED');
CREATE INDEX faro_process_offer ON faro_interests(offer_id,created_at);
CREATE TABLE faro_events (
 id TEXT PRIMARY KEY, process_id TEXT NOT NULL REFERENCES faro_interests(id) ON DELETE CASCADE,
 actor_id TEXT REFERENCES users(id) ON DELETE SET NULL, kind TEXT NOT NULL, data TEXT NOT NULL,
 occurred_at TEXT NOT NULL
);
CREATE TABLE faro_watches (
 candidate_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 offer_id TEXT NOT NULL REFERENCES faro_offers(id) ON DELETE CASCADE,
 alerts INTEGER NOT NULL DEFAULT 1 CHECK(alerts IN(0,1)), created_at TEXT NOT NULL,
 PRIMARY KEY(candidate_id,offer_id)
);
CREATE TABLE faro_contact_grants (
 process_id TEXT PRIMARY KEY REFERENCES faro_interests(id) ON DELETE CASCADE,
 candidate_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 organization_id TEXT NOT NULL REFERENCES faro_organizations(id), granted_at TEXT NOT NULL, revoked_at TEXT
);
CREATE TABLE faro_commands (
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, command_key TEXT NOT NULL,
 input_hash TEXT NOT NULL, result TEXT NOT NULL, created_at TEXT NOT NULL,
 PRIMARY KEY(user_id,command_key)
);
CREATE TABLE faro_outbox (
 id TEXT PRIMARY KEY, recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 entity_type TEXT NOT NULL, entity_id TEXT NOT NULL, message TEXT NOT NULL,
 dedupe_key TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','DELIVERED','DEAD_LETTER')),
 attempts INTEGER NOT NULL DEFAULT 0, next_attempt_at TEXT NOT NULL, error_code TEXT,
 UNIQUE(recipient_id,dedupe_key)
);
CREATE INDEX faro_outbox_due ON faro_outbox(status,next_attempt_at);
