# FARO CANONICAL IMPLEMENTATION MASTER PLAN

Version 1.2 — 2026-09-17. **PLAN COMPLETE; implementation in progress.** Initial version 1.0 (before production edits) is preserved in commit 8b2524a.

Execution update: backend deliveries through ea50b36 cover parts of CP01–CP07 and CP09–CP10. CP08 now connects candidate/employer workspace to actual APIs; desktop/mobile browser tests exercise profile, watch, interest, economics and employer progression. Complete acceptance still requires the remaining lifecycle, data rights and operational work. Production activation stays blocked. The user has explicitly resumed the full plan; the earlier nearest-commit stopping boundary no longer applies. See [checkpoint register](08_CHECKPOINT_REGISTER.md) and [implementation status](IMPLEMENTATION_STATUS.md).

Authority: user request → Canonical 2026-09-16 approved product decisions/contracts → actual fetched main evidence. Documents in the ZIP are product material; their historical execution instructions do not independently authorize outreach, production deployment or legal approval. ZIP is preserved unmodified under `source/FARO-CANONICAL/`. First version of this plan must be committed before production edits. Later changes must retain this commit as the comparison point.

## 1. Delivery contract and boundaries

Build on the modular TypeScript/Node monolith and DOM/PWA. Keep login layout, styling and image; sole visible exception approved by founder: “Załóż bezpłatne konto” registration CTA. Build an original authenticated dark workspace, candidate and employer end-to-end native process, domain/services/API protections, persistence, tests and operational documentation. Do not change the dirty parent checkout.

No CV recruitment, employer history/title signals, photo, age, surname or initial phone; no global person score, EHV, Life/Potential Score, revenge reviews, candidate subscription, ranking boost, auto-hire or auto-reject. Nationwide availability; empty inventory is shown truthfully, never fabricated listings. All sample data confined to tests/development and labelled accordingly.

Audit coverage: 71 decisions, 86 tasks, 16 invariants and 72 legacy mappings. `02_CANONICAL_GAP_MATRIX.md` maps every approved item to status, code evidence and checkpoint. `planning-coverage.json` is the machine-readable index. **UNMAPPED = 0 is coverage, not DONE.** Each delivery starts with ALREADY_CLOSED / DELTA_REQUIRED / SPEC_BLOCKED classification.

## 2. Target architecture

One HTTP runtime plus an idempotent worker, one relational database, private file storage. Layers: pure domain policies → authorized transactional services → validated HTTP commands → view-specific DTOs → DOM workspace. Shared identity and security primitives remain. Canonical API `/api/faro/*` is a versioned namespace; legacy imported opportunities never masquerade as native offers.

Module ownership:

| Module | Owns | Dependencies / forbidden dependencies |
|---|---|---|
| Identity/Organizations | memberships, invitations, verification, assignments | session identity; never trust org/role asserted by body |
| Candidate/Skills | profile, activities, proposals, claims, learning, evidence | curated concepts/ESCO mappings; no implicit company/title-to-skill facts |
| Offers | offers, immutable versions, approval, intake | organizations, salary and requirement policy |
| Matching | deterministic requirement explanations and explicit constraints | confirmed claims and versioned offer only; no billing, identity, trust score or AI opinion |
| Recruitment | relation, stage, snapshot, original deadlines, events, grants | authorized organization/process, projection, offer version |
| Assessment | approved definitions, attempts, answers, review/result | assignment scope, server clock; no hire/reject authority |
| Trust/Moderation | signals, cases, evidence and appeals | events and declared policy; no global candidate reputation |
| Economics | private scenarios and versioned calculation provenance | salary option, supported rule adapter; never employer projection |
| Notifications | outbox and inbox delivery | event IDs, recipient and safe template; no sensitive push payload |
| Billing | future organization tool entitlements only | no dependency into matching/order/access/caches |

Integrate canonical dispatch into the existing authenticated security path, not an unprotected side listener. Centralize new domain errors and rate limits. Production activation defaults closed while gate evidence is absent; local/test construction remains possible. A gate is not closed merely by an environment variable saying approved.

## 3. Target domain and database

Reuse `users`, `sessions`, `consents`, `audit_logs`, `notifications`, `analytics_events`. Add prefixed canonical tables through numbered additive migrations. Keep private legacy rows, avoid converting imported CV assertions into claims. New rows use explicit FK/cascade policy, enum CHECK constraints, indexes for actor/org/offer and unique constraints for retries.

| Entity | Minimum persisted contract |
|---|---|
| Organization | id/name/verification state/evidence date; no verified default on creation |
| Membership | organizationId/userId/OWNER,ADMIN,RECRUITER,HIRING_MANAGER/active; immediate revoke |
| Assignment | offerId/memberUserId; owners do not automatically read every candidate |
| Invitation | hashed token, org, role, expiry, acceptedAt, invitedBy; no plaintext storage |
| CandidateProfile | userId, explicit firstName, availability enum/value/reference date, private contact/preferences, version |
| SkillConcept | stable local key, optional verified canonical URI, taxonomyVersion, Polish label/aliases/licenseRef |
| ActivityStatement | candidateId/private text/source/practice; employer-facing structured task concepts separately |
| SkillProposal | candidateId/activityId/skillId/rationale/model+prompt+schema/version/PENDING,ACCEPTED,REJECTED |
| SkillClaim | candidateId/skillId/level BASICS,INDEPENDENT,FLUENT/source/practice/evidence/verification/confirmedAt/version; user confirmation is DECLARED |
| LearningIntent | candidateId/skillId/SELF_DEVELOPING,WANTS_TO_LEARN/practice |
| Offer | org, assigned recruiter, currentVersionId, lifecycle, revision, active-confirmation due; immutable identity |
| OfferVersion | offer/version, approved actor, complete typed content, createdAt; canonical JSON plus relational FK/version checks |
| Interest | candidateId/offerId/offerVersionId, projection snapshot, relation enum, stage, revision, responseDueAt, firstResponseAt, stageDueAt, next actor |
| RecruitmentEvent | process/version/actor/type/reason/time; audit without raw identity |
| ContactGrant | candidate/process/org/field/grantedAt/revokedAt; read checks both stage and active grant |
| Watch | candidateId/offerId/preference; private composite uniqueness, no organization reader |
| Outbox | event/recipient/template/payload references/dedupe/status/attempts/nextAttemptAt/errorCode; transaction with state |
| Assessment | definition/version/tasks/skills/type/limit/expectedDuration/rubric/scoring/approval; assignments fixed to approved version |
| Attempt | candidate/process/definitionVersion, INVITED/STARTED/SUBMITTED/SCORED_PENDING_REVIEW/FINALIZED/EXPIRED/TECHNICAL_ISSUE/WITHDRAWN, server times, answer revision |
| TrustCase | scoped subject/type/status/reviewer/reason/reviewAt/appeal, evidence IDs; signal is not verdict |
| EconomicsScenario | candidate/offerVersion/input amounts+units/source+date/rulesVersion; private, missing values nullable |

