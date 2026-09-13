CREATE TABLE IF NOT EXISTS outcome_inbox_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  source TEXT NOT NULL DEFAULT 'MANUAL_TEXT',
  message_excerpt TEXT NOT NULL,
  suggested_outcome TEXT NOT NULL,
  confidence REAL NOT NULL CHECK(confidence >= 0 AND confidence <= 1),
  status TEXT NOT NULL DEFAULT 'PENDING',
  confirmed_outcome TEXT,
  created_at TEXT NOT NULL,
  resolved_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_outcome_inbox_user ON outcome_inbox_items(user_id, status, created_at DESC);
INSERT OR IGNORE INTO feature_flags(key, enabled, rollout_percent, updated_at) VALUES ('outcome_inbox', 0, 0, datetime('now'));
