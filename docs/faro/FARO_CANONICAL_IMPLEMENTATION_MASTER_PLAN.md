# FARO CANONICAL IMPLEMENTATION MASTER PLAN

Version 1.0 — 2026-09-16. **PLAN COMPLETE; implementation not started in this initial version.**

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
