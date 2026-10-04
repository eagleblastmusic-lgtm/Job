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
# Structured clarification

Process command `CLARIFY` requires `question:{topic:REQUIREMENT,requirementId}` referencing the original offer or `question:{topic:AVAILABILITY}`, plus future dueAt. The server builds the question; arbitrary acknowledgment text cannot close Clock A. `ANSWER` requires conscious confirmation and a typed response: `DECLARE_SKILL` with level/source/practice, `NOT_YET`, `WANTS_TO_LEARN`, or an allowlisted availability declaration. Extra candidate free-text/identity/verification fields are ignored. A response does not mutate profile claims or the initial snapshot; its skill verification is DECLARED. Clock B returns to the employer with the original offer's decision interval. Process DTO exposes server-derived `availableCommands` and structured clarification. Legacy ANSWER free text is redacted at API projection, including nextAction.
# Repeated interest

Offer detail exposes only the authenticated user's latest `ownInterest:{id,status}`. A new interest after a terminal process requires `previousInterestId` equal to the latest own process for that offer and `renewalConfirmed:true`, in addition to a fresh projection/offer confirmation. Missing or stale links reject with 409 `RENEWAL_CONFIRMATION_REQUIRED`. The new immutable relationship stores `previous_interest_id`; old clocks/events/cases are retained. An active prior interest still blocks another submission. Process DTO includes `previousInterestId`; employer cannot read another tenant's linked history.
# Private case explanations and independent review

Case DTO includes revision, explicit explanation deadline, own statements/explanations and a structured public decision reason. Independent moderators receive private evidence, with audited reads; a moderator involved in the process/organization receives the ordinary projection and cannot review the case. Other process reports stay private. Appointment disputes are visible to both authorized parties.

POST `/cases/:id/explanations`, `/cases/:id/appeal` and `/cases/:id/review` require `expectedVersion` and `idempotencyKey`. Explanations are immutable private records. Review enters EVIDENCE_REVIEW with an explicit future `explanationDueAt` for appointment disputes. ACTION/NO_ACTION require both sides' explanations or elapsed deadline; elapsed time alone does not execute a decision. Public `decisionCode` is required for final decisions; free-form moderator notes remain private. Company restriction cannot be used for a case targeting candidate absence. Candidate function restrictions remain behind external policy/legal gates. Private report creation also requires an idempotency key. Audit and notifications are written in the same command transaction and contain no private statements.
# Offer publication boundary

Immutable versions record explicit publication proof and first publication date. Candidate detail/watch/process comparison uses the latest published version; current unapproved drafts remain in assigned organization scope. A pending edit pauses intake without exposing its content to watchers/applicants. Material diff becomes candidate-visible only after publication. Intake additionally requires an active assigned responsible recruiter. Legacy approved versions and versions referenced by existing interests get conservative visibility proof with unknown original publication dates; unproven legacy drafts remain private and require deliberate review/publication.

# Worker operations

ADMIN-only GET `/worker/status` returns running/stopped state, interval, run count, last run/success, opaque failure code and aggregate outbox status counts. POST `/worker/tick` executes the same cycle and returns 503 WORKER_TICK_FAILED on failure. Development scheduling runs without any client polling; it is stopped before app database closure and always disabled in production while release gates remain open.

# Assessment obligation integrity

Assignment POST `/processes/:id/assessment` requires `expectedVersion` of the process and `idempotencyKey`. Exact replay returns the same attempt; a stale process revision or previously attempted definition version is a conflict. All assignment effects are transactional. The worker expires INVITED/STARTED attempts from persisted deadline/expiry, retains saved answers and emits a single audited neutral event. It resumes the employer next-step deadline using the original offer decisionHours; expiry alone does not score or reject. Submission also retains an employer review deadline. Candidate Start/save/submit enforce expiry even between worker cycles.

# Assessment definition configuration

