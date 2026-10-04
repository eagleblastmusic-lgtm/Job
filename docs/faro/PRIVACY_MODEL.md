# Faro privacy model — implemented boundary and open gates

The authenticated session supplies the subject. Candidate profile, activities, proposals, learning, watches and economics are queried by that subject. Employer process access additionally requires active organization membership and offer assignment. `employerProjection` constructs every nested field explicitly; it excludes CV, surname, photo, age, private phone, raw activities, previous firms and titles. Claims are declarations until verified evidence exists.

Initial projection is snapshotted on interest. Phone is a separate candidate grant for a nonterminal eligible process; acceptance into a stage does not grant it. Revocation and terminal transitions stop subsequent reads. Free-text clarification and preview/submission concurrency still require additional hardening; the complete privacy invariant is not certified by the projection helper alone.

`GET /api/export` now includes `faro` with own profile/activity/proposal/claim history, learning, memberships, interests, events, watch, grants, attempts, economics, own cases and notifications. It does not export other candidates or assessment definition answer keys. Export is not a bulk employer roster endpoint. Existing historical account data remains in the same export.

`DELETE /api/account` requires exact `USUŃ KONTO`, current password and the existing deletion rate limit. Personal tables cascade; shared process inbox/outbox references are removed and linked free-text case content is redacted. Erasure records contain a SHA-256 subject identifier, timestamp and policy version, not the profile itself. A solo-owner organization is restricted and its offers/processes closed; shared organization ownership must first be transferred to an active member with password reauthentication.

The erasure log is a local restore hook, not a durable external deletion journal. Before restoring a pre-erasure backup, operators must reconcile the current erasure ledger. Offline DB-only reconciliation is now implemented; independently durable authority/erasure storage and approved backup retention/legal-hold policy remain release gates. No arbitrary legal retention period is encoded.

PWA caching is limited to explicit public shell assets; authenticated API responses use no-store. Navigation aborts stale fetches, logout removes private DOM/state, and server authorization is re-evaluated on every request. File/CV upload routes are retired; assessment file execution is not enabled.

LEGAL REVIEW: approved purposes, retention/holds, controller/processor responsibilities, GDPR profiling and DPIA. Local synthetic verification is not legal certification or permission to publish.
# Clarification boundary

Candidate process responses use enums, catalog skill identifiers, bounded practice and validated availability. Raw identity/CV/employer-history text has no response field in the current contract. Historical raw ANSWER action and nextAction are suppressed in process API presentation. Own export may still contain the candidate's historical raw answer; it is not organization export. Response declarations remain separate from confirmed profile history and from verified evidence.
# Moderation conflict and evidence

Private case explanations and appeal text are visible to their author and an independent authorized moderator. The other party receives case state and a structured public reason. Global ADMIN does not override this projection for cases in which that user is a party or organization member. Own export excludes the other party's explanation/appeal and raw moderator notes. Export includes relevant candidate case metadata; erasure redacts linked free-form evidence before relation deletion. Production retention/legal-hold and access review remain external gates.

Watch alert flags and upcoming-close delivery are private to the candidate. No employer count/list is exposed. The optional watch preference does not suppress updates associated with an existing interest. Muting removes pending optional watch alerts; already delivered own notification history remains exportable.

Candidate work-condition constraints are private profile preferences, not evidence of ability or an employer eligibility score. They filter the candidate's offer list only; initial employer projection never contains them. Unknown structured offer conditions remain unknown. The user may explicitly deactivate the boundaries and still access saved offers/processes outside the filtered list.

CP11-B recovery is offline and has no HTTP route or public erasure override. The internal authority snapshot includes password hashes and must never be logged/exported. Restored consent does not disclose a phone or enable optional analytics; current credentials and roles supersede historical values. A missing surviving account authority fails closed.

CP06-H: profile phone changes atomically revoke all active contact grants. Unchanged phone edits preserve exact-number consent; removal revokes it. A candidate sees and explicitly confirms the actual number for one process before granting; old/cross-process preview tokens cannot disclose another number. No phone or preview token is written to audit metadata. A revoked employer may already remember previously viewed data; access revocation prevents future API reads.
