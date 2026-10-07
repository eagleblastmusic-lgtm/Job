CREATE TABLE faro_file_disposals (
 storage_key TEXT PRIMARY KEY,
 subject_hash TEXT NOT NULL,
 requested_at TEXT NOT NULL,
 attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts >= 0),
 next_attempt_at TEXT NOT NULL,
 claim_token TEXT,
 lease_until TEXT,
 error_code TEXT CHECK(error_code IS NULL OR error_code='FILE_DISPOSAL_FAILED')
);
CREATE INDEX idx_faro_file_disposals_due ON faro_file_disposals(next_attempt_at,lease_until);
