# Operator, T&S, dostawcy i release — pakiet do odbioru

23.10.2026. Stan decyzji i ownerów: MISSING/UNASSIGNED. Ćwiczenia opisane niżej są gotowymi scenariuszami do wykonania, nie rzekomo odbytymi tabletopami. Dowody wykonanych testów znajdują się osobno w INDEPENDENT_READINESS_2026_10_23.md i istniejącym RUNBOOK.md. Zakres K009/K026/K038/K063/K064/K065/K077/K082 oraz zależności K023/K049. Nie wykonano produkcji, zmian branch protection, sekretów, płatności ani kontaktu z dostawcami.

## K009 — odbiór trwałego środowiska

Aktualnie zweryfikowane: lokalne/natywne PostgreSQL18, SQLite, szyfrowany backup i actual restore, current-authority no-resurrection, custody boundary w narzędziach, retained-account restart na darmowym stagingu. To nie ustala produkcyjnego RPO/RTO. Darmowa baza wygasa7.11.2026, a staging ma efemeryczne pliki i guard odmawiający startu przy referencjach do uploadów. Nie używać go jako jedynej kopii danych produkcyjnych.

Arkusz konkretnego targetu:

| Pole | Wymagane rozstrzygnięcie/dowód | Stan |
|---|---|---|
|Cel i odpowiedzialny operator|Target/region, administrator, zastępstwo, zakres autoryzacji/koszt|UNASSIGNED|
|Baza i private files|Rzeczywiste trwałe wolumeny/usługa, uprawnienia non-root, szyfrowanie, restart/redeploy obu grup danych|MISSING production proof|
|Backup i klucze|Oddzielny dostęp/retencja/rotacja, backup key, authority key, MFA/rate keys; brak sekretów w Git/logach|MISSING custody acceptance|
|Current authority|Niezależnie aktualne erasures/grants/roles/password/claim/activity/learning; sposób potwierdzenia świeżości i awarii capture|MISSING accountable process|
|RPO/RTO|Owner wybiera dopuszczalne cele; rzeczywisty pomiar od zatwierdzonego momentu utraty do odzyskania z walidacją|Targets UNDECIDED; production measurement MISSING|
|Odtworzenie|Nowy izolowany target, integrity/FKs/counts/hashes/files, actual HTTP/login/export, usunięte dane nie wracają|Engineering PASS; target-specific acceptance MISSING|
|Wycofanie|Wstrzymanie intake, cofnięcie klienta z zachowaniem napraw prywatności i historii; brak resetu/downgrade DB|Istniejący RUNBOOK; owner exercise MISSING|

Operator używa istniejących backup/restore CLI z RUNBOOK, secrets wyłącznie przez chronione środowisko. Nie wykonywać przykładowych komend na realnym target bez potwierdzonej ścieżki i zakresu. Raport zawiera wersje/sumy, momenty pomiaru, zakres utraconych/odzyskanych danych, ograniczenia i decyzję ownera. Bez surowych rekordów i sekretów.

## K063 — budżet i alarmy techniczne

Istniejący `scripts/faro-performance-proof.mjs` mierzy rzeczywiste HTTP w jednorazowym loopback:4 czytelników,80 żądań,8 warmup, po20 pomiarów health/me/profile/offers,0 błędów,p95<=2000ms,deadline10000ms. Loguje p50/p95/max, throughput, event-loop p95, wersję Node/backend i datę. Profil to mała syntetyczna fixture, nie prognoza ruchu ani uzgodniona produkcyjna pojemność/SLA. Obciążenia nie wysyłać na staging/produkcję.

Dodany evaluator `performanceSignals` liczy sygnały z wartości, nie z zadeklarowanego `result`. Sprawdza dokładny kontrakt polityki, cztery dozwolone ścieżki, liczność i porządek percentyli, skończone wartości, datę i backend. Nigdy nie przenosi dowolnych pól źródła do output. Kody:

