-- rebuild-with-foreign-key-check
CREATE TABLE faro_attempts_next (
 id TEXT PRIMARY KEY, process_id TEXT NOT NULL REFERENCES faro_interests(id) ON DELETE CASCADE,
 assessment_id TEXT NOT NULL, assessment_version INTEGER NOT NULL,
 state TEXT NOT NULL CHECK(state IN ('INVITED','STARTED','SUBMITTED','SCORED_PENDING_REVIEW','FINALIZED','EXPIRED','TECHNICAL_ISSUE','WITHDRAWN')),
 deadline TEXT NOT NULL, started_at TEXT, expires_at TEXT, answers TEXT NOT NULL DEFAULT '{}', revision INTEGER NOT NULL DEFAULT 1,
 result TEXT, reviewer_id TEXT REFERENCES users(id) ON DELETE SET NULL, reviewed_at TEXT,
 attempt_number INTEGER NOT NULL DEFAULT 1 CHECK(attempt_number>=1),
 retry_of TEXT UNIQUE REFERENCES faro_attempts(id) ON DELETE CASCADE,
 retry_reason TEXT, retry_authorized_at TEXT, retry_authorized_by TEXT REFERENCES users(id) ON DELETE SET NULL,
 FOREIGN KEY(assessment_id,assessment_version) REFERENCES faro_assessments(id,version),
 UNIQUE(process_id,assessment_id,assessment_version,attempt_number),
 CHECK((attempt_number=1 AND retry_of IS NULL AND retry_reason IS NULL AND retry_authorized_at IS NULL) OR
       (attempt_number>1 AND retry_of IS NOT NULL AND retry_reason IS NOT NULL AND retry_authorized_at IS NOT NULL))
);
INSERT INTO faro_attempts_next(id,process_id,assessment_id,assessment_version,state,deadline,started_at,expires_at,answers,revision,result,reviewer_id,reviewed_at)
 SELECT id,process_id,assessment_id,assessment_version,state,deadline,started_at,expires_at,answers,revision,result,reviewer_id,reviewed_at FROM faro_attempts;
DROP TABLE faro_attempts;
ALTER TABLE faro_attempts_next RENAME TO faro_attempts;
CREATE UNIQUE INDEX faro_attempt_root ON faro_attempts(process_id,assessment_id,assessment_version) WHERE retry_of IS NULL;
