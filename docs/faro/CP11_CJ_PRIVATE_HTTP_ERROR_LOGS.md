# CP11-CJ — Minimized unexpected HTTP errors

SQLite shared HTTP unexpected-error handling no longer serializes the exception object/stack into general logs. It emits only FARO_INTERNAL_FAILURE, generated request UUID and fixed INTERNAL_ERROR code. Existing neutral public response/request correlation remains; expected HttpError is unchanged. Native HTTP already refuses raw exception logging. No hosting dependency, migration or API success/UI behavior change.

Extended real account-erasure rollback regression intercepts actual database failure and proves exactly one neutral record with no SQL/error text/path/user/password/stack. Public response remains neutral, account/file/queue rollback preserved and later successful erasure still works. Full Node177/build/lint/typecheck/diff PASS. Current CI post-restore physical verification acceptance pending. Entire plan/release PARTIAL; independent review is not replaced by this self-review.