| Sygnał | Warunek | Reakcja lokalnego narzędzia / operatora |
|---|---|---|
|REQUEST_FAILURE|Niezerowy licznik błędów rzeczywistych prób HTTP|Test/budżet FAIL; operator izoluje błąd w kontrolowanym środowisku. Nie replayować mutations.|
|READ_P95_BUDGET|p95 któregokolwiek badanego route >2000ms|Test/budżet FAIL; przejrzeć pomiar, DB/CPU/I/O/plan zapytania przed zmianą progu.|
|EVIDENCE_INVALID|Brak/malformed/inny kontrakt/nieznany route/niefinitywne lub sprzeczne dane|UNKNOWN, nigdy OK. Naprawić collector/format.|
|EVIDENCE_STALE|Dowód starszy niż5min przy ocenie|ALERT tylko ważności syntetycznego cyklu;5min to limit techniczny evaluator, nie zatwierdzona częstotliwość produkcyjnych alertów.|

`delivery=NOT_CONFIGURED`, `owner=UNASSIGNED` zawsze jawne. Nie wysyła maili/Slack ani nie udaje aktywnego monitoringu. Unit/integration proof uruchamia prawdziwy serwer503 oraz testuje przekroczenie progu, stale/invalid i brak cookies/surowych błędów w logach. Native HTTP rehearsal emituje te same sygnały dla PostgreSQL.

Przed produkcją owner musi ustalić reprezentatywny rozmiar/zmienność danych, mix read/write/auth, współbieżność, okna p95, error budget, oczekiwane zasoby i granice testu. Potem technicznie można uruchomić zatwierdzony profil. Nie zmieniono obecnych limitów w celu PASS.

Proponowany zestaw monitorowania do zatwierdzenia: `/api/health` database/storage readiness; administrator-only worker/outbox/fileDisposals aggregates; failed/dead-letter i wiek najstarszego pending; aktualność capture authority i backupu; wynik ostatniego restore rehearsal; błędy/latencje stałych route templates. Body/odpowiedzi/telefony/emails/URL z ID nie są etykietami metryk. Endpoint diagnostics pozostaje chroniony RBAC/MFA, bez nowego publicznego endpointu.

Arkusz alertu do zwrotu: `signal, environment, fixedMetricLabel, threshold/window, rationale, collectionAuthReference, destinationReference, primaryOwner, backupOwner, acknowledgementExpectation, runbook, failureInjectionRef, observedDeliveryRef, falsePositiveReview`. Nie wpisano fikcyjnego odbiorcy, SLO, czasu reakcji ani dowodu dostarczenia. Bez tych danych K063 nadal EXTERNAL_BLOCKED.

## K064 — konkretna propozycja polityki release

Technicznie działa minimalne CI contents:read, build/lint/types/migrations, Node/native browsers/recovery, dependency advisory gate, SBOM i rzeczywisty container smoke. Brak ochrony main był potwierdzony w poprzednim odbiorze; nie zmieniono uprawnień repozytorium.

Wariant do decyzji właściciela: PR na main, oba pełne workflow jako required checks, brak force-push/deletion, reguła review i jawna procedura emergency/bypass. Liczba reviewerów, administratorzy i wyjątki wymagają jego wyboru. To zmienia dotychczasowy direct-main, więc nie jest zastosowane automatycznie. Nie wymyślono nowego wymogu zakupu planu GitHub. Po decyzji sprawdzić dostępność funkcji dla repo i zgodność exact check names; niezależny security reviewer ocenia auth/RBAC/MFA/privacy/recovery, nie samo zielone CI.

Odbiór security: build/hash, threat model i granice tenantów, negatywne scenariusze aktualnej autoryzacji/replay/erasure/restore, bezpieczeństwo sekretów i dostawców, finding→fix→regression, residual risks, zakres niezależności i podpisana decyzja. Nie przypisywać własnej poprawce niezależnego certyfikatu.

## K026/K038/K082 — instrukcja weryfikacji i moderacji

