# CP11-AE — Shared private process lists (2026-10-07)

The existing SQLite list consumes the same explicit scoped query as PostgreSQL staging. Candidate scope includes only own processes; employer offer scope requires current active membership and assignment before reading any rows, including an empty offer. Target list and all accepted native views share one SERIALIZABLE READ ONLY snapshot. No nested transaction, private mutable profile lookup, contact-data expansion or import-order metadata is added to the response.

Created-at direction remains candidate descending/employer ascending. Timestamp ties previously had no explicit SQL order; this change defines insertion order using SQLite rowid or reviewed target source-order identity, independent of randomized opaque process IDs. Frozen projections, historic linked processes, clocks, clarification and employment terms, public source/current employer conditions, per-event chronology and private ANSWER redaction retain the previously accepted mapping.

Actual PostgreSQL18 Node22/24 must prove wire parity with the real SQLite candidate/employer list, empty own candidate list for an employer, refusal of candidate access to employer scope, two native historical processes with equal created_at in insertion order, preserved frozen projection and owning candidate history after employer membership revocation, and current-member refusal. Previous158 Node/35 migrations/both restore/38 browser and70-table constraint/hash/privacy/current-authority evidence remains required.

Full local and actual PostgreSQL acceptance pending. Runtime SQLite, whole CP11/master plan/release PARTIAL. Remaining watch/contact/assessment/interview/auth/privacy/worker/target recovery/operator cutover, independent draft review and external gates remain open. Locked login, CV/EHV and release boundaries remain unchanged.

CP11-AE local full npm run check PASS158 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips. Source-only70/35, script syntax and diff-check PASS. Exact actual PostgreSQL and remote acceptance pending.