Immutable offer versions and submission projection snapshots are separate from latest profile; retention/deletion can remove private snapshots via an explicit privacy operation without rewriting ordinary history. Raw user biography, arbitrary filenames, portfolio URLs and AI rationale never bypass controlled evidence projection.

### Migration and rollback strategy

020 foundation (org/profile/skills); 021 offers/recruitment/watch/events/grants/outbox; 022 assessment/economics/moderation. Exact filenames may be combined only where a transactional dependency requires it; document executed migration IDs per checkpoint. Apply runner on empty DB and upgrade fixture; check FK and integrity, restart/readback and backup/restore. No destructive down migration: roll back code/disable canonical dispatch, retain new tables, restore verified backup only under explicit rollback procedure.

Production PostgreSQL is CP11: select maintained driver, introduce minimal transaction adapter replacing `DatabaseSync` at repository boundary, preserve parameterization; translate JSON/check/UTC semantics; offline extract → staging import → counts/FKs/hash comparison → rehearsed cutover; maintain rollback copy read-only. Do not label SQLite reference SQL a completed PostgreSQL migration. Public multi-instance launch blocked until rehearsal and persistence are approved.

## 4. Candidate and employer flows

Candidate: unchanged login → possibilities with real empty state → profile four sections → add task/practice or learning intent → optionally request proposals → individually accept/reject → inspect offer conditions and explanation → private watch OR preview exact company projection → confirm interest with selected offer version → timeline and response/stage clocks → reply/withdraw/optional contact grant → compare changed version → close process without reputation penalty.

Employer: account → organization pending verification → approved verification with scope/date → member assignment → offer draft responsibilities/requirements/teaching/conditions/salary/process → review immutable version → publish → recruitment queue by time → selected process projection → clarification/advance/reject with exact requirement → assessment/confirmed interview if applicable → human offer/decision; no CV upload/request field, no watcher identities.

First projection contains processId, firstName, confirmed skills with source/level/structured practice/verification, reviewed task evidence, learning intents, appropriate availability, explicitly shared results. Construct every nested object using an allowlist. Never serialize `UserRecord`, raw activity, private tax/contact/preferences or legacy experiences. Preview and actual employer response must call the same projection function; snapshot used at submission. Later surname disclosure remains SPEC_BLOCKED; do not infer consent from stage. Phone endpoint checks active grant and nonterminal eligible stage each time; revoke blocks future reads.

## 5. Native offer and explainable matching

Required for publish: role, responsibilities; MUST_HAVE/NICE_TO_HAVE/WILL_TEACH requirements with stable id/skill/level/why; salary options; contract; place/work model and remote days; hours, nights/shifts/weekends; learning support; first response policy; stages/interview count/assessment duration; decision-time policy; closing date; assigned responsible recruiter; approved current revision and verified org.

Amounts are integers in minor units. Contract and amountBasis are separate: GROSS_EMPLOYMENT/GROSS_CIVIL/B2B_NET_INVOICE_EXCL_VAT; employer-declared net is additional, not replacement. Currency/period/min/max/variable/FTE/hours explicit. Salary min <= max; no hidden salary; invalid or incomparable basis is rejected or marked unknown, not coerced.

Lifecycle reconciles user minimum with Canonical review: DRAFT → IN_REVIEW → PUBLISHED ↔ PAUSED → CLOSED → ARCHIVED. REJECTED_BY_MODERATION/REMOVED are review outcomes with history. Edit material fields → new immutable version; approval invalidated; existing submission baseline never advances silently. Candidate diff compares field values against `interest.offerVersionId`, including requirements/process/dates and money. Nonmaterial timestamps never simulate a revision. Read/update use expectedVersion and transactions.

Matching produces requirement rows SATISFIED/NOT_DEMONSTRATED/KNOWN_NOT_MET/NOT_APPLICABLE; learning alone does not satisfy MUST, WILL_TEACH never blocks. Three descriptive levels have task anchors. Explicit salary/work model/shift constraints are evaluated separately with unknown preserved. Offer ordering MVP is disclosed chronology or explicit user sort; no percentage hero. “Dlaczego widzę tę ofertę?” and “Droga do tej pracy” show matching inputs and gaps. Billing cannot enter inputs, cache key, tie-break, featured flag or candidate access.

## 6. Recruitment state machine and two clocks

Separate `InterestStatus`, `CurrentStage`, `AssessmentAttempt`, `Interview`, `ModerationCase`. No unrestricted status PATCH. Every command carries authenticated actor, authorized process, expectedVersion, idempotencyKey; transaction performs validation → state → event → audit → outbox. Duplicate key with different payload fails; stale version 409; terminal commands cannot resurrect relation.

| Event / target | Actor / allowed prior state | Required data | Side effects / notification / SLA / audit |
|---|---|---|---|
| INTERESTED, stage AWAITING_EMPLOYER | candidate, no active relation | selected live offerVersion, projection confirmation | snapshot; original responseDueAt; receipt; INTEREST_CREATED |
| CLARIFICATION_REQUESTED | assigned recruiter, active relation | substantive requirement question, reply due | firstResponseAt once; separate stage due; safe inbox; CLARIFICATION_REQUESTED |
| CLARIFICATION_ANSWERED | owning candidate, awaiting answer | structured answer | stage AWAITING_EMPLOYER; no reset of original clock; ANSWER_RECEIVED |
| ACCEPTED_TO_NEXT_STAGE | assigned recruiter, active relation | named next stage/action, due | firstResponseAt once; set stageDueAt; never grant phone; STAGE_ADVANCED |
| ASSESSMENT_REQUESTED | assigned recruiter, accepted process | approved version, assignment deadline | attempt INVITED; next action; ASSESSMENT_ASSIGNED |
| ASSESSMENT_STARTED | owning candidate, invited before deadline | explicit Start | server start/expiry; no reliability effect; ATTEMPT_STARTED |
| ASSESSMENT_COMPLETED | owning candidate/server expiry under policy | stored answers, revision | review pending, no hire/reject; ATTEMPT_SUBMITTED |
| INTERVIEW_PROPOSED | assigned recruiter or candidate in active accepted process | UTC slot, IANA zone, duration, safe meeting details | proposal plus confirmation due; INTERVIEW_PROPOSED |
| INTERVIEW_CONFIRMED | other participant | expected slot revision | atomic availability reservation; two-party reminder; INTERVIEW_CONFIRMED |
| INTERVIEW_COMPLETED | participants, confirmed appointment | confirmation/dispute source | decisionDueAt; human next action; INTERVIEW_COMPLETED |
| OFFERED | assigned recruiter, active accepted process | concrete versioned terms, response due | candidate action, no fake countdown; EMPLOYMENT_OFFERED |
| HIRED | candidate confirms offer / human confirmed outcome | outcome source and confirmation | terminal, cancel jobs; HIRED_CONFIRMED; employer-only report is unconfirmed |
| REJECTED | assigned recruiter, active | reason enum; matching original requirement for comparative reason | terminal, close tasks, candidate reason; REJECTED; not positive progress |
| WITHDRAWN | owning candidate, active | explicit action | terminal, cancel reminders/slots/grants; WITHDRAWN; no penalty |
| CANCELLED | assigned recruiter/moderator | cancellation reason | terminal, notify; not skill deficit; CANCELLED |
| NO_SHOW_CASE | either participant after confirmed slot | evidence and claim | separate case, grace and appeal; never automatic negative fact |