1. Uprawniony operator otwiera sprawę, zapisuje kategorię i referencję dowodów, sprawdza konflikt interesów. Dla JDG dopuszcza manualną ścieżkę bez zbędnego publikowania danych prywatnych.
2. Weryfikuje uprawnienie reprezentanta, istnienie potrzeby rekrutacji i jawne warunki pierwszej oferty. Sam wpis w bazie nie dowodzi aktywnego wakatu.
3. Rozdziela zarzut, stwierdzone fakty i niewiadome. Hold/restriction tylko w istniejącym uprawnionym procesie z powodem i proporcjonalnym zakresem; zapewnia informację i appeal według zatwierdzonej polityki.
4. Powtarzalne identyczne warunki ogłoszeń są sygnałem do review, nie dowodem intencji/fraudu. Pyta o wiele wakatów, evergreen i ponowne nabory; nie tworzy automatycznej sankcji/progu oszustwa.
5. Odwołanie rozpatruje osoba z właściwą niezależnością; zapisuje uzasadnienie, korektę/przywrócenie, ograniczenia dowodu i follow-through. Zachować historię i kontrolę dostępu.

Formularz: `caseRef, subjectType, allegation, evidenceRefs, verifiedFacts, unknowns, evergreenOrMultipleVacanciesContext, conflictCheck, interimActionAndReason, reviewerRef, decisionAndReason, notifiedPartiesRefs, appealRoute, secondReviewer, restorationOrFollowup, retentionDecisionRef`. Bez prywatnych załączników w repo.

## K065 — dwa gotowe scenariusze tabletop

| Etap | Naruszenie prywatności / stary backup | Scam / potencjalny ghost-job |
|---|---|---|
|Inject|Po restore zgłoszono widoczną usuniętą odpowiedź w historycznym journalu|Kandydat zgłasza prośbę o użyteczną komercyjnie pracę; raport powtarzalnych ofert sygnalizuje wzorzec|
|Pierwsze ustalenia|Zabezpieczyć dostęp, nie kopiować prywatnej treści do ticketu; zebrać build/restore/authority refs i zakres|Zabezpieczyć dowody minimalnie, sprawdzić tenant/uprawnienia i rzeczywisty wakat; nie ustalać winy z agregatu|
|Role|Incident lead, Privacy/Legal, operator, zastępstwo; wszystkie osoby do przypisania|T&S lead, osoba niezależna dla appeal, Legal przy spornym zadaniu; obsada do przypisania|
|Decyzje|Izolacja dotkniętego targetu, source-of-truth authority, zakres i kwalifikacja incydentu przez odpowiedzialne osoby|Czy hold/restriction, zakres ochrony i informacja dla stron; wyjątki evergreen i kolejny review|
|Recovery|Izolowany actual restore+current authority, skan pochodnych, brak odtworzenia starych grants/sesji, test HTTP i rollback|Uzasadniona decyzja, appeal, ewentualne przywrócenie i weryfikacja działania narzędzi|
|Wynik ćwiczenia|Faktyczne daty/czasy, kontakty i zastępstwo, dowody, luki i ich ownerzy; bez fikcyjnego spełnienia terminu prawnego|To samo; oddzielić wykrycie, reakcję człowieka, zawiadomienia i odwołanie|

Ćwiczenie i realne kontakty są MISSING. Wszelkie prawne obowiązki powiadomienia kwalifikuje właściwy owner; materiał nie ustanawia sam nowego terminu ani nie wysyła wiadomości.

## K023/K049/K077 — arkusz dostawcy/źródła

Uzupełnić per dataset/service/layer: podmiot, wersja/manifest/hash, exact endpoint i region, licencja danych oraz odrębne service terms, atrybucja, pola wysyłane i odbiorcy/subprocesorzy, transfery, trening/logi, retencja/cache/deletion, ograniczenia wieku, limity współdzielonej floty i wydatków, SLA/awaria/manual fallback, sekret i jego custodian, reviewer i decyzja.

Odrębne warstwy geograficzne: OSM data, tiles/style/renderer, geocoder, router profile, rozkład i taryfa transportu, paliwo. Brak taryfy pozostaje null, nie0; warianty podróży nie są sumowane bez podstawy. Nie dodano publicznych endpointów, cache ani domniemanych praw do INFO/ZRK/job-portali. Wiążący zakres: FOUNDER_UPDATE_NATIVE_OSM.md.
