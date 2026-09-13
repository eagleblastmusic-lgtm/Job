# Job — Browser Import Bridge

To lokalne rozszerzenie Chrome/Chromium dla aplikacji Job. Jest fallbackiem dla portali, które blokują serwerowy odczyt ofert.

## Zasada bezpieczeństwa

Rozszerzenie odczytuje wyłącznie treść już wyrenderowaną w kartach, które użytkownik sam otworzył w przeglądarce. Nie wykonuje logowania, nie rozwiązuje CAPTCHA, nie omija HTTP 403/429 i nie odpytuje prywatnych endpointów portali.

## Instalacja lokalna

1. Otwórz `chrome://extensions`.
2. Włącz `Tryb dewelopera`.
3. Kliknij `Załaduj rozpakowane`.
4. Wskaż katalog `C:\Projekty\Aplikacje\Job\browser-extension`.
5. Odśwież `http://localhost:3000`.

Po poprawnym załadowaniu ekran `Wyszukiwarka ofert` pokaże, że most przeglądarkowy jest dostępny.

## Użycie

1. Otwórz normalnie w Chrome strony wyników lub szczegóły ofert na obsługiwanych portalach.
2. Wróć do Job.
3. Kliknij `Importuj z otwartych kart`.
4. Job odbierze widoczne rekordy, przepuści je przez istniejący parser, Decision Engine i deduplikację.

Obsługiwane hosty: Pracuj.pl, LinkedIn Jobs, OLX, Indeed Polska, RocketJobs i Just Join IT.

## Produkcja

Manifest zawiera tylko lokalne hosty aplikacji (`localhost:3000` i `127.0.0.1:3000`). Po wyborze domeny produkcyjnej należy dodać ją do `host_permissions` i `content_scripts.matches`, a następnie wydać podpisaną wersję rozszerzenia.
