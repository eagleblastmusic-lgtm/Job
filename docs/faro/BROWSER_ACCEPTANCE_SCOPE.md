# CP11-F — Canonical browser acceptance scope

2026-10-04. Authority: the resumed Canonical implementation request, master plan sections 1/5/7/10/13, C001/C022 retirement, C020 private alerts, C024 explicit constraints and CP11-F handoff. This changes acceptance scope explicitly; it does not certify the retired client or close release gates.

## Current execution

Default `npm run test:browser` and its compatibility alias `test:browser:faro` execute every current `e2e/**/*.spec.ts` except the explicitly archived `historical/` directory. New current specs are discovered automatically. Both Chromium projects run, one worker, unchanged assertions/retry/trace/failure screenshot policy. No skip, expected failure, continue-on-error, axe rule exclusion or API interception was introduced. Current scope: six real Canonical journeys, four public accessibility journeys, two adapted browser journeys and one public axe journey = 13 scenarios / 26 executions.

`npm run check` retains all Node tests and the historical storage rehearsal, adds the Canonical real-file recovery rehearsal, and runs this same browser scope. Original CI and FARO CI use that same default scope; original CI also retains actual Docker build and now uses the stronger existing closed-release smoke helper. Failure artifacts remain available. Node compatibility is preserved independently of retired browser navigation.

Original versions of all 15 affected specs are retained byte-for-byte in `e2e/historical/`, including original `browser` and `axe`. They are historical source evidence, not current acceptance and not a passing legacy suite. They describe unavailable product paths or mocked responses. Do not activate CV/EHV, legacy navigation or fake endpoints to satisfy them. Manual accessibility, usability/offline acceptance, complete privileged surfaces and external production gates remain open.

## Scenario disposition

KEEP means the same current contract executes. ADAPT means a retained principle has current evidence or an explicit remaining gap; it never asserts the entire old feature is replaced. HISTORICAL_RETIRED means the old screen/feature is outside current product acceptance; retained cross-cutting principles are listed separately.

