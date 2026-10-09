# CP03-J — Bounded AI transport

K049 technical delta: extend the existing gateway, without introducing an external provider or connecting it to Canonical activity processing. A request has a bounded input and output-token budget, one request without retries/redirects, a deadline covering headers and the complete body, and a 128 KiB response ceiling. Structured output passes the supplied semantic validator. Audit records contain the input hash and controlled error codes; provider bodies, credentials and validator exceptions are never error details.

Actual loopback HTTP regressions cover successful catalog validation/token metadata, stalled body after headers, oversized body, malformed envelope, unknown catalog IDs, sensitive validator exceptions, redirects and rejected token budgets. Targeted4 and full195 Node tests PASS, zero skips; build/lint/typecheck/diff PASS. Exact cd36d99 FARO37932153174 and CI37932153248 SUCCESS, every required job, including PostgreSQL18 Node22/24, browsers and container/recovery verification.

This closes the transport defect, not live-provider acceptance. The working local catalog proposal/manual confirmation fallback remains authoritative. Provider selection, age/privacy terms, protected credentials and approved spending limits are unavailable and remain external dependencies. No paid call, production operation, schema migration or hosted configuration change.

CP03-I exact acceptance: main1d5b8c9 FARO37931093665 and CI37931093716 completed SUCCESS, including PostgreSQL18 Node22/24 and required browser/container/recovery jobs. Existing free staging retains accepted d249839 pending the next accepted deployment.
