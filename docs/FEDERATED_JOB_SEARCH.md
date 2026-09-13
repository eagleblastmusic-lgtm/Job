# Federated Job Search

Stan: 2026-09-13

## Cel

Job ma jedną wyszukiwarkę, która wykorzystuje Career Truth (rola, lokalizacja, promień), filtruje oferty już zapisane w Job i przygotowuje równoległe wyszukiwanie w uzgodnionych serwisach. Duplikaty, które później trafią do Job przez dozwolone feedy/import, nadal przechodzą przez istniejący kanoniczny Job Feed i deduplikację.

## Źródła obecne w UI

- Pracuj.pl
- LinkedIn Jobs
- OLX Praca
- Indeed
- RocketJobs
- Just Join IT
- bezpośrednie strony karier pracodawców

## Tryby dostępu

### OUTBOUND_SEARCH

Job buduje bezpieczny link do oficjalnej wyszukiwarki danego serwisu z frazą/lokalizacją, gdy serwis wspiera takie parametry. Nie kopiuje wyników przez nieautoryzowany scraper.

### PARTNER_REQUIRED

Automatyczny import może zostać uruchomiony dopiero po uzyskaniu oficjalnego API/feedu/umowy/licencji i potwierdzeniu warunków wykorzystania danych. Sam fakt, że strona jest publicznie widoczna, nie jest traktowany jako zgoda na hurtowe pobieranie ofert.

### PERMITTED_SOURCE_REQUIRED

Dla bezpośrednich stron karier automatyczne pobieranie będzie możliwe wyłącznie z jawnie skonfigurowanej allowlisty i po potwierdzeniu, że dany kanał jest dozwolony (np. oficjalny ATS feed, publiczny RSS/JSON feed albo zgoda pracodawcy).

## Zweryfikowane ograniczenia źródeł

- LinkedIn Job Posting API wymaga zatwierdzonej integracji partnerskiej i nie jest otwartym API do dowolnego wyszukiwania ofert.
- Indeed udostępnia integracje job/candidate przez Partner Docs/Partner Console; automatyczne użycie wymaga odpowiedniego dostępu partnerskiego.
- OLX Developer Portal wymaga rejestracji i zatwierdzenia aplikacji. FAQ OLX stwierdza, że API nie pozwala pobierać ogłoszeń innych użytkowników; można zarządzać własnymi ogłoszeniami.
- Pracuj.pl, RocketJobs i Just Join IT są obecne jako oficjalne wyszukiwarki wychodzące. Automatyczny import pozostaje wyłączony do czasu potwierdzenia legalnego i stabilnego kanału danych.

## Oficjalne materiały referencyjne

- LinkedIn Job Posting API: https://learn.microsoft.com/en-us/linkedin/talent/job-postings/api/overview
- Indeed Partner Docs: https://docs.indeed.com/
- OLX Developer Portal: https://developer.olx.pl/
- OLX FAQ: https://developer.olx.pl/artykuly/czeste-pytania
- Pracuj.pl: https://www.pracuj.pl/
- RocketJobs: https://rocketjobs.pl/
- Just Join IT: https://justjoin.it/

## API Job

`GET /api/job-search?q=<fraza>&location=<lokalizacja>&radiusKm=<0..300>`

Endpoint jest chroniony przez istniejący feature flag `job_feed`. Odpowiedź zawiera:

- znormalizowane kryteria,
- listę dostawców i ich bezpieczne linki wyszukiwania,
- status możliwości automatycznego importu,
- oferty już znane Job, przefiltrowane po frazie/lokalizacji,
- jawny komunikat granicy integracji.

## Następny etap automatycznego importu

Dla każdego źródła osobno wymagane są: potwierdzony kanał danych, warunki licencji/partnerstwa, dane uwierzytelniające przechowywane poza repo, limity zapytań, healthcheck, retry/backoff, mapowanie do `NormalizedSourceJob`, provenance oraz testy kontraktowe. Dopiero wtedy `canIngestAutomatically` może zostać ustawione na `true` dla konkretnego adaptera.
