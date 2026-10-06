# CP11-U — Shared atomic offer draft creation (2026-10-06)

Existing OfferService.create and real PostgreSQL staging share the parameterized draft write plan. The existing parseOffer remains the single native salary/requirements/conditions validation authority, supplied to the async command without a circular service dependency. Current creator and selected recruiter must both be active own-organization OWNER/ADMIN/RECRUITER inside the transaction. HIRING_MANAGER does not gain publication-authoring rights.

Creation atomically inserts DRAFT offer, version1 immutable content, deduplicated creator/recruiter assignments and minimal audit, then reads the explicit current-offer model. No publication proof/approval is invented. SQLite now keeps authorization and result read in its existing create transaction; PostgreSQL awaits the same checks/writes/read under SERIALIZABLE. No new endpoint, sync bridge or production activation.

Actual PostgreSQL18 Node22/24 requires native content parity, DRAFT/version1/revision1/unapproved state, one assignment when creator=recruiter, absent publication refusal, disallowed creator/recruiter and salary refusal, and full draft rollback after real audit CHECK failure. All prior import/hash/constraint/privacy/organization/membership/connection-loss proofs remain required. Source-only70/35 PASS; full application and actual PostgreSQL acceptance pending.

Runtime remains SQLite. Offer edits/lifecycle and process/assessment/auth/privacy repositories, current-authority target recovery, operator cutover and external gates remain open. Not full CP11/master plan or release DONE.

CP11-U full local npm run check PASS154 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips; source-only70/35 and diff-check PASS. Exact actual PostgreSQL and remote acceptance pending.
