# CP11-X — Shared offer listing and private conditions (2026-10-06)

Existing OfferService.list and private conditions use shared explicit query/condition plans consumed by actual PostgreSQL staging. The existing explainConditions/sortOffers functions remain authoritative. Public results require current intake-approved, verified, unexpired publication with existing proof; pending drafts and older publications cannot enter public intake. Own organization lists require current active membership and retain current draft visibility.

Default listing refuses UNKNOWN conditions; explicit includeUnknown admits only UNKNOWN/SATISFIED and never KNOWN_NOT_MET. Private constraints and native commute estimates remain candidate scoped, tied to current offer version, documented units/source/date and explicit assumptions. No net salary conversion or ranking/person score is introduced. Fixed newest-created/id ordering remains unchanged. PostgreSQL reads all inputs in one owned SERIALIZABLE READ ONLY snapshot.

Real PostgreSQL18 Node22/24 must prove exact public and organization wire parity, foreign organization refusal, known work-model failure despite unknown opt-in, missing commute default refusal/explicit opt-in, comparable current estimate acceptance and stale-version refusal. Synthetic temporary preference/economics rows are restored before remaining retained proofs. Existing70-table hashes/counts/constraints/rollback and all prior commands remain required.

Full local application and actual PostgreSQL acceptance pending. Runtime SQLite; remaining detail/process/assessment/auth/privacy repositories, production cutover and external acceptance gates remain open. Not whole plan/release DONE.

CP11-X full local npm run check PASS154 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips; source-only70/35 and diff-check PASS. Exact actual PostgreSQL and remote acceptance pending.

CP11-X0e9c483 exact acceptance: [FARO37449170085](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37449170085) and [CI37449170043](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37449170043) SUCCESS. Actual PostgreSQL18 Node22/24 public/organization list wire parity, foreign-org refusal, known-failure exclusion and private commute current/stale/unknown proof PASS. Draft78 dependent/unmerged; runtime SQLite, full plan/release PARTIAL.
