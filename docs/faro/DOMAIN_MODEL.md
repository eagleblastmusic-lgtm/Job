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
