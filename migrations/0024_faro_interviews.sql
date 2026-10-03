CREATE TABLE faro_interviews (
 id TEXT PRIMARY KEY,
 process_id TEXT NOT NULL REFERENCES faro_interests(id) ON DELETE CASCADE,
 recruiter_id TEXT REFERENCES users(id) ON DELETE SET NULL,
 state TEXT NOT NULL CHECK(state IN ('PROPOSED','CONFIRMED','COMPLETED','CANCELLED','DISPUTED')),
 revision INTEGER NOT NULL DEFAULT 1,
 starts_at TEXT NOT NULL, ends_at TEXT NOT NULL, confirm_by TEXT NOT NULL,
 timezone TEXT NOT NULL, location TEXT NOT NULL, meeting_url TEXT,
 candidate_completed INTEGER NOT NULL DEFAULT 0 CHECK(candidate_completed IN (0,1)),
 employer_completed INTEGER NOT NULL DEFAULT 0 CHECK(employer_completed IN (0,1)),
 created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX faro_one_active_interview ON faro_interviews(process_id) WHERE state IN ('PROPOSED','CONFIRMED');
CREATE INDEX faro_interview_slots ON faro_interviews(recruiter_id,state,starts_at,ends_at);
