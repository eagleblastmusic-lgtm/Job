# CP11-CF — Canonical staging smoke

Replace obsolete staging harness calling retired profile/truth/parser/decision/tracker APIs with actual Canonical readiness/legal/free-account/consent/profile-gate/retirement/private-export checks. Default public-read-only mode creates no account. Synthetic mode requires --synthetic-account --operator-confirmed, uses unique private credentials, and deletes its account with actual password before verifying invalid session even after another probe fails. Default synthetic expectation is closed production Faro503; --expect-faro-open is for approved isolated nonproduction only. HTTPS is required except explicitly allowed loopback; embedded credentials/path/query/fragment and redirects refused, requests bounded10s. No response records or credentials logged.

Full Node177/build/lint/typecheck/syntax/diff PASS. Real SQLite listener regression covers read-only no mutation, unconfirmed refusal, open fixture cleanup and closed production boundary cleanup. Native HTTP proof invokes the same CLI on actual PostgreSQL. Corrected fixture origin to actual listening port rather than weakening origin policy. Browser UI unchanged; latest full38 acceptance remains current. No remote smoke/deployment/platform mutation executed. Actual native smoke acceptance pending.

CD6d9fb99 FARO37770052739 and CI37770052754 SUCCESS including actual encrypted3-file backup/one-file restore, erased/obsolete refusal and failed-target cleanup on PostgreSQL18 Node22/24. This is bounded physical recovery acceptance; actual platform custody/storage/RPO/RTO/production cutover and external legal/manual/human decisions remain open. Whole plan/release PARTIAL; continue.


Native acceptance remediation:7cf2f8a and3425147 runs failed before child execution because local recruitment variable process shadowed the Node global. a78eea8 added minimized stage diagnostics;0a8750e renames only the harness variable, preserving all smoke assertions. Local targeted2 PASS also proves forced PROFILE failure still erases the account and reports only neutral step metadata. Actual full0a8750e run37771331348 in progress; Node24 native matrix SUCCESS.


Final actual acceptance:0a8750e FARO37771331348/CI37771331200 SUCCESS, all jobs, including native smoke and26 browsers per PostgreSQL18 Node22/24.
