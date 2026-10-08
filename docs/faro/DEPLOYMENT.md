# Deployment gates

Current scope (2026-10-08): the user-authorized free Render staging runs the accepted PostgreSQL18 adapter at https://faro-free-staging.onrender.com, deployed main6577cfb in Bartosz's workspace. CW records actual configuration/startup/schema retention; CX records account/session/changed-consent persistence across an observed hosted restart and test-account cleanup. Default local configuration remains SQLite. Actual isolated PostgreSQL migration/cutover/backup/recovery and browser acceptance are recorded in the checkpoint register. Production persistence, independent custody and measured production RPO/RTO still require their own acceptance; free staging does not close them. The dated sections below preserve earlier evidence and limitations.

`createFaroApi` intentionally returns 503 `RELEASE_GATES_OPEN` in production. Removing this check is not a substitute for resolving launch gates. Authentication screens may load while Canonical operations remain blocked.

The periodic worker is enabled in development and disabled in production independently of the API gate. Its SQLite timer is a single-process local implementation, not a leased distributed worker. Production scheduling, monitored dead-letter handling and persistence/recovery must be reviewed before activation. ADMIN diagnostics expose aggregate status only.

Before public activation: resolve KRAZ/service qualification, GDPR roles/purposes/retention/DPIA, recruitment AI/scoring gates, staffed moderation/appeal policy, durable persistence and recovery, erasure reconciliation, secret/session operations and required browser/regression evidence. Maintain free-first; future organization billing cannot enter matching or offer ordering.

Deployment changes, provider purchases, live data processing and external outreach require their own concrete authorized scope. Local foundations and synthetic tests can progress independently of these gates.

CP11-B proves local DB-only recovery against an older snapshot and a current authority source. It does not prove catastrophe recovery when both sources are lost, uploaded-file safety, PostgreSQL cutover or production restart/redeploy durability. Activation remains review-required and production API/worker gates stay closed.

CP11-D adds separate Canonical CI without replacing or making the original historical CI optional. Branch protection is not modified. Current evidence is local Node24 only; CI Node22/24 and Docker results require actual remote verification. Production API and scheduler activation gates remain closed.

CP11-E adds isolated image acceptance to faro.yml: build existing Dockerfile (npm test inside build), start ephemeral local production container, synthetic free-first signup and secure session, retired routes410, Canonical503 release gate. No live deployment. Docker unavailable locally; await actual Ubuntu result before certifying image.

CP11-E image acceptance completed on Ubuntu run37189804326 at9889288: image builds/tests and isolated production boundary passes. No deployment performed. CP10-F additive migration0028 needs backup/validation; keep correction history through rollback and recovery, do not drop table after invalidations. Production gates remain closed.

CP06-I supersedes the initial worker limitation above: SQLite outbox claims/leases/tokens, crash expiry fencing and controlled dead-letter retry are persisted and tested with actual worker processes. Production PostgreSQL/distributed scheduling remains gated. Exact Node22/24 and real Docker workflow acceptance is in the current checkpoint register; early CP11-D/E pending notes are historical observations.

CP02-H adds mandatory production staff MFA and optional enrolled-user MFA, five-minute session step-up, encrypted secrets, one-use recovery and current-authority restore. Provision FARO_MFA_ENCRYPTION_KEY outside the database using protected operator storage; wrong/missing key fails closed. Preserve the correct key with independently recoverable authority, validate rotation/rescue and independent security review before activation. Do not erase MFA or reset consumed counters/codes to bypass a key problem. Synthetic fixture keys are not deployment secrets. See CP02_H_PROTECTED_MFA.md; recruitment503/production worker gates stay closed.
