# Deployment gates

The implementation runs locally on Node with SQLite. The existing repository deployment configuration is not evidence of suitable persistent production storage. PostgreSQL remains a target requiring an actual adapter, migration/cutover rehearsal and backup verification. No public deployment is performed by the current implementation work.

`createFaroApi` intentionally returns 503 `RELEASE_GATES_OPEN` in production. Removing this check is not a substitute for resolving launch gates. Authentication screens may load while Canonical operations remain blocked.

The periodic worker is enabled in development and disabled in production independently of the API gate. Its SQLite timer is a single-process local implementation, not a leased distributed worker. Production scheduling, monitored dead-letter handling and persistence/recovery must be reviewed before activation. ADMIN diagnostics expose aggregate status only.

Before public activation: resolve KRAZ/service qualification, GDPR roles/purposes/retention/DPIA, recruitment AI/scoring gates, staffed moderation/appeal policy, durable persistence and recovery, erasure reconciliation, secret/session operations and required browser/regression evidence. Maintain free-first; future organization billing cannot enter matching or offer ordering.

Deployment changes, provider purchases, live data processing and external outreach require their own concrete authorized scope. Local foundations and synthetic tests can progress independently of these gates.

CP11-B proves local DB-only recovery against an older snapshot and a current authority source. It does not prove catastrophe recovery when both sources are lost, uploaded-file safety, PostgreSQL cutover or production restart/redeploy durability. Activation remains review-required and production API/worker gates stay closed.

CP11-D adds separate Canonical CI without replacing or making the original historical CI optional. Branch protection is not modified. Current evidence is local Node24 only; CI Node22/24 and Docker results require actual remote verification. Production API and scheduler activation gates remain closed.

CP11-E adds isolated image acceptance to faro.yml: build existing Dockerfile (npm test inside build), start ephemeral local production container, synthetic free-first signup and secure session, retired routes410, Canonical503 release gate. No live deployment. Docker unavailable locally; await actual Ubuntu result before certifying image.
