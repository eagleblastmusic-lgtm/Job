CREATE TABLE faro_request_limits (
 bucket_hash TEXT PRIMARY KEY CHECK(length(bucket_hash)=64),
 request_count INTEGER NOT NULL CHECK(request_count>=1),
 expires_at INTEGER NOT NULL CHECK(expires_at>0)
);
CREATE INDEX idx_faro_request_limits_expiry ON faro_request_limits(expires_at);
