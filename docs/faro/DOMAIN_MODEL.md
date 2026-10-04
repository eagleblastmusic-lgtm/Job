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
