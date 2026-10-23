# K072 / K062 / K063 i materiały do odbiorów — 2026-10-23

Zlecenie: wykonać samodzielnie możliwy aktualny przegląd rynku, techniczną kontrolę dostępności i pomiarów/obserwowalności oraz przygotować konkretne materiały do rzeczywistych odbiorów. Baseline i origin/main przed zmianami:24be6a36ffe23d0c283c9071900fd22f0a483e23; canonical worktree czysty. Nie zaczynano ponownie audytu001–004.

## Wykonane rezultaty

- K072: [aktualny cykl](MARKET_REVIEW_2026_10_23.md) ma osiem grup obserwacji ze źródeł pierwotnych, daty/okresy/UNKNOWN, metodę i ograniczenia, kontrdowody i wpływ na decyzje. Nie zmieniono founder lock, nie uzyskano zgód/WTP i nie kontaktowano się z uczestnikami/dostawcami. Cykl COMPLETED; proces regularny nadal wymaga ownera/cadence.
- K062: realne sekwencje klawiatury w Chromium, reflow320 CSSpx/powiększony tekst, errors, dialog name/focus/Escape, axe i powiązanie testu z oboma backendami. Naprawiono odtworzone bariery focusu error message, wrapping f-session oraz focus return; aria-labelledby preview. [Protokół i jawne braki](REVIEW_ACCESSIBILITY.md). Nie odsłuchano czytnika, nie wykonano natywnego zoom ani physical-mobile; nie deklarowano pełnej WCAG lub niezależnego odbioru.
- K063: rozszerzono istniejący pomiar, bez nowego publicznego endpointu/telemetrii. Sygnały z faktycznych próbek: próg p95, request failure, invalid/stale. Unit/integration obejmuje realne HTTP503 i sentinel privacy; delivery NOT_CONFIGURED, owner UNASSIGNED. [Budżet, alert sheet i actual-target checklist](REVIEW_OPERATIONS.md). Nie ustalono fikcyjnego produkcyjnego SLO/pojemności.
- Przygotowano [indeks materiałów](REVIEW_HANDOFF_INDEX.md), [Legal/Privacy/AI](REVIEW_LEGAL_PRIVACY.md), [badania/assessment](REVIEW_RESEARCH_ASSESSMENT.md), [operator/T&S/release/providers](REVIEW_OPERATIONS.md), [manual accessibility](REVIEW_ACCESSIBILITY.md) oraz [jawny rejestr28 odbiorów](PREPARED_REVIEW_REGISTER.json). Właściciele/recenzenci/decyzje null, returnedEvidence=[]; wymagany wynik konkretny perID.

## Zmiany i dowody regresji

`src/client/faro.ts`: serwerowy błąd formularza jest fokusowanym atomic alert; UI nie oznacza zbiorowo pól jako invalid bez wiedzy o winowajcy. Natywne preview ma nazwę z h2; oba modale wracają do aktywnego istniejącego triggera po close. Przycisk chwilowo disabled podczas async otwarcia nie był wiarygodnym native return target; nowy test odtworzył utratę focusu po Escape.

Pierwszy remote run97da106 przeszedł oba workflow, ale PG/Node22 miał jedną flaky próbę logowania. Zamiast uznać retry za dowód braku błędu, dodano deterministyczną regresję: realny anonymousGET/me401 zostaje przytrzymany, nowy login otrzymuje sesję i rozpoczyna realnyGET/me200; stary401 wraca przed nowym200. Na wcześniejszym kliencie usuwa workspace i anuluje poprawny odczyt. Test zawiódł desktop/mobile (`login-race-before.log`). Rozpoczęcie login/register teraz zmienia epoch i anuluje poprzedni controller, a api odrzuca anulowaną odpowiedź także po JSON. Aktualne401 w bieżącym kontekście nadal wylogowuje; nie osłabiono kontroli sesji. Próba kontrolna, w której401 wraca dopiero po ukończonym renderze, przechodziła już wcześniej i jest oddzielona (`login-race-after-render-control.log`).

`public/faro.css`: mobile f-session zawija elementy i ogranicza szerokość; długie treści w main mogą łamać się zamiast poszerzać viewport. Zrzut powiększonego tekstu wykazał dodatkowo obcinanie liter w input/select przez odziedziczoną height44px; scoped height:auto zachowuje minimum44 i pozwala rosnąć z fontem/padding. Test sprawdza także tę wysokość. Brak overflow:hidden maskującego błąd i brak redesignu. `public/sw.js` cachev3 dostarcza nowe publiczne JS/CSS; żadne API/answers nie dołączone do cache.

`e2e/faro-accessibility.spec.ts`: cztery scenariusze ×desktop/mobile, realny HTTP; helper Tab kontroluje outline i zasłonięcie, brak bezpośredniego focusowania kontrolek w teście. Initial failing run na poprzedniej wersji zachowany w k062-before.log; dalsze dowody focus return i reflow w logach rozwoju. Dopuszczenie przejścia natywnego dialogu do browser chrome opisuje prawdziwą granicę; tło dokumentu nie może przejąć focusu. Testy nie symulują sukcesu API. Lokalny runner i natywna lista CI zawierają ten sam plik. Nowy pełny zakres:60 SQLite,50 PostgreSQL perNode22/24.

