# CP11-CS — Isolated local PostgreSQL18 acceptance

User requested local isolated PostgreSQL18 first, no production migration or paid resources. No PostgreSQL, Docker or Podman was installed. Downloaded official EDB portable Windows18.6 archive https://sbp.enterprisedb.com/getfile.jsp?fileid=1260609 (official catalogue https://www.enterprisedb.com/download-postgresql-binaries), SHA256 E2246BA91D22345BC3D017586C09EDE52D9DF180B1EEB480F050445F1CAD84E2. Hash identifies this download; not an independently published signature. Unpacked under ignored local tools directory, no Windows service installed.

New scripts/faro-postgres-local.mjs and npm run verify:postgres:local use FARO_LOCAL_PG_BIN only. Require major18, create a fresh OS-temp cluster, random SCRAM password and loopback-only free port, create only its own disposable database. They never use an existing FARO_PG_REHEARSAL_URL or Render/production database. Temporary initdb password file is removed immediately; connection secret passed only through child environment, never printed. Stop server in finally; delete only a verified own temp child after successful stop, otherwise retain the cluster and report failure. Windows pg_ctl uses hidden spawn with ignored inherited output handles, fixing an initial start wait; the initial own stopped cluster was explicitly confined and cleaned before the accepted rerun.

Actual local acceptance2026-10-08: PostgreSQL18.6/Node24.19.0 full native exercise PASS,72 tables/37 migrations, counts/hashes/FKs/checks/consent/rollback, HTTP conflicts and learning removal, auth/MFA/privacy/moderation/worker, encrypted backup/current-authority physical recovery, common-listener cutover/restart and restored HTTP. Existing native desktop/mobile suite28 PASS (3.7m). FARO_LOCAL_POSTGRES18_ACCEPTANCE_PASS, STOPPED and CLEANUP_PASS. No retained test server or cluster; no secrets in tracked files/documentation/logs. Syntax/lint/diff PASS. Earlier runtime code already has full main396a5e9 and1f00366 GitHub acceptance; new delta is local operator harness plus corrected aggregate evidence wording (production cutover not performed).

Use (PowerShell, bin path is non-secret):

```powershell
$env:FARO_LOCAL_PG_BIN='C:/Projekty/Aplikacje/Job/.local-pg18/runtime/pgsql/bin'
npm.cmd run verify:postgres:local
```

Render connection is unnecessary for these tests. Render MCP inventory found no staging PostgreSQL, so no instructions for a nonexistent database secret are asserted. Actual hosted PostgreSQL integration later needs protected write access and reviewed prepared schema; read-only connector SQL cannot perform migrations. No paid database or production deployment authorized. Native/local test PASS is not production persistence/custody/RPO/RTO or external legal/security/manual/user acceptance. Whole plan/release PARTIAL.

Remote FARO acceptance2026-10-08:f375f8a FARO37820553760 SUCCESS, every job including real PostgreSQL18 Node22/24 HTTP/recovery and native browser contracts, default browsers/contracts and container. General CI37820553769 SUCCESS. Actual logs confirm28 native browser cases/version,38 default browser cases and retained contracts/recovery/container PASS. Full technical acceptance is confirmed; no production/external release acceptance inferred.
