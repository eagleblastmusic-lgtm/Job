# CP11-V — Shared atomic offer version editing (2026-10-06)

Existing OfferService.edit and actual PostgreSQL staging consume the same expected-revision/status/diff check and parameterized edit plan, using existing parseOffer validation. Current own active creator role, offer assignment and selected recruiter role are checked within the transaction. The existing assignment producer consumes an explicit portable query; opaque NOT_FOUND remains unchanged.

Material edits insert a new immutable version, increment current version/revision, clear approved version, return DRAFT, retain prior published version/proof, deduplicate recruiter assignment and write minimal audit atomically. Identical content creates no version or audit; stale revisions and CLOSED/ARCHIVED/REMOVED are refused. PostgreSQL uses SERIALIZABLE without automatic retry; SQLite keeps its existing synchronous command contract.

Actual PostgreSQL18 Node22/24 must prove new version/history/cleared approval, identical no-op, stale/foreign/terminal refusals, real audit failure rollback without orphan version, and edited published offer retaining prior publication as PAUSED/non-intake. Existing all70-table staging/profile/organization/membership/connection-loss proofs remain required. Source-only70/35 PASS; full application and actual PostgreSQL acceptance pending.

CP11-U initial94cbb07 actual PostgreSQL failed because injected audit CHECK validated previously retained OFFER_DRAFT_CREATED rows. Fix61cc962 uses CHECK NOT VALID: it preserves historical rows while still enforcing the exact failure on every new audit insert. The rollback assertion and acceptance criteria are unchanged; no failure hidden or skipped. Same injection rule applies to the new edit regression.

Runtime SQLite; remaining lifecycle/process/assessment/auth/privacy/current-authority/cutover/external gates open. Not full CP11/master plan or release DONE.

CP11-V full local npm run check PASS154 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips; source-only70/35 and diff-check PASS. Exact actual PostgreSQL and remote acceptance pending. CP11-U fix61cc962 actual PostgreSQL18 Node22/24 PASS; full FARO37447143779/CI37447143553 still pending at this observation.
