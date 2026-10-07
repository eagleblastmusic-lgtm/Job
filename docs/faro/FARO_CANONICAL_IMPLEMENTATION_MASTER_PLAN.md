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

## CP06-I — Durable SQLite outbox leases and controlled retry (2026-10-04)
ID / TITLE: CP06-I, persist reservations and fence expired workers without opening production execution.
GOAL / PURPOSE / CURRENT GAP: durable dedupe did not reserve work across competing processes; a crashed worker had no bounded claim budget or conscious dead-letter recovery.
SCOPE / IMPLEMENTATION / FILES: migration0030; existing RecruitmentService claim/delivery/retry; worker API aggregate diagnostics; recovery reconciliation; worker/recruitment counterexamples and real-file restore exercise. Existing producers and inbox reused.
DB CHANGE / MIGRATIONS:0030 adds claim_token, lease_until paired constraint, max_attempts default5 and due-lease index. Claim uses BEGIN IMMEDIATE, consumes an attempt before work and persists a UUID lease. Historical attempts are preserved, not reset.
API CHANGE: ADMIN POST /api/faro/worker/outbox/:id/retry requires expectedAttempts,idempotencyKey,confirmed=true,reasonCode TRANSIENT_FAILURE_RESOLVED or LEASE_RECOVERY_REVIEWED. Current platform role checked before replay and inside transaction. DEAD_LETTER only; each distinct consciously reviewed retry grants five additional attempts, never resets total count, logs one safe audit. GET worker/status adds aggregate active lease count, no tokens/recipient IDs/messages.
FRONTEND CHANGE: none; login and workspace visuals unchanged.
DEPENDENCIES: CP06 transactional producers/dedupe, CP06 watch preferences, CP11-A erasure and CP11-B authoritative restore.
TESTS / TESTED: final complete npm run check PASS:137/137 Node tests,30 migrations, both real-file restore drills,28/28 desktop/mobile browser executions, lint/typecheck, zero skipped. git diff --check PASS. Tests cover two actual child processes sharing one SQLite file, restart/expiry/new-owner fencing, unique inbox effect, forced delivery failures/backoff/five-attempt dead-letter, five abandoned claims, authorized confirmed idempotent retry and role revocation, erasure after claim, watch mute after claim, dead-letter preference recheck and applicant/optional reminder distinction. Restore snapshot contains a real active lease and rejects its historical token after reconciliation. No skipped tests or assertion/rule suppression.
ACCEPTANCE CRITERIA: exactly one competing claim; late/wrong/replaced/expired token cannot deliver or mutate newer claim; failures and crashes consume bounded budget; delivery and acknowledgement atomic; stale/unauthorized/unconfirmed/changed-payload retries fail; erasure/mute cannot resurrect cached recipient content. Optional offer alerts recheck current watch choice at retry AND delivery; applicant offer updates remain independent, closing-soon stays optional. Restore clears old leases without erasing attempts.
LEGAL STATUS: local synthetic technical foundation only; production Canonical503 and disabled scheduler remain. No external email/SMS/provider activated; no moderation/hiring/billing effect.
RISK / DEFERRED: SQLite write serialization is not PostgreSQL/distributed deployment acceptance. One in-process development scheduler remains the supported app topology. Runtime claims default30 seconds/batch100; internal lease bounds1–300 seconds. In-app inbox only; external channels need separate delivery contracts. Operator IDs are obtained through authorized local operations, not a new global private-data browser. Full retention policy, independent authority journal and external gates remain open.
ROLLBACK: disable retry entrypoint and revert claim/delivery together only with all workers stopped; preserve outbox evidence/attempt counts and additive columns. Never clear budgets or replay all dead letters. Forward migration preferred.
STATUS: bounded lease local implementation/acceptance DONE; exact remote acceptance PENDING; overall CP06/master plan PARTIAL.
NEXT CHECKPOINT: exact local/remote acceptance, then assessment retry lineage without resetting original evidence/timers or inventing approved definition versions.

