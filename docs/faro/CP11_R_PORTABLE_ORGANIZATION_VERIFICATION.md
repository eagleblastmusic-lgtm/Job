# CP11-R — Shared organization creation and independent verification (2026-10-06)

Existing ProfileService.organization/verify and real PostgreSQL staging consume one parameterized create/verify plan. Creation atomically writes PENDING organization, initial OWNER and minimal audit. Verification reads current platform ADMIN, organization state and historical affiliation within the existing transaction; it requires an independent moderator, bounded private note and a separate moderation resolution for RESTRICTED organizations. Both SQLite and PostgreSQL retain their existing respective transaction boundaries; no new endpoint or public rollout.

The synthetic PostgreSQL exercise locally provisions temporary platform roles only in its isolated target and restores them. These fixture decisions are not real organization qualification, KRAZ/legal/service acceptance or evidence for external gates.

Actual PostgreSQL18 Node22/24 must prove owner creation, rollback of the organization after missing-owner FK failure, non-admin/missing-org/short-note refusal, active and revoked affiliation conflicts, RESTRICTED refusal, rollback of verification update after a real audit CHECK failure and successful independent verification with one minimal audit. All prior import/hash/constraint/private-profile/offer/RBAC proofs remain required. Source-only70/35 PASS; full application and actual PostgreSQL acceptance pending.

Runtime remains SQLite. Invites/membership/auth/remaining repositories, current-authority target recovery, operator cutover and external gates remain open. This bounded command-portability prerequisite is not full CP11/master plan or release DONE.

CP11-R full local npm run check PASS153 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips; source-only70/35 and diff-check PASS. Exact actual PostgreSQL and remote acceptance pending.

CP11-R exact remote acceptance at3e76704: [FARO37444776127](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37444776127) and [CI37444776137](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37444776137) SUCCESS. Actual PostgreSQL18 Node22/24 create/FK rollback, independent moderator/historical conflict/restriction and audit rollback proof PASS. Draft72 dependent/unmerged; runtime SQLite, full plan/release PARTIAL.
