# K072 / K062 / K063, materiały odbiorowe i UI — 2026-10-23

Zlecenie: wykonać samodzielnie możliwy aktualny przegląd rynku, techniczną część dostępności/obserwowalności i materiały do odbiorów; następnie dopracować istniejący interfejs z Impeccable. Początkowy HEAD i origin/main:24be6a36ffe23d0c283c9071900fd22f0a483e23, canonical worktree czysty. Nie zaczynano ponownie audytu001–004.

## Rezultaty i granice

| Zakres | Wykonany rezultat | Nadal wymagany rzeczywisty odbiór |
|---|---|---|
|K072|[Bieżący cykl przeglądu](MARKET_REVIEW_2026_10_23.md):8 grup źródeł pierwotnych, daty/okresy, ograniczenia, kontrdowody i wpływ na decyzje. Cykl COMPLETED.|Owner i cadence regularnego procesu; brak badania WTP, nowych zgód lub decyzji founderskich. Całe K072 pozostaje EXTERNAL_BLOCKED.|
|K062|10 wykonań klawiatury desktop/mobile: login, skip-link, filtr, navigation, error recovery, disclosure, privacy, nazwa/focus/Escape dialogu, reflow320CSSpx i powiększony tekst; axe. Naprawione odtworzone bariery i session races.|[Manualny protokół](REVIEW_ACCESSIBILITY.md): odsłuch czytnika, natywny zoom, fizyczny mobile i niezależna ocena. Emulacja i axe nie dostarczają tych dowodów.|
|K063|Rzeczywisty ograniczony pomiar HTTP i evaluator p95/request-failure/invalid/stale; realny503, progi i ochrona przed ujawnieniem payloadu w regresji.|[Arkusz operatora](REVIEW_OPERATIONS.md): docelowa infrastruktura, pojemność/SLO, odpowiedzialny owner i rzeczywiście podłączone powiadomienia. Delivery NOT_CONFIGURED; owner UNASSIGNED.|
|Materiały|[Indeks](REVIEW_HANDOFF_INDEX.md), [Legal/Privacy/AI](REVIEW_LEGAL_PRIVACY.md), [badania/assessment](REVIEW_RESEARCH_ASSESSMENT.md), [operator/T&S/release/providers](REVIEW_OPERATIONS.md), [manual accessibility](REVIEW_ACCESSIBILITY.md), [rejestr28](PREPARED_REVIEW_REGISTER.json). Walidacja dokładnego pokrycia wszystkich28:PASS.|Owner/reviewer/decision=null, returnedEvidence=[]; wymagany konkretny wynik zwrotny perID. Przygotowanie arkuszy nie zamyka odbiorów.|
|UI|[Impeccable polish](UI_POLISH_2026_10_23.md): poprawione filtry/checkboxy, hierarchia nagłówków i szczegółów, wyrównanie formularzy, active/hover/notice, SVG strzałki i mobile detail. Zachowana paleta i procesy.|Niezależne doświadczenie użytkowników oraz manualny AT pozostają otwarte. Zatwierdzony wygląd logowania zachowany.|

Nie kontaktowano się z uczestnikami/recenzentami/dostawcami, nie pobierano ofert, nie zmieniono founder lock, sekretów, repo permissions ani publicznego release.

## Implementacja i regresje

- 97da106f5db5be060ebe88e58c6cd2c3ae4186f1: przygotowane materiały, aktualny przegląd, K063 evaluator/real503 i początkowe K062 naprawy/testy. `src/client/faro.ts` fokusuje atomic alert po serwerowym błędzie i przywraca focus triggera po modalach; preview ma nazwę z h2. Nie oznacza zbiorowo pól jako invalid bez wiedzy o błędnym polu.
- 94b7bc2257f45783243e5a7f76b9522cfb8883ca: początek login/register anuluje stary kontekst, a API odrzuca anulowaną odpowiedź także po JSON. Deterministyczny test przytrzymuje prawdziwy anonymousGET/me401 i późniejszy authenticatedGET/me200; przed fix FAIL obu viewportów, po fix PASS. Aktualne401 nadal wylogowuje. Scoped `height:auto` input/select usuwa clipping odziedziczonej44px wysokości; test wymaga pełnego fontu/padding/border.
- 6fae8e72acd982494af6e1d19000454591952687: dopracowany UI i wcześniejsza faza race, gdy401 wraca podczas pisania, przed submit. Wyłącznie początkowy anonymous probe zachowuje formularz; serwer/RBAC/MFA bez zmian. Nowy test przed poprawką FAIL desktop/mobile (`typing-focus-before.log`). Początkowy pusty hash jest normalizowany do `#offers`; keyboard flow sprawdza właściwy ekran, istniejący skip-link i stan filtra.24px scroll-margin usuwa odtworzone częściowe obcięcie focusowanego przycisku; nie złagodzono asercji. Cleanup K062 wykonuje `f.close()` również przy błędzie opuszczania strony.

`scripts/faro-performance-proof.mjs` zachowuje4 czytelników/80 żądań/8warmup,2s p95 i10s deadline w jednorazowym loopback. Evaluator nie ufa deklarowanemu `result`; waliduje strukturę/liczności/percentyle/politykę/czas i emituje stałe dozwolone pola. `scripts/faro-performance-proof.test.mjs` i wrapper Node obejmują realne HTTP503,2000/2001ms, stale/invalid/NaN/missing/null/nieznaną trasę, kolejność kluczy i brak sekretów. Brak nowego publicznego endpointu lub zewnętrznej telemetrii.

