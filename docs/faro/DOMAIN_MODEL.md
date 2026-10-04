# Faro implemented domain

| Aggregate | Stored contract | Main boundary |
|---|---|---|
| Organization | verification, active membership, invitations, offer assignment | Membership alone is not access to every process |
| Profile | first name, private phone/availability, version | Employer DTO is separately constructed |
| Skills | activity, pending proposal, versioned declared claim, learning intent | Explicit confirmation; no global score |
| Offer | lifecycle/revision, salary-required immutable content versions | Approval invalidated on material edit |
| Interest | candidate-offer relation, original offer version and projection | Typed commands, actor, version, idempotency |
| Process event | kind, actor, data and occurrence time | Timeline independent of latest profile |
| Watch | private candidate-offer relation | Does not create interest or employer watcher list |
| Contact grant | candidate/process/org, grant/revocation time | Explicit, revocable, eligible nonterminal process |
| Assessment | versioned quiz definition, approval, attempt and result review | Server expiry; no hire/reject authority |
| Trust case | report/signal, human review, decision, appeal | No global candidate reputation or automated fake-company verdict |
| Economics | private offer-version scenario, assumptions/source/date/calculation version | Manual estimate; no EHV/Life Score |
| Erasure ledger | subject hash, timestamp, local policy version | Restore reconciliation still required |

See the master plan for the target state machine and exact unfinished acceptance contracts. Interview entities, complete assessment transition coverage and external taxonomy/AI activation are not implied by this implemented-table inventory.
# Interview aggregate

Interview is separate from InterestStatus and CurrentStage: PROPOSED → CONFIRMED → COMPLETED, with CANCELLED and DISPUTED exits. Proposed slots are not obligations. Candidate acceptance of the recruiter's confirmed proposal atomically checks all confirmed participant bookings. All dates are UTC with an IANA display zone. Both completion reports are required; discrepancy/no-show opens human review without automatic restriction. Expired proposals release the pending stage neutrally. Terminal recruitment cancels live slots and live assessment attempts. Rescheduling uses explicit cancellation followed by a new proposal, retaining history.

Private profile preferences now hold explicit work model/contract/night/weekend boundaries with a profile revision. Matching combines deterministic requirement explanations with separate user-selected condition states; these are not a global score and never imply a verified skill. Only published structured offer fields enter condition evaluation.

ContactGrant remains process-scoped and candidate-controlled. The exact private number is confirmed at grant time; any subsequent profile number change revokes all grants in the same transaction. Stage progression never creates a grant.

Assessment result finalization is a human, revision-guarded command. The pinned objective breakdown/rubric remains unchanged; a conscious review adds note/reviewer/time and one result-review audit/event. It does not change first-response clock, global ranking or an employment decision. Result correction/retry policy remains a separate open requirement; finalized results cannot be silently overwritten.

Reliability response-cohort-v1 uses original first-response deadline and submission-cohort window. Matured cohort excludes early withdrawals from the answer-rate denominator but reports them separately as neither success nor failure. On-time numerator requires a substantive stored first response no later than original dueAt. Median/min/max are answered-only with sample n; unanswered/right-censored and current waiting/overdue age are separate. Progress/rejections/confirmed interviews are unique processes, not event counts. No combined score, ranking join or sanction.

CP03-B: skillCatalog.ts is the stable, immutable authored catalog of23 existing nodes:18 preserved legacy keys and5 activity keys. IDs/labels/aliases/taxonomy/license references retain previous meanings; kind/family provenance is descriptive and never a matching filter or inherited ability. Historical ONTOLOGY insertion/reorder no longer remaps Faro identities. canonicalURI remains null; ESCO equivalence/license validation and graph relationship approvals remain pending. Never recycle an ID or import a historical ontology edit automatically into confirmed claims.

CP10-F: ResultHistory(attemptId,revision,validity VALID/INVALIDATED,result snapshot,reasonCode KEY_ERROR/AMBIGUOUS_TASK/TECHNICAL_INCIDENT,reason,createdAt). First finalized snapshot is VALID. Invalidation does not change deterministic score, submitted answers, pinned definition or recruitment decisions. Historical reviewedAt may be unknown (null); never substitute deadline as review date. No un-invalidation endpoint; future replacement score needs reviewed evidence/versioning.

