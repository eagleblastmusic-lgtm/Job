# CP11-BO — Native PostgreSQL browser acceptance (2026-10-07)

Existing candidate/employer process and own-data/privacy browser scenarios can run against the actual PostgreSQL HTTP adapter with `FARO_PG_BROWSER=1`. Disposable fixtures prepare an empty reviewed schema and then use PostgreSQL only for application persistence. Both desktop/mobile and Node22/24 are included in the existing PostgreSQL workflow. Source SQLite is schema preparation only, never a facade for tested requests.

Local reused scenarios PASS4 desktop/mobile; typecheck, lint, syntax and diff PASS. Actual PostgreSQL browser acceptance pending. BN actual HTTP acceptance pending remediation; 5095dee fixes missing production pg dependency in the container and adds safe HTTP failure diagnostics. Remaining file disposal/recovery/cutover/production and external gates open; whole plan/release PARTIAL.
