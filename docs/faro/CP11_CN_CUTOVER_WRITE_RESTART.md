# CP11-CN — Cutover writes and native restart

DELTA_REQUIRED: existing actual SQLite/PostgreSQL cutover proof routed reads through the disposable front listener but wrote directly to the native backend. Extended the same isolated harness, without adding a production proxy or changing runtime architecture. It now forwards bounded request bodies, methods, cookies, Origin and Sec-Fetch-Site and retains safe response content/cache/session headers.

Acceptance requires: original account/profile/process read parity, read-only rollback, foreign-origin and cross-site write rejection, profile write through the common cutover listener, refusal to switch back to stale SQLite after native writes, original source preservation, then native listener restart with a newly connected PostgreSQL client. Existing session/account/profile/process responses must survive restart byte-for-byte at the JSON contract level; stale-source rollback must remain refused. Disposable schema and listeners/connections are cleaned, workers remain off.

Syntax/lint/diff and source-schema validation are local checks; actual PostgreSQL18 Node22/24 evidence is pending. This is a synthetic CI staging rehearsal, not a claim that the free Render service now uses PostgreSQL. Free Render remains SQLite; real target provisioning/preparation and production protected storage/key/authority custody/RPO/RTO are separate open requirements. Whole plan/release PARTIAL.


Actual9aacc1d acceptance2026-10-08: FARO37792729928 and CI37792729850 SUCCESS, all jobs including PostgreSQL18 Node22/24 and native browser matrix. Common-listener writes, both origin rejection contracts, read-only rollback, stale-source refusal and session/data after a fresh native connection/listener restart accepted. This is isolated staging evidence; no public PostgreSQL deployment or production migration claimed.
