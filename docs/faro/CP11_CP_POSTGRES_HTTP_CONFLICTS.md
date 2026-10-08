# CP11-CP — PostgreSQL HTTP transaction conflicts

DELTA_REQUIRED: native SERIALIZABLE transactions deliberately reject concurrent conflicts; the HTTP entrypoint previously converted40001 serialization failure and40P01 deadlock to generic500. Translate only those two PostgreSQL conditions to409 VERSION_CONFLICT with a safe refresh instruction. Preserve existing HttpError and unexpected500 contracts. Do not automatically retry mutations or relax transaction isolation/authority checks.

Existing real native HTTP proof injects each condition through a PostgreSQL trigger during profile update. Require409, no private database detail in response, unchanged profile/version and audit, and exactly one trigger execution measured by a nontransactional sequence. Drop each synthetic trigger/function/sequence after its proof. Later successful endpoint operations continue on the same connection, verifying rollback leaves it usable.

Local build/lint/typecheck/syntax/diff PASS. Actual PostgreSQL18 Node22/24 and broader required CI acceptance pending. No Render deployment/configuration change; admin connector/RENDER_API_KEY and staging PostgreSQL connection are currently absent, user asked to restore protected access without pasting secrets. Free staging remains SQLite, production gates closed; whole plan/release PARTIAL.

Actual acceptance2026-10-08:1f50fdb FARO37796476554 and CI37796476655 SUCCESS, all required jobs including PostgreSQL18 Node22/24 native HTTP conflict rollback, browser and recovery/container acceptance. Supersedes pending native acceptance above.
