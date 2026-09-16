CREATE TABLE faro_organizations (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, verification TEXT NOT NULL DEFAULT 'PENDING' CHECK(verification IN ('PENDING','VERIFIED','RESTRICTED')),
 verified_at TEXT, verification_note TEXT, created_at TEXT NOT NULL
);
CREATE TABLE faro_members (
 organization_id TEXT NOT NULL REFERENCES faro_organizations(id) ON DELETE CASCADE,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 role TEXT NOT NULL CHECK(role IN ('OWNER','ADMIN','RECRUITER','HIRING_MANAGER')),
 active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)), PRIMARY KEY(organization_id,user_id)
);
CREATE TABLE faro_profiles (
 user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 first_name TEXT NOT NULL, availability TEXT NOT NULL DEFAULT '{}', preferences TEXT NOT NULL DEFAULT '{}', phone TEXT,
 version INTEGER NOT NULL DEFAULT 1 CHECK(version>0), updated_at TEXT NOT NULL
);
CREATE TABLE faro_activities (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 description TEXT NOT NULL, source TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE TABLE faro_proposals (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 activity_id TEXT NOT NULL REFERENCES faro_activities(id) ON DELETE CASCADE,
 skill_id TEXT NOT NULL, rationale TEXT NOT NULL, model_version TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','ACCEPTED','REJECTED')),
 created_at TEXT NOT NULL, decided_at TEXT, UNIQUE(activity_id,skill_id)
);
CREATE TABLE faro_claims (
 id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 skill_id TEXT NOT NULL, level TEXT NOT NULL CHECK(level IN ('BASICS','INDEPENDENT','FLUENT')),
 source TEXT NOT NULL CHECK(source IN ('WORK','SELF_LEARNING','HOBBY','SCHOOL','VOLUNTEERING')),
 practice TEXT NOT NULL, verification TEXT NOT NULL DEFAULT 'DECLARED' CHECK(verification IN ('DECLARED','REVIEWED_EVIDENCE','FARO_ASSESSMENT')),
 version INTEGER NOT NULL CHECK(version>0), confirmed_at TEXT NOT NULL, revoked_at TEXT,
 UNIQUE(user_id,skill_id,version)
);
CREATE INDEX faro_claims_owner ON faro_claims(user_id,revoked_at);
CREATE TABLE faro_learning (
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, skill_id TEXT NOT NULL,
 mode TEXT NOT NULL CHECK(mode IN ('SELF_DEVELOPING','WANTS_TO_LEARN')), practice TEXT NOT NULL,
 PRIMARY KEY(user_id,skill_id,mode)
);
CREATE TABLE faro_invites (
 token_hash TEXT PRIMARY KEY, organization_id TEXT NOT NULL REFERENCES faro_organizations(id) ON DELETE CASCADE,
 role TEXT NOT NULL CHECK(role IN ('ADMIN','RECRUITER','HIRING_MANAGER')), email TEXT NOT NULL,
 expires_at TEXT NOT NULL, accepted_at TEXT, created_by TEXT REFERENCES users(id) ON DELETE SET NULL
);
