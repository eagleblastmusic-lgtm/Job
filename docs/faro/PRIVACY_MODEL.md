# Faro privacy model — implemented boundary and open gates

The authenticated session supplies the subject. Candidate profile, activities, proposals, learning, watches and economics are queried by that subject. Employer process access additionally requires active organization membership and offer assignment. `employerProjection` constructs every nested field explicitly; it excludes CV, surname, photo, age, private phone, raw activities, previous firms and titles. Claims are declarations until verified evidence exists.

Initial projection is snapshotted on interest. Phone is a separate candidate grant for a nonterminal eligible process; acceptance into a stage does not grant it. Revocation and terminal transitions stop subsequent reads. Free-text clarification and preview/submission concurrency still require additional hardening; the complete privacy invariant is not certified by the projection helper alone.

`GET /api/export` now includes `faro` with own profile/activity/proposal/claim history, learning, memberships, interests, events, watch, grants, attempts, economics, own cases and notifications. It does not export other candidates or assessment definition answer keys. Export is not a bulk employer roster endpoint. Existing historical account data remains in the same export.

`DELETE /api/account` requires exact `USUŃ KONTO`, current password and the existing deletion rate limit. Personal tables cascade; shared process inbox/outbox references are removed and linked free-text case content is redacted. Erasure records contain a SHA-256 subject identifier, timestamp and policy version, not the profile itself. A solo-owner organization is restricted and its offers/processes closed; shared organization ownership must first be transferred to an active member with password reauthentication.

The erasure log is a local restore hook, not a durable external deletion journal. Before restoring a pre-erasure backup, operators must reconcile the current erasure ledger. Automated reconciliation and approved backup retention/legal-hold policy are release gates. No arbitrary legal retention period is encoded.

PWA caching is limited to explicit public shell assets; authenticated API responses use no-store. Navigation aborts stale fetches, logout removes private DOM/state, and server authorization is re-evaluated on every request. File/CV upload routes are retired; assessment file execution is not enabled.

LEGAL REVIEW: approved purposes, retention/holds, controller/processor responsibilities, GDPR profiling and DPIA. Local synthetic verification is not legal certification or permission to publish.
