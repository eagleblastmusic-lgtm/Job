# Pakiet Legal / Privacy / AI — projekt do odbioru

Stan23.10.2026. Właściciel i recenzent: UNASSIGNED. Wszystkie decyzje: MISSING. Materiał opisuje implementację i pytania do rozstrzygnięcia; nie jest opinią prawną, zatwierdzonym DPIA ani regulaminem produkcji. Nie opublikowano zmian warunków. Zakres K001/K002/K003/K004/K021/K023/K049/K051/K052/K077/K083/K085.

## Kwalifikacja usług — dane wejściowe do pisemnej odpowiedzi K001

| Usługa / faktyczny zakres | Dowód w repozytorium | Pytanie i wymagany wynik recenzenta |
|---|---|---|
|Native marketplace: firma tworzy ofertę, jawne warunki, kontrola wersji/review; brak importu job-portali|FOUNDER_UPDATE_NATIVE_OSM.md; modele offers/recruitment|Zakwalifikować tę konkretną usługę, podmiot prowadzący, obowiązki i moment ich wykonania; wskazać podstawę i warunki GO.|
|Koordynacja procesu i dwa zegary; człowiek wybiera dalszy krok/odmowę|API.md; processWriteModel.ts|Czy i jakie obowiązki pośrednictwa/koordynacji powstają? Osobno od samego hostowania ogłoszenia.|
|Profil kompetencji, własne deklaracje, dokładna projekcja NO-CV|PRIVACY_MODEL.md; profile/projection models|Ocenić role, zakres dopuszczalnego ujawniania i informowania. Nie przywracać nazw firm/stanowisk/historii CV do projekcji.|
|Quiz/manual OPEN_ANSWER; człowiek zatwierdza, koryguje i unieważnia wynik|assessmentAnswerModel.ts; assessmentReviewModel.ts; assessmentInvalidationModel.ts|Zakwalifikować cel i odbiorców assessmentu; określić granice interpretacji i użycia w rekrutacji.|
|Weryfikacja organizacji, first-offer review, zgłoszenia/appeal|organization/trust/case models; REVIEW_OPERATIONS.md|Określić odpowiedzialność operatora, wymagane dowody, informację dla stron i obsługę skarg.|

Recenzent zwraca per wiersz: zakres analizowanego build/ekranów, podstawa i data prawa, kwalifikacja z uzasadnieniem, lista konkretnych obowiązków, owner wykonania, dowód wykonania, ograniczenia i jawna decyzja GO/NO_GO/CONDITIONAL. Sam ogólny disclaimer lub nazwa KRAZ nie wystarcza.

## Mapa danych i celów — projekt do DPIA / rejestru czynności

| Grupa / cel | Przepływ i dostęp w implementacji | Decyzje nadal wymagane |
|---|---|---|
|Konto, logowanie, sesje, MFA / dostęp|Własne konto; hasło jako hash; sekrety MFA chronione konfiguracyjnym kluczem; RBAC i aktualna sesja|Administrator/podmiot przetwarzający, podstawa per cel, informacja, retencja kont/sesji/audytu, custody klucza.|
|Prywatne opisy praktyki, deklaracje, nauka, ograniczenia / przygotowanie profilu|Dane właściciela; brak automatycznego udostępniania prywatnego kontekstu firmie; usuwanie/wycofanie i recovery według current authority|Niezbędność pól, podstawa, dane szczególne w treści, sposób redukcji/obsługi przypadkowego wpisu, okresy i zdarzenia usuwania.|
|Projekcja NO-CV / konkretny proces|Dokładny preview i potwierdzenie; wersjonowany snapshot w procesie; dostęp właściciela i uprawnionego zespołu|Role Faro/firmy, odbiorcy, legalny zakres, informacja o snapshotach, wycofaniu i uzasadnionej historii; K085 zakres późniejszy.|
|Telefon / kontakt w procesie|Osobny preview/grant; cofnięcie; zmiana telefonu cofa stare grants; brak globalnego udostępnienia|Podstawa i informacja odrębna od samego kliknięcia; dalsze użycie telefonu przez firmę i obsługa praw.|
|Odpowiedzi assessmentu / ocena w procesie|Draft prywatny; po submit assigned team; wynik/historia i ręczna korekta; journal ma minimalne{id}, nie kopię odpowiedzi|Podstawa per cel, nadzór, retencja treści/wyniku/rubryki, legal hold, eksport, odbiorcy po zamknięciu procesu.|
|Rozmowy / uzgodnienie i potwierdzenie spotkania|Termin/strefa/lokalizacja/link, potwierdzenia stron; journal minimalny|Minimalny zakres lokalizacji/linku, odbiorcy, kalendarz i ewentualny zewnętrzny dostawca.|
|Zgłoszenia / moderacja i appeal|Uprawniony human review; uzasadnienia, ograniczenia i przywrócenia; brak automatycznego ustalenia intencji z ghost-job pattern|Podstawa, role, tajemnica zgłoszeń, dozwolona treść, dostęp, terminy, wyjątki, zasady odwołań.|
|Telemetria / jakość produktu|Dobrowolna analityka, retained consenting pair/week subset; nie pełna populacja|Dopuszczalny cel, minimalizacja, retencja, wycofanie i bias próby; żadnych PII/odpowiedzi w telemetry payload.|
|Outbox/journal/audyt/request limits / niezawodność i bezpieczeństwo|Dedupe/hash/aktualna autoryzacja; journal selektywnie zminimalizowany; aggregate diagnostics|Oddzielne okresy/cel, podstawa i dostęp; nie usuwać bez rozróżnienia całej historii.|
|Backupy, pliki, ledger/current authority / odtworzenie|Szyfrowany backup+osobna authority; izolowany restore z usunięciem/cofnięciem; trwała kolejka disposal|Niezależne custody, rozdział kluczy, zatwierdzone okresy/rotacja/hold, actual infrastructure, dowód braku wskrzeszenia i pomiary RPO/RTO.|
|AI/geografia / opcjonalna funkcja|Gateway ograniczony i nieaktywowany live; OSM-adaptery niekonfigurowane; manual fallback; brak eksportu prywatnego origin do pracodawcy|Konkretny dostawca/model/endpoint/region, role/transfery/subprocesorzy/trening/logi, payload, wieku/retencji i umowa; brak zgody domniemanej z kodu.|

