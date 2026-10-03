# Canonical API

All `/api/faro/*` routes require a session and mutation origin validation. Domain writes are rate limited; request JSON is bounded. Production use is blocked by unresolved release gates. IDs in request bodies never replace authenticated ownership or organization assignment.

| Resource | Routes and commands |
|---|---|
| Profile | GET/PUT `/profile`; GET `/profile/preview`; POST `/claims`, `/learning`, `/activities`; DELETE `/claims/:id`; POST `/proposals/:id` |
| Organizations | GET/POST `/organizations`; POST `/:id/verify`, `/:id/invites`, `/:id/owner`; GET `/:id/members`; DELETE `/:id/members/:user`; POST `/invites/accept` |
| Offers | GET `/offers`; GET/PUT `/offers/:id`; POST `/organizations/:id/offers`; POST `/offers/:id/lifecycle` |
| Recruitment | POST `/offers/:id/interest`; GET `/processes`, `/processes/:id`; POST `/processes/:id/commands` |
| Watch/contact | GET `/watches`; POST/DELETE `/offers/:id/watch`; POST/DELETE `/processes/:id/phone-grant`; GET `/processes/:id/phone` |
| Assessment | GET/POST `/offers/:id/assessments`; POST `/assessments/:id/versions/:version`; GET/POST `/processes/:id/assessment`; GET `/attempts`; GET/POST `/attempts/:id`; PUT `/:id/answers`; POST `/:id/submit`, `/:id/review` |
| Economics | GET/PUT `/offers/:id/economics` (own scenario only) |
| Moderation/inbox | GET `/notifications`, `/cases`; POST `/processes/:id/reports`, `/cases/:id/review`, `/cases/:id/appeal`; admin POST `/worker/tick` |
| Existing identity/data rights | `/api/auth/*`, `/api/me`, `/api/consents`, `/api/consents/analytics`, GET `/api/export`, DELETE `/api/account` |

Offer and process mutations require `expectedVersion` where supported; process commands additionally require `idempotencyKey`. 409 means refresh/review changed data, not silently resubmit a decision. Ownership transfer requires current password and an active successor. Account deletion also requires the exact confirmation phrase. Errors return `{error:{code,message}}`; an incorrect reauthentication password does not destroy the session.

Assessment definition editing, appointment endpoints and additional lifecycle commands remain future deltas; do not infer callable endpoints from schema states.
# Preview confirmation contract

GET `/api/faro/profile/preview-confirmation` returns `{projection, confirmationToken}` for the authenticated candidate. POST `/api/faro/offers/:id/interest` requires this token alongside `projectionConfirmed`, offer version and idempotency key. Within the same transaction the service compares the current allowlisted projection and freezes that exact object. Missing/stale tokens return 409 `PROFILE_CHANGED` without process/event/outbox writes. The token is a consistency digest, not an authorization credential. Existing GET `/profile/preview` retains its projection-only contract.
# Interview commands

GET/POST `/api/faro/processes/:id/interviews` lists scoped slots / proposes a slot. Proposal requires active assigned recruiter, ACTIVE process in an eligible stage, `expectedVersion`, `idempotencyKey`, `confirmed`, absolute `startsAt`, `endsAt`, `confirmBy`, IANA `timezone`, `location` and optional HTTPS `meetingUrl`. Candidate confirmation reserves both participants atomically. POST `/api/faro/interviews/:id` accepts `CONFIRM`, `CANCEL`, `COMPLETE`, `DISPUTE`, with interview `expectedVersion`, `processVersion`, idempotency key, confirmation and typed reason where required. Completion requires both parties after the slot ends. GET `/api/faro/interviews/:id/calendar` returns scoped `{filename,content}` ICS only for confirmed slots. No attendee/contact identity is included.
