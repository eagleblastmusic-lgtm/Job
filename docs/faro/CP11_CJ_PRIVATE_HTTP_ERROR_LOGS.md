# CP11-CJ — Minimized unexpected HTTP errors

SQLite shared HTTP unexpected-error handling no longer serializes the exception object/stack into general logs. It emits only FARO_INTERNAL_FAILURE, generated request UUID and fixed INTERNAL_ERROR code. Existing neutral public response/request correlation remains; expected HttpError is unchanged. Native HTTP already refuses raw exception logging. No hosting dependency, migration or API success/UI behavior change.

Extended real account-erasure rollback regression intercepts actual database failure and proves exactly one neutral record with no SQL/error text/path/user/password/stack. Public response remains neutral, account/file/queue rollback preserved and later successful erasure still works. Full Node177/build/lint/typecheck/diff PASS. Current CI post-restore physical verification acceptance pending. Entire plan/release PARTIAL; independent review is not replaced by this self-review.


## CP11-CI/CJ actual acceptance and scope (2026-10-08)

9e0905b FARO37777439659 and CI37777439657 SUCCESS, every job. PostgreSQL18 Node22/24 includes26 native browser cases/version, post-write physical readback/hash verification and real destination-write refusal with owned schema/directory cleanup, source preservation and current-authority no-resurrection. Full Node177/build/lint/typecheck PASS; remote browser/container/restore/migration checks accepted. Prior a54972f FARO37777143315/CI37777143136 SUCCESS. Latest documentation update does not change runtime or invalidate these proofs.

No hosting on Render was requested. Workspace confirmation only authorized inspection; its earlier manifest is optional unused reference. No hosting selected, paid resources created or production deploy performed. Continued local/CI engineering does not require purchasing Render services. Actual deployment acceptance eventually needs an explicitly chosen target and operator-controlled secrets/custody; that dependency is distinct from coding/testing. Full graph/provider/advanced-executor scope and real legal/security/manual/user validation remain unfinished, never inferred from technical PASS. Whole plan/release PARTIAL.
