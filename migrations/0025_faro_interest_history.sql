ALTER TABLE faro_interests ADD COLUMN previous_interest_id TEXT REFERENCES faro_interests(id) ON DELETE SET NULL;
CREATE INDEX faro_interest_history ON faro_interests(candidate_id,offer_id,created_at);
