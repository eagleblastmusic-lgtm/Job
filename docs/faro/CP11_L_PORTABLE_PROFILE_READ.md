# CP11-L — Shared profile read model (2026-10-06)

The current Canonical ProfileService consumes one explicit five-query profile read model. Its writes and synchronous SQLite transaction contracts remain intact. The same queries and mapping are consumed by the real PostgreSQL staging exercise, including private activities, proposals, learning and live claims. Explicit columns exclude importer metadata. Activity/proposal ties now sort by stable ID after creation time.

PgJobDatabase.readBatch owns a SERIALIZABLE READ ONLY transaction unless already inside an owned transaction. PostgreSQL int8 values become domain numbers only after safe-integer validation; raw query results retain native driver types. No global parser change or synchronous bridge. Actual PostgreSQL evidence must prove both populated and absent profiles equal the current SQLite JSON response, valid-table UPDATE is refused with25006, unsafe bigint is refused with22003, and reads inside an owned transaction do not nest.

Local source-only validation PASS70 tables/35 migrations. Full application and actual PostgreSQL18 Node22/24 acceptance pending. Application runtime still uses SQLite. Production write repositories, target current-authority recovery, cutover/operator acceptance and external gates remain open; this scope is not full CP11 or release DONE.

CP11-L full local npm run check PASS153 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips; source-only70/35 and diff-check PASS. Exact real PostgreSQL and remote checks pending.

CP11-L exact remote acceptance at207adcd: [FARO37440425309](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37440425309) and [CI37440425276](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37440425276) SUCCESS. Actual PostgreSQL18 Node22/24 profile-wire/read-only-batch/safe-integer and preceding staging proof PASS. Draft66 remains dependent/unmerged; runtime SQLite, full plan/release PARTIAL.
