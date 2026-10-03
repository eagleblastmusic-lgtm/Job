ALTER TABLE faro_offer_versions ADD COLUMN publication_proof TEXT NOT NULL DEFAULT 'NONE' CHECK(publication_proof IN ('NONE','EXPLICIT','LEGACY_APPROVAL','LEGACY_INTEREST'));
ALTER TABLE faro_offer_versions ADD COLUMN published_at TEXT;
ALTER TABLE faro_offer_versions ADD COLUMN published_by TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE faro_offers ADD COLUMN confirmed_at TEXT;
-- Legacy proofs establish visibility, not an invented original publication date.
UPDATE faro_offer_versions SET publication_proof='LEGACY_APPROVAL' WHERE EXISTS(SELECT 1 FROM faro_offers o WHERE o.id=offer_id AND o.approved_version=version);
UPDATE faro_offer_versions SET publication_proof='LEGACY_INTEREST' WHERE publication_proof='NONE' AND EXISTS(SELECT 1 FROM faro_interests p WHERE p.offer_id=faro_offer_versions.offer_id AND p.offer_version=faro_offer_versions.version);
CREATE INDEX faro_published_versions ON faro_offer_versions(offer_id,publication_proof,version);
