# CP11-CI — Post-restore physical verification

Existing private-file restore now reopens the actual destination files through the reviewed bounded reader and verifies complete descriptors, sizes and SHA256 after exclusive synced writes. Success includes verifiedFiles, alongside restoredFiles; a mismatch refuses success and the existing CLI cleanup removes only newly owned schema/directory. No routing or hosting configuration involved.

Local standalone crypto/file3/lint/script syntax/diff PASS. Actual native proof now checks verifiedFiles=1 and, on Linux CI, applies a real non-writable destination directory after exclusive creation; restore must fail and remove both the newly imported schema and files target while preserving source. No production flag or error-injection hook added to runtime. Actual acceptance pending. Latest d2071a7 FARO37771876387/CI37771876392 SUCCESS (full runtime/native26 browsers Node22/24); unchanged application UI/TS/schema proofs remain applicable.

Hosting is unspecified by the user. Render inspection permission did not authorize provider selection; its earlier review draft is optional unused reference, not a global blocker. No paid resources or deploy executed. Entire plan/release PARTIAL; real secrets/custody/deployment environment and external validation/owners remain necessary to certify production.


## CP11-CI/CJ actual acceptance and scope (2026-10-08)

9e0905b FARO37777439659 and CI37777439657 SUCCESS, every job. PostgreSQL18 Node22/24 includes26 native browser cases/version, post-write physical readback/hash verification and real destination-write refusal with owned schema/directory cleanup, source preservation and current-authority no-resurrection. Full Node177/build/lint/typecheck PASS; remote browser/container/restore/migration checks accepted. Prior a54972f FARO37777143315/CI37777143136 SUCCESS. Latest documentation update does not change runtime or invalidate these proofs.

No hosting on Render was requested. Workspace confirmation only authorized inspection; its earlier manifest is optional unused reference. No hosting selected, paid resources created or production deploy performed. Continued local/CI engineering does not require purchasing Render services. Actual deployment acceptance eventually needs an explicitly chosen target and operator-controlled secrets/custody; that dependency is distinct from coding/testing. Full graph/provider/advanced-executor scope and real legal/security/manual/user validation remain unfinished, never inferred from technical PASS. Whole plan/release PARTIAL.
