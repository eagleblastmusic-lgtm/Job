-- rebuild-with-foreign-key-check
CREATE TABLE faro_result_history_next (
 attempt_id TEXT NOT NULL REFERENCES faro_attempts(id) ON DELETE CASCADE,
 revision INTEGER NOT NULL CHECK(revision >= 1),
 validity TEXT NOT NULL CHECK(validity IN ('VALID','INVALIDATED')),
 result TEXT NOT NULL,
 reason_code TEXT CHECK(reason_code IN ('KEY_ERROR','AMBIGUOUS_TASK','TECHNICAL_INCIDENT','HUMAN_AMENDMENT')),
 reason TEXT,
 created_at TEXT,
 PRIMARY KEY(attempt_id,revision),
 CHECK((validity='VALID' AND reason_code IS NULL AND reason IS NULL) OR
       (validity='VALID' AND reason_code='HUMAN_AMENDMENT' AND reason IS NOT NULL) OR
       (validity='INVALIDATED' AND reason_code IN ('KEY_ERROR','AMBIGUOUS_TASK','TECHNICAL_INCIDENT') AND reason IS NOT NULL))
);
INSERT INTO faro_result_history_next SELECT * FROM faro_result_history;
DROP TABLE faro_result_history;
ALTER TABLE faro_result_history_next RENAME TO faro_result_history;
