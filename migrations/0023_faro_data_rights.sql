CREATE TABLE faro_erasure_log (
 subject_hash TEXT PRIMARY KEY,
 erased_at TEXT NOT NULL,
 policy_version TEXT NOT NULL
);
