# CP11-Q — Shared organization membership and affiliation reads (2026-10-06)

Existing FaroStore.member/affiliated and ProfileService.organizations consume the same explicit queries used by actual async PostgreSQL staging. Every current service keeps its existing membership call and exact role allowlist; no new API or changed authorization flow. Own organization ties sort by creation time then ID, without exposing internal staging metadata.

Membership requires the exact active user/organization relationship and allowed role. Missing/foreign/revoked/disallowed membership returns the existing opaque404 NOT_FOUND. HIRING_MANAGER retains default process access but does not gain owner/admin/recruiter publishing rights. Organization list includes only active own memberships. Historical affiliation deliberately includes revoked membership, so revocation cannot clear a moderator conflict of interest.

Actual PostgreSQL18 Node22/24 must prove SQLite wire parity, owner access, foreign/missing/disallowed role refusal, revoked membership absence from list/access, retained historical affiliation, HIRING_MANAGER allowlist separation and reads inside an owned transaction. All previous import/constraint/profile/offer/private-command proofs remain required. Source-only70/35 PASS; full application and exact remote acceptance pending.

Runtime remains SQLite. Organization write commands, auth/remaining repositories, current-authority target recovery, operator cutover and external gates remain open. This bounded portability prerequisite is not full CP11/master plan or release DONE.

CP11-Q full local npm run check PASS153 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips; source-only70/35 and diff-check PASS. Exact actual PostgreSQL and remote acceptance pending.

CP11-Q exact remote acceptance at6728484: [FARO37443951948](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37443951948) and [CI37443951915](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37443951915) SUCCESS. Actual PostgreSQL18 Node22/24 membership/list parity, exact role allowlists, revoked access and retained affiliation proof PASS. Draft71 dependent/unmerged; runtime SQLite, full plan/release PARTIAL.
