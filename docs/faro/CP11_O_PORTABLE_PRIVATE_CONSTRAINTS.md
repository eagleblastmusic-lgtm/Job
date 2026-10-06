# CP11-O — Shared private working-condition constraints (2026-10-06)

Extends the existing shared profile write model with the current private constraints command. SQLite Canonical saveConstraints and actual PostgreSQL staging consume the same validation and parameterized update, preserving active/night/weekend choices, work models/contracts, native salary basis/period/hours/FTE, commute range and exact profile revision. Async execution awaits its read/check/update/read within an owned SERIALIZABLE transaction. No new public endpoint or production runtime activation.

Omitted salaryMinimum/maxCommuteMinutes preserve the existing private values; only explicit null clears them. Invalid salary or commute does not write. Missing profile and stale revision keep existing PROFILE_REQUIRED/VERSION_CONFLICT. Updates preserve phone/claims/learning and remain absent from employer projection/public ranking.

Actual PostgreSQL18 Node22/24 must prove private salary/commute save, revision increment, preservation for older callers, explicit null removal, stale/invalid/missing-profile refusals and unchanged data after refusals. Earlier source-readonly/count/hash/import/consent/transaction/profile/offer/write rollback proofs remain required. Local source-only70 tables/35 migrations PASS; full application and exact remote acceptance pending.

Runtime remains SQLite. Remaining commands/repositories, current-authority PostgreSQL recovery, operator cutover and external acceptance are open. This scope does not complete full CP11/master plan or release.

CP11-O full local npm run check PASS153 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips; source-only70/35 and diff-check PASS. Exact actual PostgreSQL and remote acceptance pending.

CP11-N final CI37441865183 SUCCESS atfd9ee0e supersedes the previous pending note; FARO37441865147 also SUCCESS. CP11-O exact acceptance at7526d41: [FARO37442510890](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37442510890) and [CI37442510741](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37442510741) SUCCESS, including PostgreSQL18 Node22/24 private constraints save/preserve/remove/refusal proof. Draft68/69 dependent/unmerged; runtime SQLite, full plan/release PARTIAL.
