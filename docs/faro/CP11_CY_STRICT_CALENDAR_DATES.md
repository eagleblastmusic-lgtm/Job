# CP11-CY — Strict calendar dates

DELTA_REQUIRED: shared Canonical timestamp validation delegated calendar validity to Date.parse, which normalizes dates such as February30 into March. Reject impossible calendar days, non-leap February29, hour24, out-of-range minutes/seconds/offsets and ambiguous timestamp forms before UTC normalization. Support explicit seconds, optional1–3 fractional digits and Z or signed HH:MM offsets; preserve valid cross-day/year conversions. Stored timestamps are unchanged.

The existing validator serves recruitment deadlines, assessments, moderation, interview inputs and economics source dates on both backends. Invalid requests retain400 VALIDATION_ERROR; no write or silent date substitution. Existing interview zone/DST checks remain separate and stricter for appointments. No calendar policy, SLA duration, client, schema or migration change.

Regression covers Gregorian century/leap rules, invalid calendar/clock/offset inputs, valid fraction/offset conversions and actual economics HTTP refusal with retained stored result. Native PostgreSQL economics exercise verifies the same refusals and unchanged scenario. Local build/lint/typecheck/syntax/diff and targeted24 PASS, zero skips. Full local Node188 PASS, zero skips; required exact CI pending. No new/paid resource, hosted configuration or production operation. Whole plan/release PARTIAL; external dependencies unchanged.


CY exact final acceptance2026-10-09:054196a FARO37856922577 and CI37856922591 SUCCESS, every required job. PostgreSQL18 Node22/24 rejects invalid economics dates without overwriting prior state; native/default desktop/mobile browsers, full contracts and container/recovery checks accepted. Local full188 Node/targeted24/build/lint/typecheck/syntax/diff PASS, zero skips. Historical timestamps unchanged; no migration/client/hosted configuration or production operation. Staging remains accepted f08e62f; full plan/release PARTIAL and external dependencies unchanged.