`scripts/faro-performance-proof.mjs`: zachowane request/budget/deadline/scope ograniczenia. Evaluator nie ufa polu result, waliduje strukturę/liczność/per-route percentyle/politykę/daty i emituje tylko stałe bezpieczne pola. `scripts/faro-performance-proof.test.mjs` oraz wrapper `src/tests/faro-operational-evidence.test.ts` testują sukces, HTTP503, p95 granicę2000/2001, stale/invalid/NaN/missing/nieznaną ścieżkę, kolejność kluczy i brak sekretów. Żaden zewnętrzny alarm nie został wysłany.

Istniejący dwurołowy pełny scenariusz `e2e/faro.spec.ts` ma jawny limit60s zamiast30s. Trace natywnego lokalnego run pokazał zaliczone asercje do linii216 i wyczerpanie30s podczas końcowego screenshot/cleanup; scenariusz obejmuje ponad200 interakcji. Nie zmieniono timeoutów asercji, kryteriów lub pozostałych testów. `faro-postgres-local.mjs --browser-only` pozwala powtórzyć wyłącznie przeglądarki w nowym jednorazowym klastrze, bez niepotrzebnego ponawiania niezmienionego rehearsal/restore; jego komunikat PASS nie udaje pełnego rehearsal.

Mechaniczny Impeccable detector odnotował dwie zastane uwagi stylistyczne `side-tab` w istniejących akcentach obramowania. Nie stanowią wykazanej bariery WCAG; nie zmieniano wyglądu z tego powodu. Weryfikacja wizualna dotyczy reflow i czytelności bieżących syntetycznych ekranów, nie jakości badania użytkowników.

## Weryfikacja

Etap94b7bc2 zakończony: [FARO39988429533](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/39988429533) i [CI39988428650](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/39988428650) SUCCESS;213 Node bez failures/skips,60/60 SQLite,50/50 PostgreSQL na każdym Node22/24, bez flaky/retry; native restore/current authority, migracje i container readiness PASS. To dowód dla tego etapu, nie późniejszej delty wizualnej.

Następne jawne zlecenie użytkownika: [dopracowanie UI z Impeccable](UI_POLISH_2026_10_23.md). Zawiera również odtworzoną wcześniejszą fazę race przed submit i poprawkę pełnej widoczności focusu. Regresje przed poprawką zawiodły; targeted retest6/6 PASS. Nowy pełny zakres62/52 i jego CI pozostają w toku do zapisania faktycznych wyników.

Lokalnie build/lint/typecheck/38 migracji PASS,213/213 Node PASS bez skips/failures; targeted K0626/6 desktop/mobile PASS. SQLite pomiar:4 czytelników/80 żądań,0 errors; p95 health21.075ms,me6.515ms,profile6.346ms,offers6.742ms; signals OK przy NOT_CONFIGURED delivery. To konkretny lokalny pomiar, nie produkcyjna obietnica. Natywna weryfikacja PostgreSQL i pełne zestawy przeglądarkowe/nowe CI są w toku; nie przypisywać starych wyników zmienionemu buildowi.

Uzupełnienie etapu97da106: lokalne58/58 SQLite oraz ponowione48/48 PostgreSQL18.6/Node24 browsers PASS, cluster STOPPED/CLEANUP_PASS. Wcześniejszy native rehearsal/actual restore/current authority PASS; pomiarPG p95 health19.620/me25.048/profile26.832/offers31.283ms,0 errors, signalsOK. Dokładne [FARO39986251894](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/39986251894) i [CI39986251395](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/39986251395) SUCCESS; PG22 miał jedną flaky próbę logowania opisaną powyżej. Nie uznano retry za brak błędu.

Końcowa delta session-race/input-height: nowy deterministyczny test zawodzi na poprzednim kliencie w obu viewportach; po poprawce pełny targeted K0628/8 PASS, build/lint/typecheck PASS. Zrzuty desktop/mobile potwierdzają widoczne nieobcięte litery i zawijanie nagłówka. Nowy pełny zakres60/50 wymaga kolejnego exact-commit CI; wynik97da106 nie jest mu przypisany. Metadane i hashe ukończonych logów: [verification.json](evidence/independent-readiness-20261023/verification.json).

Logi oryginalne: `evidence/independent-readiness-20261023/*.log` lokalnie, bez sekretów i surowych danych użytkowników. Końcowe metadane i hashe zostaną zapisane po zakończeniu weryfikacji. Udane proof uruchamiały się na jednorazowych lokalnych fixture; cleanup klastra wymaga jawnego STOPPED/CLEANUP_PASS.

## Granice odbioru

Wszystkie28 zewnętrznych zadań nadal EXTERNAL_BLOCKED;44 DONE/0 DELTA_REQUIRED/28 EXTERNAL_BLOCKED/14 DEFERRED bez zmiany. Brakujące prawne/eksperckie/user/manual-AT/security/production/operator/provider approvals nie są zastępowane przygotowanymi arkuszami. Żadne nowe źródło ofert, płatny zasób, sekret, repo permission, provider call, publiczna rekrutacja lub produkcja nie zostały uruchomione. Staging pozostaje na ostatnio przyjętym1e8d704, aktualny etap nie potwierdza nowego zdalnego deployu.
