# FARO — external acceptance packet (2026-10-06)

Prepared from the existing Canonical plan and actual implementation evidence. User reported no external acceptance evidence. Every external decision below is MISSING; reviewers/owners are UNASSIGNED. This packet organizes review, does not provide a legal opinion, substitute independent assessment, invent participants or enable production. Runtime recruitment remains503 RELEASE_GATES_OPEN and production scheduler stays disabled. Existing approved login is preserved.

## Concrete scope for review

Private authenticated candidate/employer workflow: authored skill declarations and locally suggested claims individually confirmed by candidate; structured projection without CV/private biography; immutable native salary-required offers and chronology; controlled interest/response/stage commands, contact consent, bilateral interviews and manual moderation/appeal. Quiz/manual open-answer assessment uses pinned definitions and explicit human review, not an employment decision, person score or validated capability certificate. Candidate confirms versioned employment-offer acceptance; this is not proof of signing or commencing employment. Economics is private manual source/date/assumption evidence, without invented tax/routing/provider data. Optional product telemetry is a consenting candidate's retained pair/week completed-stage subset, not complete NSM or population conversion.

Security/operations: encrypted TOTP and one-use recovery with mandatory production privileged step-up; operator key lifecycle/rescue and independent security acceptance missing. Own export/deletion and current-authority DB restore exercised. Actual PostgreSQL18 staging-data rehearsal passes70-table counts/hashes/constraints/consent/rollback on Node22/24; application runtime still SQLite. Production runtime adapter, independent durable recovery authority and cutover remain technical work, not completed external approvals. Draft PRs form an unmerged dependency chain and require integration review before any authorized merge.

## Review inventory

| Existing gate | Specific review artifact needed | Current decision/owner | Disabled or limited scope |
|---|---|---|---|
| KRAZ/service qualification | Written per-function qualification for marketplace, employer verification, recruitment coordination and human assessments; obligations/conditions identified by reviewer | MISSING / UNASSIGNED | Public service activation |
| GDPR/DPIA/purposes | Approved controller/processor and data-flow map; purpose/basis/recipient records; DPIA decision and oversight; purpose-specific retention/legal hold/backup erasure decisions | MISSING / UNASSIGNED | Real personal-data production processing |
| Dataset/provider terms | Exact provider/dataset version, license/terms artifact and approved use for skills/relationships, model API, tax/routing/notification data; permitted retention and recipient map | MISSING / UNASSIGNED | ESCO/live model/tax/routing/external delivery integration |
| Assessment validity/fairness | Human-reviewed intended use, task/rubric rationale, actual validation sample and uncertainty, accessibility/accommodations and appeal procedure; no automatic recruitment decisions | MISSING / UNASSIGNED | Claims of validated competence/comparability and advanced automatic engine |
| Moderation/minors/service policy | Staffed response/appeal owner and documented supported population, restrictions/restore/no-show process and exceptions; no invented fraud threshold or silent18+ scope | MISSING / UNASSIGNED | Public policy operation/minors and automated sanctions |
| Research/manual accessibility | Real participant records/consent and findings, independent keyboard/screen-reader/mobile/manual evidence, review of unresolved barriers and follow-through | MISSING / UNASSIGNED | Claims of validated usability or full accessibility acceptance |
| Operator security/persistence | Protected deployment secrets, MFA key continuity/rotation/rescue, independent security findings; runtime PostgreSQL/current-authority recovery/backup/cutover evidence and support ownership | MISSING / UNASSIGNED | Deployment/public activation and multi-instance scheduling |

These are the existing plan's gates. No approval is inferred from tests, a configured variable, a draft PR, this document or an unsigned reviewer form.

## Purpose-specific retention decision sheet

Reviewer must specify actual approved periods/events rather than copying a global TTL. Current implementation does not invent production periods.

| Data group | Current concrete boundary | Decision still required |
|---|---|---|
| Account/session/MFA | Own account; encrypted factor, hashed recovery; session-bound short verification, one-use consumption, delete cascade | Purpose, retention, operational key authority/rescue and access owner |
| Profile/activity/claim/projection | Private authored descriptions, individually confirmed declarations, immutable submission projection; own erasure | Retention by recruitment/purpose and evidence access; no raw biography in employer projection |
| Offers/process/events/contact | Published versions and bilateral operational events; contact reads require current explicit grant; terminate obligations | Contractual/operational purpose, terminal-process retention, recipient scope and legal-hold handling |
| Assessment/attempt/history | Pinned private text/answers, independent human review/history, explicit validity/amendment | Intended use/validation, retention/reviewer access/accommodations and appeals |
| Cases/restrictions/appeals | Private scoped evidence, independent review, restored restrictions preserve history | Evidence purpose, staffed review windows, minimum necessary access, retention/hold and appeal obligations |
| Optional analytics | Minimal stage/week only; no raw terms/amounts; withdrawal/erasure removes telemetry; restore defaults off | Approved purpose/notice/consent and retained-data window, with opt-in denominator limitation |
| Backups/erasure authority | Restore reconciles current erasures/auth/factor consumption; no sessions resurrected | Independently durable current authority, backup expiry/tombstone/hold, operator recovery and verified deletion responsibilities |

## Sign-off record to fill with real evidence

For each gate record: gate ID; exact enabled product/data/provider/population scope; reviewer identity/competence and review date; immutable artifact location/version/hash; APPROVED / CONDITIONAL / REJECTED decision; reasons and conditions; explicit remaining limitations; accountable implementation/support owner; review/expiry trigger; completed mitigation evidence and independent verification. An absent field or outstanding condition keeps the affected gate open. Do not upload private participant records into a public PR; use access-controlled evidence and minimal references.

## Existing technical evidence for the reviewer

- [Master plan](FARO_CANONICAL_IMPLEMENTATION_MASTER_PLAN.md), [latest status](IMPLEMENTATION_STATUS.md), [checkpoint register](08_CHECKPOINT_REGISTER.md) and [dependency PR sequence](09_PR_SEQUENCE.md): bounded implementation/actual tests with full plan still PARTIAL.
- [MFA](CP02_H_PROTECTED_MFA.md):152 Node/35 migrations/both actual restores/36 browser executions; exact remote FARO37387892167 and CI37387892042 SUCCESS at2f90e5b. Operator acceptance still absent.
- [Concrete employment terms](CP06_J_EMPLOYMENT_TERMS.md):153 Node/35 migrations/both actual restores/38 browsers; exact remote FARO37389049374 and CI37389047911 SUCCESS at6def302. Acceptance is a candidate-confirmed process fact.
- [PostgreSQL staging](CP11_I_POSTGRES_REHEARSAL.md): real PostgreSQL18 Node22/24,70 tables/35 migrations/counts/hashes/FKs/checks/consent/rollback/source preservation; FARO37389939763 and CI37389940077 SUCCESS at7c05f87. Not production runtime/cutover.
- [Browser scope](BROWSER_ACCEPTANCE_SCOPE.md): real Canonical and retained public contracts,19 scenarios/38 executions; historical rejected contracts remain archived. Automated axe/keyboard/reflow evidence is distinct from missing independent manual acceptance.
- [Recovery runbook](RUNBOOK.md): exact source/current-authority and new-target restrictions; source-only and actual PostgreSQL rehearsal are separate outcomes.

No messages sent to reviewers/providers/participants and no merge, deployment or release approval performed. Gather actual evidence before closing a gate; technical work on remaining authorized deltas continues independently.
