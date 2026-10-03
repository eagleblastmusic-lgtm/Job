ALTER TABLE faro_cases ADD COLUMN revision INTEGER NOT NULL DEFAULT 1;
ALTER TABLE faro_cases ADD COLUMN explanation_due_at TEXT;
ALTER TABLE faro_cases ADD COLUMN public_reason TEXT;
ALTER TABLE faro_cases ADD COLUMN appeal_by TEXT REFERENCES users(id) ON DELETE SET NULL;
CREATE TABLE faro_case_explanations (
 id TEXT PRIMARY KEY,
 case_id TEXT NOT NULL REFERENCES faro_cases(id) ON DELETE CASCADE,
 user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 participant TEXT NOT NULL CHECK(participant IN ('CANDIDATE','EMPLOYER')),
 statement TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX faro_case_explanation_scope ON faro_case_explanations(case_id,user_id);
