CREATE TABLE faro_attempt_incidents (
 id TEXT PRIMARY KEY,
 attempt_id TEXT NOT NULL UNIQUE REFERENCES faro_attempts(id) ON DELETE CASCADE,
 reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 category TEXT NOT NULL CHECK(category IN ('ACCESS','CONNECTION','ANSWER_SAVE','OTHER_TECHNICAL')),
 statement TEXT NOT NULL,
 reported_at TEXT NOT NULL,
 observed_state TEXT NOT NULL CHECK(observed_state IN ('INVITED','STARTED','EXPIRED','SCORED_PENDING_REVIEW')),
 observed_revision INTEGER NOT NULL CHECK(observed_revision >= 1),
 original_deadline TEXT NOT NULL, original_started_at TEXT, original_expires_at TEXT,
 state TEXT NOT NULL DEFAULT 'OPEN' CHECK(state IN ('OPEN','RESOLVED')),
 revision INTEGER NOT NULL DEFAULT 1 CHECK(revision IN (1,2)),
 resolution TEXT CHECK(resolution IN ('ISSUE_CONFIRMED','NOT_ESTABLISHED')),
 reason TEXT, resolved_at TEXT, reviewer_id TEXT REFERENCES users(id) ON DELETE SET NULL,
 CHECK((state='OPEN' AND revision=1 AND resolution IS NULL AND reason IS NULL AND resolved_at IS NULL) OR
       (state='RESOLVED' AND revision=2 AND resolution IS NOT NULL AND reason IS NOT NULL AND resolved_at IS NOT NULL))
);
