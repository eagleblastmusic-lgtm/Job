CREATE TABLE faro_mfa (
 user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 active_cipher TEXT, pending_cipher TEXT, pending_until TEXT,
 last_counter INTEGER NOT NULL DEFAULT -1 CHECK(last_counter>=-1),
 activated_at TEXT,
 CHECK((active_cipher IS NULL AND activated_at IS NULL) OR (active_cipher IS NOT NULL AND activated_at IS NOT NULL)),
 CHECK((pending_cipher IS NULL AND pending_until IS NULL) OR (pending_cipher IS NOT NULL AND pending_until IS NOT NULL))
);
CREATE TABLE faro_mfa_recovery (
 user_id TEXT NOT NULL REFERENCES faro_mfa(user_id) ON DELETE CASCADE,
 code_hash TEXT NOT NULL, used_at TEXT,
 PRIMARY KEY(user_id,code_hash)
);
CREATE TABLE faro_mfa_sessions (
 token_hash TEXT PRIMARY KEY REFERENCES sessions(token_hash) ON DELETE CASCADE,
 verified_until TEXT NOT NULL
);
CREATE TABLE faro_mfa_limits (
 user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
 failures INTEGER NOT NULL DEFAULT 0 CHECK(failures>=0),
 window_start TEXT NOT NULL
);
