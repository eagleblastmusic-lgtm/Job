# Binding founder update — 2026-10-09

Authority: attached FARO CANONICAL UPDATE + CONTINUED IMPLEMENTATION request. This update supersedes incompatible historical planning rows; historical evidence remains intact.

## Native offers

Only authorized employers may create and publish active Faro offers through the existing organization/assignment/review/version workflow. External job portals, aggregators, scraped listings and imported advertisements are excluded permanently from canonical recruitment. There is no job-portal license dependency for launch. Historical importer modules/tests/migration records remain archival evidence; canonical SQLite/PostgreSQL listeners do not mount their APIs. No new importer or conversion of private legacy jobs into native offers is authorized.

## Geographic architecture

OSM is the selected geographic data basis. `domain/faro/geography.ts` separates map data/style configuration (compatible with a later MapLibre renderer), geocoding and routing adapters. Provider identity, dataset version and observation date belong to provider results. No public service endpoint or paid service is configured. Authenticated shared API GET `/api/faro/geography` truthfully reports unconfigured providers; POST `/api/faro/geography/distance` validates coordinates and calculates a labelled spherical straight-line distance offline. It stores no coordinates and makes no network requests. Route distance, commute time and fare stay null. Existing manual private Job Economics remains authoritative.

Provider integration must use an approved endpoint, bounded requests/timeouts/retries, provider-specific request budget/cache policy, attribution and a protected configuration. Never use public Nominatim for autocomplete or bulk queries. No public tile prefetch/offline download. Search queries and home coordinates require explicit privacy/purpose review before external transmission; no employer projection of private origins. A renderer must display visible OSM attribution linked to the copyright page, and any separate tile/style attribution. ODbL database obligations and applicable provider terms must be reviewed for the actual distributed dataset/use. OSM is not a complete transit schedule/fare source; separate licensed schedule/tariff inputs are required for those capabilities.

Official policy references checked 2026-10-09: [OSM copyright](https://www.openstreetmap.org/copyright), [tile policy](https://operations.osmfoundation.org/policies/tiles/), [Nominatim policy](https://operations.osmfoundation.org/policies/nominatim/), [vector tile policy](https://operations.osmfoundation.org/policies/vector/). Service policies are distinct from the OSM data license and must be rechecked before enabling a live provider.

## Current dependency classification

| Remaining item | Classification | Concrete boundary |
|---|---|---|
| Native offer publication and retired external API | DONE (existing accepted implementation) | Shared authorized native services; importer retirement regression retained |
| Job-portal import/licenses | DEFERRED (excluded by founder) | No launch dependency; historical evidence retained |
| Pinned ESCO identifiers/aliases/version/source and explicit declarations | DONE (CP03-H/M accepted evidence) | 13,939 imported concepts; authored IDs retained; no implicit equivalence |
| Empirical competency relationships/assessment validity | EXTERNAL_BLOCKED | Requires real expert/sample evidence; no invented calibration |
| Local proposals/private lineage and bounded AI transport | DONE (CP03-I/J accepted evidence) | Manual confirmation; controlled response/time/token limits |
| Live AI provider and financial/privacy acceptance | EXTERNAL_BLOCKED | Provider selection, protected credentials, terms and approved spend required; no personal-data calls |
| OSM offline boundary/distance API | DELTA_REQUIRED until current verification recorded | No live map/geocoder/router claimed |
| Live geocoder/router/map provider | EXTERNAL_BLOCKED | Actual service/capacity/privacy/terms selection; no unlimited public access assumed |
| MapLibre screen and automatic commute/transit economics | DEFERRED | Current manual flow retained; provider prerequisites unresolved |
| PostgreSQL runtime/migrations/recovery and technical browser contracts | DONE (existing CP11 evidence) | Technical acceptance only; no production custody acceptance |
| Production backup/key/current-authority custody and RPO/RTO | EXTERNAL_BLOCKED | Operator-controlled durable target and real acceptance |
| KRAZ, DPIA/AI compliance, independent security, manual accessibility and real user research | EXTERNAL_BLOCKED | Existing packet requires actual independent artifacts and owners |

These are current dependency decisions, not reclassification of every historical baseline row into DONE. The initial gap matrix remains a dated audit; use accepted checkpoint evidence and this superseding table for current scope. Public production gates and scheduling restrictions remain closed. Approved login, free-first nationwide skills-first policy and privacy projections are unchanged.
