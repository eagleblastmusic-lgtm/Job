# CP11-M — Shared current and published offer reads (2026-10-06)

Existing OfferService now consumes explicit current-offer, last-proven-publication and intake queries/mapping. The PostgreSQL exercise consumes the same model within an owned SERIALIZABLE READ ONLY snapshot. Write commands, candidate detail ownership, organization authorization and private conditions remain in their existing service boundaries. No new public endpoint or automatic production cutover.

The read model keeps draft version content separate from the most recent proven published version. Intake still requires current PUBLISHED status, exact approved version, verified organization, active assigned recruiter of an eligible role, current-version publication proof, unexpired confirmation and closing time. A newer unpublished draft yields the previous publication as PAUSED. Missing offer and missing publication keep distinct existing404 codes. Explicit columns omit staging importer metadata.

Actual PostgreSQL18 Node22/24 acceptance requires current/published JSON parity with existing SQLite for a live offer and a newer unpublished draft, missing publication/offer, expired intake, revoked membership, missing approval and removed publication proof. Previous70-table hashes/constraints/rollback/consent/transaction/recovery proof remains required. Local source-only70/35 PASS; full application and exact remote acceptance pending.

Runtime remains SQLite. Async writes, target current-authority recovery and rehearsed operator cutover are outstanding. This bounded portability step is not full CP11/master-plan or release DONE.

CP11-M full local npm run check PASS153 Node/35 migrations/both actual restores/38 desktop/mobile browser executions/lint/typecheck, zero skips; source-only70/35 and diff-check PASS. Actual PostgreSQL and exact remote acceptance pending.

CP11-M exact remote acceptance at9beab73: [FARO37441227370](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37441227370) and [CI37441227307](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37441227307) SUCCESS. Actual PostgreSQL18 Node22/24 published/current wire parity, unpublished draft isolation and intake proof regressions PASS. Draft67 remains dependent/unmerged; runtime SQLite, whole plan/release PARTIAL.
