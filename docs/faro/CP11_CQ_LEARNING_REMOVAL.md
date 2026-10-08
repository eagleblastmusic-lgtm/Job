# CP11-CQ — Candidate learning removal

DELTA_REQUIRED: candidates could add SELF_DEVELOPING/WANTS_TO_LEARN directions but could not withdraw them. Add an owned DELETE /api/faro/learning contract and accessible profile buttons to both sections, using the existing SQLite/native PostgreSQL services and shared write model.

Require known skill/mode, explicit confirmation and the displayed expectedPractice. A changed quantity/unit returns409 VERSION_CONFLICT. Authenticated ownership ignores any supplied userId. Delete and minimized LEARNING_REMOVED audit are one transaction; an absent owned entry is idempotent without duplicate audit. The other mode and other candidates remain intact. This compares practice values, not a new row version: it does not claim detection of an intervening edit restored to identical values.

Real SQLite HTTP regression covers authentication, confirmation, ownership, stale data, audit failure rollback, idempotency, profile preview and own export. Existing candidate browser journey exercises add/remove on desktop/mobile; the same journey runs in native PostgreSQL CI. Actual native HTTP proof separately injects an audit constraint failure and requires rollback, ownership and stale-value protection.

Local/full and remote acceptance recorded below after verification. No migration, provider selection, Render resource creation or production deployment. Default runtime remains SQLite. Whole plan/release PARTIAL.

Local acceptance2026-10-08: npm run check PASS — lint/typecheck/37 migrations,180 Node tests, both backup/restore exercises and38 browser cases, including learning add/remove desktop/mobile. Native source72 tables/37 migrations and script syntax/diff PASS. Actual PostgreSQL18 Node22/24 acceptance pending GitHub Actions.
