# Architecture overview

## Shape

Current implementation is a modular monolith:

```text
src/domain   — pure/testable business rules
src/server   — HTTP, auth, persistence, uploads, PDF, AI gateway
src/client   — browser orchestration only
public       — PWA shell and design system
migrations   — reproducible database schema
```

The UI does not calculate matching or CV eligibility. Those rules remain server/domain-side.

## Core boundaries

- **Career Truth**: inferred facts never become CV-eligible automatically.
- **Job Parser**: deterministic Polish parsing first; uncertain fields remain unknown.
- **Decision Engine**: deterministic and evidence-based; hard constraints reduce recommendation but never forbid applying.
- **CV Engine**: consumes only `CONFIRMED && allowedForCv` facts.
- **AI Gateway**: the only allowed route for future LLM calls. It hashes inputs for logs and does not place raw CV content in analytics.
- **Persistence**: centralized through `AppStore` and SQLite for the first executable release.

## Database

`migrations/0001_init.sql` contains normalized tables for users, Career Truth, experience, education, credentials, skills, jobs, requirements, decisions, applications, documents, outcomes, interventions, daily actions, subscriptions, consent, audit, analytics, AI requests, and feature flags.

The plan's PostgreSQL recommendation remains the production target. SQLite is an explicit first-release deviation documented in status/readiness files.

## Future expansion

Later roadmap engines (Today, Skill ROI, Strategy, career transitions, job feed) are behind `feature_flags` and intentionally disabled until MVP 0.1 proves its acceptance gate.
