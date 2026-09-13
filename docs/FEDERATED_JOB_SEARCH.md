# Federated Job Search + Live Public Ingestion

Stan: 2026-09-13

## Cel

Job ma jedną wyszukiwarkę, która wykorzystuje Career Truth (rola, lokalizacja, promień), automatycznie próbuje odczytać publiczne oferty z aktywnych źródeł, normalizuje je do wspólnego modelu i przekazuje do istniejącego kanonicznego Job Feed/deduplikacji. Użytkownik nie musi otwierać każdego portalu osobno, żeby zobaczyć wyniki w Job.

## Źródła

Automatyczny, ograniczony odczyt publicznych stron jest aktywny dla:

- Pracuj.pl
- LinkedIn Jobs
- OLX Praca
- Indeed
- RocketJobs
- Just Join IT

Bezpośrednie strony karier pracodawców pozostają osobnym kanałem wymagającym jawnej allowlisty lub feedu konkretnego pracodawcy.

## Jak działa odczyt

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
- awaria jednego źródła nie zatrzymuje pozostałych.

Przy 401/403/429 lub wykryciu CAPTCHA źródło zwraca status `BLOCKED`, a UI pokazuje to użytkownikowi. Dostępny pozostaje ręczny link do oficjalnej wyszukiwarki.

## Oficjalne API a publiczne strony

Live ingestion nie oznacza, że Job otrzymał partnerski dostęp API. To dwa różne kanały.

- LinkedIn Job Posting API pozostaje ograniczone do zatwierdzonych integracji partnerskich. Public-page adapter nie używa tego API.
- Indeed API wymaga partnerstwa/OAuth. Public-page adapter nie używa partnerskiego GraphQL jako obejścia.
- OLX Developer API nie jest używane do pobierania cudzych ogłoszeń; adapter czyta wyłącznie publiczne strony WWW i zatrzymuje się przy blokadzie.
- Pracuj.pl, RocketJobs i Just Join IT mają publicznie dostępne strony list i szczegółów ofert; adapter wykorzystuje tylko publiczny HTML/structured data.

## API Job

`GET /api/job-search?q=<fraza>&location=<lokalizacja>&radiusKm=<0..300>`

Endpoint jest chroniony przez feature flag `job_feed`. W czasie jednego żądania:

- waliduje kryteria;
- uruchamia refresh wszystkich aktywnych źródeł równolegle;
- importuje i deduplikuje wyniki per użytkownik;
- zwraca wspólny feed pasujących ofert;
- zwraca `sourceRefresh` dla każdego źródła (`IMPORTED`, `NO_RESULTS`, `BLOCKED`, `FAILED`, `DISABLED`);
- zwraca `importedCount` oraz `newCanonicalCount`.

## Stan źródeł w UI

UI nie pokazuje już wyłącznie „Szukaj w ...”. Głównym przepływem jest przycisk **„Pobierz oferty ze wszystkich źródeł”**. Karty źródeł są diagnostyczne: pokazują ile rekordów pobrano albo dlaczego konkretne źródło nie odpowiedziało. Link ręczny pozostaje fallbackiem.

## Bezpośrednie strony pracodawców

`employer_careers` nadal jest wyłączone do czasu dodania jawnej konfiguracji pracodawców/ATS. Następny bezpieczny krok dla tego kanału to adaptery oficjalnych publicznych feedów (np. JSON/RSS/ATS) z allowlistą domen i testami kontraktowymi.