Clock A = original first substantive response; receipt/ack does not close it. Clock B = next-stage/decision commitment, independent from A. Store UTC, render Europe/Warsaw; policy explicitly uses elapsed calendar hours initially and says so in creator/UI. Business-day calendars require separate versioned calendar; no guessing weekends/DST. Extensions preserve old deadlines in events. Values for reconfirmation/grace/reminders are versioned TEST FIRST policy, configurable in development, not purported research facts.

Rejection codes initially REQUIREMENT_NOT_DEMONSTRATED, REQUIREMENT_NOT_MET, OTHER_CANDIDATE_BETTER_MATCH, POSITION_FILLED, RECRUITMENT_CANCELLED. First three require requirementId from the submitted offer version; “better match” cannot be generic or cite unrelated/current-only requirement. Cancellation does not masquerade as candidate incapability. Free text does not replace the enum/requirement. No bulk reject optimization.

## 7. Watch, trust, notifications and analytics

Private watch candidate×offer; does not create recruitment or company event. Alert material salary/location/work-model/requirements/process changes, upcoming closure and closure; no identity analytics to employers. Transactional events fan out via durable outbox, with idempotent inbox inserts; bounded retries/backoff, error code only, dead-letter and operator retry. Existing notification preferences respected for optional watch alerts; essential process events remain visible in timeline. In-app delivery first; email/push require channel consent/provider and safe generic payload.

Worker evaluates original due dates, sends reminder and overdue signals, pauses stale intake, leaves existing processes operable. Repeated patterns enter review; no 100/50/25 or manipulation of skillmatch. Signals repeat repost/no progression/high interest+zero interview/repeated close-repost/stale/unusual rejection; thresholds explicitly provisional, avoid small-n verdict. Case OPEN → EVIDENCE_REVIEW → ACTION or NO_ACTION → APPEAL → RESOLVED, reason/scope/expiry/review and appeal required. Human reviewer decides restriction. Withdrawal, low score or declining work cannot create a negative candidate fact.

Analytics allowlisted events only; consent-gated product analytics, minimal mandatory security audit separate. Meaningful progression uses unique candidate-offer pair/week, mutually confirmed completed stage; invitation/rejection not NSM. Show sample n/window/unanswered alongside response timeliness, never a reputation number. No watcher IDs, tax scenario, raw answer, phone or biography in analytics.

## 8. Assessment foundations

Definition DRAFT → IN_REVIEW → APPROVED; edit makes new DRAFT and invalidates approval for that version. AI adapter emits DRAFT only, no publication capability. Start with one exact-answer/quiz type and manual open-answer review. No executing candidate code or files in app server. Assignment references approved immutable version/rubric and authorized process.

Overview: type/count/expected duration/time limit/deadline/scoring/visibility/help. GET never starts timer. POST Start idempotently stores serverStartedAt and min(start+limit, assignment deadline). Reconnect reads persisted expiry; client date/expiry ignored. Autosave has revision; submit is atomic, late submission transitions appropriately without reputation penalty. Objective scoring deterministic per question with missing distinct from zero; complex answers pending manual review. Finalization records reviewer and breakdown. Corrections versioned with reason. Recruitment state never auto-transitions to hired/rejected based on result. Scoped comparisons require same org/offer/definitionVersion/rubric and human interpretation. Standard Faro/wallet deferred until validation and grants, no skill expiry.

## 9. Job Economics and comparison

Foundation supports gross/invoice basis, manually provided net estimate range, commute cost/time and amount after selected commute, each with source/date/assumptions/version. No effective hourly quotient. Missing commute or net => unknown remainder, not zero. Auto and public transport alternatives not summed unless user defines mixed travel days. All fields candidate-private.

TaxRulesProvider interface accepts salary option/version + scenario + effectiveDate and returns supported/unsupported, range, calculationVersion, source dates, assumptions and uncertainty. No invented Polish payroll constants. Publish automated rules only after tax specialist golden cases and licensed sources. Routing/fuel/transit/rail separate licensed adapters with cache/expiry and manual fallback. Comparison aligns currency/period/basis, shows incompatibility explicitly and gross/net/after-commute/cost/time/remote/shifts/weekends/stages/test duration/response separately. No winner or Life Score.

## 10. Workspace/design system

Night #0B1020, Cloud #F7F9FC, Gold #FFC857. Font stack Manrope/Inter/system sans without requiring external font request. Semantic tokens for base/raised surfaces, text, border/focus, primary action, unknown/info/warn/error/success. Shared inputs/buttons/cards/chips/timeline/tables/filter/empty/error/loading/assessment components. Status includes text, not color alone.

Candidate desktop: slim role navigation + list/filters + selected offer analysis/actions. Employer: organization/recruitment list + process projection/timeline/actions. Mobile under content-driven breakpoint: single list OR detail, back preserves filter/scroll and restores focus; bottom nav, no compressed dual panes. Hash/deep links select native offer/process. Keyboard labels, visible focus, live status, 320px reflow, reduced motion, sufficient contrast. No copied JobNest composition/logo/copy.

Auth success mounts new workspace; authentication failure remains on unchanged login. Session expiry clears private DOM and requests login, stale fetches cannot repaint prior account; AbortController/request generation for navigation. Offline cannot falsely acknowledge writes. Service worker caches only explicit public shell assets and excludes API/private resources, old caches cleaned on upgrade/logout. Use real backend states; no mock job cards in production.

## 11. Security, privacy, AI and legal gates

RBAC checks membership and offer assignment for every organization read/write; role alone insufficient. Every process resource authorized before lookup serialization; foreign org returns 404. Candidate-only resources derive userId from session. Body limits, field bounds, enum validation, pagination and process rates. No secret output. Uploads remain private/quarantined; assessment upload disabled pending safety boundary. AI input untrusted and minimized, output schema plus semantic validation, no tools, no automatic confirmation. Provider/model/prompt/schema/input-version provenance; bounded body/time/retry; manual path on failure.