CP06-I remote acceptance DONE for code checkpoint a4755a6bce1b1ce54bfd141f7edebefd2b0601a6: [FARO37196636236](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37196636236) and [original CI37196636227](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37196636227) SUCCESS. Includes Node22/24 contracts/recovery, all137 retained Node tests,30 migrations, both restore drills,28 browser executions and actual image/smoke in both workflows. [Draft47](https://github.com/eagleblastmusic-lgtm/Job/pull/47) is unmerged and depends on draft46. Subsequent PR-sequence/handoff/evidence documentation changes do not change tested implementation, migrations or inputs. Bounded CP06-I local/remote acceptance DONE; full CP06/master plan/release remain PARTIAL. Continue with explicit assessment retry lineage and current gates; no deployment or production scheduler activation.

## CP10-H — Separate pinned retry after confirmed technical incident (2026-10-04)
ID / TITLE: CP10-H, conscious retry lineage, never resetting original attempt.
GOAL / PURPOSE / CURRENT GAP: confirmed TECHNICAL_ISSUE could not receive a new same-version invitation because old process/definition/version unique contract prevented it.
SCOPE / IMPLEMENTATION / FILES: migration0031, controlled migration runner/validator, AssessmentService/API, own export, existing attempt UI/controller/types/labels, API/migration/browser/restore tests. No parallel assessment engine.
DB CHANGE / MIGRATIONS:0031 copies every original attempt column unchanged into rebuilt table inside one transaction, adds attempt_number/retry_of unique child and explicit reason/authorization time/actor; historical roots default1. Root uniqueness retained; sequence uniqueness and FK cascade. Marked rebuild disables FK enforcement only before transaction; foreign_key_check before commit, rollback on mismatch, FK reenabled finally. Both runtime and validator support LF/CRLF marker. Rehearsed populated pre0031 table preserves incident/result-history children, restores enforced FK and cascade. Stop app/writers and backup before rollout; no evidence deletion/reset.
API CHANGE: POST /api/faro/attempts/:id/retry requires expectedVersion,processVersion,idempotencyKey,confirmed:true,reason,deadline. Assigned active OWNER/ADMIN/RECRUITER, excluding own applicant/unassigned platform ADMIN/HIRING_MANAGER. Only source TECHNICAL_ISSUE with resolved ISSUE_CONFIRMED, ACTIVE process/accepted stage, no previous child or other active attempt. Exact pinned approved version reused even if unrelated newer draft exists. New INVITED row has empty answers/null timer/result; original unchanged. Updates current stage/Clock B only, retains original Clock A/snapshot. One safe bilateral event/outbox. Replay caches only new id, reauthorizes and returns fresh scoped overview.
FRONTEND CHANGE: original/new attempt links, shared reason/date/number, conscious employer invite and candidate Start. Original technical attempt stays uneditable. Actual desktop axe found legacy hover label contrast1.03:1; one workspace-only color override fixes it, no auth/style redesign or rule suppression.
DEPENDENCIES: CP10-C pinned definitions/timer, CP10-G incident human handling, CP06 transaction/idempotency/clocks/outbox, CP11 erasure/recovery.
TESTS / TESTED: final full npm run check PASS139/139 Node,31 migrations, both real-file restore drills,28/28 desktop/mobile browser executions, lint/typecheck; zero skipped. Two new focused cases prove retry history/approval/auth/HIRING_MANAGER/terminal/version/confirmation/deadline/replay/export/erasure and populated migration fidelity/cascades. Real browser performs human resolution→separate retry→candidate conscious Start→original history and axe/reflow; restore snapshot contains root+retry and erases both. git diff --check PASS after LF normalization. Exact remote acceptance pending.
ACCEPTANCE CRITERIA: no old timer/answers/result/revision rewrite; distinct invitation same definition/rubric/tasks; no fake definition version; one child per source, no simultaneous active obligation; neutral technical failure not no-show/ability score; current scope rechecked on replay, no candidate key/reviewer identity leak; clocks/history preserved; rollback-safe populated migration and erasure of whole lineage.
LEGAL STATUS: local synthetic engineering only. Production503/scheduler remain closed; external legal/assessment quality/oversight gates have no supplied evidence and are not certified by CI.
RISK / DEFERRED: pinned retry repeats known tasks, is explicitly technical recovery and not a cheating/psychometric equivalence claim. General reassessment/credential/whole-cohort score correction and advanced tasks remain separate. Table rebuild requires offline backup/rehearsal; avoid destructive rollback or dropping new lineage data.
ROLLBACK: disable retry UI/API together; retain lineage/table/history, use forward correction. Never restore old unique schema over existing retries or reset first attempt. Keep hover contrast fix.
STATUS: bounded retry local implementation/acceptance DONE; remote PENDING; full CP10/master plan PARTIAL.
NEXT CHECKPOINT: current CI; explicit human restriction restoration with conflict/version/history guards; remaining full-plan legal-safe deltas continue.

## CP07-E — Explicit restriction history, appeal and independent restoration (2026-10-04)
ID / TITLE: CP07-E, close missing organization restoration path without silent verification bypass.
GOAL / PURPOSE / CURRENT GAP: moderation could set RESTRICTED but had no inspectable scoped condition/history, organization appeal or controlled restoration; ordinary verification correctly refused bypass.
SCOPE / IMPLEMENTATION / FILES: migration0032; existing TrustService moderation producer/appeal/restore/list; API; current workspace; own appeal export/erasure; authoritative restore ledger; API/browser/real-file recovery tests.
DB CHANGE / MIGRATIONS:0032 records NEW_INTAKE restriction ACTIVE→RESTORED, source case, minimal conflict subject references with erasure SET NULL, safe reason code, user-authored restoration condition, actual creation/review date, version, own appeal and human restoration reason/date. Existing RESTRICTED organizations backfill explicitly LEGACY_RESTRICTION_REVIEW_REQUIRED with unknown case/condition/dates NULL, never fabricated facts.
API CHANGE: GET /organizations/:id/restrictions only active organization OWNER/ADMIN or independent platform ADMIN; allowlist DTO omits identities/private case statement/decision. POST /restrictions/:id/appeal {expectedVersion,idempotencyKey,reason} once by active org OWNER/ADMIN. POST /restore additionally confirmed:true, independent current platform ADMIN; conflicts include affiliations even revoked and original reporter/candidate even after source case deletion/recovery. Scope/version/replay guarded before cache, one safe audit and durable notification. New restriction requires explicit restorationCondition and future reviewAt inside existing ACTION/restrict command; transaction rolls back missing condition.
FRONTEND CHANGE: existing moderation review accepts condition; organization link and scope/review/history with appeal; independent moderator can consciously end one restriction. Notifications open organization restriction view. Private underlying report/evidence never exposed; auth/login unchanged.
DEPENDENCIES: CP07-C independence, CP06 revision/idempotency/outbox/intake, CP11 rights and current-authority recovery.
TESTS / TESTED: final current-input full npm run check PASS:140/140 Node tests,32 migrations,both actual restore drills,30/30 mobile/desktop browser executions,lint/typecheck; zero skipped. New API case proves two overlapping restrictions, candidate/affiliated-admin/old-source reporter conflicts, revoked-role replay, stale/unconfirmed/changed payload failures, unchanged process/paused vacancy, one audit/effect, own export and erasure of transferred owner's private appeal. Real browser restrict→org appeal→independent restore with both-role axe/reflow. Real restore replays RESTORED latest authority and ACTIVE post-backup restriction; original reporter cannot restore despite missing source case, old decision is never revived. No skipped tests or suppressed axe; diff check PASS after LF normalization.
ACCEPTANCE CRITERIA: reason/scope/condition/review inspectable without reporter/evidence disclosure; explicit independent human action only; one restoration cannot clear another ACTIVE restriction; final clearance returns organization PENDING for fresh verification, never VERIFIED or automatic republish; old process/Clock A unaffected; appeal/history survive authorized scope and current authority, erased statement cannot return from snapshot.
LEGAL STATUS: synthetic technical foundation only. Sanction proportionality/duration/staffing/legal appeal policy and production activation remain gates; reviewAt is human scheduling, not an automatic expiry or research-certified threshold.
RISK / DEFERRED: current bounded scope is NEW_INTAKE; no candidate restriction/rating, automatic fraud finding, public score or arbitrary punishment policy. Legacy unknown evidence is visibly identified for conscious manual reconstruction. Actual platform MFA, complete moderation policy/research and retention still separate. Restore requires current schema0032 authority; absent current restriction ledger fails closed. Independent authority disaster recovery remains open.
ROLLBACK: disable new restoration/appeal UI/API together while retaining restriction evidence and RESTRICTED intake guard. Do not clear ACTIVE rows or republish as rollback. Forward migration preferred; current-authority replay must remain paired with schema/ledger.
STATUS: bounded local implementation/acceptance DONE; remote PENDING; full CP07/master plan PARTIAL.
NEXT CHECKPOINT: exact local/remote evidence; explicit commute constraint with existing private source-backed estimate and separate unknown listing; remaining legal-safe plan continues.

CP07-E remote acceptance DONE at6be3d1e: [FARO37215164691](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37215164691) and [CI37215164741](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37215164741) SUCCESS, including actual Docker smoke, Node22/24 contracts/recovery and30 browsers. [Draft49](https://github.com/eagleblastmusic-lgtm/Job/pull/49) stays dependent/unmerged. Full CP07/master plan/release PARTIAL.
## CP05-C — Private commute boundary and explicit unknown listing (2026-10-04)
GOAL / DELTA: candidate can declare maximum round-trip minutes per work day; existing own economics estimate is the sole producer, without route inference or remote=zero assumptions.
IMPLEMENTATION: optional maxCommuteMinutes integer0..1440/null in existing revisioned private preferences; omitted field preserves existing value. Current offer-version estimate requires exact ROUND_TRIP_MINUTES_PER_WORK_DAY, nonnegative integer, named source and nonfuture source date. Missing/old/incompatible evidence yields UNKNOWN; above bound KNOWN_NOT_MET. Default listing requires SATISFIED; explicit includeUnknown=true admits UNKNOWN only and labels it, never a known failed condition. Employer projections and process snapshots/clocks remain unchanged; no CV/EHV/net conversion/login delta.
API / UI: GET /api/faro/offers?includeUnknown=true|false (invalid values400); candidate checkbox defaults off/reset on logout. Own preferences enable/disable bound; detail explains three states. No migration; existing private JSON and economics version remain authoritative.
TEST / REVIEW / ACCEPTANCE: full current-input npm run check PASS:142 Node tests,32 migrations,both real restore drills,30 mobile/desktop browser executions,lint/typecheck, zero skips. Two new tests cover exact boundary/zero, wrong basis, negative/fractional/future/old estimates, unknown opt-in, other-user isolation, employer/process unchanged, omitted preference preservation and invalid input. Existing real browser journey covers save/reload, strict exclusion, explicit unknown label, own estimate and strict admission; axe remains enabled. git diff --check PASS.
PRIVACY / LEGAL: candidate-only estimates/constraints; cards carry only own unknown marker. Engineering comparison of self-declared evidence is not verified routing or assessment validity. External provider/legal/research gates remain open; production503 and scheduler disabled.
ROLLBACK / RISK: disable commute filter/UI together while preserving private declarations; do not reinterpret missing evidence as zero or hide failures under unknown. Actual routing/provider freshness policy remains separate.
STATUS: bounded local acceptance DONE; exact remote PENDING; full CP05/master plan/release PARTIAL. Continue remaining legal-safe deltas.
CP05-C exact remote acceptance DONE at76dde71: [FARO37216061628](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37216061628) and [CI37216061412](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37216061412) SUCCESS including actual Docker smoke. [Draft50](https://github.com/eagleblastmusic-lgtm/Job/pull/50) depends on draft49 and remains unmerged. Full plan/release PARTIAL.
## CP10-I — Individual human score amendment (2026-10-04)
GOAL / DELTA: finalized quiz scores now permit explicit task-by-task human correction with reason; this is individual review, not shared answer-key/cohort repair or psychometric validation.
IMPLEMENTATION / MIGRATION:0033 preserves all existing result-history rows and timestamps, extends VALID history with HUMAN_AMENDMENT and rejects invalid validity/reason combinations. Original attempts.result/answers/definition/reviewer/timing stay unchanged; only attempt revision increments. Current finalized result reads latest history, invalidation copies latest corrected evidence. Pinned task maximums, exact task set and integer points required; unanswered stays NULL, not zero. Explicit comparisonStatus INDIVIDUAL_HUMAN_AMENDMENT prevents claims of common deterministic grading.
API / UI: POST /api/faro/attempts/:id/amend-result {expectedVersion,processVersion,idempotencyKey,confirmed:true,reason,scores:{taskId:number|null}} by currently assigned organization member; no candidate/unassigned platform administrator. Before-cache and transactional authorization, stale input/changed key/unconfirmed/no-change denied; cached acknowledgement freshly projects current authorized evidence so subsequent invalidation never revives valid result. Current workspace exposes reason and reviewed points/history; candidate sees corrected score and comparison limitation without answer key/reviewer identity. No locked login delta.
TEST / ACCEPTANCE: full npm run check PASS143 Node/33 migrations/both real restores/30 desktop-mobile browser executions/lint/typecheck, zero skips. New API regression covers pinned original evidence, terminal withdrawal/clock preservation, scope/stale/version/invalid points/missing answers, one bilateral notification/event, fresh replay after invalidation, export/erasure. Actual backup restores original2 and amendment1; actual browser corrects then invalidates with axe. Added populated0033 upgrade assertions were separately executed after final build:1 selected test PASS, zero skips. diff check PASS.
PRIVACY / LEGAL: own process result/reason only; shared-case actor remains audit evidence, not candidate DTO. No hiring automation, global score or certified fairness claim. User has no external legal/assessment/provider/research evidence; gates remain open, production503/scheduler disabled.
ROLLBACK / RISKS: retain additive history and latest-history projection; disabling amendment API/UI together must not resurrect original score as current. Offline backup/controlled migration rehearsal required. Per-recruitment cohort repair/ranking, formal measurement validity and appeals policy remain separate; full CP10/master plan PARTIAL. Local bounded acceptance DONE; exact remote PENDING.
NEXT: shared pinned-key/cohort correction after explicit preview; other legal-safe technical gaps continue.
CP10-I exact remote acceptance DONE atc250d35: [FARO37216770693](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37216770693) and [CI37216770743](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37216770743) SUCCESS including actual Docker smoke. [Draft51](https://github.com/eagleblastmusic-lgtm/Job/pull/51) depends on draft50; full CP10/master plan/release PARTIAL.
## CP10-J — Previewed common-key cohort correction (2026-10-04)
GOAL / DELTA: an authorized human can correct objective accepted-answer options consistently for all current VALID finalized attempts of one pinned company-assessment version, with inspectable effects instead of silent key mutation.
IMPLEMENTATION / MIGRATION:0034 records immutable separate key-correction revision/id, accepted-option sets, reason/date and actor with erasure SET NULL; original definition/rubric/tasks/weights and attempts.result/answers/reviewer/timing are untouched. Append-only result history holds prior individual/common scores; current score uses latest VALID history and shared scoringRevision. This does not equate different tests or different correction revisions.
API / UI: POST /assessments/:id/versions/:version/key-correction/preview {acceptedOptions:{taskId:number[]},reason}; POST same path without /preview {same payload,previewToken,confirmed:true,replaceIndividualAmendments,idempotencyKey}. Existing assigned-member scope before cache and transaction. Snapshot fingerprint uses whole exact group/definition/current correction/current process revisions and proposed key/reason/actor; stale preview409. Preview includes every attempt with before/after/state, including invalid or unfinished results. Any INVITED/STARTED/SCORED_PENDING_REVIEW blocks apply, never change key mid-attempt. INVALIDATED stays invalid; EXPIRED/TECHNICAL_ISSUE untouched. Individual score replacement requires additional explicit acknowledgement; all VALID finalized rows receive shared revision atomically, including terminal processes whose decisions/clocks remain unchanged. Limit500 is operational review capacity, not a quality/fraud threshold; over-limit fails closed. Corrected versions no longer accept fresh assignment/technical retry; new candidates require a genuinely new reviewed/approved definition version. Employer review labels original pinned key, current result labels common correction. Candidate DTO has no accepted options/keys/actors. Locked login unchanged.
TEST / ACCEPTANCE: final npm run check PASS144 Node/34 migrations/both real restore drills/30 browser executions/lint/typecheck, zero skips; diff check PASS. New multi-candidate API regression: incomplete live group block, stale group/manual revision, malformed options, current scopes/replay/revocation, explicit manual replacement, invalidated and unanswered retention, unchanged original evidence and process decisions, distinct later common revision, future assignment refusal, erasure. Actual browser preview/ack/apply→visible corrected result→invalidation with axe/reflow320. Actual restore keeps original2/individual1/common2, archived key and scoringRevision; erased author remains NULL.
PRIVACY / LEGAL / LIMITS: own per-process history only, common reason safe template events to each involved candidate/assigned team; no global ranking, automatic hiring decision or psychometric/legal certification. Full CP10 includes further advanced tasks/assessment wallet/ranking validation and external gates; these are not marked DONE. Source/header correction reason must omit private identities. Production503/scheduler remain closed.
ROLLBACK: disable correction UI/API together, retain header/history/latest result projection and corrected-version assignment fence. Never revert to uncorrected score as current or erase old evidence. Offline backup/rehearsal required for migration. Bounded local acceptance DONE; exact remote PENDING; full CP10/master plan/release PARTIAL.
NEXT: current remote acceptance, then consent-gated minimal Canonical product analytics/meaningful progression and remaining legal-safe gaps.
## CP11-G — Optional product progression, 2026-10-05
Closed existing-store producer derives one consenting candidate-offer pair/week from actual bilateral completed interview; payload only version/week/stage. No invitations/rejections/client properties. Revocation/erasure/recovery remove product telemetry; security audit stays independent. Full check145 Node/34 migrations/both restores/30 browsers/lint/typecheck PASS, zero skips. See [implementation and limits](CP11_G_PRODUCT_ANALYTICS.md). Local bounded acceptance DONE, exact remote PENDING; full CP11/master plan/release PARTIAL. Next: authored task-level guidance for existing activity nodes, without ESCO/license/measurement certification. Locked login/invariants remain unchanged.
## CP03-D — Authored activity guidance, 2026-10-06
Five existing activity nodes now expose immutable versioned task examples for three descriptive levels in the catalog and actual declaration/proposal/offer editor. AUTHOR_DRAFT, optional help, not validated anchors/certification/ESCO mapping. Stored claims/snapshots/matching/projections unchanged. [Scope and evidence](CP03_D_ACTIVITY_GUIDANCE.md): full check146 Node/34 migrations/both restores/30 browsers/lint/typecheck PASS, zero skips. Bounded local acceptance DONE; exact remote PENDING; full CP03/master plan/release PARTIAL. Next: distinct operational count of mutually completed interviews using existing reliability producer, not invitations/rejections as success.
## CP07-F — Distinct mutually completed stage, 2026-10-06
Existing own-organization operational report now verifies mutual completion against actual interview flags/completion event and counts distinct processes separately from invitation/confirmed appointment/rejection. [Scope and evidence](CP07_F_COMPLETED_STAGE_FACTS.md): full check147 Node/34 migrations/both restore drills/30 browsers/lint/typecheck PASS, zero skips. Local bounded acceptance DONE; exact remote PENDING; full CP07/master plan/release PARTIAL. Next: expose existing full native conditions/process/economics provenance in comparison; no tax/routing invention.
CP07-F exact remote acceptance DONE at4577587: [FARO37380483247](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37380483247) and [CI37380483273](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37380483273) SUCCESS. Draft55 remains dependent/unmerged; full plan/release PARTIAL.

## CP09-B — Native comparison and scenario provenance, 2026-10-06
Existing authorized Offer/Economics DTOs now expose all salary variants, current offer version/native conditions/process promises, selected private scenario version and source/date/assumptions/calculation version. No tax/route provider, EHV, winner or employer disclosure. Stale scenario warnings only accompany scenario-derived cells, never current conditions. [Scope](CP09_B_NATIVE_COMPARISON.md). Full npm run check PASS147 Node/34 migrations/both actual restore drills/30 browser executions/lint/typecheck, zero skips; exact remote pending; full CP09/master plan/release PARTIAL. Next: browser offline/session-expiry boundary and remaining legal-safe gaps. Locked login preserved; external gates remain open.

## CP11-H — Real network loss and expired-session boundary, 2026-10-06
Existing API client distinguishes connection failure/offline without replaying commands, preserves abort behavior, and puts expired-session notice on the locked login after clearing private state. Real Chromium mobile/desktop test: offline PUT fails and original profile persists, read retry recovers, keyboard skip focuses content, actual public-shell CacheStorage contains no API entries, actual expired sessions row yields401/cleared workspace/empty password and axe PASS. No auth markup/style change, offline write queue, private cache or MFA claim.
Full npm run check PASS147 Node/34 migrations/both actual restore drills/32 browser executions/lint/typecheck, zero skips. Exact remote pending. Full CP11/master plan/release PARTIAL; manual accessibility acceptance, MFA/recovery, PostgreSQL and external gates remain open. Next: current authority session revocation with reauthentication, using existing sessions/security path.

CP09-B exact remote acceptance DONE at4d15f5b: FARO37381779711 and CI37381779799 SUCCESS (also push FARO37381743126 SUCCESS). Draft56 stays dependent/unmerged; no release approval.

CP11-H exact remote acceptance DONE atd340f83: [FARO37382563175](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37382563175) and [CI37382563222](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37382563222) SUCCESS. Draft57 remains dependent/unmerged; full plan/release PARTIAL.

## CP02-G — Reauthenticated revoke-all sessions, 2026-10-06
Existing privacy workspace and sessions table now support confirmed exact-current-password revocation of every own session, including current, with atomic minimal security audit and cookie expiry. Wrong password keeps workspace; foreign origin/target denied or ignored. [Scope](CP02_G_SESSION_REVOCATION.md). Full check148 Node/34 migrations/both actual restores/32 browsers PASS. After final password-preservation and audit-rollback regression changes: typecheck/full148 Node/targeted2 browsers/current lint/diff-check PASS; unchanged migrations/restore inputs retain preceding proof. Zero skips. Bounded local acceptance DONE; exact remote pending. MFA/recovery/privileged step-up and full CP02/K019/master plan/release PARTIAL. Next: descriptive process progression gaps through existing own-organization report, no fraud thresholds or automatic sanctions.

## CP07-G — Recorded progression gaps, 2026-10-06
Existing own-organization aggregate report response-cohort-v3 shows exact distinct-process complements for no recorded ADVANCE/no recorded confirmed interview, denominator all retained cohort including rejection/withdrawal/immature cases. UI explicitly distinguishes absence of an event from fraud, missing external interview or overdue next stage. [Scope](CP07_G_PROGRESSION_GAPS.md). Full npm run check PASS148 Node/34 migrations/both actual restores/32 browsers/lint/typecheck, zero skips; diff check PASS. No thresholds, automatic cases/restrictions, public reputation or ranking input. Local bounded acceptance DONE; exact remote pending; full CP07/master plan/release PARTIAL. Next: manual open-answer assessment foundation with pinned rubric, no automatic grading or executable uploads.

CP02-G exact remote acceptance DONE at44bf3ca: [FARO37383213563](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37383213563) and [CI37383213360](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37383213360) SUCCESS. CP07-G exact remote acceptance DONE ata81e015: [FARO37383663019](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37383663019) and [CI37383663160](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37383663160) SUCCESS. Draft58/59 remain dependent/unmerged; full plan/release PARTIAL.

## CP10-K — Manual open-answer foundation, 2026-10-06
Extends existing approved pinned definitions/attempts with explicit OPEN_ANSWER/HUMAN, authored per-task criteria, bounded private text save/reconnect, no automatic points, exact human review of every answered task and null for missing answers. Original rubric/text/score survive new drafts and amendments; quiz-key correction forbidden. [Scope and limits](CP10_K_MANUAL_OPEN_ANSWER.md). Final npm run check PASS149 Node/34 migrations/both actual restore drills/34 desktop/mobile browser executions/lint/typecheck, zero skips; diff check PASS. Real create/edit/start/save/reload/submit/manual score and both-role axe/reflow320; export/erasure and actual restored original2/amendment1, pinned text/rubric and erased reviewer NULL. Local bounded acceptance DONE; exact remote pending. Full CP10 assessment validation/advanced tasks/wallet and master plan/release PARTIAL. Next: privileged MFA/recovery using existing identity/session boundary, with fail-closed protected secret configuration.

CP10-K exact remote acceptance DONE at66635b4: [FARO37384886723](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37384886723) and [CI37384886582](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37384886582) SUCCESS. Draft60 remains dependent/unmerged; full plan/release PARTIAL.

## CP02-H — Protected MFA and one-use recovery, 2026-10-06
Extends existing sessions with encrypted TOTP setup, mandatory production privileged MFA, five-minute session verification and one-use password-confirmed recovery. Private API gates recheck authorization after request body; active secret replacement requires current second factor. Current-authority restore preserves consumed counters/recovery codes and drops session grants. Locked login unchanged. [Scope](CP02_H_PROTECTED_MFA.md). Full npm run check PASS152 Node/35 migrations/both actual restore drills/36 desktop/mobile browser executions/lint/typecheck, zero skips; diff check PASS. RFC vectors, actual HTTP expiry during body, replay/rate limits, private export and real accessible enrollment/recovery covered. Local bounded acceptance DONE; exact remote pending. Protected operator key lifecycle, independent security review, PostgreSQL, external acceptance and full master plan/release remain PARTIAL. Next: remaining canonical plan delta using existing authoritative service, without bypassing external gates.

CP02-H exact remote acceptance DONE at2f90e5b: [FARO37387892167](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37387892167) and [CI37387892042](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37387892042) SUCCESS. Draft61 remains dependent/unmerged; full plan/release PARTIAL.


## CP06-J — Concrete pinned employment offer, 2026-10-06
Existing OFFER/ACCEPT_OFFER now require confirmed published native conditions, exact selected salary amount, start/response dates and candidate confirmation of exact unexpired revision. Private event snapshot survives new drafts and actual recovery; legacy free-text offer cannot be silently accepted. Existing HIRED enum UI means confirmed offer acceptance, not proof of employment commencement. [Scope](CP06_J_EMPLOYMENT_TERMS.md). Full check PASS153 Node/35 migrations/both actual restore drills/38 desktop/mobile browsers/lint/typecheck, zero skips. Final added account-erasure assertion targeted regression/typecheck/lint PASS; unchanged production code and preceding broader evidence retained. Diff check PASS. Bounded local acceptance DONE; exact remote pending. Full CP06/master plan/release PARTIAL. Next: executable PostgreSQL staging data rehearsal, with application runtime cutover kept explicit and uncompleted.


CP06-J exact remote acceptance DONE at6def302: [FARO37389049374](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37389049374) and [CI37389047911](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37389047911) SUCCESS. Draft62 remains dependent/unmerged; full plan/release PARTIAL.


## CP11-I — Executable PostgreSQL staging rehearsal, 2026-10-06
Read-only current-schema snapshot feeds new isolated PostgreSQL schema via pinned pg8.23.1, one client/transaction and parameterized values. Counts/hashes, source row order/consent trigger, FKs/CHECKs/indexes, rollback and source unchanged are required. [Scope and open runtime work](CP11_I_POSTGRES_REHEARSAL.md). Local source-only PASS70 tables/35 migrations, lint/typecheck/syntax/diff-check PASS. Real PostgreSQL18/Node22+24 CI defined; actual acceptance PENDING, not DONE. Application runtime remains SQLite and production Canonical503/worker gates remain closed. Broader unchanged153 Node/both restores/38 browsers have CP06-J exact remote acceptance; new-head full remote checks pending. Continue from actual PostgreSQL errors if any, then production runtime adapter/rehearsal; no audit restart or fake cutover.


CP11-I exact remote acceptance DONE for staging-data scope at7c05f87: [FARO37389939763](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37389939763) and [CI37389940077](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37389940077) SUCCESS. Actual PostgreSQL18 jobs Node22/24 PASS70 tables/35 migrations/counts/hashes/FKs/checks/consent/rollback/source-readonly. Earlierfe39731 failure fixed, no skips or criterion changes. Draft63 dependent/unmerged. Application runtime is SQLite; full CP11/master plan/release PARTIAL.


## CP11-J — Confirmed offer stage telemetry, 2026-10-06
Extends the existing closed optional progression producer with actual owning-candidate acceptance of matching published/pinned human offer terms. Definition v2 shares stable v1 pair/week dedupe namespace; existing v1 interview evidence remains unchanged and cannot gain a second count from accepted offer. Minimal payload, candidate consent/withdrawal/erase/recovery default-off and operational separation preserved. [Scope](CP11_J_OFFER_STAGE_ANALYTICS.md). Full check PASS153 Node/35 migrations/both actual restores/38 browsers/lint/typecheck, zero skips; targeted cross-stage/historical-v1 and actual offer/absence-of-consent regressions PASS. Restore fixture now requires both legitimate new accepted-offer and synthetic old telemetry before backup, still zero after fresh-consent recovery. Diff check PASS. Bounded local acceptance DONE, exact remote pending; full NSM/CP11/master plan/release PARTIAL. [External acceptance packet](EXTERNAL_ACCEPTANCE_PACKET.md) records user-reported missing evidence, exact scopes/reviewer artifacts/retention decision sheet without fabricated approvals. Next: async PostgreSQL transaction boundary consumed by real staging rehearsal, then remaining runtime/cutover deltas.


## CP11-K — Async PostgreSQL transaction boundary, 2026-10-06
Real staging importer now consumes PgJobDatabase: owner-scoped async single-connection transactions, serialization, SERIALIZABLE isolation, timeout/rollback, safe SQLSTATE and late-scope/nested protection. [Scope](CP11_K_ASYNC_POSTGRES_BOUNDARY.md). Source-only70 tables/35 migrations/syntax/typecheck/lint PASS; actual two-connection conflict/caught-failure/late-write and broader CI acceptance PENDING. Runtime remains SQLite and all external/release gates open. Continue with actual CI root causes if any before production repository adaptation; no synchronous worker bridge or shadow store introduced.


CP11-J exact remote acceptance at01e33b6: [FARO37391162935](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37391162935) and [CI37391162982](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37391162982) SUCCESS. CP11-K exact remote acceptance atbd8b141: [FARO37391574567](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37391574567) and [CI37391574640](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37391574640) SUCCESS, including real PostgreSQL18 Node22/24 transaction/scope/conflict proof. Draft64/65 remain dependent/unmerged. Full plan/release PARTIAL.

## CP11-L — Shared profile read model, 2026-10-06
Existing Canonical SQLite producer and real async PostgreSQL staging share explicit queries/mapping; synchronous commands preserved. Read-only snapshot batch and safe integer conversion have real database regression requirements. [Scope](CP11_L_PORTABLE_PROFILE_READ.md). Source-only70/35 PASS; full application and exact remote evidence pending. Runtime remains SQLite; whole CP11/master plan/release PARTIAL. Continue from actual acceptance, then remaining async repository/current-authority/cutover deltas.

CP11-L full local npm run check PASS153 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips; source-only70/35 and diff-check PASS. Exact real PostgreSQL and remote checks pending.

## CP11-M — Shared published offer read, 2026-10-06
Existing offer producer and PostgreSQL staging share explicit current/published reads and unchanged intake gates in an owned snapshot. Pending draft content stays private; missing proof/revoked membership/expiry cannot enable intake. [Scope](CP11_M_PORTABLE_OFFER_READ.md). Source-only70/35 PASS; full application and actual PostgreSQL acceptance pending. Runtime SQLite, whole CP11/master plan/release PARTIAL.

CP11-L exact remote acceptance at207adcd: [FARO37440425309](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37440425309) and [CI37440425276](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37440425276) SUCCESS. Actual PostgreSQL18 Node22/24 profile-wire/read-only-batch/safe-integer and preceding staging proof PASS. Draft66 remains dependent/unmerged; runtime SQLite, full plan/release PARTIAL.

CP11-M full local npm run check PASS153 Node/35 migrations/both actual restores/38 desktop/mobile browser executions/lint/typecheck, zero skips; source-only70/35 and diff-check PASS. Actual PostgreSQL and exact remote acceptance pending.

## CP11-N — Shared profile save command, 2026-10-06
Existing synchronous profile save and real async PostgreSQL staging share validation/parameterized write plan, guarded revision and atomic phone-grant revocation/audit. Structured clarification keeps existing availability parser semantics. [Scope](CP11_N_PORTABLE_PROFILE_WRITE.md). Source-only70/35 PASS; full application and actual PostgreSQL acceptance pending. Runtime remains SQLite; whole CP11/master plan/release PARTIAL. Continue with actual database errors if any, then remaining command/current-authority conversion.

CP11-M exact remote acceptance at9beab73: [FARO37441227370](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37441227370) and [CI37441227307](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37441227307) SUCCESS. Actual PostgreSQL18 Node22/24 published/current wire parity, unpublished draft isolation and intake proof regressions PASS. Draft67 remains dependent/unmerged; runtime SQLite, whole plan/release PARTIAL.

CP11-N full local npm run check PASS153 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips; source-only70/35 and diff-check PASS. Exact actual PostgreSQL and remote acceptance pending.

## CP11-O — Shared private constraints write, 2026-10-06
Existing constraints command and actual PostgreSQL staging share guarded validation/update, preserving omitted salary/commute and requiring explicit null to remove. [Scope](CP11_O_PORTABLE_PRIVATE_CONSTRAINTS.md). Source-only70/35 PASS; full application and actual PostgreSQL acceptance pending. Runtime SQLite; whole CP11/master plan/release PARTIAL. Continue remaining profile commands/repositories and current-authority conversion after actual acceptance.

CP11-N atfd9ee0e: [FARO37441865147](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37441865147) SUCCESS, including actual PostgreSQL18 Node22/24 profile writes and atomic phone-grant/audit/profile rollback. [CI37441865183](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37441865183) still in progress at this observation. Draft68 dependent/unmerged; runtime SQLite, whole plan/release PARTIAL.

CP11-O full local npm run check PASS153 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips; source-only70/35 and diff-check PASS. Exact actual PostgreSQL and remote acceptance pending.

## CP11-P — Shared profile evidence commands, 2026-10-06
Existing own claim/revoke/learning/activity/proposal producers and real PostgreSQL staging share validation and parameterized commands. Retained claim history, owning pending decisions, explicit confirmation and DECLARED verification preserved; local questions do not become competence automatically. [Scope](CP11_P_PORTABLE_PROFILE_EVIDENCE.md). Full application and actual PostgreSQL acceptance pending. Runtime SQLite; full CP11/master plan/release PARTIAL. Continue actual acceptance then remaining organization/offer/process/assessment/privacy/current-authority repositories.

CP11-N final CI37441865183 SUCCESS atfd9ee0e supersedes the previous pending note; FARO37441865147 also SUCCESS. CP11-O exact acceptance at7526d41: [FARO37442510890](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37442510890) and [CI37442510741](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37442510741) SUCCESS, including PostgreSQL18 Node22/24 private constraints save/preserve/remove/refusal proof. Draft68/69 dependent/unmerged; runtime SQLite, full plan/release PARTIAL.

CP11-P full local npm run check PASS153 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips; final source-only70/35 and diff-check PASS. Exact actual PostgreSQL and remote acceptance pending.

## CP11-Q — Shared organization access reads, 2026-10-06
Existing FaroStore membership/affiliation and own organization list share explicit queries with actual PostgreSQL. Exact active role scopes and opaque404 retained; historical affiliation survives revocation for moderator independence. [Scope](CP11_Q_PORTABLE_ORGANIZATION_ACCESS.md). Source-only70/35 PASS; full application and actual PostgreSQL acceptance pending. Runtime SQLite; whole CP11/master plan/release PARTIAL. Continue organization writes and remaining repositories/current-authority work after real acceptance.

CP11-P exact remote acceptance at951682f: [FARO37443239641](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37443239641) and [CI37443239626](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37443239626) SUCCESS. Actual PostgreSQL18 Node22/24 private claims/learning/activity/proposal history, ownership, confirmation, pinned-skill and rollback regressions PASS. Draft70 dependent/unmerged; runtime SQLite, full plan/release PARTIAL.

CP11-Q full local npm run check PASS153 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips; source-only70/35 and diff-check PASS. Exact actual PostgreSQL and remote acceptance pending.

## CP11-R — Shared organization create/verify commands, 2026-10-06
Existing create and independent moderator verification share parameterized plans with real PostgreSQL staging. Owner/audit transaction, current ADMIN, historical affiliation and RESTRICTED separation preserved; synthetic fixture is not external qualification. [Scope](CP11_R_PORTABLE_ORGANIZATION_VERIFICATION.md). Source-only70/35 PASS; full application and actual PostgreSQL acceptance pending. Runtime SQLite; full CP11/master plan/release PARTIAL. Continue invites/membership and remaining repositories/current-authority conversion after actual acceptance.

CP11-Q exact remote acceptance at6728484: [FARO37443951948](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37443951948) and [CI37443951915](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37443951915) SUCCESS. Actual PostgreSQL18 Node22/24 membership/list parity, exact role allowlists, revoked access and retained affiliation proof PASS. Draft71 dependent/unmerged; runtime SQLite, full plan/release PARTIAL.

CP11-R full local npm run check PASS153 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips; source-only70/35 and diff-check PASS. Exact actual PostgreSQL and remote acceptance pending.

## CP11-S — Shared invitations and atomic membership revoke, 2026-10-06
Existing invite/accept/revoke and real PostgreSQL share parameterized plans. Closes actual SQLite revoke-before-audit transaction gap; new real API failure regression PASS. Exact email/unused/expiry, hash-only token, owner protection, approved reactivation and historical affiliation retained. [Scope](CP11_S_PORTABLE_MEMBERSHIP_COMMANDS.md). Source-only70/35 and targeted4 API tests PASS; full application and PostgreSQL acceptance pending. Runtime SQLite; whole CP11/master plan/release PARTIAL. Continue remaining offer/process/assessment/auth/privacy/current-authority repositories after actual acceptance.

CP11-R exact remote acceptance at3e76704: [FARO37444776127](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37444776127) and [CI37444776137](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37444776137) SUCCESS. Actual PostgreSQL18 Node22/24 create/FK rollback, independent moderator/historical conflict/restriction and audit rollback proof PASS. Draft72 dependent/unmerged; runtime SQLite, full plan/release PARTIAL.

CP11-S full local npm run check PASS154 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips; source-only70/35, targeted4 API tests and diff-check PASS. Exact actual PostgreSQL and remote acceptance pending.

## CP11-T — Controlled PostgreSQL connection loss, 2026-10-06
Consumed adapter handles idle driver errors/end, fails closed and rechecks readiness for queued scopes. Real PostgreSQL must terminate an isolated backend and prove controlled refusal without losing healthy connection. [Scope](CP11_T_POSTGRES_CONNECTION_LOSS.md). Source-only70/35/typecheck/lint/diff-check PASS; exact remote pending. Runtime remains SQLite; previous CP11-S full154/both restores/38 browsers retained. Whole plan/release PARTIAL; continue actual acceptance then remaining repositories/current-authority conversion.

## CP11-U — Shared atomic offer draft create, 2026-10-06
Existing parseOffer and draft producer remain authoritative; PostgreSQL consumes the same native validation/write plan under SERIALIZABLE, with current own creator/recruiter role checks and atomic version/assignment/audit. [Scope](CP11_U_PORTABLE_OFFER_DRAFT.md). Source-only70/35 PASS; full application and actual PostgreSQL acceptance pending. Runtime SQLite; full CP11/master plan/release PARTIAL. Continue actual acceptance then offer edit/lifecycle and remaining repositories/current-authority conversion.

CP11-S exact remote acceptance atb1f6b8f: [FARO37445963925](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37445963925) and [CI37445963899](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37445963899) SUCCESS. CP11-T exact acceptance atc446669: [FARO37446143207](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37446143207) and [CI37446143344](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37446143344) SUCCESS. Real PostgreSQL18 Node22/24 membership/hash/expiry/role/rollback and actual idle backend termination proof PASS; full154 Node/both restores/38 browser CI retained, no skips. Draft73/74 dependent/unmerged; runtime SQLite, whole plan/release PARTIAL.

CP11-U full local npm run check PASS154 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips; source-only70/35 and diff-check PASS. Exact actual PostgreSQL and remote acceptance pending.

## CP11-V — Shared atomic offer version edit, 2026-10-06
Existing edit and actual PostgreSQL share guarded native version write plan, current assignment/creator/recruiter checks, immutable prior content and approval reset. [Scope](CP11_V_PORTABLE_OFFER_EDIT.md). Source-only70/35 PASS; full application and actual PostgreSQL acceptance pending. CP11-U actual failure94cbb07 fixed at61cc962: fault-injection CHECK now enforces new inserts without rejecting retained history; rollback criterion unchanged. Runtime SQLite; whole plan/release PARTIAL. Continue actual acceptance then lifecycle/outbox and remaining repositories/current-authority conversion.

CP11-V full local npm run check PASS154 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips; source-only70/35 and diff-check PASS. Exact actual PostgreSQL and remote acceptance pending. CP11-U fix61cc962 actual PostgreSQL18 Node22/24 PASS; full FARO37447143779/CI37447143553 still pending at this observation.

CP11-U fixed61cc962 exact acceptance: [FARO37447143779](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37447143779) and [CI37447143553](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37447143553) SUCCESS. CP11-V abdf320 exact acceptance: [FARO37447404367](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37447404367) and [CI37447404336](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37447404336) SUCCESS, including PostgreSQL18 Node22/24 atomic create/edit, retained publication/history, no-op and real audit rollback. Initial U failure remains recorded; fixed injection enforces new writes without invalidating retained history. Draft75/76 dependent/unmerged; runtime SQLite, full plan/release PARTIAL.

## CP11-W — Shared atomic offer lifecycle/outbox, 2026-10-06
Existing publication/reconfirmation/pause/close/archive producer and real PostgreSQL share revision/status checks, explicit confirmation, current organization/recruiter authority and atomic version-proof/audit/outbox commands. Recipient union and exact dedupe key retained; unrelated outbox errors now fail the entire command rather than being ignored. [Scope](CP11_W_PORTABLE_OFFER_LIFECYCLE.md). Full application and actual PostgreSQL acceptance pending. Runtime SQLite; full CP11/master plan/release PARTIAL. Continue actual acceptance then remaining offer discovery/process/assessment/auth/privacy/current-authority repositories.

CP11-W full local npm run check PASS154 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips; source-only70/35 and diff-check PASS. Exact actual PostgreSQL and remote acceptance pending.

## CP11-X — Shared offer listing/private conditions, 2026-10-06
Existing public/own-organization listing and actual PostgreSQL consume shared explicit queries and the existing private condition evaluator. Only current intake-approved publications enter candidate results; unknown opt-in never admits a known failure. Own organization lists remain role scoped and show current drafts. [Scope](CP11_X_PORTABLE_OFFER_LIST.md). Full application and actual PostgreSQL acceptance pending. Runtime SQLite; whole CP11/master plan/release PARTIAL. Continue actual acceptance then remaining detail/process/assessment/auth/privacy/current-authority work.

CP11-X full local npm run check PASS154 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips; source-only70/35 and diff-check PASS. Exact actual PostgreSQL and remote acceptance pending.

CP11-W46ffc46 exact remote acceptance: [FARO37448510362](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37448510362) and [CI37448510341](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37448510341) SUCCESS. Real PostgreSQL18 Node22/24 publication/explicit confirmation/current authority/outbox rollback/dedupe/original publication time/close/archive proof PASS; full application/browser/image proof retained. Draft77 dependent/unmerged; runtime SQLite, full plan/release PARTIAL.

## CP11-Y — Shared private offer detail/history read, 2026-10-06
Existing detail and actual PostgreSQL share active assignment, own process/watch, native profile explanation and private conditions. Candidate viewers see proven publication; assigned members keep current draft visibility. Native insertion order for latest own process is retained with reviewed target identity, including backdated/equal clocks. [Scope](CP11_Y_PORTABLE_OFFER_DETAIL.md). Full application and actual PostgreSQL acceptance pending. Runtime SQLite; whole CP11/master plan/release PARTIAL. Continue actual acceptance then remaining process/assessment/auth/privacy/current-authority conversion.

CP11-X0e9c483 exact acceptance: [FARO37449170085](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37449170085) and [CI37449170043](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37449170043) SUCCESS. Actual PostgreSQL18 Node22/24 public/organization list wire parity, foreign-org refusal, known-failure exclusion and private commute current/stale/unknown proof PASS. Draft78 dependent/unmerged; runtime SQLite, full plan/release PARTIAL.

CP11-Y full local npm run check PASS154 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips; source-only70/35 and diff-check PASS. Exact actual PostgreSQL and remote acceptance pending.

## CP11-Z — Shared atomic command journal, 2026-10-06
Existing recruitment/interview/assessment/trust commandOnce consumes shared key/hash/read/replay/save plans. Real async PostgreSQL owns SERIALIZABLE command/work/journal scope and requires current-authority callback before every replay. Existing synchronous callers keep their current authorization checks and command contract. [Scope](CP11_Z_PORTABLE_COMMAND_JOURNAL.md). Full application and actual PostgreSQL acceptance pending. Runtime SQLite; whole CP11/master plan/release PARTIAL. Continue actual acceptance then remaining native process commands/assessment/auth/privacy/current-authority conversion.

CP11-Z full local npm run check PASS154 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips; source-only70/35 and diff-check PASS. Exact actual PostgreSQL and remote acceptance pending.

CP11-Z initial9b09124 real PostgreSQL failed retained hash comparison after the new journal proof: the synthetic successful acknowledgement was not removed alongside its temporary process/outbox changes. Fix removes only the exact synthetic employer/key journal row after all replay/rollback/current-authority assertions, restoring the original snapshot before the unchanged70-table comparison. No assertion skipped or relaxed; full real PostgreSQL rerun required. Local application154/35/both restores/38 browser proof remains valid because runtime code is unchanged.

CP11-Y48b227e exact acceptance: [FARO37449975250](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37449975250) and [CI37449975261](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37449975261) SUCCESS. CP11-Z fixe6cba56 exact acceptance: [FARO37450962160](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37450962160) and [CI37450962143](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37450962143) SUCCESS. Actual PostgreSQL18 Node22/24 private detail/history ordering and journal rollback/replay/current-authority proof PASS with original70-table hash comparison retained. Initial Z9b09124 fixture failure remains recorded and is superseded by the fixed full rerun. Draft79/80 dependent/unmerged; runtime SQLite, whole plan/release PARTIAL.

## CP11-AA — Shared native interest/projection/event commands, 2026-10-06
Existing interest producer and actual PostgreSQL share explicit projection preview/hash, intake/version/confirmation/active/history checks, immutable minimized snapshot/response clock and event/audit/outbox plans. Idempotent async command owns all writes under current-authority callback. [Scope](CP11_AA_PORTABLE_INTEREST.md). Full application and actual PostgreSQL acceptance pending. Runtime SQLite; whole CP11/master plan/release PARTIAL. Continue actual acceptance then remaining native process transitions/read/assessment/auth/privacy/current-authority conversion.

CP11-AA local full npm run check PASS154 retained Node tests/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips. Added real API regression then rebuilt and ran the complete recruitment file:17/17 PASS, including the new rollback/retry/replay test (155 distinct Node tests covered across retained full run plus new targeted regression). No runtime change after the full run. Source-only70/35 and diff-check PASS. Exact actual PostgreSQL and remote155-test acceptance pending.

CP11-AA5fece10 [FARO37451873621](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37451873621) SUCCESS: actual PostgreSQL18 Node22/24 native interest/projection/history/event/outbox/journal rollback proof, all preceding70-table hashes/constraints/current-authority proofs, contracts, full155 Node compatibility,38 desktop/mobile browser executions and actual container closed-release smoke PASS, no skips. [CI37451873766](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37451873766) still in progress at this observation. Local full154 retained Node/both restores/38 browsers plus17/17 recruitment including new API regression PASS. Draft81 dependent/unmerged; runtime SQLite, whole CP11/master plan/release PARTIAL.

Continuation: retain this accepted code head and existing shared command/projection/event plans. Next CP11-AB is remaining native process read/transition commands and current-authority async conversion, then assessment/interview/auth/privacy/worker/target recovery/operator cutover work already listed. Do not restart audit/project or rerun valid proof without a concrete invalidating delta. Independent review of draft chain and external legal/provider/research/measurement/manual gates remain open.

CP11-AA final acceptance observed2026-10-07: CI37451873766 SUCCESS at5fece10, superseding the previous pending note; FARO37451873621 also SUCCESS. All required155 Node/35 migrations/both actual restore drills/38 real browser executions/actual PostgreSQL18 Node22/24/image closed-release proof PASS. Runtime SQLite; draft81 remains unmerged and full plan/release PARTIAL.

## CP11-AB — Shared private process view/context, 2026-10-07
Existing process row/view, pinned offer-version and latest clarification/employment terms consume shared explicit query/response plans with actual PostgreSQL. Active current membership/assignment and owning candidate access remain scoped; immutable projection/history and original clocks retained. Historical ANSWER free-text action stays redacted and latest-event insertion order still controls generic next action even under backdated clocks. [Scope](CP11_AB_PORTABLE_PROCESS_VIEW.md). Full application and real PostgreSQL acceptance pending. Runtime SQLite; full CP11/master plan/release PARTIAL. Continue actual acceptance then native process transitions and remaining assessment/interview/auth/privacy/worker/current-authority conversion.

CP11-AB full local npm run check PASS155 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips; source-only70/35 and diff-check PASS. Exact real PostgreSQL and remote acceptance pending.
