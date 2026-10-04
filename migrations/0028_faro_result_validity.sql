CREATE TABLE faro_result_history (
 attempt_id TEXT NOT NULL REFERENCES faro_attempts(id) ON DELETE CASCADE,
 revision INTEGER NOT NULL CHECK(revision >= 1),
 validity TEXT NOT NULL CHECK(validity IN ('VALID','INVALIDATED')),
 result TEXT NOT NULL,
 reason_code TEXT CHECK(reason_code IN ('KEY_ERROR','AMBIGUOUS_TASK','TECHNICAL_INCIDENT')),
 reason TEXT,
 created_at TEXT,
 PRIMARY KEY(attempt_id,revision),
 CHECK((validity='VALID' AND reason_code IS NULL AND reason IS NULL) OR (validity='INVALIDATED' AND reason_code IS NOT NULL AND reason IS NOT NULL))
);
INSERT INTO faro_result_history(attempt_id,revision,validity,result,created_at)
 SELECT id,1,'VALID',result,reviewed_at FROM faro_attempts WHERE state='FINALIZED' AND result IS NOT NULL;
