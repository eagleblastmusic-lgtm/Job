# CP11-CC — Durable disposal operator diagnostics

Existing admin worker status now includes durable fileDisposals aggregates: pending, ready, retrying, leased, failed and oldestRequestedAt. Shared SQL is used by SQLite and PostgreSQL, including exact lease-expiry boundaries. No storage key, subject hash, claim token, path, recipient or payload leaves the database. Native read revalidates current admin authority within its owned read transaction; shared route rejects ordinary accounts. No migrations, external notifications, production worker activation or platform mutations.

Local targeted disposal/worker11 PASS; full Node174 PASS; build/lint/typecheck/script syntax/diff PASS. Prior CB full local check173/37 migrations/both restores/38 browser cases PASS; unchanged browser UI contracts do not require repetition. Added native aggregate assertions after actual filesystem failure/retry and HTTP admin-only empty status. Actual PostgreSQL acceptance pending.

This exposes state for operator polling; it does not supply an on-call owner, remote alert channel, production monitoring acceptance or a cleanup SLA. Platform provisioning/deploy needs explicit user approval, physical-file recovery and external custody/legal/human gates remain open. Whole plan/release PARTIAL; continue.
