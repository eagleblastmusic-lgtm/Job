# Job — Polski system zdobywania pracy

**Job** jest kandydackim systemem podejmowania decyzji i nawigacji kariery. Rdzeń MVP realizuje przepływ:

`konto → profil/Career Truth → oferta → decyzja → pakiet aplikacyjny → CV PDF → tracker → outcome`

Interfejs jest po polsku, mobile-first i unika „magicznych” procentów. System nie może wpisywać do CV faktów wywnioskowanych z CV lub oferty bez potwierdzenia użytkownika.

## Co działa w tej wersji

- rejestracja i logowanie hasłem z `scrypt`, sesje HttpOnly,
- onboarding i preferencje pracy,
- Career Truth Lite z rozróżnieniem `INFERRED` / `CONFIRMED` / `NOT_POSSESSED`,
- prywatny upload PDF/DOCX/TXT/MD oraz lokalna ekstrakcja tekstu,
- deterministyczny parser polskich ofert,
- explainable Decision Engine V1,
- Decision Card z sekcjami „Dlaczego / Nie wiemy / Brakuje”,
- override rekomendacji,
- generowanie pakietu aplikacyjnego wyłącznie z potwierdzonych faktów,
- generowanie CV i eksport PDF przez Python ReportLab,
- tracker aplikacji i wyników rekrutacji,
- wewnętrzna analityka bez surowej treści CV,
- eksport danych i usuwanie konta,
- 7-dniowy trial i konfiguracja planów,
- chroniona diagnostyka administratora,
- PWA, responsywny interfejs, podstawowe zabezpieczenia HTTP,
- unit/integration/E2E API tests.

## Lokalny start

Wymagania:

- Node.js 22+
- `python3 + ReportLab` dla bezpośredniego PDF
- `pdftotext` (pakiet `poppler-utils`) dla PDF CV
- `unzip` dla DOCX

```bash
cp .env.example .env
npm install
npm run check
npm start
```

Następnie otwórz `http://localhost:3000`.

## Konfiguracja

Zobacz `.env.example`. Sekrety nie mogą trafić do repozytorium.

Najważniejsze wartości:

- `DATABASE_PATH` — plik SQLite obecnego MVP,
- `DATA_DIR` — prywatne uploady,
- `APP_ORIGIN` — źródło akceptowane dla mutujących żądań,
- `ADMIN_EMAILS` — lista e-maili adminów rozdzielona przecinkami,
- `AI_*` — opcjonalny OpenAI-compatible AI Gateway; rdzeń działa deterministycznie bez AI,
- `PDF_RENDERER_BIN` — interpreter Python używany przez renderer PDF (domyślnie `python3`).

## Testy

```bash
npm run typecheck
npm test
```

Test E2E API przechodzi przez krytyczny przepływ od rejestracji do zapisania outcome i eksportu danych.

## Architektura

To modularny monolit. Logika domenowa nie zależy od UI i znajduje się w `src/domain`. Serwer HTTP, auth, baza i integracje są w `src/server`. Klient PWA jest w `src/client` i `public`.

Szczegóły: `docs/ARCHITECTURE.md`.

## Ważna decyzja techniczna — SQLite zamiast PostgreSQL w pierwszym wykonaniu

Plan rekomenduje PostgreSQL. W tej gałęzi runtime MVP używa `node:sqlite`, ponieważ repozytorium było puste, a środowisko wykonawcze nie miało dostępu do rejestru npm podczas implementacji. Pozwoliło to uruchomić i przetestować rzeczywisty pełny przepływ bez udawanych adapterów.

**Wpływ:** ta wersja nadaje się do jednego trwałego procesu/VPS lub zamkniętych testów, ale przed zewnętrzną betą na środowisku stateless należy przenieść schemat do PostgreSQL i S3-compatible storage. Warstwa domenowa i identyfikatory są przygotowane do migracji. Decyzja jest jawnie zapisana w `IMPLEMENTATION_STATUS.md`.

## Deployment

Najprostsza wspierana ścieżka obecnej wersji to Docker z trwałym volume pod `/app/data`:

```bash
docker build -t job-app .
docker run --rm -p 3000:3000 -v job-data:/app/data --env-file .env job-app
```

Przed publicznym wdrożeniem ustaw TLS przez reverse proxy i `APP_ORIGIN` na właściwy origin HTTPS.

## Dokumentacja

- `docs/ARCHITECTURE.md`
- `docs/SECURITY_PRIVACY.md`
- `docs/DEPLOYMENT.md`
- `docs/AI_EVALUATION.md`
- `docs/ADMIN.md`
- `docs/RELEASE_NOTES.md`
- `docs/PRODUCTION_READINESS.md`
- `IMPLEMENTATION_STATUS.md`
