ALTER TABLE faro_outbox ADD COLUMN claim_token TEXT;
ALTER TABLE faro_outbox ADD COLUMN lease_until TEXT CHECK((lease_until IS NULL)=(claim_token IS NULL));
ALTER TABLE faro_outbox ADD COLUMN max_attempts INTEGER NOT NULL DEFAULT 5 CHECK(max_attempts >= 1);
CREATE INDEX faro_outbox_lease_due ON faro_outbox(status,lease_until,next_attempt_at);