CP05-B: private SalaryMinimum explicitly declares amount/currency/basis/period/hoursPerPeriod/FTE. Work constraints apply only when candidate actively enables them. Minimum salary checks salary options permitted by private contract selection; same declared units only. Mixed failing-comparable plus incompatible options remain UNKNOWN, not a false negative. Existing published salary versions, projection snapshots, response clocks and chronological order are unchanged. No automatic gross/net/invoice/time conversion or EHV.

CP10-G: AttemptIncident is one attempt-bound original state/revision/timer/deadline observation plus OPEN→RESOLVED human outcome/reason/time. User allegation is not verified failure. ISSUE_CONFIRMED neutralizes unfinalized attempt to TECHNICAL_ISSUE; original pending score and answers remain stored but no current result is presented. NOT_ESTABLISHED preserves lifecycle and original expiry. A terminal process stays terminal; an independent newer active attempt retains its obligations. Same-version retry lineage is not implemented; existing uniqueness remains. Original incident data/one resolution are never overwritten by service commands.

CP06-I: outbox lifecycle remains PENDING/DELIVERED/DEAD_LETTER; a paired claim_token/lease_until reserves due PENDING rows under SQLite BEGIN IMMEDIATE. Claim increments attempts before work, max_attempts bounds crashes as well as failures. Delivery rereads fresh row/token/expiry and current optional watch/applicant eligibility under its write transaction; inbox dedupe and DELIVERED are atomic. Expired claim may be replaced; old owner cannot deliver or change new owner. Conscious platform ADMIN retry of eligible dead letter grants five additional claims, preserves attempts and emits one safe audit. No process/clock transition or hiring judgment.

CP10-H: root unique process/definition/version remains; each retry is a distinct attempt_number with unique retry_of predecessor. Original TECHNICAL_ISSUE evidence immutable, child starts INVITED with null timer/result and empty answers. Same pinned definition/rubric retained despite unrelated new draft. Conscious employer command updates only current stage/deadline, preserves Clock A and emits one bilateral event. Candidate independently starts new timer. No automatic reassessment/hiring judgment.

CP07-E separates restriction lifecycle ACTIVE→RESTORED from private case lifecycle. Scope NEW_INTAKE only, human reason/condition/review and revision history, one organization appeal and explicit independent human restoration. Other ACTIVE restrictions still block; final clearance PENDING needs fresh verification and conscious offer publication. Original process/clocks unaffected. Legacy RESTRICTED has explicit unknown dates/condition/source; never invented evidence.

## CP05-C — Private commute boundary and explicit unknown listing (2026-10-04)
GOAL / DELTA: candidate can declare maximum round-trip minutes per work day; existing own economics estimate is the sole producer, without route inference or remote=zero assumptions.
IMPLEMENTATION: optional maxCommuteMinutes integer0..1440/null in existing revisioned private preferences; omitted field preserves existing value. Current offer-version estimate requires exact ROUND_TRIP_MINUTES_PER_WORK_DAY, nonnegative integer, named source and nonfuture source date. Missing/old/incompatible evidence yields UNKNOWN; above bound KNOWN_NOT_MET. Default listing requires SATISFIED; explicit includeUnknown=true admits UNKNOWN only and labels it, never a known failed condition. Employer projections and process snapshots/clocks remain unchanged; no CV/EHV/net conversion/login delta.
API / UI: GET /api/faro/offers?includeUnknown=true|false (invalid values400); candidate checkbox defaults off/reset on logout. Own preferences enable/disable bound; detail explains three states. No migration; existing private JSON and economics version remain authoritative.
TEST / REVIEW / ACCEPTANCE: full current-input npm run check PASS:142 Node tests,32 migrations,both real restore drills,30 mobile/desktop browser executions,lint/typecheck, zero skips. Two new tests cover exact boundary/zero, wrong basis, negative/fractional/future/old estimates, unknown opt-in, other-user isolation, employer/process unchanged, omitted preference preservation and invalid input. Existing real browser journey covers save/reload, strict exclusion, explicit unknown label, own estimate and strict admission; axe remains enabled. git diff --check PASS.
PRIVACY / LEGAL: candidate-only estimates/constraints; cards carry only own unknown marker. Engineering comparison of self-declared evidence is not verified routing or assessment validity. External provider/legal/research gates remain open; production503 and scheduler disabled.
ROLLBACK / RISK: disable commute filter/UI together while preserving private declarations; do not reinterpret missing evidence as zero or hide failures under unknown. Actual routing/provider freshness policy remains separate.
STATUS: bounded local acceptance DONE; exact remote PENDING; full CP05/master plan/release PARTIAL. Continue remaining legal-safe deltas.