Export all own canonical data including reasons and grants, no other candidates or answer keys. Deletion covers snapshots/claims/attempts/watch/outbox/scenarios and derivatives; last org owner must transfer/close organization first without making account deletion impossible indefinitely. Audit fields minimize PII, retention not arbitrary global TTL. Production retention, legal hold and backup tombstone policy require approved purpose-specific decision; implement hooks/rehearsal without inventing legal periods.

| Gate | Status now | Evidence needed / effect |
|---|---|---|
| Local foundations without real personal data | LEGAL CLEAR for implementation scope only | Does not certify service launch |
| KRAZ marketplace | LEGAL REVIEW; public launch LEGAL BLOCKER | Written per-function qualification and fulfilled requirements |
| GDPR roles/art6/art22/DPIA | LEGAL REVIEW; real processing LEGAL BLOCKER | Approved purposes, controller/processor map, retention, rights, oversight |
| Recruitment AI/scoring/ranking | LEGAL REVIEW; activation LEGAL BLOCKER | Intended purpose, classification, validation, provider terms, actual human review |
| Minors/first job | LEGAL REVIEW | Supported scope + provider terms + founder approval; do not silently add 18+ |
| Post-initial identity beyond phone | LEGAL REVIEW | Defined fields/purposes; keep hidden meanwhile |
| Tax/route/skills datasets | LEGAL REVIEW | Rules validation and per-dataset license; manual/local fallback |
| Moderation/DSA/accessibility | LEGAL REVIEW | Policy, appeal, operator, accessible paths and required accommodations |

