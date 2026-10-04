CREATE TABLE faro_key_corrections (
 id TEXT PRIMARY KEY,
 assessment_id TEXT NOT NULL,
 assessment_version INTEGER NOT NULL,
 revision INTEGER NOT NULL CHECK(revision >= 1),
 accepted_options TEXT NOT NULL,
 reason TEXT NOT NULL,
 created_at TEXT NOT NULL,
 actor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
 UNIQUE(assessment_id,assessment_version,revision),
 FOREIGN KEY(assessment_id,assessment_version) REFERENCES faro_assessments(id,version) ON DELETE CASCADE
);