`e2e/faro-accessibility.spec.ts` używa prawdziwych Tab/ShiftTab/Enter/Space/tekstu i HTTP, bez bezpośredniego focusowania kontrolek lub wstrzykiwania udanego API. Helper sprawdza outline, prostokąt viewport i hit target. Dialog może przejść do browser chrome, lecz następny Tab musi wrócić do modalu; tło dokumentu nie może przejąć focusu. Test jest w lokalnej i CI liście natywnego PostgreSQL.

## Weryfikacja

Build/lint/typecheck/38 migracji PASS. Lokalnie Node24.19.0:213/213 Node bez failures/skips,10/10 K062 i62/62 pełnych SQLite browsers PASS. Oględziny syntetycznych list/ofert/profilu/pustych stanów/organizacji:320,390,900,1440CSSpx. Zrzuty przed/po i archiwum tymczasowego walkthrough są w katalogu artefaktów rozmowy. Impeccable detector wskazał jedynie istniejącą linię osi czasu, zachowaną jako łącznik sekwencji zdarzeń; nie jest akcentem karty.

Exact6fae8e7: [FARO39993852956](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/39993852956) (attempt2) oraz [CI39993852858](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/39993852858): **SUCCESS, wszystkie joby**.213 Node bez failures/skips,62 SQLite,52 natywne PostgreSQL browsers perNode22/24, backup/actual restore/current authority,38 migracji i image readiness/closed-release smoke PASS. Brak flaky/retry testów. Pierwsza próba FARO przerwała tylkoPG22 po10min wolnego pobierania pakietów z Azure Ubuntu mirror, przed browser tests. Zachowano `ci-faro-6fae8e7-attempt1.log` i diagnostykę; ponowiono ten sam job/commit z niezmienionymi kryteriami. W ponowieniu instalacja i wszystkie52 testy PASS; nie zamaskowano nieudanej próby.

Wcześniejszy etap94b7bc2: [FARO39988429533](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/39988429533) i [CI39988428650](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/39988428650) SUCCESS:213 Node/60 SQLite/50 PostgreSQL perNode22/24, bez flaky/retry. Etap97da106 miał jedną flaky próbę loginPG22; odtworzono ją deterministycznie i naprawiono zamiast uznawać retry za brak problemu. Lokalny PostgreSQL18.6/Node24: native rehearsal/actual restore/current authority PASS, późniejszy48/48 browser retest PASS; STOPPED/CLEANUP_PASS. Nie przypisano tej wcześniejszej liczby nowej wersji.

Przykładowy rzeczywisty pomiar lokalny z2026-10-23, nie obietnica produkcyjna:

| Backend | health p95 | me p95 | profile p95 | offers p95 | Błędy / sygnał |
|---|---|---|---|---|---|
|SQLite|21.075ms|6.515ms|6.346ms|6.742ms|0 / OK|
|PostgreSQL|19.620ms|25.048ms|26.832ms|31.283ms|0 / OK|

Metadane/hashe logów: [verification.json](evidence/independent-readiness-20261023/verification.json). Lokalne logi w tym katalogu są celowo poza Git; pełne logi CI dostępne również przez wskazane runy. Zachowano negatywne dowody; początkowy local native browser timeout podczas końcowego screenshot/cleanup spowodował uzasadniony60s limit wyłącznie dla istniejącej dwurołowej podróży ponad200 interakcji, bez osłabienia asercji. `--browser-only` oznacza wyłącznie nowy jednorazowy klaster i browsers, nie pełny restore rehearsal.

## Stan planu i wdrożenia

[Wszystkie86 klasyfikacji](CURRENT_TASK_STATUS.json):44 DONE,0 DELTA_REQUIRED,28 EXTERNAL_BLOCKED,14 DEFERRED. Rejestr jawny, generator fail-closed: brak/duplikat/nieznany status/evidence nie staje się DONE. Materiały mają dokładnie te same28 IDs i tytuły co zadania zewnętrzne. K062/K063/K072 pozostają EXTERNAL_BLOCKED w pełnym zakresie.

Istniejący darmowy [staging](https://faro-free-staging.onrender.com) zaktualizowany do6fae8e72acd982494af6e1d19000454591952687 jako deploydep-dbdppgt9fdbs7388a2l0, Live2026-10-23T17:44:44.196215Z (19:44 Europe/Warsaw). [Preflight/rollback](evidence/independent-readiness-20261023/staging-preflight.json), [rollout](evidence/independent-readiness-20261023/staging-rollout.json), [zgodność7 publicznych assets](evidence/independent-readiness-20261023/staging-assets.json). Brak delty src/server/migrations/startup względem1e8d704; zero nowych zasobów/config/sekretów. Nowa instancja j8brx potwierdziła EXISTING_SCHEMA_RETAINED, PRIVATE_FILES_ZERO i otwarcie listenera. Rzeczywisty HTTPS retained-account/original-session/changed-consent/fresh-login/own-export/release-boundary PASS; konto testowe usunięte, późniejszy401 PASS. Public release nadal503. Auto-deploy off; bazaFreePG18 z dotychczasową datą wygaśnięcia2026-11-07, zewnętrzny firewall pozostaje zamknięty. Nie wykonano rollbacku ani restore na stagingu; bezpieczny plan wskazuje poprzedni przyjęty commit/deploy i zachowanie PostgreSQL. Niezależne prawne/AI/privacy/assessment/user/manual-AT/security/provider/operator odbiory oraz produkcyjna custody/RPO/RTO nadal nie zostały uzyskane. Faro nie jest deklarowane jako produkcyjnie gotowe.