| Original spec / scenario | Disposition | Canonical requirement and current evidence / boundary |
| --- | --- | --- |
| browser — critical Decision Card/application/outcome | HISTORICAL_RETIRED | C001/C010: no CV/aggregate verdict. `faro` real candidate/employer journey covers native interest, projection and progression; `faro-runtime` tests enforce retired routes. No claim of CV equivalence. |
| browser — Career Truth corrections/current employment | HISTORICAL_RETIRED | CP03: private activities and confirmed structured claims replace employer/title biography. `faro-profile` proves privacy, confirmation and declaration vs verification. Full evidence correction/verification remains open; old employment CRUD is not restored. |
| browser — required consent and optional analytics | ADAPT | CP11 reused consent/auth contract: current `browser` registers against actual HTTP/SQLite; unchecked required consents prevent submission, TERMS/PRIVACY version persisted, optional analytics starts false, opt-in and withdrawal survive reload. No API mock. |
| browser — password-required deletion | ADAPT | CP11-A: `faro` privacy journey rejects wrong password, exports own records, erases with correct password and proves old session 401; privacy API tests prove derivatives/FKs and ownership. |
| browser — public layout overflow | ADAPT | CP08 locked auth: current `browser` checks login and registration at 320px; `faro` checks actual workspace reflow. Retired offer-paste headline removed from acceptance. |
| browser — onboarding wizard | HISTORICAL_RETIRED | CP03/05/08: actual profile→explanation→projection→interest journey replaces old role/CV/import wizard. Salary/commute filters and broader usability remain partial. |
| axe — public login/registration/privacy/terms | KEEP | Current `axe` executes all four surfaces with the same WCAG 2/2.1/2.2 A/AA tags and violation detail, no rule suppression. Required pages asserted visible/200. |
| axe — authenticated start/Career Truth/job input/Decision Card/applications/privacy-plan | ADAPT | CP08: `faro` contains axe scans of real offer/economics and organization workspace; new consent journey uses actual privacy UI. Retired CV/Decision Card views archived. This is bounded automated coverage, not axe coverage of every current view or manual WCAG acceptance. |
| effective-wage — subjective time value/calculation | HISTORICAL_RETIRED | C022 prohibits EHV. CP09 real economics journey/API retain source/assumptions, separate money/time, unknown and private comparisons; no quotient or monetized time reinstated. |
| job-search — official/direct-source health | HISTORICAL_RETIRED | CP01 external import410; CP04 native published inventory only. All retained ingestion Node tests still execute. Live importer/provider license not certified. |
| job-search — loading skeletons | HISTORICAL_RETIRED | CP08 actual workspace has loading/aria-busy, tested before actions. Specific old importer skeleton count is not Canonical; broader slow/offline UI acceptance remains open. |
| job-feed — import/dedupe/state/source | HISTORICAL_RETIRED | CP04/06 native versions/private watch. Current real journey tests watch vs interest and mute; recruitment API tests preserve published version/diff. No imported offer masquerades as native. |
| career-transition — uncertain adjacent-role graph | HISTORICAL_RETIRED | CP03/12: unknown remains unknown in matching/API, authored catalog stable; validated ESCO relations/career graph remain open, not proven by old mock. |
| local-labour — provenance/uncertainty/+10km | HISTORICAL_RETIRED | C024 explicit constraints never auto-relaxed; CP05-A real filters/API. Licensed market/routing data and commute constraints remain open; no synthetic market guarantee. |
| bottleneck — sample/confidence/alternatives/action | HISTORICAL_RETIRED | CP07-D private factual reliability has n/window/censored waits and separate progression; real employer journey + reliability API/domain tests. Not old diagnosis or causal inference. |
| strategy — cautious user experiments | HISTORICAL_RETIRED | CP12 post-MVP hypotheses; no replacement strategy engine claim. No auto-hire/reject or strong causal claim in current matching/reliability. |
| v2-outcome-strategy — pasted-message confirmation | HISTORICAL_RETIRED | CP06 explicit typed human commands and immutable history tested at API; no external inbox parsing or raw-message storage feature reinstated. |
| today — feature-gated CV task recommendation | HISTORICAL_RETIRED | C001 removes CV tasks. CP06 real in-app process history/optional watch alerts; no replacement task recommender claim. |
| time-to-first-decision — Decision Card under 3 minutes | HISTORICAL_RETIRED | CP08 native explanations replace aggregate verdict; old duration target is not evidence for current usability. Current user research/performance acceptance remains open. |
| skill-roi-learning — opportunity ranking/learning plan | HISTORICAL_RETIRED | CP03 private learning intent and unknown declarations, no automatic verified ability. Full learning provider/ROI feature is deferred; old mocked score not acceptance. |
| interview-pack — Career Truth generated preparation | HISTORICAL_RETIRED | CP06 interviews are real two-party scheduling/confirmation, tested by real journey/API. Truth boundary remains in projection; generated preparation feature is not delivered here. |
| notifications — mocked preferences/read/dismiss/no-pressure | ADAPT | CP06-G real private watch mute/unmute and durable delivery/API, first journey verifies mute with normal actions. Essential process history remains independent. Old general preferences/read/dismiss controls and provider/channel consent are still open; no false equivalence or send claim. |
| accessibility — accessible names/visible keyboard focus | KEEP | Existing public test retained unchanged. |
| accessibility — minimum target sizes | KEEP | Existing public test retained unchanged; CP08-B workspace checkbox geometry independently verified. |
| accessibility — reduced motion | KEEP | Existing public test retained unchanged. |
| accessibility — public legal information | KEEP | Existing public test retained unchanged, release blockers explicit. |
| faro — all six actual journeys | KEEP | Real isolated HTTP/SQLite fixtures and current employer/candidate/privacy/moderation/assessment/economics assertions retained unchanged. |

## Review and rollback

Archive content must match pre-checkpoint Git blobs, with all 22 historical scenario titles accounted for above (the two job-search scenarios are separate). Typecheck still includes historical sources. Review the default discovery list and zero-skip test summary, not just the new tests. Auth markup/styles and Canonical retirement/gates are unchanged. Rollback restores the previous config/scripts/CI and test locations together while keeping this disposition record; it must not reinstate retired runtime functionality. Actual evidence and commit/run IDs are recorded in the checkpoint register and implementation status after execution.