Nie wpisano domyślnej podstawy prawnej ani jednego globalnego TTL. Istniejąca karta retencji w EXTERNAL_ACCEPTANCE_PACKET.md pozostaje punktem odniesienia. Dla każdej grupy recenzent uzupełnia: administrator i role, kategorie osób/danych, cel, podstawa, odbiorcy/transfery, minimalizacja, okres lub zdarzenie końca, wyjątki/hold, propagacja do kopii, realizacja praw i residual risk. Wersję zatwierdzonych decyzji trzeba powiązać z buildem i wdrożyć osobno.

## Inwentarz zastosowań AI do K003

| Moduł | Fakty i wpływ | Do sklasyfikowania |
|---|---|---|
|Lokalne sugestie kompetencji|Lokalne reguły/lineage; sugestia wymaga potwierdzenia, bez domniemanej równoważności|Czy spełnia definicję systemu AI w faktycznej wersji; rola dostawcy/użytkownika i intended purpose.|
|Opcjonalny gateway LLM|Schema/semantic validation, limity kosztu/egress, manual fallback; brak narzędzia publikacji lub odrzucania|Osobno każdy prompt/cel/dostawca/dane; nie przypisywać jednej klasy całemu Faro.|
|Matching/widoki|Jawne warunki i exact skill IDs; brak globalnego person score|Ocenić rzeczywisty wpływ wyświetlania/filtering i wyjaśnień, nie wyłącznie etykietę „asystent”.|
|Quiz i ręczna ocena OPEN_ANSWER|Deterministyczne punkty quizu, człowiek zatwierdza/koryguje; pierwotna rubryka i historia zachowane|Klasyfikacja celu i ocena rzeczywistego nadzoru/odwołania. Ręczny przycisk sam nie dowodzi skutecznego nadzoru.|
|AI grading shadow|Brak zatwierdzonej walidacji i aktywacji; nie wpływa na proces|Przed eksperymentem określić provider/data approval, eksperckie oceny i granice eksperymentu; REVIEW_RESEARCH_ASSESSMENT.md.|

Aktualne publiczne informacje instytucjonalne i ich ograniczenia są w MARKET_REVIEW_2026_10_23.md/M07. Nie wynikają z nich klasyfikacja Faro ani zgoda na release.

## Proponowane klauzule produktowe do zatwierdzenia K002/K021/K052

Projekt, nie opublikowany regulamin:

> Korzystanie z Faro jest bezpłatne dla kandydatów i pracodawców. W obecnym zakresie nie ma subskrypcji kandydata ani opłaty za dostęp do rekrutacji.

> Do aktywnej rekrutacji trafiają oferty utworzone przez uprawnione firmy w Faro. Udostępnienie danych kandydata następuje w pokazanym, konkretnym zakresie procesu; prywatne opisy praktyki i robocze odpowiedzi nie stają się automatycznie profilem firmy.

> Zadanie assessmentu służy ocenie według pokazanej rubryki. Nie może być zleceniem wykonania nieodpłatnej pracy do komercyjnego wykorzystania. Przed rozpoczęciem pokazywane są przewidywany czas i limit; problem można zgłosić przez istniejącą ścieżkę zgłoszeń.

Recenzent ma wskazać wykonalne obowiązki, środki ochrony i spójność ze wszystkimi ekranami; projekt nie obiecuje nieistniejących czasów obsługi lub odszkodowań. Nie dodano globalnego limitera czasu, płatności ani nowej decyzji founderskiej.

## Pozostałe konkretne decyzje

- K083: jawnie określić obsługiwane grupy wieku i pierwszej pracy, obowiązki i ograniczenia dostawców oraz właściwą ścieżkę manualną. Pole decyzji jest puste; nie wprowadzono cichego18+ ani nie ogłoszono wsparcia małoletnich przed odbiorem.
- K085: dla etapu rozmowy/oferty/zatrudnienia ustalić dopuszczalne pola tożsamości, cel, odbiorcę, podstawę, inicjatora, preview/grant, cofnięcie i historię. Brak decyzji oznacza zachowanie istniejącej ograniczonej projekcji; nie przywraca historii firm/stanowisk.
- K023/K049/K077: zatwierdzić actual manifest/dataset/provider i dokładny zakres; data license nie jest service entitlement. Klucze, limit kosztów, region i retencja nie mogą być wartościami przykładowymi udającymi konfigurację produkcyjną.

## Formularz zwrotu

`reviewId / reviewerRole / reviewerReference / independence / buildAndArtifactHash / reviewedScope / evidenceReferences / missingEvidence / decision(GO,NO_GO,CONDITIONAL) / conditions / accountableOwner / decisionDate / reviewExpiryOrTrigger`.

Wszystkie pola decyzji pozostają niewypełnione w repozytorium. Dane osób i pełne materiały recenzenta przechowywać w kontrolowanym miejscu; tutaj wyłącznie referencje. Brak odpowiedzi, upływ czasu lub zielone CI nie stanowią zgody.
