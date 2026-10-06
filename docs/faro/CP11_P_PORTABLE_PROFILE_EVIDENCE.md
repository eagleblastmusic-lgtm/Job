# CP11-P — Shared private declarations and activity decisions (2026-10-06)

Extends the existing profile write model and producer with parameterized own claim/revocation, learning, activity/local proposals and proposal-decision commands. Existing SQLite commands stay within their established synchronous transaction boundaries; real PostgreSQL staging awaits the same commands inside owned SERIALIZABLE transactions. Practice validation remains shared by structured clarification. Claim history version is computed from retained history in the insert statement; revoked versions are not overwritten or reused.

Activity text is private data. Local rules produce pending questions only, with local-question-rules-v1 provenance; no external AI call or inferred competence. Accepting a proposal requires exact owning pending record and explicit declaration confirmation. User-supplied skillId cannot replace the proposal's pinned skill. Verification stays DECLARED; no certification, global score or pay-to-win. Revocation is scoped to the owning active claim and repeated/foreign requests keep404; closed proposals keep409.

Actual PostgreSQL18 Node22/24 must prove retained claim history/monotonic versions, confirmation refusal without effects, own/foreign/repeated revocation, both learning modes and idempotent upsert, unknown skill refusal, literal private activity text, pending local questions without automatic claims, foreign/unconfirmed/closed proposal refusal and confirmed acceptance with DECLARED verification. All prior import/hash/constraint/consent/scope/profile/offer/write rollback proofs remain required. Full application and actual PostgreSQL acceptance pending.

Runtime remains SQLite. Organization/auth/offer/process/assessment/privacy repositories, current-authority target recovery, operator cutover and external evidence gates remain open. This bounded profile-command portability scope is not full CP11/master plan or release DONE.

Additional actual PostgreSQL regressions require a real claim CHECK failure after revocation to roll back retained live claim and pending proposal, and a client skillId override to leave the proposal pinned skill authoritative.

CP11-P full local npm run check PASS153 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips; final source-only70/35 and diff-check PASS. Exact actual PostgreSQL and remote acceptance pending.
