# CP11-CE — Private disposal parent-directory confinement

Actual unlink now validates each parent directory up to the configured data root, refusing symlink/non-directory redirection before touching a retained file. Missing directories/files remain idempotent success. This extends the existing lexical storage-key confinement; it does not claim to fence a privileged operator racing filesystem replacements. Queue errors remain neutral and retain durable retry.

Full Node175/build/lint/typecheck PASS. Actual filesystem regression preserves an external sentinel behind a redirected upload parent. Native disposal proof adds the same sentinel protection with persisted retry. Existing physical recovery standalone3/full local174/38 browsers accepted; native acceptance pending. No migration/platform mutation/production activation. Whole plan/release PARTIAL; continue.
