# CP11-BL — Portable private case report/explanation/review/appeal (2026-10-07)

Shared SQLite/native case plans implement scoped private reports, bilateral own explanations, independent human review and appeals. All revisions, statements, decisions, source restriction metadata, organization intake pause, minimized audits, notifications/events and command journals commit atomically. Native current authority and process membership precede exact replay. Shared review retains explicit explanation window/both-side evidence, neutral no-action after deadline, wrong-subject restriction refusal and separate active restriction history after case resolution.

Fixed SQLite review replay authority: historical moderator affiliation is checked before returning a saved acknowledgment; report/explanation/appeal also recheck current authority inside the journal transaction. Added actual HTTP audit rollback/retry then historical affiliation replay refusal. Extended disposable native proof covers report/explanation/review/appeal audit and notification rollback, private wire boundaries, current historical conflict before replay, manual restriction/pause atomicity, resolved case retaining independent restriction, wrong no-show subject and explicit deadline without automatic sanctions.

BK40f53a2 actual full acceptance PASS: FARO37660164466 and CI37660164532, including PostgreSQL18 Node22/24 restriction writes. Targeted existing moderation/interviews/restrictions tests pending; full local and actual PostgreSQL acceptance pending. Runtime SQLite; economics/HTTP/recovery/cutover and external gates remain open. Whole plan/release PARTIAL; direct main.


CP11-BL full local check PASS168 Node/35 migrations/lint/typecheck/both restores/38 browsers; existing targeted moderation24 PASS, source70/35/syntax/diff PASS. Actual native case-write PostgreSQL acceptance pending. BK40f53a2 FARO37660164466/CI37660164532 SUCCESS. Runtime SQLite; whole plan/release PARTIAL.
