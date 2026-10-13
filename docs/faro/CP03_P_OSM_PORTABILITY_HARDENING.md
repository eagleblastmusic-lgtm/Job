# Continued technical closure — 2026-10-13

Baseline119ef5d matched fetched origin/main. This delivery completes previously uncommitted work and distinct remaining engineering requirements; historical checkpoint evidence remains intact.

## P2 — Native AI admission

`aiAdmissionModel.ts` owns the same parameterized admission/completion plans on SQLite and PostgreSQL. A SERIALIZABLE PostgreSQL admission commits before model egress, retries only40001/40P01 storage conflicts, and consumes failed/in-flight slots across real competing connections. Completion requires exactly one retained admission row. Existing gateway accepts either backend without duplicating transport or changing local skill confirmation. Actual synthetic HTTP covers response semantics, bounded bytes/time/tokens, safe audit, exhausted budget and audit refusal with zero egress. No live model is activated and no real personal data is sent. Dataset/model/prompt financial/privacy acceptance remains external. The initial native harness compared PostgreSQL bigint token_usage as a string; it now uses the existing safe-integer readBatch contract and passes without weakening the numeric criterion.

## P3 — OSM adapter implementation

`geographyProviders.ts` implements separate Nominatim search and OSRM routing adapters. Operator-supplied HTTPS origin only; no body-controlled endpoint, cookies, redirects, retries or default public service. Public OSM Nominatim and OSRM demo hosts are refused, including their equivalent trailing-dot names. Config is copied/frozen. Search is deliberately submitted, Polish/nationwide, bounded to5 results and200 input characters. Route mode requires an explicit provider profile; CAR never substitutes for WALK/BICYCLE. Coordinates, outputs, provenance and units are validated; NoRoute is null. A64KiB body ceiling, whole-response deadline including stalled body, concurrency/minimum interval and UTC-day per-instance request ceiling are enforced. Private upstream fields/errors never enter results. Existing manual economics and unmapped time/fare remain unknown.

The adapters are implemented but remain unmounted/unconfigured. Live use still needs actual service/capacity/privacy/terms selection and shared fleet-level quotas where needed; these process-local limits are not a distributed service entitlement or production budget. No query cache is introduced before actual permitted retention/cache terms. Map rendering/tile distribution is separate. Optional MapLibre screen and automated nationwide tax/transit economics remain post-MVP; adapter code is no longer incorrectly grouped with external provider acceptance.

Protocol sources: [Nominatim search](https://nominatim.org/release-docs/latest/api/Search/), [OSRM routing API](https://project-osrm.org/docs/v5.24.0/api/), [public Nominatim service policy](https://operations.osmfoundation.org/policies/nominatim/). No public service was called by adapter tests.

## P4 — Static confinement, repeated offers and operational evidence

Static serving now requires both lexical and resolved filesystem containment under publicDir. Encoded traversal/backslashes, Windows drive/stream syntax and external linked directories refuse; malformed URL escapes return a controlled400. Both HTTP runtimes reuse this path. The real loopback regression confirms no private sentinel is served and public assets remain available. No login markup or styling changes.

Existing private organization reliability report now includes bounded repeated-native-terms aggregates. The cohort is retained offers created in the requested window with publication proof; drafts excluded. Exact structured terms use normalized labels, sorted requirement/salary/task sets and original skill IDs; deadline, recruiter and per-record requirement IDs are excluded. Changed salary, skill ID, response commitments or stage order remain distinct. No raw offer grouping, candidate identity, score, case, sanction, public reputation, matching or ranking effect. Multiple actual vacancies/evergreen recruitment may share terms; human context is explicitly required. Both real SQLite API and native PostgreSQL exercise verify authorized aggregate reads and unchanged policy boundaries.

`faro-performance-proof.mjs` adds an actual disposable loopback load budget on both databases:4 concurrent readers,80 measured requests across health/me/profile/offers,8 warmups,0 errors, p95<=2000ms per route. These are versioned synthetic engineering ceilings, not a production SLA/capacity commitment. Runtime metadata, counts, route p50/p95/max, elapsed throughput and event-loop lag are recorded without cookies, bodies or identities. No load is generated on hosted staging.

Canonical CI now generates/uploads locked CycloneDX SBOM per Node22/24 and gates high/critical dependency advisories. Actual local all-dependency audit2026-10-13:0 vulnerabilities; SBOM23 components. GitHub branch-protection read returned404 Branch not protected. Changing protected-branch/review/merge permissions is an owner action and conflicts with the existing direct-main instruction unless explicitly reconciled; no repository settings changed. Independent audit/operator custody remain external.

Assessment creator/review/candidate views now state the approved assessment-only/non-commercial boundary and existing report path. This does not certify task validity or replace legal/operator handling.

Actual test/CI results and exact revisions are recorded in IMPLEMENTATION_STATUS.md. Full plan/release stays PARTIAL while required independent evidence and production/provider custody are absent.
