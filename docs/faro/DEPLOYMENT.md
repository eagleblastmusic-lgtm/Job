# Deployment gates

The implementation runs locally on Node with SQLite. The existing repository deployment configuration is not evidence of suitable persistent production storage. PostgreSQL remains a target requiring an actual adapter, migration/cutover rehearsal and backup verification. No public deployment is performed by the current implementation work.

`createFaroApi` intentionally returns 503 `RELEASE_GATES_OPEN` in production. Removing this check is not a substitute for resolving launch gates. Authentication screens may load while Canonical operations remain blocked.

Before public activation: resolve KRAZ/service qualification, GDPR roles/purposes/retention/DPIA, recruitment AI/scoring gates, staffed moderation/appeal policy, durable persistence and recovery, erasure reconciliation, secret/session operations and required browser/regression evidence. Maintain free-first; future organization billing cannot enter matching or offer ordering.

Deployment changes, provider purchases, live data processing and external outreach require their own concrete authorized scope. Local foundations and synthetic tests can progress independently of these gates.