Official sources checked during audit: [ELI labour-market act](https://eli.gov.pl/eli/DU/2025/620/ogl), [European Commission AI framework](https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai), [GDPR full text](https://eur-lex.europa.eu/eli/reg/2016/679/oj/eng). These support gate inventory, not a legal opinion or launch clearance. Legal dates in archived material must be revalidated at launch; no hardcoded regulatory timetable unlocks functionality.

## 12. Milestones, dependencies and critical path

M0 CP00 audit/plan → CP01 remove rejected live paths/security baseline → CP02 org/projection → CP03 skills + CP04 offers → CP05 explanation → CP06 interest/clocks/watch/diff → CP07 moderation → CP08 complete workspace → CP09 economics + CP10 assessment foundations → CP11 privacy/operations/release verification. CP12 research/GTM/billing remain explicit external or post-MVP work. Implement independent legal-safe work while external gates remain open.

Critical technical path: identity/authorization → immutable offer/profile → exact projection preview → transactional interest → human response → usable workspace → privacy/recovery proof. Critical launch path: KRAZ + DPIA + production persistence + verified supply + staffed moderation + usable/audited core. Assessment library, tax automation, payroll coverage, Windows/native apps and payment are not critical MVP path.

Do not stop after a checkpoint merely for user “continue”. Progress to next authorized implementation, test, review, documentation; stop only on a real external decision while continuing independent tasks. The checklist is an execution map, not permission to mark partially implemented helpers as complete.

## 13. Test and release strategy

Before each edit identify actual delta and reuse existing tests; extend only for distinct counterexamples. Domain tests: projection nested fields, pending proposals, WILL_TEACH/unknown/levels, billing metamorphism, money/units/null, state actors/terminal/concurrency, reason binding, clock independence and DST, grant+stage, immutable diff, stale intake, timer/approval/scoring. API tests: two organizations/users, revoked membership, cross-tenant resource, preview equivalence, watcher privacy, foreign requirement, stale revision, idempotency collisions, no CV/legacy path, no employer export leak. Transaction rollback test proves no orphan event/outbox.

Browser: unchanged login plus approved CTA; create organization/profile/offer, candidate preview→interest, employer decision, watch/revision diff, mobile back, keyboard/focus, errors/empty/offline, no horizontal overflow, axe critical pages. Test data explicitly synthetic, external HTTP uses local fixture. Final required project checks: lint/typecheck/migrations/node tests/backup restore/Playwright mobile+desktop/Docker smoke if runtime available; record environment limitations distinctly. Node22 parity CI required. Never weaken assertions to conceal a regression. Use exact final inputs, no rerun after PASS without new change.

Release acceptance: no unresolved high-severity privacy/tenant defects; all 16 invariants proven at actual API/UI boundary; persisted restart+restore; legal gates closed for enabled scope; no candidate payments; current real offer supply/support owner; production PostgreSQL/persistence rehearsal; manual accessibility and user research limitations stated. Local runnable build is not production launch.

## 14. PR sequence and risk register

Checkpoint register and PR sequence below are normative parts of this plan. Each checkpoint gets isolated commit(s), selective staging and reviewable diff. Start `codex/faro-canonical` from current main; initial docs-only commit precedes production edits. Subsequent PR branches can be split from checkpoint commits (`codex/faro-01-foundation`, etc.) without force-pushing. No one giant PR or automatic merge. Do not push unless remote publication scope is concrete; local commit sequence already preserves review/revert units.

| Risk | Severity | Mitigation / verification | Owner |
|---|---|---|---|
| Private history leaks through nested evidence | Critical | allowlisted concept/practice/evidence DTO, raw text private, poisoned input API tests | Engineering/privacy |
| Wrong KRAZ/AI/GDPR assumption | Critical | closed activation by default, written qualification | Founder/counsel |
| SQLite/free ephemeral hosting data loss | Critical | block public launch, restore rehearsal, PostgreSQL cutover | Ops |
| Overlapping user edits | High | isolated worktree, parent untouched | Engineering |
| Existing connector failures conceal regression | High | baseline pinned 90/92, targeted fixture diagnosis plus rights gate | Engineering |
| Rejected feature still reachable | High | HTTP boundary retirement, canonical UI uses no legacy score | Engineering |
| Scope falsely reported complete | High | requirements→checkpoint→evidence; partial remains partial | Engineering |
| AI claims treated as certified | High | proposal-only output; explicit declaration label and provenance | Product/engineering |
| Fast mass rejection games metrics | High | reasons tied to requirements, distinct progression metric, review | Trust/product |
| Arbitrary tax/transport precision | High | unsupported states/manual provenance; expert gate | Domain reviewer |
| Accessibility/mobile regressions | High | Playwright+axe+visual review, auth asset lock | Engineering |
| Thin nationwide supply | High | honest empty state; acquisition requires founder work | Founder |

## 15. Companion files and completeness

`01_CURRENT_SYSTEM_MAP.md`, `02_CANONICAL_GAP_MATRIX.md`, `08_CHECKPOINT_REGISTER.md`, `09_PR_SEQUENCE.md`, `planning-coverage.json`, and `IMPLEMENTATION_STATUS.md` form the saved plan package. This master includes target architecture/domain, database/migrations/API/flows/design, milestones/dependencies/critical path/MVP and risks; additional numbered duplicate summaries are unnecessary. Maintain `ARCHITECTURE.md`, `DOMAIN_MODEL.md`, `API.md`, `PRIVACY_MODEL.md`, `AI_GOVERNANCE.md`, `TESTING.md`, `RUNBOOK.md`, `DEPLOYMENT.md` in this directory as delivered behavior becomes known; distinguish target from implemented.

Pre-code verification: required sections exist; 71+86 unique IDs mapped once; 16 invariants assigned; 72 legacy records retained; full checkpoint fields present; source hash recorded; initial plan committed; explicit PLAN COMPLETE communicated. Implementation may begin only after this gate.
# Implementation delta — 2026-10-03

Initial plan remains preserved in commit 8b2524a. Verified follow-through now includes CP11-A data rights, CP06-B exact preview confirmation, CP06-C manual interviews and CP06-D structured clarification. These complete bounded slices, not the full master plan. CP06 outstanding: explicit repeated-interest history and operational scheduled delivery. CP07 outstanding: bilateral case explanations/policy gates and pattern signals. Assessment, matching constraints, offer publication safety and operational persistence/release work continue according to the checkpoint register. No production/legal completion is implied by local test passes.

CP06-F now implements scheduled development delivery and ADMIN aggregate diagnostics with stop-before-close and retry evidence. CP06-E repeated-interest history, CP07-B bilateral review and CP04-B publication boundaries are also delivered slices. The older outstanding list above describes that earlier checkpoint; current remaining scope is recorded in IMPLEMENTATION_STATUS.md. Production scheduling remains gated.

CP10-B adds transactional revision/idempotency-protected assignment, server expiry of idle attempts and employer review deadlines; real quiz workspace lifecycle is verified on desktop/mobile. Immutable edited definitions and approval renewal remain the next assessment slice. See IMPLEMENTATION_STATUS.md for evidence and external gates.

CP10-C now provides employer-scoped immutable definition editing, latest-version assignment guards and a full task/key/rubric review surface. New versions require renewed approval; existing attempts keep their original versions. Objective quiz foundations are real and verified, while complex assessment and external validity/production gates remain deferred.

CP06-G adds private watch alert toggles and deduplicated upcoming-close notices based on published deadlines. Explicit candidate matching constraints remain the next engineering slice; rollout/notification policies retain their external gates.

CP05-A delivers explicit private work-condition filters with unknown-state explanations and no automatic relaxation. Salary/commute constraints remain pending comparable basis/unit contracts. Current candidate workspace and employer projection evidence is recorded in IMPLEMENTATION_STATUS.md.

CP04-C/CP09-B preserve extra salary alternatives during editing and align comparison with the selected private scenario. Manual-v2 results record money/time periods; historical v1 records retain provenance. Automatic tax/tariff integration remains externally gated. Remaining operations/CI/recovery work continues next.

## CP11-B — Fail-closed Canonical DB-only recovery (2026-10-04)
ID / TITLE: CP11-B, isolated recovery with current erasure and access authority.
GOAL / PURPOSE / CURRENT GAP: a legacy snapshot could resurrect erased subjects, old credentials/privileges and disclosures.
SCOPE / IMPLEMENTATION / FILES: recoveryService.ts, privacyService.ts internal recovery reuse, db.ts constructor cleanup, restore-faro.mjs, faro-backup-restore-exercise.mjs, package.json and operational documentation. New absent target only; integrity/FK validation; current consistent read-only authority snapshot captured after copying/migration; transactionally replay deletions and restrict stale authority/disclosure/intake. No sensitive ledger output.
DB CHANGE / MIGRATIONS: none; existing erasure/member/grant/audit records reused.
API CHANGE / FRONTEND CHANGE: none; no offline override reachable from API.
DEPENDENCIES: CP11-A erasure/ownership, CP02 RBAC, CP04 versioning, CP06 processes, CP10 attempts.
TESTS / TESTED: real-file restore rehearsal PASS including current credentials, owner transfer/fallback closure, erasure replay and failure cleanup; build/typecheck/lint, 27 migrations and 28 Faro Node scenarios PASS. Final authority-capture script change verified by recovery rehearsal.
ACCEPTANCE CRITERIA: no erased account/attempt/watch/grant resurrection; current passwords/roles/restrictions win; historical survivor process/version/first clock retained; no sessions or automatic phone/analytics disclosure; existing target refused; failed ledger validation leaves no database; replay has no duplicate erasure; source unchanged.
LEGAL STATUS: local synthetic foundation only; retention/legal hold and public release gates unresolved.
RISK / DEFERRED: DB-only; uploads refused. Current authoritative source must survive and be quiescent; independent durable journal, file recovery, PostgreSQL/multi-instance persistence, production cutover and external legal decisions remain. No distributed source/target transaction claimed.
ROLLBACK: revert offline helper/service only; preserve erasure history and safe default API deletion. Do not activate failed or unreconciled snapshots.
STATUS: DONE for bounded CP11-B foundation; overall CP11 PARTIAL.
NEXT CHECKPOINT: explicit confirmation of exact phone number and revocation on profile change.

## CP06-H — Conscious exact-number phone disclosure (2026-10-04)
ID / TITLE: CP06-H, phone preview and consent consistency.
GOAL / PURPOSE / CURRENT GAP: profile edits could expose a replacement phone under an old grant; workspace granted immediately without showing the number.
SCOPE / IMPLEMENTATION / FILES: profileService.ts transactional save/version check/revocation, recruitmentService.ts scoped preview and transactional grant, api.ts, client faro.ts, recruitment/privacy/recovery/browser fixtures and docs.
DB CHANGE / MIGRATIONS: none; existing revoked_at and audit reused.
API CHANGE: candidate-only GET phone-preview and explicit phoneConfirmed/current token POST phone-grant. No employer access to preview. Existing DELETE unchanged.
FRONTEND CHANGE: workspace modal shows actual number, explains revocation, requires conscious confirmation; no login change.
DEPENDENCIES: CP03 private profile, CP06 recruitment/contact grants, CP08 dialogs, CP11-B recovery.
TESTS / TESTED: build/typecheck/lint PASS; 11 recruitment + 3 privacy scenarios PASS; real DB recovery PASS; expanded actual candidate/employer browser journey PASS mobile/desktop (2).
ACCEPTANCE CRITERIA: stage advance never discloses; stale/missing/cross-process confirmation cannot grant; wrong actors receive 404; changed or removed number revokes all active grants atomically; unchanged number preserves consent; grant audit has no phone/token; candidate can revoke.
LEGAL STATUS: local privacy foundation; wider retention/production legal gates remain open.
RISK / DEFERRED: revocation cannot erase a previously observed number from human memory. No automatic contact exchange or external messaging.
ROLLBACK: revert UI/API together while retaining revoke-on-number-change protection; never restore immediate unconfirmed disclosure.
STATUS: DONE for CP06-H; overall CP06 PARTIAL.
NEXT CHECKPOINT: malformed request URL boundary and relevant CI release verification.

## CP11-C — Malformed request boundary (2026-10-04)
ID / TITLE: CP11-C, contain invalid URL parsing.
GOAL / PURPOSE / CURRENT GAP: URL parsing ran before the async handler catch and could reject without an HTTP response.
SCOPE / IMPLEMENTATION / FILES: faroApp.ts request boundary and faro-runtime.test.ts raw HTTP counterexample.
DB CHANGE / MIGRATIONS / FRONTEND CHANGE: none.
API CHANGE: malformed URLs return 400 INVALID_URL, no-store and standard security headers.
DEPENDENCIES: CP01 runtime allowlist.
TESTS / TESTED: build and both runtime scenarios PASS; lint/typecheck PASS.
ACCEPTANCE CRITERIA: malformed raw target produces a stable error, does not leak parse details or terminate service; subsequent health remains 200; retirement/auth contract retained.
LEGAL STATUS: local security fix; production gates remain closed.
RISK: parser rejection is intentionally limited to URL validation, other internal errors remain opaque 500.
ROLLBACK: revert handler/test together; preserve safe security headers.
STATUS: DONE for CP11-C; overall CP11 PARTIAL.
NEXT CHECKPOINT: relevant CI and regression evidence.

## CP11-D — Explicit Canonical CI and aggregate regression (2026-10-04)
ID / TITLE: CP11-D, executable current-system quality scope.
GOAL / PURPOSE / CURRENT GAP: CI lacked canonical recovery and codex branch push coverage; old browser contracts targeted retired product.
SCOPE / IMPLEMENTATION / FILES: package.json new test:faro/test:browser:faro scripts; .github/workflows/faro.yml; testing/operations docs. Keep original CI/tests and container unchanged and visibly unresolved.
DB CHANGE / MIGRATIONS / API CHANGE / FRONTEND CHANGE: none.
DEPENDENCIES: CP01 runtime, CP08 workspace, CP11-B recovery and CP06-H consent.
TESTS / TESTED: local Node24 aggregate 50/50 Node, 20/20 browser, lint/typecheck and 27 migrations PASS; recovery PASS at current relevant code. Remote Node22/24 execution pending; no Docker available locally.
ACCEPTANCE CRITERIA: CI explicitly exercises all Canonical invariant suites and shared auth/privacy/security contracts; actual real-file recovery; both roles/mobile/desktop and retained public accessibility; no hidden legacy failures/skips/continue-on-error; workflow least-privilege contents:read.
LEGAL STATUS: synthetic CI only; release gates unchanged.
RISK / DEFERRED: original full legacy CI has known OLX/LinkedIn fixture failures and obsolete browser expectations. These and Node22/container/persistence validation remain gates; this bounded CI addition is not full CP11 completion.
ROLLBACK: revert additive workflow/scripts; historical pipeline remains intact.
STATUS: DONE for local aggregate verification and CI definition; remote verification pending, overall CP11 PARTIAL.
NEXT CHECKPOINT: publish reviewable dependent drafts and continue remaining invariant/security/domain gaps.

## CP07-C — Independent verification and moderation (2026-10-04)
ID / TITLE: CP07-C, preserve conflicts after membership revocation.
GOAL / PURPOSE / CURRENT GAP: platform-admin members could verify their own organization; revoked staff became eligible to read/review private moderation evidence; generic verify could clear restrictions.
SCOPE / IMPLEMENTATION / FILES: FaroStore affiliation helper, profileService transactional verification, trustService involved guard, profile API counterexample and privacy/API/status docs.
DB CHANGE / MIGRATIONS / FRONTEND CHANGE: none; historical membership already retained.
API CHANGE: verification conflict/restriction errors; former affiliated admins cannot acquire moderator view or review authorization by revoking membership.
DEPENDENCIES: CP02 membership, CP07 private cases and CP11-B recovery preserving current restrictions.
TESTS / TESTED: build/typecheck/lint and 12 profile/assessment-trust/interview scenarios PASS. New API counterexample checks active owner/staff and revoked staff, no private case read, no state mutation on denial, independent review success and restricted verification refusal.
ACCEPTANCE CRITERIA: reviewer has no current/historical affiliation; conflicted caller never receives third-party evidence; verification cannot lift moderation restrictions; authorization/update/audit atomic.
LEGAL STATUS: local safe foundation; staffed moderation, approved conflict/retention policy and proportional restoration remain gates.
RISK / DEFERRED: historical affiliation conservatively remains a conflict while membership record is retained; external undisclosed relationships cannot be inferred. Dedicated restriction restoration is not invented here.
ROLLBACK: retain stricter conflict/restriction guards; revert feature entry points if necessary without exposing private evidence.
STATUS: DONE for CP07-C; overall CP07 PARTIAL.
NEXT CHECKPOINT: mobile checkbox hit-target failure discovered by actual Ubuntu CI.

## CP08-B — Workspace checkbox geometry and mobile scroll clearance (2026-10-04)
ID / TITLE: CP08-B, fix actual Ubuntu browser failure.
GOAL / PURPOSE / CURRENT GAP: legacy/native checkbox dimensions conflicted with generic workspace input padding; normal320px click hit fieldset/navigation; fieldsets inherited a pale legacy surface.
SCOPE / IMPLEMENTATION / FILES: public/faro.css scoped to workspace only, e2e/faro.spec.ts pointer geometry assertion and operational status.
DB CHANGE / MIGRATIONS / API CHANGE: none.
FRONTEND CHANGE: native24px checkbox/radio with zero padding, mobile100px scroll margin; transparent workspace fieldsets keep dark parent surface. Login CSS/markup unchanged.
DEPENDENCIES: CP08 shell, CP11-D actual remote browser evidence.
TESTS / TESTED: build/typecheck/lint and affected workflow PASS mobile/desktop locally; visual screenshot inspected. Test uses ordinary click, asserts actual geometry/padding; Ubuntu rerun pending.
ACCEPTANCE CRITERIA: normal touch/pointer confirmation at320px is reachable above nav; no forced click/skip/timeout masking; original auth visuals retained; dark form surface and no horizontal overflow.
LEGAL STATUS: accessibility/runtime fix, production gates unchanged.
RISK: native controls vary by OS; remote Linux evidence required. Shared workspace CSS affects all forms; complete remote browser suite will rerun.
ROLLBACK: revert scoped CSS/test together; do not accept the known obstructed checkbox.
STATUS: local fix DONE; remote acceptance pending, overall CP08 PARTIAL.
NEXT CHECKPOINT: remote browser acceptance and assessment final review concurrency.

## CP10-D — Transactional and idempotent human result review (2026-10-04)
ID / TITLE: CP10-D, protect result finalization against stale reviews/retries.
GOAL / PURPOSE / CURRENT GAP: finalize read state before its transaction and lacked version/idempotency guards; concurrent review could silently overwrite/duplicate events.
SCOPE / IMPLEMENTATION / FILES: assessmentService.ts overview and commandOnce finalization, client faro.ts/types, assessment API test, documentation.
DB CHANGE / MIGRATIONS: none; existing revisions/idempotency/audit reused.
API CHANGE: result review requires current attempt and process versions and idempotency key; rechecks assigned employer and active process inside transaction. Overview exposes processVersion only, no extra identity.
FRONTEND CHANGE: existing conscious-review form sends current versions/key; no redesign/login change.
DEPENDENCIES: CP10-B/C pinned attempt, CP06 transaction/revision/idempotency, CP08 review form.
TESTS / TESTED: build/typecheck/lint and6 assessment/economics/trust scenarios PASS; actual review browser journey PASS mobile/desktop (2). New API scenario checks wrong actors, missing conscious confirmation, stale attempt/process, exact replay, changed payload conflict, one audit/event, unchanged first clock and terminal denial.
ACCEPTANCE CRITERIA: no stale result publication/overwrite; unauthorized or terminal attempt review has no side effects; exact replay returns same result; explicit human review stays required; no auto-hire/reject/ranking.
LEGAL STATUS: local synthetic assessment foundation; production scoring/AI/legal validation remain gated.
RISK / DEFERRED: immutable result correction, accommodation/retry and complex/manual task engine remain open. Pending historical score after withdrawal stays private/unfinalized rather than becoming a new decision.
ROLLBACK: revert API/client together while retaining transactional stale/result guards and immutable event history.
STATUS: DONE for CP10-D; overall CP10 PARTIAL.
NEXT CHECKPOINT: final CI for this checkpoint and remaining trust/assessment/domain engineering.

## CP07-D — Private factual reliability report (2026-10-04)
ID / TITLE: CP07-D, explicit response/progression cohorts.
GOAL / PURPOSE / CURRENT GAP: deadline history existed but had no inspectable denominator/median/censored-wait report; fast rejections could look like complete success without progression context.
SCOPE / IMPLEMENTATION / FILES: domain/faro/reliability.ts pure calculation; TrustService scoped consistent report; api.ts; client types/views/controller portal organization section; new reliability tests and expanded existing browser journey.
DB CHANGE / MIGRATIONS: none; original dueAt and immutable events reused.
API CHANGE: owner/admin organization reliability GET, explicit past window or server last30days; max366days/10000records, no silent truncation; private aggregates only.
FRONTEND CHANGE: original organization portal shows window/asOf/sample/matured denominator, early withdrawals, median answered n, unanswered/current waits/overdue age and distinct progression/assessment/confirmed-interview/rejection counts. No percentage headline or global score.
DEPENDENCIES: CP06 immutable clocks/events, CP07 private scope, CP08 components, CP11-A erasure limits acknowledged.
TESTS / TESTED: build/typecheck/lint and2 reliability scenarios PASS; expanded candidate/employer browser workflow PASS mobile/desktop with actual sample and axe. Historical unaffected contracts retain prior evidence; new remote CI pending.
ACCEPTANCE CRITERIA: exact original dueAt; early withdrawal never credited as response; unanswered censoring beside median; empty denominator/null median is insufficient data; deduped progression distinct from rejection; no private identities/watchers, no automatic sanction/case/ranking change; no hidden truncation.
LEGAL STATUS: local private factual report; public metrics/small-sample disclosure and operational/legal policy remain review gates.
RISK / DEFERRED: retained records only, erasure changes cohorts; no public reputation, fraud inference, approved pattern threshold, similar-offer/repost linkage or automatic consequences. Default30days is reporting presentation, not sanction policy; custom window API supported, UI selector pending.
ROLLBACK: remove report endpoint/portal section together; underlying immutable clocks/events retained.
STATUS: DONE for CP07-D private foundation; full K041/K082 and CP07 remain PARTIAL.
NEXT CHECKPOINT: new CI acceptance, remaining trust/moderation and assessment engineering.

## CP10-E — Meaningful review of pinned submitted answers (2026-10-04)
ID / TITLE: CP10-E, make human review inspectable.
GOAL / PURPOSE / CURRENT GAP: employer result page showed points without submitted choice/key/question; oversight could become a blind checkbox. Candidate pre-Start lacked exact disclosure/help and employer could see candidate-only buttons.
SCOPE / IMPLEMENTATION / FILES: assessmentService overview allowlist; client types/attemptView role-aware actions and pinned response/key display; assessment API/browser assertions; documentation.
DB CHANGE / MIGRATIONS: none; immutable attempt definition/answers reused.
API CHANGE: viewer and submitted-only employer reviewTasks. Candidate remains key-free; employer draft answers remain private.
FRONTEND CHANGE: assigned employer sees question/chosen answer/key/possible points and rubric before finalizing; before Start candidate sees disclosure and existing private technical help path. No timer reset or automated penalty promise.
DEPENDENCIES: CP10-C pinned definitions, CP10-D guarded human review, CP07 private reports, CP08 forms.
TESTS / TESTED: build/typecheck/lint,6 assessment/economics/trust scenarios and expanded real review journey desktop/mobile(2) PASS. Candidate reviewTasks empty even after result; employer before submission gets no chosen answer; unanswered differs from wrong choice.
ACCEPTANCE CRITERIA: reviewer can inspect actual submitted answer against original rubric/key; no live draft monitoring or candidate key response; explicit pre-Start disclosure and technical help; candidate-only actions not shown to employer.
LEGAL STATUS: local foundation; production scoring/quality/fairness gates unchanged.
RISK / DEFERRED: objective quiz only; missing answer is null. Structured technical incident/retry policy and immutable correction remain separate pending requirements; no AI/manual complex scoring is implied.
ROLLBACK: revert DTO/UI together, retain candidate/draft answer boundary and human review gate.
STATUS: DONE for CP10-E; overall CP10 PARTIAL.
NEXT CHECKPOINT: stable curated skill identities independent of legacy ontology ordering; current CI acceptance.

## CP03-B — Stable authored skill identities (2026-10-04)
ID / TITLE: CP03-B, remove positional identity coupling.
GOAL / PURPOSE / CURRENT GAP: skill IDs came from legacy ontology array indices, so historical insertion/reorder could reinterpret persisted claims/requirements without a migration or user confirmation.
SCOPE / IMPLEMENTATION / FILES: domain/faro/skillCatalog.ts explicit23-node frozen seed; skills.ts same catalog reexport and unchanged suggestion/projection algorithms; isolated import regression; architecture/domain/status docs.
DB CHANGE / MIGRATIONS: none; every existing identifier/label/alias/version/license preserved, no rekeying.
API CHANGE: same catalog endpoint; additive kind/family descriptive metadata, no official taxonomy claim.
FRONTEND CHANGE: none; same choices/labels and matching meanings.
DEPENDENCIES: CP03 confirmed claims, CP04 requirements, CP05 exact matching.
TESTS / TESTED: build/typecheck/lint and15 skills/profile/recruitment scenarios PASS. Isolated subprocess imports reordered/extended historical ontology first and confirms stable IDs plus no automatic new node; actual profile/matching/phone/publication contracts retained.
ACCEPTANCE CRITERIA: persisted identity independent of unrelated ontology ordering; no new concepts introduced without explicit curated release; readonly frozen seed/aliases; confirmation semantics and exact matching unchanged; ESCO URI remains null rather than guessed.
LEGAL STATUS: repository-authored local taxonomy; ESCO/license/provider mapping remains REVIEW before use.
RISK / DEFERRED: only23 authored nodes, no complete ESCO graph/validated equivalences or semantic entailment. Existing family metadata never restricts occupations/geography or certifies an ability. Future labels/relations require reviewed versioning, never ID recycling.
ROLLBACK: retain stable seed; revert consumers together without restoring index-derived identity or rekeying claims.
STATUS: DONE for CP03-B identity integrity; overall CP03 graph integration PARTIAL.
NEXT CHECKPOINT: updated CI acceptance; remaining skills/evidence/privacy and operational gates.

## CP11-E — Full retained Node compatibility and production-image CI (2026-10-04)
ID / TITLE: CP11-E, validate retained modules and actual image alongside Canonical contracts.
GOAL / PURPOSE / CURRENT GAP: two historical ingestion fixtures mocked transports the existing connector no longer calls; Canonical CI lacked full retained Node and actual Docker acceptance.
SCOPE / IMPLEMENTATION / FILES: public-job-ingestion.test.ts fixtures now serve real listing links and detail contracts; faro.yml adds Ubuntu compatibility/image job; scripts/faro-container-smoke.mjs verifies isolated production boundary.
DB CHANGE / MIGRATIONS / API CHANGE / FRONTEND CHANGE: none; no production importer changes or retired routes reactivation.
DEPENDENCIES: CP11-D CI, CP03-B stable identities, CP01 retirement/free-first, existing Dockerfile and recovery helpers.
TESTS / TESTED: exact npm test PASS127/127, zero failures/skips; focused ingestion8/8; lint/typecheck/diff checks PASS; historical real-file backup-restore exercise PASS. Remote Canonical run37188962130 at0ca9676 PASS Node22/24, Canonical recovery and20 browser checks. New compatibility/container job pending actual remote result; local Docker unavailable.
ACCEPTANCE CRITERIA: no weakened assertions/skips; OLX detail traversal and LinkedIn standard search/detail verified; every retained Node test executes; production image builds its own tests; isolated synthetic account FREE/ACTIVE and secure session; production Canonical remains503 and CV/EHV/billing/imports410.
LEGAL STATUS: synthetic isolated engineering validation; release gates unchanged.
RISK / DEFERRED: old full browser suite still describes retired product flows and remains separate unresolved scope; npm check is not claimed green. Container result is pending until remote completion. This is not deployment or permission to activate production.
ROLLBACK: revert CI/helper and fixture delta together; keep Canonical boundary contracts and existing tests enabled.
STATUS: implementation DONE; container acceptance PENDING; overall CP11 and master plan PARTIAL.
NEXT CHECKPOINT: actual container CI, then remaining assessment/trust/domain engineering.

## CP10-F — Immutable result validity history (2026-10-04)
ID / TITLE: CP10-F, withdraw validity of an erroneous reviewed objective result.
GOAL / PURPOSE / CURRENT GAP: Canonical report10 requires original values/reason and bilateral notice for material corrections; finalized score had no way to mark detected error without overwriting evidence.
SCOPE / IMPLEMENTATION / FILES: migration0028; assessmentService/API; own privacy export; client types/controller/view/labels; assessment API/migration and real browser tests.
DB CHANGE / MIGRATIONS:0028_faro_result_validity.sql adds append-only service history with VALID/INVALIDATED snapshots, constrained technical reason codes, version PK, attempt cascade. Existing finalized scores backfilled unchanged with actual reviewed_at (null remains unknown); no guessed timestamps. Rollout requires backup and migration validation.
API CHANGE: overview adds resultValidity/resultHistory; invalid current result=null, original points only in explicitly historical snapshots. POST attempt invalidate-result requires active assigned employer, attempt/process revisions, idempotency key, confirmed=true, technical reason code and >=10-character shared justification. Revocation denies replay. No arbitrary point editing, key replacement or AI action.
FRONTEND CHANGE: employer explicit invalidation form; both roles see invalidity warning and history/reason. Candidate cannot invalidate; initial login unchanged. Marking invalid preserves lifecycle FINALIZED (review already completed), separate validity prevents presenting historical points as current ability.
DEPENDENCIES: CP10-C pinned evidence, CP10-D guarded review, CP10-E inspectable answers, CP06 durable bilateral outbox, CP11-A erasure/export.
TESTS / TESTED: build/typecheck/lint PASS;28 migrations PASS;57 Canonical/shared scenarios (56 before added migration regression; targeted8 then PASS); meaningful invalidation API counterexamples, snapshot fidelity, clocks unchanged, one event/two recipient outbox entries, isolation/revoked replay, own export/cascade erased. Extended browser assessment journey desktop/mobile2 PASS. Canonical real-file recovery PASS before timestamp-only migration refinement; remote current-input acceptance pending.
ACCEPTANCE CRITERIA: erroneous score cannot appear as valid current result; original score/answers/rubric/review retained; explicit technical explanation accessible to both parties; no candidate-key or reviewer identity leak; no clock/recruitment-state/ranking alteration; failed/stale commands atomic; idempotent retry does not create duplicate correction.
LEGAL STATUS: synthetic local foundation; production scoring/fairness/DPIA/recruitment gates unchanged.
RISK / DEFERRED: invalidation is a corrective safeguard, not complete score amendment/whole-cohort repair, technical retry engine or complex task scoring. A new approved definition/review is needed for later reassessment; never silently reset timer. Correction of factual history may happen after process closure and never reopens or changes a hiring decision. Justification is shared; UI asks for no personal data. Historical result is not transferable certification.
ROLLBACK: remove invalidation UI/endpoint together only with invalid-score guard retained; do not drop history or recycle snapshot versions. Forward migration preferred; database rollback must preserve newly recorded corrections.
STATUS: DONE for bounded validity correction; full CP10 and master plan PARTIAL.
NEXT CHECKPOINT: current CI and remaining assessment technical incidents/valid score amendment, skills integration and operational requirements.

CP11-E acceptance DONE: actual remote run37189804326 at9889288 SUCCESS, including all127 Node tests on Ubuntu, historical storage exercise, actual Docker build and isolated production smoke, Node22/24 Canonical/recovery and20 browser checks. This does not certify old historical browser flows or authorize production activation.
