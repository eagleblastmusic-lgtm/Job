# K072 / K062 / K063 i materiały do odbiorów — 2026-10-23

Zlecenie: wykonać samodzielnie możliwy aktualny przegląd rynku, techniczną kontrolę dostępności i pomiarów/obserwowalności oraz przygotować konkretne materiały do rzeczywistych odbiorów. Baseline i origin/main przed zmianami:24be6a36ffe23d0c283c9071900fd22f0a483e23; canonical worktree czysty. Nie zaczynano ponownie audytu001–004.

## Wykonane rezultaty

- K072: [aktualny cykl](MARKET_REVIEW_2026_10_23.md) ma osiem grup obserwacji ze źródeł pierwotnych, daty/okresy/UNKNOWN, metodę i ograniczenia, kontrdowody i wpływ na decyzje. Nie zmieniono founder lock, nie uzyskano zgód/WTP i nie kontaktowano się z uczestnikami/dostawcami. Cykl COMPLETED; proces regularny nadal wymaga ownera/cadence.
- K062: realne sekwencje klawiatury w Chromium, reflow320 CSSpx/powiększony tekst, errors, dialog name/focus/Escape, axe i powiązanie testu z oboma backendami. Naprawiono odtworzone bariery focusu error message, wrapping f-session oraz focus return; aria-labelledby preview. [Protokół i jawne braki](REVIEW_ACCESSIBILITY.md). Nie odsłuchano czytnika, nie wykonano natywnego zoom ani physical-mobile; nie deklarowano pełnej WCAG lub niezależnego odbioru.
- K063: rozszerzono istniejący pomiar, bez nowego publicznego endpointu/telemetrii. Sygnały z faktycznych próbek: próg p95, request failure, invalid/stale. Unit/integration obejmuje realne HTTP503 i sentinel privacy; delivery NOT_CONFIGURED, owner UNASSIGNED. [Budżet, alert sheet i actual-target checklist](REVIEW_OPERATIONS.md). Nie ustalono fikcyjnego produkcyjnego SLO/pojemności.
- Przygotowano [indeks materiałów](REVIEW_HANDOFF_INDEX.md), [Legal/Privacy/AI](REVIEW_LEGAL_PRIVACY.md), [badania/assessment](REVIEW_RESEARCH_ASSESSMENT.md), [operator/T&S/release/providers](REVIEW_OPERATIONS.md), [manual accessibility](REVIEW_ACCESSIBILITY.md) oraz [jawny rejestr28 odbiorów](PREPARED_REVIEW_REGISTER.json). Właściciele/recenzenci/decyzje null, returnedEvidence=[]; wymagany wynik konkretny perID.

## Zmiany i dowody regresji

`src/client/faro.ts`: serwerowy błąd formularza jest fokusowanym atomic alert; UI nie oznacza zbiorowo pól jako invalid bez wiedzy o winowajcy. Natywne preview ma nazwę z h2; oba modale wracają do aktywnego istniejącego triggera po close. Przycisk chwilowo disabled podczas async otwarcia nie był wiarygodnym native return target; nowy test odtworzył utratę focusu po Escape.

`public/faro.css`: mobile f-session zawija elementy i ogranicza szerokość; długie treści w main mogą łamać się zamiast poszerzać viewport. Brak overflow:hidden maskującego błąd i brak redesignu. `public/sw.js` cachev3 dostarcza nowe publiczne JS/CSS; żadne API/answers nie dołączone do cache.

`e2e/faro-accessibility.spec.ts`: trzy scenariusze ×desktop/mobile, realny HTTP; helper Tab kontroluje outline i zasłonięcie, brak bezpośredniego focusowania kontrolek w teście. Initial failing run na poprzedniej wersji zachowany w k062-before.log; dalsze dowody focus return i reflow w logach rozwoju. Dopuszczenie przejścia natywnego dialogu do browser chrome opisuje prawdziwą granicę; tło dokumentu nie może przejąć focusu. Testy nie symulują sukcesu API. Lokalny runner i natywna lista CI zawierają ten sam plik.

`scripts/faro-performance-proof.mjs`: zachowane request/budget/deadline/scope ograniczenia. Evaluator nie ufa polu result, waliduje strukturę/liczność/per-route percentyle/politykę/daty i emituje tylko stałe bezpieczne pola. `scripts/faro-performance-proof.test.mjs` oraz wrapper `src/tests/faro-operational-evidence.test.ts` testują sukces, HTTP503, p95 granicę2000/2001, stale/invalid/NaN/missing/nieznaną ścieżkę, kolejność kluczy i brak sekretów. Żaden zewnętrzny alarm nie został wysłany.

Istniejący dwurołowy pełny scenariusz `e2e/faro.spec.ts` ma jawny limit60s zamiast30s. Trace natywnego lokalnego run pokazał zaliczone asercje do linii216 i wyczerpanie30s podczas końcowego screenshot/cleanup; scenariusz obejmuje ponad200 interakcji. Nie zmieniono timeoutów asercji, kryteriów lub pozostałych testów. `faro-postgres-local.mjs --browser-only` pozwala powtórzyć wyłącznie przeglądarki w nowym jednorazowym klastrze, bez niepotrzebnego ponawiania niezmienionego rehearsal/restore; jego komunikat PASS nie udaje pełnego rehearsal.

Mechaniczny Impeccable detector odnotował dwie zastane uwagi stylistyczne `side-tab` w istniejących akcentach obramowania. Nie stanowią wykazanej bariery WCAG; nie zmieniano wyglądu z tego powodu. Weryfikacja wizualna dotyczy reflow i czytelności bieżących syntetycznych ekranów, nie jakości badania użytkowników.

## Weryfikacja

Lokalnie build/lint/typecheck/38 migracji PASS,213/213 Node PASS bez skips/failures; targeted K0626/6 desktop/mobile PASS. SQLite pomiar:4 czytelników/80 żądań,0 errors; p95 health21.075ms,me6.515ms,profile6.346ms,offers6.742ms; signals OK przy NOT_CONFIGURED delivery. To konkretny lokalny pomiar, nie produkcyjna obietnica. Natywna weryfikacja PostgreSQL i pełne zestawy przeglądarkowe/nowe CI są w toku; nie przypisywać starych wyników zmienionemu buildowi.

Logi oryginalne: `evidence/independent-readiness-20261023/*.log` lokalnie, bez sekretów i surowych danych użytkowników. Końcowe metadane i hashe zostaną zapisane po zakończeniu weryfikacji. Udane proof uruchamiały się na jednorazowych lokalnych fixture; cleanup klastra wymaga jawnego STOPPED/CLEANUP_PASS.

## Granice odbioru

Wszystkie28 zewnętrznych zadań nadal EXTERNAL_BLOCKED;44 DONE/0 DELTA_REQUIRED/28 EXTERNAL_BLOCKED/14 DEFERRED bez zmiany. Brakujące prawne/eksperckie/user/manual-AT/security/production/operator/provider approvals nie są zastępowane przygotowanymi arkuszami. Żadne nowe źródło ofert, płatny zasób, sekret, repo permission, provider call, publiczna rekrutacja lub produkcja nie zostały uruchomione. Staging pozostaje na ostatnio przyjętym1e8d704, aktualny etap nie potwierdza nowego zdalnego deployu.
