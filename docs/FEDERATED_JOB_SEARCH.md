# Federated Job Search + Official API + Live Public Ingestion

Stan: 2026-09-13

## Cel

Job ma jedną wyszukiwarkę, która wykorzystuje Career Truth (rola, lokalizacja, promień), pobiera oferty przez oficjalne API tam, gdzie taki kanał jest dostępny, równolegle próbuje ograniczony odczyt publicznych ofert z aktywnych źródeł, normalizuje wszystko do wspólnego modelu i przekazuje do istniejącego kanonicznego Job Feed/deduplikacji. Użytkownik nie musi otwierać każdego portalu osobno, żeby zobaczyć wyniki w Job.

## Preferowana kolejność źródeł

1. **Oficjalne API / licencjonowane feedy** — stabilny kanał pierwszego wyboru.
2. **Dozwolone publiczne feedy / ATS / strony karier** — po jawnej konfiguracji konkretnego źródła.
3. **Ograniczony odczyt publicznego HTML** — kanał uzupełniający, zawsze fail-closed przy blokadzie.
4. **Ręczny link do portalu** — ostatni fallback, gdy automatyczny kanał dla danego serwisu jest niedostępny.

Nie próbujemy sprawiać, żeby portal „przestał blokować” przez obchodzenie jego mechanizmów. Zamiast tego zwiększamy pokrycie przez niezależne oficjalne kanały danych.

## Jooble Polska — oficjalny agregator API

Job obsługuje `jooble_pl` przez oficjalny Jooble REST API dla rynku polskiego:

- dokumentacja i wniosek o klucz: `https://pl.jooble.org/api/about`;
- klucz jest konfigurowany jako `JOOBLE_API_KEY_PL` i nigdy nie jest zapisywany w provenance ani logach;
- zapytanie wykorzystuje stanowisko, lokalizację i najbliższy wspierany promień;
- odpowiedź Jooble (`title`, `company`, `location`, `salary`, `type`, `snippet`, `link`, `updated`) jest mapowana do istniejącego `JobSourceConnector`;
- oferty z Jooble przechodzą przez ten sam parser, Decision Engine i deduplikację jak pozostałe źródła;
- cache 30 minut ogranicza liczbę powtarzanych zapytań do oficjalnego API;
- brak klucza nie psuje wyszukiwarki — źródło ma stan `DISABLED`, a pozostałe kanały działają dalej;
- błędny klucz, limit zapytań lub chwilowa awaria Jooble failują tylko to źródło.

Oficjalna strona Jooble opisuje REST API jako mechanizm dla stron i wyszukiwarek, które chcą wysyłać zapytania do Jooble i prezentować odpowiedzi we własnym interfejsie. Klucz uzyskuje się przez formularz na stronie API.

## Bezpośrednie źródła publiczne

Ograniczony odczyt publicznych stron jest dodatkowo skonfigurowany dla:

- Pracuj.pl
- LinkedIn Jobs
- OLX Praca
- Indeed
- RocketJobs
- Just Join IT

Bezpośrednie strony karier pracodawców pozostają osobnym kanałem wymagającym jawnej allowlisty lub feedu konkretnego pracodawcy.

## Jak działa odczyt publicznego HTML

1. Job buduje URL wyszukiwania z frazą, lokalizacją i promieniem tam, gdzie źródło obsługuje te parametry.
2. Backend wykonuje zwykłe publiczne `GET` do strony wyników — bez logowania i bez prywatnych endpointów.
3. Najpierw szuka `application/ld+json` / Schema.org `JobPosting`.
4. Jeśli lista nie zawiera pełnego `JobPosting`, Job wyciąga ograniczoną liczbę publicznych linków do szczegółów i odczytuje ich strony.
5. `JobPosting` jest zamieniany na wspólny tekst źródłowy i przepuszczany przez istniejący `JobSourceConnector` → parser → Decision Engine → obserwacje źródłowe → deduplikację.
6. Odświeżenie tego samego wyniku jest idempotentne: ten sam URL/external ID nie tworzy kolejnej kanonicznej oferty.

## Granice bezpieczeństwa źródeł

Adapter publicznych stron:

- nie loguje się do serwisu;
- nie używa cudzych kont/cookies/tokenów;
- nie omija CAPTCHA ani challenge typu „verify you are human”;
- nie obchodzi HTTP 401/403/429;
- nie próbuje korzystać z nieudokumentowanych prywatnych API jako substytutu oficjalnego dostępu;
- ma timeout 8 s na żądanie, limit 2 MB HTML, maksymalnie 8 stron szczegółów na źródło i cache 10 minut;
- awaria jednego źródła nie zatrzymuje pozostałych ani Jooble API.

Przy 401/403/429 lub wykryciu CAPTCHA źródło zwraca status `BLOCKED`. To nie jest awaria całej wyszukiwarki: wyniki z Jooble, innych API/feedów i pozostałych dostępnych źródeł nadal trafiają do wspólnego feedu.

## Oficjalne API a publiczne strony

Live ingestion nie oznacza, że Job otrzymał partnerski dostęp API do każdego portalu. To różne kanały.

- Jooble Polska: oficjalny REST API, aktywny po podaniu `JOOBLE_API_KEY_PL`.
- LinkedIn Job Posting API pozostaje ograniczone do zatwierdzonych integracji partnerskich. Public-page adapter nie używa tego API.
- Indeed API wymaga odpowiedniego dostępu partnerskiego. Public-page adapter nie używa prywatnych endpointów jako obejścia.
- OLX Developer API nie jest używane do pobierania cudzych ogłoszeń; adapter czyta wyłącznie publiczne strony WWW i zatrzymuje się przy blokadzie.
- Pracuj.pl, RocketJobs i Just Join IT są obecne jako bezpośrednie źródła publiczne, ale ich struktura lub polityka dostępu może się zmienić niezależnie od Job.

## API Job

`GET /api/job-search?q=<fraza>&location=<lokalizacja>&radiusKm=<0..300>`

Endpoint jest chroniony przez feature flag `job_feed`. W czasie jednego żądania:

- waliduje kryteria;
- uruchamia oficjalny Jooble API i aktywne bezpośrednie źródła równolegle;
- importuje i deduplikuje wyniki per użytkownik;
- zwraca wspólny feed pasujących ofert;
- zwraca `sourceRefresh` dla każdego uruchomionego źródła;
- zwraca `importedCount` oraz `newCanonicalCount`.

## Stan źródeł w UI

Głównym przepływem jest przycisk **„Pobierz oferty ze wszystkich źródeł”**. Karty źródeł są diagnostyczne: pokazują ile rekordów pobrano albo dlaczego konkretny kanał nie odpowiedział. Jooble bez klucza pokazuje **„wymaga klucza API”**. Blokada bezpośredniego portalu nie usuwa wyników uzyskanych przez oficjalny agregator.

## Bezpośrednie strony pracodawców

`employer_careers` nadal wymaga jawnej konfiguracji pracodawców/ATS. Następny bezpieczny krok dla tego kanału to adaptery oficjalnych publicznych feedów (np. JSON/RSS/ATS) z allowlistą domen i testami kontraktowymi.