GET `/assessments/:id/versions/:version` returns the scoped employer definition including answer key; candidates/outsiders receive 404. PUT requires `{expectedVersion,idempotencyKey,data}` and creates the next immutable DRAFT from the latest version. Existing AI origin is retained and client approval fields are ignored. Edit replay returns the same version; stale edit gets VERSION_CONFLICT. Earlier versions remain available to existing attempts, but new assignment/approval must target the latest version and complete fresh human review. The editor supports 1–50 objective quiz tasks and the review screen exposes the complete rubric/key/limits.

# Private watch alert preferences

PUT `/offers/:id/watch` accepts only boolean `alerts` for the current authenticated user's saved watch (404 if absent). GET `/watches` includes that user's `watchAlerts`; organization roles do not gain watcher access. Muting/unwatching removes pending optional offer alerts but preserves updates attached to an interest. The local worker sends a deduplicated upcoming-close alert to enabled watches within 24 hours of the last published deadline. Delivered notices remain in own history; no email/SMS delivery is added.

# Private condition constraints

PUT `/profile/constraints` accepts `{expectedVersion,constraints:{active,workModels,contracts,noNights,noWeekends}}`; booleans and enums are validated, unlisted fields are discarded and current profile revision is required. Empty model/contract sets impose no boundary. Candidate offer list respects active constraints server-side without automatic relaxation: selected unknown conditions do not enter the known-matching list. Own detail explains SATISFIED/KNOWN_NOT_MET/UNKNOWN; watches and process history remain accessible. Organization list is unaffected and initial employer projection excludes preferences.

# Economics units and selected variant

New manual calculations are `manual-scenario-v2`, recording units `{money:PLN_MINOR,netPeriod:<salary period>,commuteCostPeriod:<salary period>,commuteTime:ROUND_TRIP_MINUTES_PER_WORK_DAY}` and salary option index. All input amounts are integer grosze; private net and commute cost use the selected salary period. Optional assertions netPeriod/commuteCostPeriod/commuteTimeBasis reject conflicting units with ECONOMICS_UNIT_MISMATCH. Historical v1 JSON is preserved. Comparison uses stored scenario salary bounds/basis/period rather than the first current offer variant and flags changed offer versions. No automatic tax or cross-basis conversion is performed.

CP11-B adds no public endpoint. RecoveryService and restore-faro.mjs operate only on an isolated new database; public account deletion retains the owner-transfer guard and cannot enable the internal recovery override.

CP06-H: GET /processes/:id/phone-preview is candidate-only, requires ACTIVE/OFFERED and a saved private number, returns phone and a consistency confirmationToken. POST /processes/:id/phone-grant requires phoneConfirmed=true and the current process/number-bound token; absent confirmation 400, stale token 409, wrong actor 404. It rechecks inside the transaction. DELETE still revokes without a token. All Canonical responses remain no-store; the token is not an authorization credential.

CP11-C: malformed raw request URLs are caught at the Canonical runtime boundary and return 400 INVALID_URL with no-store/security headers. Subsequent health/auth requests remain available; internal parse exceptions are not returned.

CP07-C: POST organization verify runs authorization/state/update/audit transactionally. Own or formerly affiliated moderators get 409 VERIFICATION_CONFLICT; RESTRICTED organizations get 409 RESTRICTION_REVIEW_REQUIRED. Case review rejects historical affiliation with MODERATION_CONFLICT. Role ADMIN alone never overrides these guards.

CP10-D: attempt overview adds processVersion. POST /attempts/:id/review requires expectedVersion (attempt), processVersion, idempotencyKey, confirmed=true and review note. Authorization precedes replay lookup and is rechecked inside the command transaction. Stale attempt/process409; terminal process409; duplicate identical key returns original result with no duplicate audit/event; changed payload under key409. Candidate and unassigned admin remain404.

CP07-D: GET /organizations/:id/reliability is active OWNER/ADMIN scoped; candidates/foreign organization/recruiter get404. Optional from/to are ISO timestamps with zone, both required together; absent both uses server-defined last30 calendar days. Half-open submission cohort, historical window up to366 days, asOf from server. More than10000 retained processes rejects broad window rather than truncating. Response is aggregate only with version/window/sample/denominator/exclusions/censoring/median/progression; no candidate/process IDs, names, contact or score. Read creates no case/restriction/ranking effect.
