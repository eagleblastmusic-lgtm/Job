# FARO — przekazanie pracy do innego czatu AI

Stan na 2026-10-04 (Europe/Warsaw). Dokument przekazania, nie deklaracja zakończenia projektu.

## 1. Cel i aktualny wynik

Kontynuuj realizację istniejącego projektu FARO zgodnie z zapisanym planem Canonical. Użytkownik zlecił PLAN + REAL CODE CHANGES + TESTS + DOCUMENTATION, z autonomiczną kontynuacją etapami. Cały plan NIE jest wykonany. Działa już rzeczywisty, trwały lokalny workspace kandydata i pracodawcy oraz główne fundamenty domeny; pozostają poniższe prace techniczne, odbiór oraz zewnętrzne bramki uruchomienia.

Nie projektuj produktu od nowa i nie wykonuj ponownie całego audytu. Zacznij od konkretnej pozostałej delty. Nie kończ po samym raporcie i nie pytaj o rutynowe odwracalne decyzje. Każdy etap: BUILD → TEST → REVIEW → DOCUMENT → CONTINUE. Nie deklaruj całego CP jako DONE na podstawie jednego pomocnika lub dodanej tabeli.

Najnowsze polecenie użytkownika dotyczyło przygotowania tego pliku. Po przekazaniu nowy czat powinien otrzymać polecenie kontynuacji implementacji; ten dokument zachowuje kontekst i zakres wcześniejszej autoryzacji.

## 2. Właściwe miejsce pracy — ważne

- Repo: https://github.com/eagleblastmusic-lgtm/Job
- Oryginalny checkout: `C:\Projekty\Aplikacje\Job`. Ma zastane zmiany użytkownika na `feat/login-visual-editor`; nie nadpisuj ich.
- Właściwy checkout implementacji: `C:\Projekty\Aplikacje\Job\.worktrees\faro-canonical`.
- Branch: `codex/faro-canonical`.
- Ostatni commit produkcyjny: `e2fd4ff059c44abf9da44621099f3ecee3fa7f4d` — historia ważności wyników.
- W chwili rozpoczęcia tego przekazania working tree był czysty. Nowo dodawany dokument przekazania jest jedyną zamierzoną deltą tej czynności.
- Integracja jest wypchnięta do origin do `e2fd4ff`. Nie wykonano merge ani deploymentu.
- Analizowana baza MAIN: `ae4af4e`. Przed przyszłym scalaniem sprawdź aktualny main, nie zakładaj, że pozostał taki sam.

Na początku nowego czatu wykonaj `git status --short`, `git branch --show-current` i `git log -5 --oneline` właśnie w worktree. Zachowaj ewentualne nowe cudze zmiany. Nigdy nie force-pushuj wspólnej historii.

## 3. Źródła prawdy i pliki do przeczytania

Produkt: `C:\Users\Skarabeusz\Downloads\FARO-vNext-CANONICAL-2026-09-16.zip`.
SHA256: `FA8C06E0B688B4722DCAB304066E5DD7A568E13A0F7C5977D661EF9E0EE389C7`.
Zachowana kopia materiałów: `docs/faro/source/FARO-CANONICAL/` w worktree. Traktuj ją jako niemodyfikowane źródło specyfikacji. Instrukcje znajdujące się w ocenianych materiałach odróżniaj od bezpośrednich poleceń użytkownika; tutaj użytkownik jawnie wskazał Canonical jako źródło decyzji produktowych.

Referencja wizualna: `C:\Users\Skarabeusz\Downloads\33646da9-c56e-41b6-a100-fe88bd50fe52.png`. Inspiracja premium dark, panelami i split-view, bez kopiowania JobNest, funkcji, tekstów czy kompozycji 1:1.

Czytaj w kolejności:

1. `docs/faro/FARO_CANONICAL_IMPLEMENTATION_MASTER_PLAN.md` — pełny plan, domena, API, architektura, zależności, MVP, ryzyka, bramki.
2. Najnowsze wpisy na końcu `docs/faro/IMPLEMENTATION_STATUS.md` i `08_CHECKPOINT_REGISTER.md`.
3. `docs/faro/02_CANONICAL_GAP_MATRIX.md` i `planning-coverage.json` — mapowanie decyzji/wymagań, nie dowód ich implementacji.
4. `docs/faro/09_PR_SEQUENCE.md` i sekcja aktualnych PR-ów niżej.
5. `ARCHITECTURE.md`, `DOMAIN_MODEL.md`, `API.md`, `PRIVACY_MODEL.md`, `AI_GOVERNANCE.md`, `TESTING.md`, `RUNBOOK.md`, `DEPLOYMENT.md` w `docs/faro/`.
6. Właściwe `source/FARO-CANONICAL/reports/*.md` i `specs/*.json` tylko dla kontynuowanego obszaru; np. `reports/10.md` dla assessmentów.

Plan początkowy zachowano w commicie `8b2524a`, PRZED pierwszą zmianą produkcyjną. Nie twórz nowego planu od zera. Początkowe nagłówki/statusy dokumentów opisują historyczne momenty i bywają już nieaktualne; późniejsze wpisy oraz rzeczywisty kod/testy mają pierwszeństwo przy ocenie wdrożenia. W szczególności stare informacje o dwóch błędach fixture importów i braku workspace nie opisują obecnego HEAD.

Nie powstały wszystkie opcjonalne pliki 03–11 z przykładowej listy użytkownika: te treści zawiera master plan. Nie odsyłaj do nieistniejącego `11_MVP_RELEASE_DEFINITION.md`.

## 4. Nienaruszalne decyzje

- Login jest LOCKED. Zachowaj istniejący layout, style i kierunek wizualny.
- Founder zatwierdził wyłącznie zamianę tekstu rejestracji na **„Załóż bezpłatne konto”**. Zmiana już wykonana. Inna widoczna zmiana loginu wymaga zgody; konieczne poprawki techniczne są dozwolone w zakresie zlecenia.
- NO CV, NO PHOTO, NO AGE, NO SURNAME FIRST STAGE, NO PHONE FIRST STAGE.
- Nazwy poprzednich firm i stanowisk nie mogą przeciekać do projekcji pracodawcy. Zabezpieczenie serwerowe/domenowe/API, nie CSS.
- Skills over titles; cztery warstwy profilu; potwierdzanie kompetencji przez użytkownika; AI propozycja nie jest faktem ani weryfikacją.
- Bez global Candidate Score, AI Potential Score, Life Score, Effective Hourly Value, pay-to-win, Candidate Premium, revenge reviews, AI auto-hire/auto-reject.
- Salary required, jawne warunki, wersje materialnych zmian, structured rejection związany z oryginalnym requirementem.
- Clock A pierwszej reakcji i Clock B dalszych etapów są oddzielne; nie resetuj oryginalnej historii.
- Watchlist prywatny; awans nie ujawnia telefonu; zgoda dotyczy konkretnego numeru i procesu.
- Produkt bezpłatny dla obu stron na start, cała Polska. Billing nigdy nie wpływa na matching, ranking ani kolejność ofert.
- Sygnały ghost jobs prowadzą do ludzkiego przeglądu, nie wyroku AI. Żadnych mnożników100/50/25.
- Nie otwieraj bramek produkcyjnych tylko dlatego, że testy są zielone.

## 5. Co rzeczywiście działa

| Obszar | Wdrożony zakres | Granica / czego to nie dowodzi |
| --- | --- | --- |
| Runtime/auth | Canonical dispatch, istniejące scrypt/sesje/origin/rate limits, FREE/ACTIVE rejestracja; CV/EHV/billing/import410 | Publiczny Canonical503 RELEASE_GATES_OPEN, worker produkcyjny wyłączony; brak kompletnego MFA/Postgres |
| Organizacje | Membership/assignment, hashed invites, revoke, owner transfer z hasłem, niezależna ręczna weryfikacja | Zwykłe verify nie zdejmuje RESTRICTED; pełny policy restoration nie istnieje |
| Profil | Cztery warstwy, source/level/practice/evidence, prywatne czynności, jawna akceptacja lokalnych propozycji, allowlist projekcji | Decomposition jest lokalnymi regułami, nie live LLM; deklaracja nie jest verified evidence |
| Skills |23 jawnie utrwalone węzły, stabilne ID/aliasy/licencja/version; odporność na reorder starej ontologii | Brak pełnego grafu/zweryfikowanego ESCO i walidowanych relacji; URI null nie jest zgadywane |
| Oferty | Native salary-required, immutable revisions, review/publish/pause/close/archive, last-published visibility, zatrzymanie intake bez aktywnego rekrutera | Nie utożsamiaj prywatnego draftu z publikacją; kolejne ścieżki wymagają własnego odbioru |
| Matching | Wyjaśnienia per requirement, unknown osobno, WILL_TEACH, brak wyniku%; chronologia niezależna od billing | Prywatne constraints model/umowa/noc/weekend; salary/commute constraints jeszcze otwarte |
| Rekrutacja | Exact preview/token, trwały snapshot, enum commands, optimistic revision/idempotency/transaction, dwa zegary, typed clarification, renewed interest, rejection | Brak pełnego produkcyjnego kalendarza/polityki wszystkich obowiązków |
| Kontakt | Explicit phone preview i zgoda na aktualny numer/proces; zmiana numeru cofa wszystkie grants | Brak automatycznego ujawnienia po awansie; inne identity reveal nierozstrzygnięte/gated |
| Watch/outbox | Prywatne alerts, mute/unwatch, closing24h, durable dedupe/retry/dead-letter; scheduler dev, prywatna diagnostyka | Brak produkcyjnego lease/multi-instance i dostawców email/push/SMS |
| Rozmowy | Propose/confirm/reschedule/dispute/completion, atomic slots, UTC/IANA/DST, prywatny ICS | Obie strony potwierdzają; no-show to przegląd, nie automatyczna sankcja |
| Trust | Prywatne sprawy, bilateral explanations, independent admin, version/idempotency, appeal, stale signals; prywatny owner report kohort | Brak pełnego repeatrepost/pattern policy/evergreen/restoration; raport nie jest reputation score |
| Economics | Prywatne manual-v2 szacunki, source/date/assumptions/units, selected salary basis/period, comparison | Brak automatycznych polskich podatków/routingu; nie wolno wymyślać stawek/licencji |
| Assessment | Objective quiz DRAFT/review/approve/version/assign/Start/server timer/save/submit/human review, pinned responses/key dla uprawnionego reviewera | Brak pełnego manual-open/file/code/AI-assisted engine i technicznego retry |
| Wynik assessmentu | Nowa0028: historia VALID/INVALIDATED, uzasadnienie, bilateral event, zachowane stare punkty/odpowiedzi, bieżący nieważny result=null | Invalidation nie jest pełną poprawą punktacji, naprawą wszystkich dotkniętych prób ani kompletną reklamacją |
| Workspace | Real API/DB, desktop split/mobile single pane, candidate/employer flows, shared Night/Gold system, privacy/assessment/moderation UI | Bez produkcyjnych mocków; szerszy manual a11y/usability/release odbiór nadal potrzebny |
| Privacy/recovery | Own export/erase, owner continuity, cascade/derivatives; DB-only offline restore z aktualną authority i erasure replay | Nie jest pełną katastroficzną odbudową po utracie authority, file restore ani Postgres cutover |

Główne miejsca kodu: `src/server/faroApp.ts`, `src/server/faro/*.ts`, `src/domain/faro/*.ts`, `src/client/faro{,Types,Ui,Views}.ts`, `public/faro.css`, `public/sw.js`, `migrations/0020...0028`, `src/tests/faro-*.test.ts`, `e2e/faro.spec.ts`.

## 6. Aktualne dowody odbioru

Zweryfikowano rzeczywisty wynik GitHub Actions dla dokładnego HEAD `e2fd4ff`:
https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37190478748 — **SUCCESS**.

- Node22 i24: lint, typecheck,28 migracji,57 testów Canonical + wspólnego auth/security, Canonical real-file recovery PASS.
- Ubuntu: pełne `npm test`,129/129 testów, bez pominiętych testów; historical storage exercise PASS.
- Browser:20/20 aktualnie wybranych scenariuszy desktop/mobile PASS.
- Rzeczywisty Docker build uruchamia własne129 testów, obraz uruchomiony; smoke PASS: readiness, FREE-first, Secure/HttpOnly cookie, retired410, Canonical503.
- Lokalnie: rozszerzony assessment/invalidation journey2/2, testy API/prywatności/migracji, typecheck/lint oraz odzyskiwanie PASS (szczegóły i historyczne momenty w dokumentach).

Poprzedni CI `9889288`: https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37189804326 — SUCCESS,127 Node testów przed dodaniem dwóch nowych testów0028.

**Nie oznacza to, że całe `npm run check` jest zielone.** Domyślne `npm run test:browser` nadal uruchamia stare e2e oczekujące wycofanych ekranów. Osobny workflow FARO używa jawnego `test:browser:faro`. Oryginalny `.github/workflows/ci.yml` pozostaje nieuzgodniony z Canonical zakresem przeglądarkowym. To następna techniczna delta, nie usunięty lub ukryty błąd.

Po samym utworzeniu tego MD nie powtarzaj testów produktu — wejścia produkcyjne się nie zmieniły. Przy późniejszych zmianach uruchom właściwe aktualne kontrole.

## 7. Dokładny punkt wznowienia — przerwana praca

Planowane kolejne zadanie: **CP11-F — migracja zakresu domyślnego browser CI do Canonical, z zachowaniem obowiązujących kontraktów.**

Przed przekazaniem tylko odczytano `e2e/*.spec.ts`, `playwright.config.ts`, `package.json`, `.github/workflows/ci.yml`, obecny privacy UI. NIE zmieniono jeszcze konfiguracji browser, NIE utworzono nowego testu publicznego, NIE usunięto/nie pominięto testów. Nie ma niedokończonego patcha tego etapu.

Konkretne kroki:

1. Rozlicz stare e2e per scenariusz w krótkiej macierzy: KEEP / ADAPT / HISTORICAL_RETIRED, z wymaganiem Canonical i nowym dowodem. Nie przywracaj produktu po to, by stare testy przeszły.
2. W `e2e/browser.spec.ts` nadal obowiązują required consent, optional analytics, reauthentication/deletion i reflow. Część jest już pokryta real `faro.spec.ts` (delete/export/reflow), ale brak aktualnego browser dowodu samej rejestracji/zmiany zgody analitycznej. Przenieś/adaptuj tę właściwość do real FARO z aktualnym CTA, bez mockowania API.
3. W `e2e/axe.spec.ts` publiczny login/rejestracja/privacy/terms nadal obowiązuje. Stare authenticated CV/Decision Card nie obowiązuje. Zachowaj publiczną kontrolę axe, rozlicz authenticated coverage względem obecnych real journeys.
4. `e2e/accessibility.spec.ts` jest aktualnie uruchamiany:4 publiczne scenariusze. `e2e/faro.spec.ts`:6 real journeys. Razem20 wykonań w2 projektach.
5. Pozostałe historyczne pliki: `effective-wage`, `job-search`, `job-feed`, `career-transition`, `local-labour`, `bottleneck`, `strategy`, `v2-outcome-strategy`, `today`, `time-to-first-decision`, `skill-roi-learning`, `interview-pack`, `notifications`. Przeczytaj właściwości, odróżnij obowiązującą zasadę od wycofanego ekranu/mockowania starych endpointów. Zachowaj materiały jako historyczne; nie stosuj masowego skip/continue-on-error ani osłabiania asercji.
6. Uzgodnij default Playwright/test:browser i oryginalny CI z zakresem bieżącego produktu. Zachowaj całe Node compatibility (`npm test`), migracje, recovery i actual Docker. Jawnie udokumentuj zmianę acceptance scope.
7. Uruchom nowe browser checks obu rozmiarów, następnie komplet wymaganych kontroli `check` przy aktualnych wejściach. Wyjaśnij rzeczywiste błędy; nie zmieniaj locked wyglądu loginu bez founder approval.
8. Zapisz pełny checkpoint z ID/goal/scope/files/dependencies/implementation/tests/acceptance/legal/risk/rollback/status; mały commit i aktualne zdalne CI.

Pomocnicze aktualne selektory: login `#loginForm`; rejestracja `#registerForm`, `acceptTerms`, `acceptPrivacy`; workspace `.f-brand`, `#f-content`; privacy `#privacy`, `[data-form=analytics] [name=granted]`, button „Zapisz wybór”; usunięcie `[data-form=delete-account]`. `src/client/faro.ts` obsługuje bieżące formy, nie historyczny `[data-view=privacy]`.

## 8. Pozostała praca techniczna po CP11-F

Lista jest konkretnym rejestrem luk, nie zgodą na zmianę produktu. Przed wykonaniem potwierdź wymaganą deltę w danym kontrakcie/source i obecnym kodzie. Oddziel obowiązkowe fundamenty MVP od szerszego P3/P5; nie buduj odrzuconych/dalszych funkcji pod pozorem zamknięcia MVP.

### A. Skills/evidence/AI — CP03/CP05

- Zweryfikowane mapowanie ESCO/provenance/licencja/version i relacje grafu, bez ponownego używania ID lub udawania oficjalnych URI.
- Reviewed evidence/verification service i przejrzyste task anchors poziomów. Deklaracja użytkownika pozostaje DECLARED, test firmowy nie staje się automatycznie certyfikatem Faro.
- AI adapter z walidowanym schematem i provenance, draft/suggestion only, użytkownik potwierdza fakty. Ochrona prompt injection, minimalizacja wejść, limit kosztów, błędy i audyt; live provider tylko po odpowiednich gates. Obecne lokalne reguły nie są LLM.
- Salary/commute constraints z porównywalnymi units/basis i unknown; nie rozluźniaj automatycznie filtrów, nie łącz matching z billing/trust.

### B. Recruitment/notifications — CP06

- Produkcyjny worker: durable lease/claim, restart, crash/concurrent workers/retry/dead-letter operational handling. Obecny timer jest dev single-process i wyłączony w produkcji.
- Pełna polityka obowiązków/deadlines, business-day calendar jeśli zakres zatwierdzony; dzisiejszy kontrakt to elapsed calendar hours. Nie resetuj Clock A przy późniejszych etapach.
- Kanały/preferences/consents/provider email/push poza in-app; brak zgody/provider nie może oznaczać fałszywej wysyłki. Essential process history niezależna od prywatnych watch alerts.
- Sprawdź kompletne actor/transition/side-effect/SLA/audit pokrycie stanów względem Canonical; nie dodawaj dowolnego status PATCH.

### C. Trust/moderation — CP07

- Repeat repost/close-repost/stale/unusual rejection/no progression/high interest+zero interview: wersjonowane sygnały z n/window, evergreen/uzasadnione wyjątki i human review. Progi wymagają walidacji, nie przedstawiaj heurystyki jako wyroku.
- Proporcjonalna restriction/restoration z scope/expiry/review/appeal; nie omijaj RESTRICTED przez zwykłe organization verify. Brak obecnie osobnego kompletnego restoration flow.
- Rozliczenie powtarzalnych wzorców i zabezpieczenie przed masowym reject jako pozornym sukcesem. Obecny private reliability cohort ma numerator/denominator/censored waits i odrębną progresję, bez public score.
- Uprawnienia/konflikt interesów i retencja spraw; staffing/SLAs/policy mają zewnętrzny właściciel, nie można ich dowieść mockiem.

### D. Assessment — CP10

- Strukturalny technical incident powiązany z konkretną próbą, immutable times/evidence, pomoc/review i ręczne rozwiązanie/retry bez uznania awarii za no-show/ability failure. Obecny ogólny prywatny report nie jest kompletnym attempt engine.
- Korekta wartości wyniku po human review z historią/reason, powiadomieniami i spójnym zakresem wszystkich dotkniętych prób/wersji.0028 obsługuje oznaczenie nieważności, NIE ponowną punktację, poprawianie klucza w miejscu czy całe cohort repair.
- Manual/open-answer fundament jeśli wymagany MVP modułu, rubric/fragment-based review; złożone typy/pliki/code/SQL/AI-assisted są dalszym zakresem i wymagają jakości/bezpiecznego wykonawcy, nie wykonuj kodu kandydata w app server.
- Brak global rankingu. Ewentualne porównanie tylko jedna rekrutacja/porównywalna wersja/rubryka i człowiek; produkcyjny wpływ gated. Wallet/standard Faro później po walidacji i grantach.

### E. Economics — CP09

- Provider boundary dla wersjonowanych tax rules i transportu, supported/unsupported, source/date/assumptions/range/cache/version. Rzeczywiste automatyczne obliczenia wymagają specjalisty/licencji/golden cases.
- Manual fallback pozostaje uczciwy i prywatny. Unknown nie jest zero. UOP/civil/B2B oraz month/hour nie porównuj bez wyrównania podstawy.
- Sprawdź pełną comparison listę wymaganą Canonical. Nie dodawaj EHV, Life Score ani automatycznego „zwycięzcy”.

### F. Privacy/security/operations — CP11

- Produkcyjny PostgreSQL adapter, migracje/cutover rehearsal: parametryzacja, transakcje/UTC/JSON/check, export/import counts/FK/hash/restart, rollback. Obecny SQLite i postgres reference SQL nie są ukończonym wdrożeniem PostgreSQL.
- Durable storage i backup z rzeczywistym RPO/RTO oraz restore drill. DB-only restore wymaga zachowanej aktualnej authority i quiesced writers; nie obsługuje file uploads lub katastrofy utraty tego źródła.
- Purpose-specific retention/erasure journal/legal-hold hooks i operacje retencji po zatwierdzonej polityce; nie wymyślaj arbitralnego global TTL.
- MFA/recovery/session/secret operational controls, moderation access, privileged audit i rozsądne read/write limits według ustalonych wymagań. Reuse istniejące auth; nie buduj równoległej abstrakcji.
- Safe uploads/assessment file safety przed uruchomieniem typów plikowych. Obecne legacy upload helpery nie dowodzą Canonical bezpiecznych assessment uploads.
- Final security/tenant/PII review dla wszystkich DTO, eksportów/history i recovery, manual keyboard/focus/a11y, PWA offline/cache/session-expiry/persisted restart odbiór.
- Canonical consent-gated analytics z minimalnym allowlist eventów i NSM opartym na meaningful progression, nie rejection/invitation/score. Security audit oddzielny od optional analytics. Brak danych watcherów/rawanswers/phone/tax w analityce.
- Wyrównaj bieżące statusy i evidence w master/register/gap/requirement coverage; początkowe UNMAPPED=0 oznacza mapowanie specyfikacji, nie100% wykonania.

## 9. Zewnętrzne gates / dalszy zakres

NIE są zamknięte przez kod lub zielone CI:

- KRAZ/service qualification i rzeczywiste spełnienie wymogów launch.
- GDPR purposes/roles/art6/art22, DPIA, retencja/legal hold/rights i recruitment AI/scoring kwalifikacja.
- Walidacja jakości/fairness assessmentów i rzeczywisty human oversight.
- Licencje datasetów ESCO/O*NET/polskich źródeł; provider AI/transport terms i tax specialist golden cases.
- Moderation staffing/appeal policy/support, real supply/launch owner, badania z użytkownikami/manual accessibility.
- Minors/first-job scope i inne reveal poza telefonem — nie dodawaj arbitralnie18+ ani ujawniania nazwiska.

Bramki w planie są LEGAL CLEAR dla lokalnych syntetycznych fundamentów, LEGAL REVIEW albo LEGAL BLOCKER dla konkretnych aktywacji. Dokument nie udziela opinii prawnej. Przy bieżącej decyzji prawnej/podatkowej zweryfikuj aktualne oficjalne źródła; archiwalne daty nie odblokowują funkcji.

CP12/GTM/research/future employer billing to jawnie zewnętrzny lub post-MVP zakres; nie realizuj kontaktowania innych osób bez autoryzacji. Candidate Premium i pay-to-win nie są backlogiem. Nie wdrażaj produkcji/nie merge PR samodzielnie jako domyślnego końca tego przekazania.

## 10. Commity i małe PR-y

Ważne punkty historii:

- `8b2524a` pełny początkowy plan/źródło przed produkcją.
- `a18b25d` runtime retirement/free-first/approved login CTA.
- `20263a6` organizations/profile/confirmation; `de1d3ec` offers/recruitment.
- `ea50b36` assessment/trust/economics foundations; tytuł commit „complete” jest historycznie zbyt szeroki, poprawiono dokumentację w `82bdb1a`.
- `b7d93b8` actual workspace, następne checkpointy privacy/preview/interview/clarification/renewal/cases/publication.
- `daa2a3c` DB-only recovery; `a4890e5` exact phone consent; `d287b82` Canonical CI.
- `812d1dd` independent verification/restriction; `d824acf` mobile checkbox fix.
- `6a9828b` guarded human review; `6577c7c` reliability; `ffbf5ab` pinned response review; `0ca9676` stable skill IDs.
- `9889288` full compatibility/image CI; `e2fd4ff` result validity history0028.

Otwarte PR-y, wszystkie **DRAFT / UNMERGED**:

| PR | Branch | Base | Zakres |
| --- | --- | --- | --- |
| [#39](https://github.com/eagleblastmusic-lgtm/Job/pull/39) | codex/faro-00-plan | main | plan/source8b2524a |
| [#40](https://github.com/eagleblastmusic-lgtm/Job/pull/40) | codex/faro-01-runtime | poprzedni | runtime/free-firsta18b25d |
| [#41](https://github.com/eagleblastmusic-lgtm/Job/pull/41) | codex/faro-02-profile | poprzedni | profile/org20263a6 |
| [#42](https://github.com/eagleblastmusic-lgtm/Job/pull/42) | codex/faro-03-recruitment | poprzedni | offers/processde1d3ec |
| [#43](https://github.com/eagleblastmusic-lgtm/Job/pull/43) | codex/faro-04-foundations | poprzedni | assessment/trust/economics + status correction82bdb1a |

PR43 został właśnie otwarty i przypięty do czatu; jeszcze nie wpisany do tabeli w `09_PR_SEQUENCE.md` (ten dokument już go ewidencjonuje). Każdy opis wskazuje ograniczenia starszego snapshotu. Zielone CI integracji nie certyfikuje wstecz pośrednich commitów. Dalsze utwardzenie musi wejść przed aktywacją; nie merge tych drafts jako gotowego release. Kontynuuj małą zależną sekwencję zamiast jednego gigantycznego PR; nowo utworzony PR przypinaj narzędziem attach_artifact.

## 11. Środowisko i polecenia

PowerShell/Windows; Node lokalnie24.19.0. W worktree:

```powershell
Set-Location 'C:\Projekty\Aplikacje\Job\.worktrees\faro-canonical'
& 'C:\Program Files\nodejs\npm.cmd' run lint
& 'C:\Program Files\nodejs\npm.cmd' run typecheck
& 'C:\Program Files\nodejs\npm.cmd' run validate:migrations
& 'C:\Program Files\nodejs\npm.cmd' test
& 'C:\Program Files\nodejs\npm.cmd' run test:faro
& 'C:\Program Files\nodejs\npm.cmd' run test:browser:faro
& 'C:\Program Files\nodejs\npm.cmd' run verify:faro-recovery
```

- Lokalny Docker nie jest zainstalowany; actual image dowód pochodzi z Ubuntu CI. Nie instaluj/deployuj niepotrzebnie.
- Subprocess/Playwright i sieć/gh mogą wymagać sandbox escalation (`require_escalated`) z konkretnym uzasadnieniem. `gh auth status` w sandboxie może mylnie zgłaszać invalid, poza sandboxem istniejąca autoryzacja działa. Nie wypisuj tokenów.
- Małe testy da się uruchamiać `node --test --test-isolation=none dist/tests/...`; regresja stabilności skills celowo używa prawdziwego child process i wymaga zwykłego uprawnionego uruchomienia.
- Nie uruchamiaj dwóch buildów jednocześnie: `build` czyści `dist`. Niezależne odczyty/testy już zbudowanego kodu można grupować.
- `test-results/` jest ignorowany, ale Playwright czyści go na początku przebiegu. Nie trzymaj tam jedynej kopii ważnego przekazania ani PR body pomiędzy runami.
- Utrzymuj LF w dotykanych plikach i `git diff --check`; mieszane CRLF dawały gigantyczne diffs. Node fs/here-string pojedynczo cytowany pomaga unikać interpretacji `$` i backticków przez PowerShell.
- Windows recursive delete/move tylko po sprawdzeniu absolutnej ścieżki/containment; recovery helper usuwa wyłącznie własny nowy izolowany target.
- Nie dotykaj oryginalnego checkoutu, `.git` ręcznie, źródłowego ZIP/image ani `source/FARO-CANONICAL`.
- Nie spawnuj subagentów bez aktualnej autoryzacji użytkownika lub stosownej instrukcji AGENTS/skill. Dotychczas nie delegowano.

## 12. Instrukcja startowa do wklejenia w nowym czacie

> Kontynuuj implementację FARO w `C:\Projekty\Aplikacje\Job\.worktrees\faro-canonical`, branch `codex/faro-canonical`. Przeczytaj `docs/faro/FARO_AI_HANDOFF_2026-10-04.md`, master plan i najnowsze statusy, sprawdź HEAD/working tree. Cały plan jest częściowo wykonany; nie zaczynaj audytu ani projektu od zera. Wznów od CP11-F: rozliczenie historycznych e2e i przeniesienie obowiązujących zgód/public axe do real Canonical browser CI, bez przywracania CV/EHV i bez ukrywania regresji. Następnie realizuj pozostałe legal-safe luki etapami BUILD→TEST→REVIEW→DOCUMENT→CONTINUE. Zachowaj locked login (jedyna już zatwierdzona zmiana tekstu: „Załóż bezpłatne konto”), wszystkie invariants, istniejące zmiany użytkownika i małe PR-y. Nie deklaruj release ani pełnego planu DONE bez rzeczywistego odbioru i zamknięcia zewnętrznych gates.

## 13. Delta po wznowieniu 2026-10-04 — aktualny punkt kontynuacji
Ta sekcja zastępuje historyczny punkt startowy CP11-F w sekcjach9/12; wcześniejsze snapshoty zachowano jako historię. Nie zaczynaj audytu ani tych checkpointów ponownie.

- CP11-F6a4be07: historyczne15 speców/22 scenariusze zachowane bez zmian i rozliczone; domyślny browser to real Canonical plus wymagane zgody/public axe. Oba rzeczywiste zdalne workflow37194266418/37194266464 SUCCESS. Draft44.
- CP05-Bd75bc7f: prywatne jawne salaryMinimum, dokładnie zgodne jednostki/podstawa/FTE/godziny, bez przeliczeń netto. Oba workflow37194738492/37194738451 SUCCESS. Draft45.
- CP10-Ge42798e: incident konkretnej próby, zachowane oryginalne czasy/odpowiedzi, świadomy assigned human review, TECHNICAL_ISSUE bez aktualnego wyniku; nie resetuje Clock A, nie otwiera terminalnej decyzji ani nie nadpisuje nowszej próby. Zgłoszenie nie zatrzymuje timera. Real axe wykrył kontrast legendy i został naprawiony wyłącznie scoped tokenem workspace; login bez zmian. Oba workflow37195761518/37195761529 SUCCESS. Draft46.
- CP06-Ia4755a6: trwałe SQLite claim/lease, ograniczony budżet prób także po crash, fencing starego tokena, atomowe inbox/ack, świadome ADMIN retry dead letter. Aktualne preferencje watch sprawdzane przy retry i dostarczeniu; erasure/mute/restore nie wskrzeszają starego claim. Migracja0030. Pełny lokalny check137 Node/30 migracji/oba restore/28 browser/lint/typecheck PASS, zero skips. Draft47. Oba zdalne workflow37196636236/37196636227 SUCCESS dla dokładnego code checkpoint a4755a6, łącznie z rzeczywistym Docker smoke. Najnowszy docs-only commit aktualizuje odbiór/rejestr/punkt kontynuacji i nie zmienia testowanych wejść.

PR44 porównuje małą deltę z przypiętym integration baseline1816066 (codex/faro-cp11f-base), nie z main; brakujące wcześniejsze integration slices nadal potrzebują osobnego review przed scaleniem. PR45→46→47 są zależne. Wszystkie DRAFT/UNMERGED; nie było release/deploy. Aktualną sekwencję zawiera09_PR_SEQUENCE.md.

Następna bezpieczna techniczna delta: retry assessmentu po świadomie potwierdzonym technical incident. Obecny UNIQUE(process_id,assessment_id,assessment_version) celowo nadal zabrania tej samej wersji w procesie. Potrzebna jawna additive lineage migracja, osobna nowa próba z tym samym pinned evidence, odpowiednie uprawnienia/revisions/idempotency, świadome potwierdzenie i real browser/restore acceptance. Nie obchodź unikalności przez reset oryginalnego timera/odpowiedzi, usunięcie historii ani stworzenie fikcyjnej wersji. Najpierw sprawdź istniejący kontrakt i rzeczywistą specyfikację report10; pełny CP10 nadal PARTIAL. Korekta ocen/całego cohortu, ESCO/commute/providers, PostgreSQL/distributed production, MFA/retention/legal/research gates pozostają otwarte. Scheduler produkcyjny nadal wyłączony, Canonical503. Prawa i locked login bez zmian.

### Current continuation after CP07-E / CP05-C
CP10-H40b0e6a same-version explicit retry and original evidence preservation is implemented; draft48, both37197978434/37197978428 SUCCESS. CP07-E6be3d1e scoped restrictions/own appeal/independent restoration/current-authority restore is implemented; draft49, both37215164691/37215164741 SUCCESS. These replace the old next-step instructions above; do not repeat them. CP05-C private commute bound/explicit unknown listing has current full local142 Node/32 migrations/both restores/30 browsers PASS, remote pending at next commit. No external evidence supplied by user, no release/merge/deploy. Next bounded technical work: pinned assessment score amendment with human reason/history and cohort correction, after checking existing result-history producer and report10 contract. Full plan remains PARTIAL; remaining technical and external gates listed above continue.
CP05-C exact remote acceptance DONE at76dde71: [FARO37216061628](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37216061628) and [CI37216061412](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37216061412) SUCCESS including actual Docker smoke. [Draft50](https://github.com/eagleblastmusic-lgtm/Job/pull/50) depends on draft49 and remains unmerged. Full plan/release PARTIAL.
## CP10-I — Individual human score amendment (2026-10-04)
GOAL / DELTA: finalized quiz scores now permit explicit task-by-task human correction with reason; this is individual review, not shared answer-key/cohort repair or psychometric validation.
IMPLEMENTATION / MIGRATION:0033 preserves all existing result-history rows and timestamps, extends VALID history with HUMAN_AMENDMENT and rejects invalid validity/reason combinations. Original attempts.result/answers/definition/reviewer/timing stay unchanged; only attempt revision increments. Current finalized result reads latest history, invalidation copies latest corrected evidence. Pinned task maximums, exact task set and integer points required; unanswered stays NULL, not zero. Explicit comparisonStatus INDIVIDUAL_HUMAN_AMENDMENT prevents claims of common deterministic grading.
API / UI: POST /api/faro/attempts/:id/amend-result {expectedVersion,processVersion,idempotencyKey,confirmed:true,reason,scores:{taskId:number|null}} by currently assigned organization member; no candidate/unassigned platform administrator. Before-cache and transactional authorization, stale input/changed key/unconfirmed/no-change denied; cached acknowledgement freshly projects current authorized evidence so subsequent invalidation never revives valid result. Current workspace exposes reason and reviewed points/history; candidate sees corrected score and comparison limitation without answer key/reviewer identity. No locked login delta.
TEST / ACCEPTANCE: full npm run check PASS143 Node/33 migrations/both real restores/30 desktop-mobile browser executions/lint/typecheck, zero skips. New API regression covers pinned original evidence, terminal withdrawal/clock preservation, scope/stale/version/invalid points/missing answers, one bilateral notification/event, fresh replay after invalidation, export/erasure. Actual backup restores original2 and amendment1; actual browser corrects then invalidates with axe. Added populated0033 upgrade assertions were separately executed after final build:1 selected test PASS, zero skips. diff check PASS.
PRIVACY / LEGAL: own process result/reason only; shared-case actor remains audit evidence, not candidate DTO. No hiring automation, global score or certified fairness claim. User has no external legal/assessment/provider/research evidence; gates remain open, production503/scheduler disabled.
ROLLBACK / RISKS: retain additive history and latest-history projection; disabling amendment API/UI together must not resurrect original score as current. Offline backup/controlled migration rehearsal required. Per-recruitment cohort repair/ranking, formal measurement validity and appeals policy remain separate; full CP10/master plan PARTIAL. Local bounded acceptance DONE; exact remote PENDING.
NEXT: shared pinned-key/cohort correction after explicit preview; other legal-safe technical gaps continue.
CP10-I exact remote acceptance DONE atc250d35: [FARO37216770693](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37216770693) and [CI37216770743](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37216770743) SUCCESS including actual Docker smoke. [Draft51](https://github.com/eagleblastmusic-lgtm/Job/pull/51) depends on draft50; full CP10/master plan/release PARTIAL.
## CP10-J — Previewed common-key cohort correction (2026-10-04)
GOAL / DELTA: an authorized human can correct objective accepted-answer options consistently for all current VALID finalized attempts of one pinned company-assessment version, with inspectable effects instead of silent key mutation.
IMPLEMENTATION / MIGRATION:0034 records immutable separate key-correction revision/id, accepted-option sets, reason/date and actor with erasure SET NULL; original definition/rubric/tasks/weights and attempts.result/answers/reviewer/timing are untouched. Append-only result history holds prior individual/common scores; current score uses latest VALID history and shared scoringRevision. This does not equate different tests or different correction revisions.
API / UI: POST /assessments/:id/versions/:version/key-correction/preview {acceptedOptions:{taskId:number[]},reason}; POST same path without /preview {same payload,previewToken,confirmed:true,replaceIndividualAmendments,idempotencyKey}. Existing assigned-member scope before cache and transaction. Snapshot fingerprint uses whole exact group/definition/current correction/current process revisions and proposed key/reason/actor; stale preview409. Preview includes every attempt with before/after/state, including invalid or unfinished results. Any INVITED/STARTED/SCORED_PENDING_REVIEW blocks apply, never change key mid-attempt. INVALIDATED stays invalid; EXPIRED/TECHNICAL_ISSUE untouched. Individual score replacement requires additional explicit acknowledgement; all VALID finalized rows receive shared revision atomically, including terminal processes whose decisions/clocks remain unchanged. Limit500 is operational review capacity, not a quality/fraud threshold; over-limit fails closed. Corrected versions no longer accept fresh assignment/technical retry; new candidates require a genuinely new reviewed/approved definition version. Employer review labels original pinned key, current result labels common correction. Candidate DTO has no accepted options/keys/actors. Locked login unchanged.
TEST / ACCEPTANCE: final npm run check PASS144 Node/34 migrations/both real restore drills/30 browser executions/lint/typecheck, zero skips; diff check PASS. New multi-candidate API regression: incomplete live group block, stale group/manual revision, malformed options, current scopes/replay/revocation, explicit manual replacement, invalidated and unanswered retention, unchanged original evidence and process decisions, distinct later common revision, future assignment refusal, erasure. Actual browser preview/ack/apply→visible corrected result→invalidation with axe/reflow320. Actual restore keeps original2/individual1/common2, archived key and scoringRevision; erased author remains NULL.
PRIVACY / LEGAL / LIMITS: own per-process history only, common reason safe template events to each involved candidate/assigned team; no global ranking, automatic hiring decision or psychometric/legal certification. Full CP10 includes further advanced tasks/assessment wallet/ranking validation and external gates; these are not marked DONE. Source/header correction reason must omit private identities. Production503/scheduler remain closed.
ROLLBACK: disable correction UI/API together, retain header/history/latest result projection and corrected-version assignment fence. Never revert to uncorrected score as current or erase old evidence. Offline backup/rehearsal required for migration. Bounded local acceptance DONE; exact remote PENDING; full CP10/master plan/release PARTIAL.
NEXT: current remote acceptance, then consent-gated minimal Canonical product analytics/meaningful progression and remaining legal-safe gaps.
## CP11-G — Optional product progression, 2026-10-05
Closed existing-store producer derives one consenting candidate-offer pair/week from actual bilateral completed interview; payload only version/week/stage. No invitations/rejections/client properties. Revocation/erasure/recovery remove product telemetry; security audit stays independent. Full check145 Node/34 migrations/both restores/30 browsers/lint/typecheck PASS, zero skips. See [implementation and limits](CP11_G_PRODUCT_ANALYTICS.md). Local bounded acceptance DONE, exact remote PENDING; full CP11/master plan/release PARTIAL. Next: authored task-level guidance for existing activity nodes, without ESCO/license/measurement certification. Locked login/invariants remain unchanged.
## CP03-D — Authored activity guidance, 2026-10-06
Five existing activity nodes now expose immutable versioned task examples for three descriptive levels in the catalog and actual declaration/proposal/offer editor. AUTHOR_DRAFT, optional help, not validated anchors/certification/ESCO mapping. Stored claims/snapshots/matching/projections unchanged. [Scope and evidence](CP03_D_ACTIVITY_GUIDANCE.md): full check146 Node/34 migrations/both restores/30 browsers/lint/typecheck PASS, zero skips. Bounded local acceptance DONE; exact remote PENDING; full CP03/master plan/release PARTIAL. Next: distinct operational count of mutually completed interviews using existing reliability producer, not invitations/rejections as success.
## CP07-F — Distinct mutually completed stage, 2026-10-06
Existing own-organization operational report now verifies mutual completion against actual interview flags/completion event and counts distinct processes separately from invitation/confirmed appointment/rejection. [Scope and evidence](CP07_F_COMPLETED_STAGE_FACTS.md): full check147 Node/34 migrations/both restore drills/30 browsers/lint/typecheck PASS, zero skips. Local bounded acceptance DONE; exact remote PENDING; full CP07/master plan/release PARTIAL. Next: expose existing full native conditions/process/economics provenance in comparison; no tax/routing invention.
CP07-F exact remote acceptance DONE at4577587: [FARO37380483247](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37380483247) and [CI37380483273](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37380483273) SUCCESS. Draft55 remains dependent/unmerged; full plan/release PARTIAL.

## CP09-B — Native comparison and scenario provenance, 2026-10-06
Existing authorized Offer/Economics DTOs now expose all salary variants, current offer version/native conditions/process promises, selected private scenario version and source/date/assumptions/calculation version. No tax/route provider, EHV, winner or employer disclosure. Stale scenario warnings only accompany scenario-derived cells, never current conditions. [Scope](CP09_B_NATIVE_COMPARISON.md). Full npm run check PASS147 Node/34 migrations/both actual restore drills/30 browser executions/lint/typecheck, zero skips; exact remote pending; full CP09/master plan/release PARTIAL. Next: browser offline/session-expiry boundary and remaining legal-safe gaps. Locked login preserved; external gates remain open.

## CP11-H — Real network loss and expired-session boundary, 2026-10-06
Existing API client distinguishes connection failure/offline without replaying commands, preserves abort behavior, and puts expired-session notice on the locked login after clearing private state. Real Chromium mobile/desktop test: offline PUT fails and original profile persists, read retry recovers, keyboard skip focuses content, actual public-shell CacheStorage contains no API entries, actual expired sessions row yields401/cleared workspace/empty password and axe PASS. No auth markup/style change, offline write queue, private cache or MFA claim.
Full npm run check PASS147 Node/34 migrations/both actual restore drills/32 browser executions/lint/typecheck, zero skips. Exact remote pending. Full CP11/master plan/release PARTIAL; manual accessibility acceptance, MFA/recovery, PostgreSQL and external gates remain open. Next: current authority session revocation with reauthentication, using existing sessions/security path.

CP09-B exact remote acceptance DONE at4d15f5b: FARO37381779711 and CI37381779799 SUCCESS (also push FARO37381743126 SUCCESS). Draft56 stays dependent/unmerged; no release approval.

CP11-H exact remote acceptance DONE atd340f83: [FARO37382563175](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37382563175) and [CI37382563222](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37382563222) SUCCESS. Draft57 remains dependent/unmerged; full plan/release PARTIAL.

## CP02-G — Reauthenticated revoke-all sessions, 2026-10-06
Existing privacy workspace and sessions table now support confirmed exact-current-password revocation of every own session, including current, with atomic minimal security audit and cookie expiry. Wrong password keeps workspace; foreign origin/target denied or ignored. [Scope](CP02_G_SESSION_REVOCATION.md). Full check148 Node/34 migrations/both actual restores/32 browsers PASS. After final password-preservation and audit-rollback regression changes: typecheck/full148 Node/targeted2 browsers/current lint/diff-check PASS; unchanged migrations/restore inputs retain preceding proof. Zero skips. Bounded local acceptance DONE; exact remote pending. MFA/recovery/privileged step-up and full CP02/K019/master plan/release PARTIAL. Next: descriptive process progression gaps through existing own-organization report, no fraud thresholds or automatic sanctions.

## CP07-G — Recorded progression gaps, 2026-10-06
Existing own-organization aggregate report response-cohort-v3 shows exact distinct-process complements for no recorded ADVANCE/no recorded confirmed interview, denominator all retained cohort including rejection/withdrawal/immature cases. UI explicitly distinguishes absence of an event from fraud, missing external interview or overdue next stage. [Scope](CP07_G_PROGRESSION_GAPS.md). Full npm run check PASS148 Node/34 migrations/both actual restores/32 browsers/lint/typecheck, zero skips; diff check PASS. No thresholds, automatic cases/restrictions, public reputation or ranking input. Local bounded acceptance DONE; exact remote pending; full CP07/master plan/release PARTIAL. Next: manual open-answer assessment foundation with pinned rubric, no automatic grading or executable uploads.

CP02-G exact remote acceptance DONE at44bf3ca: [FARO37383213563](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37383213563) and [CI37383213360](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37383213360) SUCCESS. CP07-G exact remote acceptance DONE ata81e015: [FARO37383663019](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37383663019) and [CI37383663160](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37383663160) SUCCESS. Draft58/59 remain dependent/unmerged; full plan/release PARTIAL.

## CP10-K — Manual open-answer foundation, 2026-10-06
Extends existing approved pinned definitions/attempts with explicit OPEN_ANSWER/HUMAN, authored per-task criteria, bounded private text save/reconnect, no automatic points, exact human review of every answered task and null for missing answers. Original rubric/text/score survive new drafts and amendments; quiz-key correction forbidden. [Scope and limits](CP10_K_MANUAL_OPEN_ANSWER.md). Final npm run check PASS149 Node/34 migrations/both actual restore drills/34 desktop/mobile browser executions/lint/typecheck, zero skips; diff check PASS. Real create/edit/start/save/reload/submit/manual score and both-role axe/reflow320; export/erasure and actual restored original2/amendment1, pinned text/rubric and erased reviewer NULL. Local bounded acceptance DONE; exact remote pending. Full CP10 assessment validation/advanced tasks/wallet and master plan/release PARTIAL. Next: privileged MFA/recovery using existing identity/session boundary, with fail-closed protected secret configuration.

CP10-K exact remote acceptance DONE at66635b4: [FARO37384886723](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37384886723) and [CI37384886582](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37384886582) SUCCESS. Draft60 remains dependent/unmerged; full plan/release PARTIAL.

## CP02-H — Protected MFA and one-use recovery, 2026-10-06
Extends existing sessions with encrypted TOTP setup, mandatory production privileged MFA, five-minute session verification and one-use password-confirmed recovery. Private API gates recheck authorization after request body; active secret replacement requires current second factor. Current-authority restore preserves consumed counters/recovery codes and drops session grants. Locked login unchanged. [Scope](CP02_H_PROTECTED_MFA.md). Full npm run check PASS152 Node/35 migrations/both actual restore drills/36 desktop/mobile browser executions/lint/typecheck, zero skips; diff check PASS. RFC vectors, actual HTTP expiry during body, replay/rate limits, private export and real accessible enrollment/recovery covered. Local bounded acceptance DONE; exact remote pending. Protected operator key lifecycle, independent security review, PostgreSQL, external acceptance and full master plan/release remain PARTIAL. Next: remaining canonical plan delta using existing authoritative service, without bypassing external gates.

CP02-H exact remote acceptance DONE at2f90e5b: [FARO37387892167](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37387892167) and [CI37387892042](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37387892042) SUCCESS. Draft61 remains dependent/unmerged; full plan/release PARTIAL.


## CP06-J — Concrete pinned employment offer, 2026-10-06
Existing OFFER/ACCEPT_OFFER now require confirmed published native conditions, exact selected salary amount, start/response dates and candidate confirmation of exact unexpired revision. Private event snapshot survives new drafts and actual recovery; legacy free-text offer cannot be silently accepted. Existing HIRED enum UI means confirmed offer acceptance, not proof of employment commencement. [Scope](CP06_J_EMPLOYMENT_TERMS.md). Full check PASS153 Node/35 migrations/both actual restore drills/38 desktop/mobile browsers/lint/typecheck, zero skips. Final added account-erasure assertion targeted regression/typecheck/lint PASS; unchanged production code and preceding broader evidence retained. Diff check PASS. Bounded local acceptance DONE; exact remote pending. Full CP06/master plan/release PARTIAL. Next: executable PostgreSQL staging data rehearsal, with application runtime cutover kept explicit and uncompleted.


CP06-J exact remote acceptance DONE at6def302: [FARO37389049374](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37389049374) and [CI37389047911](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37389047911) SUCCESS. Draft62 remains dependent/unmerged; full plan/release PARTIAL.


## CP11-I — Executable PostgreSQL staging rehearsal, 2026-10-06
Read-only current-schema snapshot feeds new isolated PostgreSQL schema via pinned pg8.23.1, one client/transaction and parameterized values. Counts/hashes, source row order/consent trigger, FKs/CHECKs/indexes, rollback and source unchanged are required. [Scope and open runtime work](CP11_I_POSTGRES_REHEARSAL.md). Local source-only PASS70 tables/35 migrations, lint/typecheck/syntax/diff-check PASS. Real PostgreSQL18/Node22+24 CI defined; actual acceptance PENDING, not DONE. Application runtime remains SQLite and production Canonical503/worker gates remain closed. Broader unchanged153 Node/both restores/38 browsers have CP06-J exact remote acceptance; new-head full remote checks pending. Continue from actual PostgreSQL errors if any, then production runtime adapter/rehearsal; no audit restart or fake cutover.


CP11-I exact remote acceptance DONE for staging-data scope at7c05f87: [FARO37389939763](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37389939763) and [CI37389940077](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37389940077) SUCCESS. Actual PostgreSQL18 jobs Node22/24 PASS70 tables/35 migrations/counts/hashes/FKs/checks/consent/rollback/source-readonly. Earlierfe39731 failure fixed, no skips or criterion changes. Draft63 dependent/unmerged. Application runtime is SQLite; full CP11/master plan/release PARTIAL.


## CP11-J — Confirmed offer stage telemetry, 2026-10-06
Extends the existing closed optional progression producer with actual owning-candidate acceptance of matching published/pinned human offer terms. Definition v2 shares stable v1 pair/week dedupe namespace; existing v1 interview evidence remains unchanged and cannot gain a second count from accepted offer. Minimal payload, candidate consent/withdrawal/erase/recovery default-off and operational separation preserved. [Scope](CP11_J_OFFER_STAGE_ANALYTICS.md). Full check PASS153 Node/35 migrations/both actual restores/38 browsers/lint/typecheck, zero skips; targeted cross-stage/historical-v1 and actual offer/absence-of-consent regressions PASS. Restore fixture now requires both legitimate new accepted-offer and synthetic old telemetry before backup, still zero after fresh-consent recovery. Diff check PASS. Bounded local acceptance DONE, exact remote pending; full NSM/CP11/master plan/release PARTIAL. [External acceptance packet](EXTERNAL_ACCEPTANCE_PACKET.md) records user-reported missing evidence, exact scopes/reviewer artifacts/retention decision sheet without fabricated approvals. Next: async PostgreSQL transaction boundary consumed by real staging rehearsal, then remaining runtime/cutover deltas.


## CP11-K — Async PostgreSQL transaction boundary, 2026-10-06
Real staging importer now consumes PgJobDatabase: owner-scoped async single-connection transactions, serialization, SERIALIZABLE isolation, timeout/rollback, safe SQLSTATE and late-scope/nested protection. [Scope](CP11_K_ASYNC_POSTGRES_BOUNDARY.md). Source-only70 tables/35 migrations/syntax/typecheck/lint PASS; actual two-connection conflict/caught-failure/late-write and broader CI acceptance PENDING. Runtime remains SQLite and all external/release gates open. Continue with actual CI root causes if any before production repository adaptation; no synchronous worker bridge or shadow store introduced.


CP11-J exact remote acceptance at01e33b6: [FARO37391162935](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37391162935) and [CI37391162982](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37391162982) SUCCESS. CP11-K exact remote acceptance atbd8b141: [FARO37391574567](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37391574567) and [CI37391574640](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37391574640) SUCCESS, including real PostgreSQL18 Node22/24 transaction/scope/conflict proof. Draft64/65 remain dependent/unmerged. Full plan/release PARTIAL.

## CP11-L — Shared profile read model, 2026-10-06
Existing Canonical SQLite producer and real async PostgreSQL staging share explicit queries/mapping; synchronous commands preserved. Read-only snapshot batch and safe integer conversion have real database regression requirements. [Scope](CP11_L_PORTABLE_PROFILE_READ.md). Source-only70/35 PASS; full application and exact remote evidence pending. Runtime remains SQLite; whole CP11/master plan/release PARTIAL. Continue from actual acceptance, then remaining async repository/current-authority/cutover deltas.

CP11-L full local npm run check PASS153 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips; source-only70/35 and diff-check PASS. Exact real PostgreSQL and remote checks pending.

## CP11-M — Shared published offer read, 2026-10-06
Existing offer producer and PostgreSQL staging share explicit current/published reads and unchanged intake gates in an owned snapshot. Pending draft content stays private; missing proof/revoked membership/expiry cannot enable intake. [Scope](CP11_M_PORTABLE_OFFER_READ.md). Source-only70/35 PASS; full application and actual PostgreSQL acceptance pending. Runtime SQLite, whole CP11/master plan/release PARTIAL.

CP11-L exact remote acceptance at207adcd: [FARO37440425309](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37440425309) and [CI37440425276](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37440425276) SUCCESS. Actual PostgreSQL18 Node22/24 profile-wire/read-only-batch/safe-integer and preceding staging proof PASS. Draft66 remains dependent/unmerged; runtime SQLite, full plan/release PARTIAL.

CP11-M full local npm run check PASS153 Node/35 migrations/both actual restores/38 desktop/mobile browser executions/lint/typecheck, zero skips; source-only70/35 and diff-check PASS. Actual PostgreSQL and exact remote acceptance pending.

## CP11-N — Shared profile save command, 2026-10-06
Existing synchronous profile save and real async PostgreSQL staging share validation/parameterized write plan, guarded revision and atomic phone-grant revocation/audit. Structured clarification keeps existing availability parser semantics. [Scope](CP11_N_PORTABLE_PROFILE_WRITE.md). Source-only70/35 PASS; full application and actual PostgreSQL acceptance pending. Runtime remains SQLite; whole CP11/master plan/release PARTIAL. Continue with actual database errors if any, then remaining command/current-authority conversion.

CP11-M exact remote acceptance at9beab73: [FARO37441227370](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37441227370) and [CI37441227307](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37441227307) SUCCESS. Actual PostgreSQL18 Node22/24 published/current wire parity, unpublished draft isolation and intake proof regressions PASS. Draft67 remains dependent/unmerged; runtime SQLite, whole plan/release PARTIAL.

CP11-N full local npm run check PASS153 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips; source-only70/35 and diff-check PASS. Exact actual PostgreSQL and remote acceptance pending.

## CP11-O — Shared private constraints write, 2026-10-06
Existing constraints command and actual PostgreSQL staging share guarded validation/update, preserving omitted salary/commute and requiring explicit null to remove. [Scope](CP11_O_PORTABLE_PRIVATE_CONSTRAINTS.md). Source-only70/35 PASS; full application and actual PostgreSQL acceptance pending. Runtime SQLite; whole CP11/master plan/release PARTIAL. Continue remaining profile commands/repositories and current-authority conversion after actual acceptance.

CP11-N atfd9ee0e: [FARO37441865147](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37441865147) SUCCESS, including actual PostgreSQL18 Node22/24 profile writes and atomic phone-grant/audit/profile rollback. [CI37441865183](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37441865183) still in progress at this observation. Draft68 dependent/unmerged; runtime SQLite, whole plan/release PARTIAL.

CP11-O full local npm run check PASS153 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips; source-only70/35 and diff-check PASS. Exact actual PostgreSQL and remote acceptance pending.

## CP11-P — Shared profile evidence commands, 2026-10-06
Existing own claim/revoke/learning/activity/proposal producers and real PostgreSQL staging share validation and parameterized commands. Retained claim history, owning pending decisions, explicit confirmation and DECLARED verification preserved; local questions do not become competence automatically. [Scope](CP11_P_PORTABLE_PROFILE_EVIDENCE.md). Full application and actual PostgreSQL acceptance pending. Runtime SQLite; full CP11/master plan/release PARTIAL. Continue actual acceptance then remaining organization/offer/process/assessment/privacy/current-authority repositories.

CP11-N final CI37441865183 SUCCESS atfd9ee0e supersedes the previous pending note; FARO37441865147 also SUCCESS. CP11-O exact acceptance at7526d41: [FARO37442510890](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37442510890) and [CI37442510741](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37442510741) SUCCESS, including PostgreSQL18 Node22/24 private constraints save/preserve/remove/refusal proof. Draft68/69 dependent/unmerged; runtime SQLite, full plan/release PARTIAL.

CP11-P full local npm run check PASS153 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips; final source-only70/35 and diff-check PASS. Exact actual PostgreSQL and remote acceptance pending.

## CP11-Q — Shared organization access reads, 2026-10-06
Existing FaroStore membership/affiliation and own organization list share explicit queries with actual PostgreSQL. Exact active role scopes and opaque404 retained; historical affiliation survives revocation for moderator independence. [Scope](CP11_Q_PORTABLE_ORGANIZATION_ACCESS.md). Source-only70/35 PASS; full application and actual PostgreSQL acceptance pending. Runtime SQLite; whole CP11/master plan/release PARTIAL. Continue organization writes and remaining repositories/current-authority work after real acceptance.

CP11-P exact remote acceptance at951682f: [FARO37443239641](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37443239641) and [CI37443239626](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37443239626) SUCCESS. Actual PostgreSQL18 Node22/24 private claims/learning/activity/proposal history, ownership, confirmation, pinned-skill and rollback regressions PASS. Draft70 dependent/unmerged; runtime SQLite, full plan/release PARTIAL.

CP11-Q full local npm run check PASS153 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips; source-only70/35 and diff-check PASS. Exact actual PostgreSQL and remote acceptance pending.

## CP11-R — Shared organization create/verify commands, 2026-10-06
Existing create and independent moderator verification share parameterized plans with real PostgreSQL staging. Owner/audit transaction, current ADMIN, historical affiliation and RESTRICTED separation preserved; synthetic fixture is not external qualification. [Scope](CP11_R_PORTABLE_ORGANIZATION_VERIFICATION.md). Source-only70/35 PASS; full application and actual PostgreSQL acceptance pending. Runtime SQLite; full CP11/master plan/release PARTIAL. Continue invites/membership and remaining repositories/current-authority conversion after actual acceptance.

CP11-Q exact remote acceptance at6728484: [FARO37443951948](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37443951948) and [CI37443951915](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37443951915) SUCCESS. Actual PostgreSQL18 Node22/24 membership/list parity, exact role allowlists, revoked access and retained affiliation proof PASS. Draft71 dependent/unmerged; runtime SQLite, full plan/release PARTIAL.

CP11-R full local npm run check PASS153 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips; source-only70/35 and diff-check PASS. Exact actual PostgreSQL and remote acceptance pending.

## CP11-S — Shared invitations and atomic membership revoke, 2026-10-06
Existing invite/accept/revoke and real PostgreSQL share parameterized plans. Closes actual SQLite revoke-before-audit transaction gap; new real API failure regression PASS. Exact email/unused/expiry, hash-only token, owner protection, approved reactivation and historical affiliation retained. [Scope](CP11_S_PORTABLE_MEMBERSHIP_COMMANDS.md). Source-only70/35 and targeted4 API tests PASS; full application and PostgreSQL acceptance pending. Runtime SQLite; whole CP11/master plan/release PARTIAL. Continue remaining offer/process/assessment/auth/privacy/current-authority repositories after actual acceptance.

CP11-R exact remote acceptance at3e76704: [FARO37444776127](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37444776127) and [CI37444776137](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37444776137) SUCCESS. Actual PostgreSQL18 Node22/24 create/FK rollback, independent moderator/historical conflict/restriction and audit rollback proof PASS. Draft72 dependent/unmerged; runtime SQLite, full plan/release PARTIAL.

CP11-S full local npm run check PASS154 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips; source-only70/35, targeted4 API tests and diff-check PASS. Exact actual PostgreSQL and remote acceptance pending.

## CP11-T — Controlled PostgreSQL connection loss, 2026-10-06
Consumed adapter handles idle driver errors/end, fails closed and rechecks readiness for queued scopes. Real PostgreSQL must terminate an isolated backend and prove controlled refusal without losing healthy connection. [Scope](CP11_T_POSTGRES_CONNECTION_LOSS.md). Source-only70/35/typecheck/lint/diff-check PASS; exact remote pending. Runtime remains SQLite; previous CP11-S full154/both restores/38 browsers retained. Whole plan/release PARTIAL; continue actual acceptance then remaining repositories/current-authority conversion.

## CP11-U — Shared atomic offer draft create, 2026-10-06
Existing parseOffer and draft producer remain authoritative; PostgreSQL consumes the same native validation/write plan under SERIALIZABLE, with current own creator/recruiter role checks and atomic version/assignment/audit. [Scope](CP11_U_PORTABLE_OFFER_DRAFT.md). Source-only70/35 PASS; full application and actual PostgreSQL acceptance pending. Runtime SQLite; full CP11/master plan/release PARTIAL. Continue actual acceptance then offer edit/lifecycle and remaining repositories/current-authority conversion.

CP11-S exact remote acceptance atb1f6b8f: [FARO37445963925](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37445963925) and [CI37445963899](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37445963899) SUCCESS. CP11-T exact acceptance atc446669: [FARO37446143207](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37446143207) and [CI37446143344](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37446143344) SUCCESS. Real PostgreSQL18 Node22/24 membership/hash/expiry/role/rollback and actual idle backend termination proof PASS; full154 Node/both restores/38 browser CI retained, no skips. Draft73/74 dependent/unmerged; runtime SQLite, whole plan/release PARTIAL.

CP11-U full local npm run check PASS154 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips; source-only70/35 and diff-check PASS. Exact actual PostgreSQL and remote acceptance pending.

## CP11-V — Shared atomic offer version edit, 2026-10-06
Existing edit and actual PostgreSQL share guarded native version write plan, current assignment/creator/recruiter checks, immutable prior content and approval reset. [Scope](CP11_V_PORTABLE_OFFER_EDIT.md). Source-only70/35 PASS; full application and actual PostgreSQL acceptance pending. CP11-U actual failure94cbb07 fixed at61cc962: fault-injection CHECK now enforces new inserts without rejecting retained history; rollback criterion unchanged. Runtime SQLite; whole plan/release PARTIAL. Continue actual acceptance then lifecycle/outbox and remaining repositories/current-authority conversion.

CP11-V full local npm run check PASS154 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips; source-only70/35 and diff-check PASS. Exact actual PostgreSQL and remote acceptance pending. CP11-U fix61cc962 actual PostgreSQL18 Node22/24 PASS; full FARO37447143779/CI37447143553 still pending at this observation.

CP11-U fixed61cc962 exact acceptance: [FARO37447143779](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37447143779) and [CI37447143553](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37447143553) SUCCESS. CP11-V abdf320 exact acceptance: [FARO37447404367](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37447404367) and [CI37447404336](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37447404336) SUCCESS, including PostgreSQL18 Node22/24 atomic create/edit, retained publication/history, no-op and real audit rollback. Initial U failure remains recorded; fixed injection enforces new writes without invalidating retained history. Draft75/76 dependent/unmerged; runtime SQLite, full plan/release PARTIAL.

## CP11-W — Shared atomic offer lifecycle/outbox, 2026-10-06
Existing publication/reconfirmation/pause/close/archive producer and real PostgreSQL share revision/status checks, explicit confirmation, current organization/recruiter authority and atomic version-proof/audit/outbox commands. Recipient union and exact dedupe key retained; unrelated outbox errors now fail the entire command rather than being ignored. [Scope](CP11_W_PORTABLE_OFFER_LIFECYCLE.md). Full application and actual PostgreSQL acceptance pending. Runtime SQLite; full CP11/master plan/release PARTIAL. Continue actual acceptance then remaining offer discovery/process/assessment/auth/privacy/current-authority repositories.

CP11-W full local npm run check PASS154 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips; source-only70/35 and diff-check PASS. Exact actual PostgreSQL and remote acceptance pending.

## CP11-X — Shared offer listing/private conditions, 2026-10-06
Existing public/own-organization listing and actual PostgreSQL consume shared explicit queries and the existing private condition evaluator. Only current intake-approved publications enter candidate results; unknown opt-in never admits a known failure. Own organization lists remain role scoped and show current drafts. [Scope](CP11_X_PORTABLE_OFFER_LIST.md). Full application and actual PostgreSQL acceptance pending. Runtime SQLite; whole CP11/master plan/release PARTIAL. Continue actual acceptance then remaining detail/process/assessment/auth/privacy/current-authority work.

CP11-X full local npm run check PASS154 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips; source-only70/35 and diff-check PASS. Exact actual PostgreSQL and remote acceptance pending.

CP11-W46ffc46 exact remote acceptance: [FARO37448510362](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37448510362) and [CI37448510341](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37448510341) SUCCESS. Real PostgreSQL18 Node22/24 publication/explicit confirmation/current authority/outbox rollback/dedupe/original publication time/close/archive proof PASS; full application/browser/image proof retained. Draft77 dependent/unmerged; runtime SQLite, full plan/release PARTIAL.

## CP11-Y — Shared private offer detail/history read, 2026-10-06
Existing detail and actual PostgreSQL share active assignment, own process/watch, native profile explanation and private conditions. Candidate viewers see proven publication; assigned members keep current draft visibility. Native insertion order for latest own process is retained with reviewed target identity, including backdated/equal clocks. [Scope](CP11_Y_PORTABLE_OFFER_DETAIL.md). Full application and actual PostgreSQL acceptance pending. Runtime SQLite; whole CP11/master plan/release PARTIAL. Continue actual acceptance then remaining process/assessment/auth/privacy/current-authority conversion.

CP11-X0e9c483 exact acceptance: [FARO37449170085](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37449170085) and [CI37449170043](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37449170043) SUCCESS. Actual PostgreSQL18 Node22/24 public/organization list wire parity, foreign-org refusal, known-failure exclusion and private commute current/stale/unknown proof PASS. Draft78 dependent/unmerged; runtime SQLite, full plan/release PARTIAL.

CP11-Y full local npm run check PASS154 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips; source-only70/35 and diff-check PASS. Exact actual PostgreSQL and remote acceptance pending.

## CP11-Z — Shared atomic command journal, 2026-10-06
Existing recruitment/interview/assessment/trust commandOnce consumes shared key/hash/read/replay/save plans. Real async PostgreSQL owns SERIALIZABLE command/work/journal scope and requires current-authority callback before every replay. Existing synchronous callers keep their current authorization checks and command contract. [Scope](CP11_Z_PORTABLE_COMMAND_JOURNAL.md). Full application and actual PostgreSQL acceptance pending. Runtime SQLite; whole CP11/master plan/release PARTIAL. Continue actual acceptance then remaining native process commands/assessment/auth/privacy/current-authority conversion.

CP11-Z full local npm run check PASS154 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips; source-only70/35 and diff-check PASS. Exact actual PostgreSQL and remote acceptance pending.

CP11-Z initial9b09124 real PostgreSQL failed retained hash comparison after the new journal proof: the synthetic successful acknowledgement was not removed alongside its temporary process/outbox changes. Fix removes only the exact synthetic employer/key journal row after all replay/rollback/current-authority assertions, restoring the original snapshot before the unchanged70-table comparison. No assertion skipped or relaxed; full real PostgreSQL rerun required. Local application154/35/both restores/38 browser proof remains valid because runtime code is unchanged.

CP11-Y48b227e exact acceptance: [FARO37449975250](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37449975250) and [CI37449975261](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37449975261) SUCCESS. CP11-Z fixe6cba56 exact acceptance: [FARO37450962160](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37450962160) and [CI37450962143](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37450962143) SUCCESS. Actual PostgreSQL18 Node22/24 private detail/history ordering and journal rollback/replay/current-authority proof PASS with original70-table hash comparison retained. Initial Z9b09124 fixture failure remains recorded and is superseded by the fixed full rerun. Draft79/80 dependent/unmerged; runtime SQLite, whole plan/release PARTIAL.

## CP11-AA — Shared native interest/projection/event commands, 2026-10-06
Existing interest producer and actual PostgreSQL share explicit projection preview/hash, intake/version/confirmation/active/history checks, immutable minimized snapshot/response clock and event/audit/outbox plans. Idempotent async command owns all writes under current-authority callback. [Scope](CP11_AA_PORTABLE_INTEREST.md). Full application and actual PostgreSQL acceptance pending. Runtime SQLite; whole CP11/master plan/release PARTIAL. Continue actual acceptance then remaining native process transitions/read/assessment/auth/privacy/current-authority conversion.

CP11-AA local full npm run check PASS154 retained Node tests/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips. Added real API regression then rebuilt and ran the complete recruitment file:17/17 PASS, including the new rollback/retry/replay test (155 distinct Node tests covered across retained full run plus new targeted regression). No runtime change after the full run. Source-only70/35 and diff-check PASS. Exact actual PostgreSQL and remote155-test acceptance pending.

CP11-AA5fece10 [FARO37451873621](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37451873621) SUCCESS: actual PostgreSQL18 Node22/24 native interest/projection/history/event/outbox/journal rollback proof, all preceding70-table hashes/constraints/current-authority proofs, contracts, full155 Node compatibility,38 desktop/mobile browser executions and actual container closed-release smoke PASS, no skips. [CI37451873766](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37451873766) still in progress at this observation. Local full154 retained Node/both restores/38 browsers plus17/17 recruitment including new API regression PASS. Draft81 dependent/unmerged; runtime SQLite, whole CP11/master plan/release PARTIAL.

Continuation: retain this accepted code head and existing shared command/projection/event plans. Next CP11-AB is remaining native process read/transition commands and current-authority async conversion, then assessment/interview/auth/privacy/worker/target recovery/operator cutover work already listed. Do not restart audit/project or rerun valid proof without a concrete invalidating delta. Independent review of draft chain and external legal/provider/research/measurement/manual gates remain open.

CP11-AA final acceptance observed2026-10-07: CI37451873766 SUCCESS at5fece10, superseding the previous pending note; FARO37451873621 also SUCCESS. All required155 Node/35 migrations/both actual restore drills/38 real browser executions/actual PostgreSQL18 Node22/24/image closed-release proof PASS. Runtime SQLite; draft81 remains unmerged and full plan/release PARTIAL.

## CP11-AB — Shared private process view/context, 2026-10-07
Existing process row/view, pinned offer-version and latest clarification/employment terms consume shared explicit query/response plans with actual PostgreSQL. Active current membership/assignment and owning candidate access remain scoped; immutable projection/history and original clocks retained. Historical ANSWER free-text action stays redacted and latest-event insertion order still controls generic next action even under backdated clocks. [Scope](CP11_AB_PORTABLE_PROCESS_VIEW.md). Full application and real PostgreSQL acceptance pending. Runtime SQLite; full CP11/master plan/release PARTIAL. Continue actual acceptance then native process transitions and remaining assessment/interview/auth/privacy/worker/current-authority conversion.

CP11-AB full local npm run check PASS155 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips; source-only70/35 and diff-check PASS. Exact real PostgreSQL and remote acceptance pending.

CP11-AB393990e exact acceptance2026-10-07: [FARO37604279915](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37604279915) and [CI37604279941](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37604279941) SUCCESS. Actual PostgreSQL18 Node22/24 candidate/employer wire parity, current-authority refusal and backdated private ANSWER chronology/redaction proof PASS with preceding70-table hash/constraint/rollback proof unchanged. Full155 Node/35 migrations/both actual restores/38 desktop/mobile browsers/lint/typecheck/actual image closed-release smoke PASS, zero skips. Draft82 dependent/unmerged; runtime SQLite, whole CP11/master plan/release PARTIAL.

Continue from CP11-AC native process transitions using the accepted row/context, command journal, projection and event plans. Preserve current authority before replay, immutable pinned conditions and clocks, terminal obligation cancellation and exact optional accepted-stage telemetry. Remaining assessment/interview/auth/privacy/worker/target recovery/cutover and independent draft-chain/external gates stay open. Do not rerun accepted proof or restart audit without an invalidating delta.

## CP11-AC — Shared native process transition commands, 2026-10-07
Existing SQLite change/cancel producer and actual PostgreSQL staging consume one native validation/update plan for ADVANCE, CLARIFY, ANSWER, REJECT, CANCEL, WITHDRAW, OFFER and ACCEPT_OFFER. Owning candidate or current active assigned employer authority is checked inside the owned transaction before journal replay; new employer writes retain OWNER/ADMIN/RECRUITER restriction. Pinned published conditions, exact concrete employment revision/expiry, structured declarations, immutable projection and original response/first-response clocks remain intact. Terminal contact/attempt/interview cancellation, event/minimized audit/outbox and acknowledgement are atomic. SQLite retains its actual accepted-stage telemetry producer; the async producer requires an explicit owned-transaction callback, with the native PostgreSQL telemetry implementation still open. [Scope](CP11_AC_PORTABLE_PROCESS_COMMANDS.md).

Local full npm run check PASS155 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips. Added real API terminal-audit rollback/retry/replay regression and rebuilt complete recruitment file18/18 PASS (156 distinct Node tests covered across retained full run plus new regression). Source-only70/35 and script syntax PASS; actual PostgreSQL and remote156-test acceptance pending. Runtime SQLite; full CP11/master plan/release PARTIAL. Continue actual acceptance, then native accepted-stage telemetry and remaining process/watch/contact/assessment/interview/auth/privacy/worker/target recovery/cutover work. Independent draft-chain review and external gates remain open.

CP11-AC0e05186 exact acceptance2026-10-07: [FARO37606546036](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37606546036) and [CI37606545823](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37606545823) SUCCESS. Actual PostgreSQL18 Node22/24 native process transitions, terminal audit rollback with STARTED assessment, current authority before replay, pinned clarification/terms/clocks and accepted-hook rollback PASS with preceding70-table comparison retained. Full156 Node/35 migrations/both actual restores/38 desktop/mobile browsers/lint/typecheck/actual image closed-release proof PASS, zero skips. Draft83 dependent/unmerged; runtime SQLite and whole plan/release PARTIAL. Continue CP11-AD native consented accepted-stage producer and remaining native conversion/cutover/external gates.

## CP11-AD — Native consented accepted-stage telemetry, 2026-10-07
Shared pair-week consent/write plan now serves the existing SQLite interview/accepted-offer producer and native async accepted-offer producer. The owned process hook retains HIRED + owning candidate ACCEPT_OFFER + separate employer OFFER + published source version + non-null revision + exact lexical terms proof; an isolated entry point owns its own transaction without nesting the command transaction. JSON key order, numeric spelling, escapes and first duplicate-key behavior remain significant; whitespace outside strings alone is compacted. No jsonb semantic equality loosening. Latest consent including insertion ties must be granted and no later than the source event. Existing v1 pair/week namespace prevents double counting either stage or historical v1 rows; properties remain minimal v2/week/stage. Analytics integrity failure must roll back the entire acceptance/event/outbox/journal. [Scope](CP11_AD_NATIVE_ACCEPTED_STAGE.md).

Full local and actual PostgreSQL18 Node22/24 acceptance pending. Runtime SQLite; full CP11/master plan/release PARTIAL. Continue acceptance then remaining native process lists/watch/contact, assessment/interview/auth/privacy/worker and target recovery/cutover/independent review/external gates. This is optional consenting-pair telemetry, not full-population NSM or evidence of employment commencement.

CP11-AD local full npm run check PASS158 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips. Target-only hook ownership was then separated to avoid nested command transactions; rebuilt native target, reran both SQLite lexical/dedupe regression tests PASS, source-only70/35 and syntax/diff checks PASS. No SQLite runtime behavior changed after the full run. Exact real PostgreSQL and remote acceptance pending.

## CP11-AE — Shared private process lists, 2026-10-07
Existing RecruitmentService.list and native PostgreSQL list use a shared scoped query and the already accepted private process view mapping. Candidate lists contain only owning candidate history; offer-scoped lists require current active membership and assignment even when empty. Target rows and all per-process views are read in one owned SERIALIZABLE READ ONLY snapshot without nested transactions. Existing created_at directions remain (candidate descending, employer ascending), with an explicit insertion-order tie breaker instead of an unspecified timestamp tie. Both backends use their reviewed physical/source-order metadata internally; none is returned. [Scope](CP11_AE_PORTABLE_PROCESS_LIST.md).

Full local and real PostgreSQL acceptance pending. Runtime SQLite; full plan/release PARTIAL. Continue actual acceptance then native watch/contact and assessment/interview/auth/privacy/worker/target recovery/cutover, independent draft-chain review and external gates.

CP11-AE local full npm run check PASS158 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips. Source-only70/35, script syntax and diff-check PASS. Exact actual PostgreSQL and remote acceptance pending.

CP11-AD6584e3d exact acceptance2026-10-07: [FARO37607617234](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37607617234) and [CI37607617199](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37607617199) SUCCESS. Actual PostgreSQL18 Node22/24 consented acceptance producer, whole-command analytics failure rollback, unchanged SQLite source-query lexical oracle, latest/equal-time/later consent and retained historical v1 dedupe PASS. Full158 Node/35 migrations/both actual restores/38 desktop/mobile browsers/lint/typecheck/actual image closed-release proof PASS, zero skips. Draft84 dependent/unmerged; runtime SQLite, whole plan/release PARTIAL. CP11-AE list conversion is now in draft85 with local full PASS and remote acceptance pending; continue remaining native watch/contact/assessment/interview/auth/privacy/worker/recovery/cutover and external gates.

CP11-AE initialee8b2a4 actual PostgreSQL failed a new fixture assertion: list expected the two native interest/history rows under targetDraft.id, while submitInterest created them under the separate published interestOffer.id. Fix uses the actual owning published offer for the same full history/current-authority assertions; the unchanged SQLite source-proof oracle now also carries that exact offer ID. Safe failure stack parsing now selects stack frames before limiting, so multiline assertion differences cannot suppress diagnostic locations. No criteria skipped/relaxed. Local full158/35/both restores/38 browser proof remains valid; full actual PostgreSQL/remote rerun required.

## CP11-AF — Shared private watches and atomic alert cancellation, 2026-10-07
Existing SQLite watch/create/remove/mute/list now consumes the same private query/write plans as native PostgreSQL. Current-session authority runs inside each owned target write; create requires active proven intake, while existing historical watches retain last published conditions without unpublished draft leakage. Preference/write and pending optional alert deletion are atomic. Closing reminders are removed on mute/unwatch; other offer updates are removed only when no applicant history exists. Process updates, applicant condition updates and already delivered messages remain independent. Public response excludes watch-owner identity and import-order metadata. [Scope](CP11_AF_PORTABLE_PRIVATE_WATCHES.md).

Full local and real PostgreSQL acceptance pending. Runtime SQLite; full CP11/master plan/release PARTIAL. Continue acceptance then native explicit contact preview/grant/read/revoke and remaining assessment/interview/auth/privacy/worker/target recovery/cutover; independent draft-chain review and external gates remain open.

CP11-AF local full npm run check PASS159 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips. New real API watch mute cancellation rollback/retry/applicant-independence regression PASS. Source-only70/35, script syntax and diff-check PASS. Exact actual PostgreSQL18 Node22/24 and remote acceptance pending.

CP11-AF initial1463bdd and diagnostica091a19 PostgreSQL runs failed a new fixture baseline assertion: the original source snapshot already contains candidate watch for offer.id. Fix retains and asserts this imported watch, scopes new-watch assertions to interestOffer.id and checks the complete original list after removal/session refusal. Historical draft lookup selects its own offer instead of relying on timestamp position. No production criteria skipped or relaxed, and no imported row removed to manufacture empty state. Runtime local159/35/both restores/38 browser evidence remains valid; full real PostgreSQL rerun required.

CP11-AE7aaa3ce exact acceptance2026-10-07: [FARO37608760521](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37608760521) and [CI37608760647](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37608760647) SUCCESS. Real PostgreSQL18 Node22/24 private scoped process lists/wire parity/equal-date history/current-authority refusal PASS. Full158 Node/35 migrations/both restores/38 desktop/mobile browsers/actual image closed-release proof PASS; initial fixture failure is superseded by corrected full rerun. Draft85 unmerged; runtime SQLite, whole plan/release PARTIAL.

## CP11-AG — Shared explicit private contact consent and audited read, 2026-10-07
Existing SQLite phone preview/grant/revoke/read consume shared native ownership/status/confirmation/query/audit plans with PostgreSQL staging. Preview token remains bound to exact candidate/process/current phone; fresh explicit confirmation is required, private read requires current active assignment/membership plus unrevoked grant and ACTIVE/OFFERED status. Target authority callbacks run inside the transaction and privileged read explicitly requires session/MFA authority supplied by its caller; native authentication/MFA integration remains open. Private phone read and its minimized audit now share a write transaction in both backends, with no contact returned on audit failure. [Scope](CP11_AG_PORTABLE_EXPLICIT_CONTACT.md).

Full local and actual PostgreSQL acceptance pending. Runtime SQLite; full CP11/master plan/release PARTIAL. Continue acceptance then remaining assessment/interview/auth/MFA/privacy/worker/target recovery/cutover; independent draft-chain review and external gates remain open.

CP11-AF12ebcc3 actual PostgreSQL18 Node22/24 watch/current authority/pending alert FK rollback/applicant independence/imported baseline preservation proof PASS in FARO37611303930. Remaining full FARO/browser and CI37611303919 acceptance pending at this observation. Prior fixture baseline failures remain recorded; no production criterion was relaxed.

CP11-AG local full npm run check PASS160 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips. New real API grant/read audit failure regression PASS; original new-test endpoint typo was corrected to existing phone-grant before this complete rerun. Source-only70/35, syntax and diff-check PASS. Exact actual PostgreSQL and remote acceptance pending.

CP11-AF12ebcc3 exact acceptance2026-10-07: [FARO37611303930](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37611303930) and [CI37611303919](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37611303919) SUCCESS. Actual PostgreSQL18 Node22/24 watch authority/atomic optional cancellation/imported-history preservation PASS; full159 Node/35 migrations/both actual restores/38 desktop/mobile browsers/actual image closed-release proof PASS. Recorded initial fixture failures superseded by fixed full rerun. Draft86 unmerged; runtime SQLite, whole plan/release PARTIAL.

## CP11-AH — Shared native assessment definition/read/create/review, 2026-10-07
Existing SQLite definition/list/native parse/create/review/approval consume shared explicit query/validation/write/audit plans with PostgreSQL staging. Assigned current active organization members retain employer-only rubric/key access; candidate/foreign/revoked access remains refused. Native QUIZ/OBJECTIVE and OPEN_ANSWER/HUMAN, required rubric/time/task/right confirmation, latest-version review and immutable historical versions stay unchanged. SQLite standalone create and approval now own atomic write+audit transactions; existing idempotent version edit reuses the owned creation helper without nested transactions. Target create/read/approval use owned SERIALIZABLE transactions and write-authority callbacks. [Scope](CP11_AH_PORTABLE_ASSESSMENT_DEFINITIONS.md).

Full local and actual PostgreSQL acceptance pending. Runtime SQLite; full plan/release PARTIAL. Native idempotent definition-edit command, assignment/attempt lifecycle/incidents/results/retries/cohort correction, interview/auth/MFA/privacy/worker/recovery/cutover, independent draft review and external gates remain open. No advanced execution, AI provider call, automatic open-answer grade or release enablement.

CP11-AG419dfc3 [FARO37611991331](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37611991331) SUCCESS: actual PostgreSQL18 Node22/24 explicit contact ownership/confirmation/current membership/session-MFA callback refusal/audit rollback and full160 Node/35 migrations/both restores/38 desktop/mobile browsers/actual image closed-release evidence PASS. CI37611991336 still in progress at this observation. Draft87 dependent/unmerged; runtime SQLite, full plan/release PARTIAL.

CP11-AG419dfc3 exact final acceptance2026-10-07: CI37611991336 SUCCESS, superseding the pending note; FARO37611991331 also SUCCESS. All required actual PostgreSQL18 Node22/24 contact proof/160 Node/35 migrations/both restores/38 real browsers/image closed-release evidence PASS, zero skips. Runtime SQLite; draft87 unmerged and full CP11/master plan/release PARTIAL. Continue assessment definitions and remaining native conversion/cutover/external gates.

CP11-AH local full npm run check PASS161 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips. New real API definition create/approval audit rollback/retry/frozen version edit regression PASS. Source-only70/35, syntax and diff-check PASS. Exact actual PostgreSQL18 Node22/24 and remote acceptance pending.

## CP11-AI — Native idempotent assessment definition edit, 2026-10-07
Existing SQLite definition edit and native PostgreSQL command share expected/latest-version validation and preserve original origin, ignoring client attempts to relabel provenance. Required current authority and assigned membership run inside the owned transaction before replay. New immutable version, minimized audit and command acknowledgement are atomic; audit failure leaves no version or journal row, and exact replay creates no second version. Prior approved and draft versions remain unchanged. [Scope](CP11_AI_PORTABLE_ASSESSMENT_EDIT.md).

Full local and actual PostgreSQL acceptance pending. Runtime SQLite; full CP11/master plan/release PARTIAL. Continue acceptance then native assignment/attempt clocks/private drafts/submit/incidents/review/validity/retries/corrections, interview/auth/MFA/privacy/worker/recovery/cutover, independent draft-chain review and external gates. Checkpoint suffix AI does not enable AI providers or automatic grading.

CP11-AHcb88774 [FARO37612720333](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37612720333) SUCCESS: actual PostgreSQL18 Node22/24 definition/list wire parity, native task/scoring validation, scoped authority, draft/approval audit rollback and frozen version proof PASS. Full161 Node/35 migrations/both restores/38 real desktop/mobile browsers/actual image closed-release proof PASS, zero skips. CI37612720164 pending at this observation. Draft88 dependent/unmerged; runtime SQLite and whole plan/release PARTIAL. Continue native idempotent definition edit then assignment/attempt/review and remaining conversion/external gates.

CP11-AI local full npm run check PASS161 Node/35 migrations/both actual restore drills/38 desktop/mobile browser executions/lint/typecheck, zero skips. Extended real API definition-edit audit rollback/retry/replay/frozen history regression PASS. Source-only70/35, syntax and diff-check PASS. Exact actual PostgreSQL18 Node22/24 and remote acceptance pending.

CP11-AI448dcfa exact acceptance 2026-10-07: [FARO37613303718](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37613303718) and [CI37613303714](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37613303714) SUCCESS. Actual PostgreSQL18 Node22/24 immutable edit/audit rollback/current authority before replay PASS; full161 Node/35 migrations/both actual restores/38 browsers/image closed-release proof PASS. Draft89 unmerged; runtime SQLite and whole plan/release PARTIAL. CP11-AH CI37612720164 also SUCCESS, superseding its pending note.

## CP11-AJ — Portable pinned assessment assignment, 2026-10-07

Shared SQLite/native assignment validation and exact pinned version; invitation, process stage/deadline, event/audit/outbox and idempotent acknowledgement are atomic. Current authority precedes replay. Full local162 Node/35 migrations/both restores/38 browsers/lint/typecheck PASS, zero skips; actual PostgreSQL18 Node22/24 acceptance pending. [Scope](CP11_AJ_PORTABLE_ASSESSMENT_ASSIGNMENT.md). Runtime SQLite, full plan/release PARTIAL. Continue attempt lifecycle and remaining native conversion/external gates.

## CP11-AK — Portable private assessment attempt views, 2026-10-07

Existing SQLite/native explicit reads and role-aware attempt mapping are shared. Candidate keys and employer draft answers stay private; submitted review, immutable result history/validity and retry/incident context retain current behavior. Native current-authority/assigned membership checked in owned read-only transaction, including empty scoped list. [Scope](CP11_AK_PORTABLE_ASSESSMENT_ATTEMPT_VIEWS.md). Local/actual PostgreSQL acceptance pending; runtime SQLite, whole plan/release PARTIAL. Continue native attempt writes and remaining conversion/external gates.

CP11-AK full local npm run check PASS162 Node/35 migrations/both actual restores/38 real desktop/mobile browser executions/lint/typecheck, zero skips. Source-only70/35, syntax and diff check PASS. Existing native read fixtures require real PostgreSQL acceptance; runtime SQLite, whole plan/release PARTIAL.

CP11-AJa21a81b exact acceptance2026-10-07: [FARO37614506206](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37614506206) and [CI37614506118](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37614506118) SUCCESS. Actual PostgreSQL18 Node22/24 pinned assignment/guards/notification rollback/current authority before replay PASS. Full162 Node/35 migrations/both restores/38 browsers/actual image closed-release proof PASS, zero skips. Draft90 unmerged; runtime SQLite, full plan/release PARTIAL.

## CP11-AL — Portable neutral attempt expiry, 2026-10-07

Shared SQLite/native due query and expiry plan preserve private answers, deadline/start/expiry evidence and original process response clocks. Required event/audit/outbox and neutral next-step deadline from the pinned offer version are atomic; newer/terminal process stages are retained. Native worker-authority callback runs inside the owned SERIALIZABLE transaction. [Scope](CP11_AL_PORTABLE_ASSESSMENT_EXPIRY.md). Local/actual PostgreSQL acceptance pending; runtime SQLite and whole plan/release PARTIAL. Continue candidate start/save/submit and remaining native lifecycle/integration/external gates.

CP11-AK58df3f5 exact acceptance2026-10-07: [FARO37615169333](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37615169333) and [CI37615169487](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37615169487) SUCCESS. Actual PostgreSQL18 Node22/24 private views/lists/source wire parity/current scoped refusal/draft-key privacy/finalized-invalidation history PASS. Full162 Node/35 migrations/both actual restores/38 browsers/actual image closed-release proof PASS, zero skips. Draft91 unmerged; runtime SQLite and full plan/release PARTIAL.

CP11-AL5b6de94 corrected local full check PASS162 Node/35 migrations/both actual restores/38 browsers/lint/typecheck, zero skips. Targeted exact UTF-8 neutral expiry/rollback regression PASS1. [FARO37616219738](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37616219738) SUCCESS including actual PostgreSQL18 Node22/24 worker refusal/delivery rollback/retry once/private evidence/pinned neutral clock/newer-stage proof and actual image closed release. CI37616219838 pending. Original encoding/fixture failures retained and superseded only by corrected proof; no loosened assertions. Runtime SQLite, draft92 unmerged and whole plan/release PARTIAL.

## CP11-AM — Portable candidate attempt start, 2026-10-07

Existing SQLite/native candidate-only start share ownership/terminal guard and server-timer/audit plan. Timer is limited by the pinned definition and original invitation deadline; repeated start preserves clocks/revision and adds no audit. Required current authority checked before expiry and again inside start transaction; committed expiry remains neutral on refused late start. [Scope](CP11_AM_PORTABLE_ASSESSMENT_START.md). Targeted real API start audit rollback/retry/replay regression PASS1; full local/actual PostgreSQL acceptance pending. Runtime SQLite, full plan/release PARTIAL; continue private save/submit and remaining lifecycle/integration/external gates.

CP11-AL5b6de94 exact final acceptance2026-10-07: CI37616219838 SUCCESS, superseding the pending note; FARO37616219738 also SUCCESS. Corrected actual PostgreSQL18 Node22/24 expiry and full162 Node/35 migrations/both actual restores/38 browsers/image closed-release proof PASS, zero skips. Earlier encoding regression is documented and not hidden. Runtime SQLite, draft92 unmerged; whole CP11/master plan/release PARTIAL.

CP11-AM7ab0678 local full check PASS162 Node/35 migrations/both actual restores/38 browsers/lint/typecheck, zero skips. Targeted real API timer/start audit rollback/retry/replay PASS1; source70/35 and syntax/diff PASS. [FARO37616934104](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37616934104) SUCCESS including actual PostgreSQL18 Node22/24 current authority/candidate/terminal guards, audit rollback, pinned timer/repeat/deadline clamp/expired refusal and actual image closed release. CI37616934177 pending. Runtime SQLite, draft93 unmerged; full plan/release PARTIAL.

## CP11-AN — Portable private answer save/submit, 2026-10-07

Shared pinned native answer validation and write plan preserve candidate-only drafts and original timer. Submit/result proposal, process decision deadline from pinned offer, event/audit/outbox are atomic. Open answers remain unscored until human review; candidate provisional result is hidden. SQLite now checks ownership/terminal status before expiry, matching native current authority before mutation. [Scope](CP11_AN_PORTABLE_ASSESSMENT_ANSWERS.md). Targeted/full/actual PostgreSQL acceptance pending; runtime SQLite and whole plan/release PARTIAL. Continue incidents/review/validity/retries/cohort corrections and remaining native integration/external gates.

CP11-AM7ab0678 exact final acceptance2026-10-07: CI37616934177 SUCCESS, superseding the pending note; FARO37616934104 also SUCCESS. Actual PostgreSQL18 Node22/24 candidate clock/authority/audit rollback/replay/deadline/expired refusal and full162 Node/35 migrations/both restores/38 browsers/image closed-release proof PASS, zero skips. Runtime SQLite; draft93 unmerged, whole plan/release PARTIAL.

CP11-AN1b5a5d5 exact acceptance2026-10-07: [FARO37617622891](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37617622891) and [CI37617622766](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37617622766) SUCCESS. Actual PostgreSQL18 Node22/24 private answer/task/session/revision guards, unchanged clocks, draft privacy, actual notification rollback/retry once, unscored human proposal and pinned deadline PASS. Full162 Node/35 migrations/both restores/38 browsers/actual image closed-release proof PASS, zero skips. Runtime SQLite, draft94 unmerged; whole plan/release PARTIAL.

## CP11-AO — Portable human result finalization, 2026-10-07

Shared pinned definition/rubric and attempt/process revision guards retain explicit human confirmation, pending-only review and open incident refusal. Result/reviewer timestamp/history/minimized audit/event/outbox/command acknowledgement are atomic. Current assigned employer authority runs inside native transaction before replay; SQLite also rechecks scoped authority before replay. [Scope](CP11_AO_PORTABLE_ASSESSMENT_REVIEW.md). Targeted real API review rollback/retry/replay and open-answer/missing-answer review PASS2; full local/actual PostgreSQL acceptance pending. Runtime SQLite, whole plan/release PARTIAL. Continue incidents/validity/amendments/retries/cohort correction and remaining conversion/cutover/external gates.

CP11-AO2dba1dc exact acceptance2026-10-07: [FARO37618499208](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37618499208) and [CI37618499128](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37618499128) SUCCESS. Actual PostgreSQL18 Node22/24 pinned human rubric/revision/incident/authority guards, audit and delivery rollback/history/journal/replay once PASS. Full162 Node/35 migrations/both restores/38 browsers/actual image closed-release proof PASS, zero skips. Runtime SQLite, draft95 unmerged; whole plan/release PARTIAL.

## CP11-AP — Portable result invalidation, 2026-10-07

Shared latest history/state/revision/explicit-confirmation/reason validation and writes append INVALIDATED evidence without overwriting original answers/result or process clocks/decision. Required notifications/event/audit and command acknowledgement are atomic. Current assigned employer authority runs inside native transaction before replay; SQLite rechecks inside command as well. [Scope](CP11_AP_PORTABLE_ASSESSMENT_INVALIDATION.md). Targeted real API notification rollback/history/export/erasure and history migration PASS2; full local/actual PostgreSQL acceptance pending. Runtime SQLite, whole plan/release PARTIAL; continue amendments/incidents/retries/cohort correction and remaining conversion/cutover/external gates.

CP11-APd687189 full corrected local npm run check PASS162 Node/35 migrations/both actual restores/38 real desktop/mobile browsers/lint/typecheck, zero skips. Targeted actual API invalidation rollback/history/export/erasure and legacy migration PASS2; source70/35, syntax/diff PASS. [FARO37619483825](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37619483825) SUCCESS including actual PostgreSQL18 Node22/24 immutable validity history/current authority/delivery rollback/replay and actual image closed release. CI37619483655 still running at this observation; not full acceptance. Runtime SQLite, draft96 unmerged and whole plan/release PARTIAL.

CP11-APd687189 exact final acceptance2026-10-07: CI37619483655 SUCCESS, superseding the pending note; FARO37619483825 also SUCCESS. Actual PostgreSQL18 Node22/24 invalidation/privacy/history/current authority/atomic delivery and full162 Node/35 migrations/both actual restores/38 browsers/image closed-release proof PASS, zero skips. Runtime SQLite; draft96 unmerged, whole plan/release PARTIAL.

## CP11-AQ — Portable human result amendment, 2026-10-07

Shared pinned rubric/revision/confirmation/reason/score validation appends an immutable human amendment, preserves original answers/result and process clocks/decision, and retains missing-answer nulls. History/revision/event/audit/outbox/command acknowledgement are atomic. Current assigned employer authority is checked before replay; returned view is freshly projected after command replay to respect later invalidation. [Scope](CP11_AQ_PORTABLE_ASSESSMENT_AMENDMENT.md). Targeted API amendment rollback/fresh validity replay and open-answer review PASS2; full local/actual PostgreSQL acceptance pending. Runtime SQLite, whole plan/release PARTIAL; continue incidents/retries/cohort correction and remaining conversion/external gates.

CP11-AQa3bf5d8 local full check PASS162 Node/35 migrations/both actual restores/38 browsers/lint/typecheck, zero skips. Targeted amendment/open-answer PASS2; source70/35, syntax/diff PASS. [FARO37621061975](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37621061975) SUCCESS including real PostgreSQL18 Node22/24 immutable amendment/delivery rollback/fresh validity replay/current authority and actual image closed-release proof. CI37621061928 pending; runtime SQLite, draft97 unmerged and whole plan/release PARTIAL.

## CP11-AR — Portable candidate technical report, 2026-10-07

Shared candidate scope/revision/confirmation/category/statement validation and original-evidence write plan; incident/revision/event/audit/outbox/command acknowledgement atomic. Statement remains only in owned incident data; event payload and journal exclude private answers/statement. Required current candidate authority precedes replay, then a fresh view rechecks authority. [Scope](CP11_AR_PORTABLE_ASSESSMENT_INCIDENT_REPORT.md). Rebuilt existing actual API report/resolve/privacy/older-stage regressions PASS3; full local/actual PostgreSQL acceptance pending. Runtime SQLite, whole plan/release PARTIAL; continue native incident resolution/retries/cohort corrections and remaining conversion/external gates.

CP11-AQa3bf5d8 exact final acceptance2026-10-07: CI37621061928 SUCCESS, superseding pending; FARO37621061975 also SUCCESS. Actual PostgreSQL18 Node22/24 immutable human amendment/fresh validity replay/current authority and full162 Node/35 migrations/both restores/38 browsers/image closed-release proof PASS, zero skips. Runtime SQLite, draft97 unmerged; whole plan/release PARTIAL.

CP11-ARae8f21a local full check PASS162 Node/35 migrations/both actual restores/38 browsers/lint/typecheck, zero skips. Targeted report/incident/privacy/newer-stage regressions PASS3; source70/35, syntax/diff PASS. Actual PostgreSQL18 Node22/24 candidate report/evidence/delivery rollback/privacy proof PASS in FARO37621657225; full FARO and CI37621657237 acceptance still pending. Runtime SQLite, draft98 unmerged; whole plan/release PARTIAL.

## CP11-AS — Portable human incident resolution, 2026-10-07

Shared assigned employer/revision/confirmation/native resolution validation and incident/attempt/neutral process write plans preserve original evidence. Newer or terminal process decisions and another active attempt are retained; confirmed affected attempts become TECHNICAL_ISSUE with pinned neutral next-step deadline only where applicable. Writes/event/audit/outbox/command acknowledgement atomic; fresh view and current authority protect replay. [Scope](CP11_AS_PORTABLE_ASSESSMENT_INCIDENT_RESOLUTION.md). Full local/actual PostgreSQL acceptance pending; runtime SQLite, whole plan/release PARTIAL. Continue technical retries/cohort correction and remaining conversion/external gates.

CP11-ARae8f21a exact final acceptance2026-10-07: [FARO37621657225](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37621657225) and [CI37621657237](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37621657237) SUCCESS. Actual PostgreSQL18 Node22/24 candidate report/evidence/current authority/delivery rollback/minimized journal/event and full162 Node/35 migrations/both restores/38 browsers/image closed-release proof PASS, zero skips. Runtime SQLite, draft98 unmerged; whole plan/release PARTIAL.

CP11-ASd68cdc7 local full check PASS162 Node/35 migrations/both actual restores/38 browsers/lint/typecheck, zero skips. Targeted incident rollback/evidence/privacy/newer-stage PASS3; source70/35, syntax/diff PASS. [FARO37622192234](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37622192234) SUCCESS including actual PostgreSQL18 Node22/24 human resolution/delivery rollback/pinned neutral deadline/terminal and newer-stage proof/image closed release. CI37622192262 pending; runtime SQLite, draft99 unmerged and whole plan/release PARTIAL.

## CP11-AT — Portable pinned technical retry, 2026-10-07

Shared current recruiter scope/revision/confirmed incident/state/active attempt/corrected version/confirmation/deadline validation creates a separate pinned retry lineage. Original attempt/evidence/clocks stay unchanged; retry/process deadline/event/audit/outbox/journal atomic, current authority before replay and fresh view. [Scope](CP11_AT_PORTABLE_ASSESSMENT_RETRY.md). Rebuilt actual API rollback/lineage/privacy and0031 migration regressions PASS2; full local/actual PostgreSQL acceptance pending. Runtime SQLite, whole plan/release PARTIAL; continue cohort correction and remaining native integration/external gates.

CP11-ASd68cdc7 exact final acceptance2026-10-07: CI37622192262 SUCCESS, superseding pending; FARO37622192234 also SUCCESS. Actual PostgreSQL18 Node22/24 human incident resolution and full162 Node/35 migrations/both restores/38 browsers/image closed-release proof PASS, zero skips. Draft99 unmerged; runtime SQLite, whole plan/release PARTIAL.

CP11-ATb584a1e exact acceptance2026-10-07: [FARO37622886147](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37622886147) and [CI37622886042](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37622886042) SUCCESS. Actual PostgreSQL18 Node22/24 pinned retry/role/current authority/original evidence/delivery rollback/replay PASS. Full local162 Node/35 migrations/both actual restores/38 browsers/lint/typecheck PASS, zero skips. Draft100 unmerged; runtime SQLite and whole plan/release PARTIAL.

## CP11-AU — Portable scoped cohort correction preview, 2026-10-07

SQLite/native PostgreSQL share pinned QUIZ key validation, sorted capped cohort query, private effect calculation, revision/history fencing token and minimized public preview. Current session plus assigned membership are checked inside owned read-only SERIALIZABLE transaction. Active attempts block application; invalidated results are excluded and manual amendments require deliberate replacement. Preview does not write results, reset timers or change decisions. [Scope](CP11_AU_PORTABLE_COHORT_PREVIEW.md). Existing real API cohort regression PASS1 and source70/35 PASS; full local/actual PostgreSQL acceptance pending. Runtime SQLite, whole plan/release PARTIAL; continue atomic cohort correction write and remaining native integration/external gates.

CP11-AU draft [#101](https://github.com/eagleblastmusic-lgtm/Job/pull/101): codex/faro-cp11au-cohort-preview base codex/faro-cp11at-technical-retry, codef2e21fb plus fixture fix7789815. Local full162/35/both restores/38 browsers PASS; initial PostgreSQL23514 from missing synthetic invalidation reason retained, corrected fixture CI running. No loosened constraint; runtime SQLite and whole plan/release PARTIAL.

## CP11-AV — Portable atomic cohort key correction, 2026-10-07

Shared SQLite/native pinned token/active/manual confirmation and effect write plan appends immutable key/result history, advances only affected attempt revisions and retains original answers/result/clocks/definition/process decisions. Current assigned authority applies before command replay; correction/history/events/audit/notifications/journal are atomic. [Scope](CP11_AV_PORTABLE_COHORT_CORRECTION.md). Existing real API cohort regression extended with actual delivery failure/complete rollback/retry PASS1; source70/35 and syntax/diff PASS. Full local/actual PostgreSQL acceptance pending. Runtime SQLite, whole plan/release PARTIAL; continue remaining native interviews/auth/privacy/worker integration and external gates.

CP11-AU7789815 exact corrected acceptance2026-10-07: [FARO37624399179](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37624399179) and [CI37624398832](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37624398832) SUCCESS. Actual PostgreSQL18 Node22/24 private scoped cohort preview/active block/history fences/current authority PASS; full local162 Node/35 migrations/both restores/38 browsers PASS, zero skips. Original23514 fixture failure retained; reason evidence corrected without loosening CHECK. Draft101 unmerged; runtime SQLite and whole plan/release PARTIAL.

CP11-AV2aecadd full local check PASS162 Node/35 migrations/both actual restores/38 browsers/lint/typecheck, zero skips. Targeted actual API cohort delivery rollback/retry/history/privacy PASS1; source70/35 and syntax/diff PASS. [FARO37624773821](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37624773821) SUCCESS including actual PostgreSQL18 Node22/24 token/manual/current authority/atomic delivery rollback/replay/evidence/privacy and actual image closed release. CI37624773883 pending. Draft102 unmerged, runtime SQLite and whole plan/release PARTIAL.

## CP11-AW — Portable private interview views/calendar, 2026-10-07

Shared SQLite/native explicit interview and list queries, scoped view, confirmed-only UTF-8 folded/escaped ICS and exact participant collision query retain candidate ownership/current assigned membership. Native reads require current session inside owned read-only SERIALIZABLE transaction. [Scope](CP11_AW_PORTABLE_INTERVIEW_VIEWS.md). Existing real API interview calendar/DST/slot/scoped completion regression PASS1; source70/35 and syntax/diff PASS. Full local/actual PostgreSQL acceptance pending. Runtime SQLite, whole plan/release PARTIAL; continue atomic interview scheduling/change/worker and remaining integration/external gates.

CP11-AV2aecadd exact final acceptance2026-10-07: CI37624773883 SUCCESS, superseding pending; FARO37624773821 also SUCCESS. Actual PostgreSQL18 Node22/24 atomic cohort correction and full162 Node/35 migrations/both restores/38 browsers/image closed-release proof PASS, zero skips. Draft102 unmerged; runtime SQLite, whole plan/release PARTIAL.

CP11-AW7ff9387 full local check PASS162 Node/35 migrations/both actual restores/38 browsers/lint/typecheck, zero skips. Targeted interview calendar/DST/private scope PASS1; source70/35 and syntax/diff PASS. [FARO37625449062](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37625449062) SUCCESS including actual PostgreSQL18 Node22/24 scoped detail/list/calendar/current authority/collision boundary and actual image closed release. CI37625448959 pending. Draft103 unmerged, runtime SQLite and whole plan/release PARTIAL.

## CP11-AX — Portable atomic interview proposal, 2026-10-07

Shared SQLite/native current recruiter role, process revision/active state, pinned interview count, explicit availability, IANA/offset/DST/time/duration/HTTPS and participant slot guards. Proposal/process deadline/events/audit/outbox/journal atomic; current recruiter role now applies on cached replay in both backends. [Scope](CP11_AX_PORTABLE_INTERVIEW_PROPOSAL.md). Rebuilt actual API delivery rollback/current replay role/calendar/DST/expiry regressions PASS2; source70/35 and syntax/diff PASS. Full local/actual PostgreSQL acceptance pending. Runtime SQLite, whole plan/release PARTIAL; continue interview confirmation/completion/dispute/worker and remaining integration/external gates.

CP11-AW7ff9387 exact final acceptance2026-10-07: CI37625448959 SUCCESS, superseding pending; FARO37625449062 also SUCCESS. Actual PostgreSQL18 Node22/24 private interview views/calendar and full162 Node/35 migrations/both restores/38 browsers/image closed-release proof PASS, zero skips. Draft103 unmerged; runtime SQLite, whole plan/release PARTIAL.

CP11-AX16f08d1 full local check PASS162 Node/35 migrations/both actual restores/38 browsers/lint/typecheck, zero skips. Targeted real API delivery rollback/current replay role/DST/neutral expiry PASS2; source70/35 and syntax/diff PASS. Actual PostgreSQL18 Node22/24 proposal/guards/atomic delivery/original clocks PASS in FARO37626238389; full FARO/CI37626238345 final acceptance pending. Draft104 unmerged, runtime SQLite and whole plan/release PARTIAL.

## CP11-AY — Portable atomic interview confirmation/cancellation, 2026-10-07

Shared SQLite/native interview/process revisions, active state, explicit action and current participant/recruiter authority protect confirmation and neutral cancellation. Confirmation requires candidate, current assigned original recruiter, future confirmation cutoff and participant slot availability. Cancellation pins neutral decision clock to original offer. Interview/process/event/audit/outbox/journal atomic; current role checked before cached replay. [Scope](CP11_AY_PORTABLE_INTERVIEW_SCHEDULE.md). Rebuilt actual API confirmation/cancellation delivery rollback/retry, slot/DST/expiry regressions PASS2; source70/35 and syntax/diff PASS. Full local/actual PostgreSQL acceptance pending. Runtime SQLite, whole plan/release PARTIAL; continue mutual completion/discrepancy/worker and remaining native integration/external gates.

CP11-AX16f08d1 exact final acceptance2026-10-07: [FARO37626238389](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37626238389) and [CI37626238345](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37626238345) SUCCESS. Actual PostgreSQL18 Node22/24 atomic interview proposal and full162 Node/35 migrations/both restores/38 browsers/image closed-release proof PASS, zero skips. Draft104 unmerged; runtime SQLite, whole plan/release PARTIAL.

CP11-AYf98735f local full check PASS162 Node/35 migrations/both actual restores/38 browsers/lint/typecheck, zero skips; targeted actual API confirmation/cancellation rollback/retry/DST/neutral clock PASS2. [FARO37626987773](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37626987773) and CI37626987787 did not start jobs: GitHub account payments failed or spending limit requires increase. One failed-job rerun2026-10-07 reproduced the same billing annotation. Native PostgreSQL18 acceptance is NOT established for AY. This requires repository account owner action in Billing & plans; no local Docker/psql is available and source-only rehearsal is not a substitute. Draft105 unmerged, runtime SQLite; full plan/release PARTIAL.

## CP11-AZ — Portable consented mutual interview stage producer, 2026-10-07

SQLite keeps its existing evidence query, extracted to shared model. Native PostgreSQL producer requires COMPLETED interview/both participant reports plus matching completed operational event; first duplicate JSON key semantics match SQLite. Current/latest consent must precede event; shared private pair/week-v1 dedupe with v2 definition avoids duplicate completed stages and late-consent backfill. [Scope](CP11_AZ_PORTABLE_MUTUAL_STAGE.md). Targeted existing optional progression/private interview regressions PASS2; source70/35 and syntax/diff PASS. Full local verification pending. Real PostgreSQL18/remote acceptance blocked by confirmed GitHub account billing failure; no native acceptance claim. Native completion integration remains next stage. Runtime SQLite, whole plan/release PARTIAL.

CP11-AZ6d0e0a3 local full check PASS162 Node/35 migrations/both actual restores/38 real desktop/mobile browsers/lint/typecheck, zero skips. Rebuilt extended SQLite duplicate-key evidence/consent/dedupe/privacy/erasure oracle PASS1; earlier existing progression/private interview PASS2. Source70/35 and syntax/diff PASS. Draft [#106](https://github.com/eagleblastmusic-lgtm/Job/pull/106): codex/faro-cp11az-mutual-stage base codex/faro-cp11ay-interview-schedule. Actual PostgreSQL18/remote acceptance remains OPEN because GitHub account billing/spending prevented AY jobs from starting even after one rerun. No completion/release claim; runtime SQLite and full plan PARTIAL. Resume real AY/AZ acceptance before native completion/discrepancy/worker integration; repository owner must resolve Billing & plans.

CP11-AYf98735f exact final acceptance2026-10-07: [FARO37626987773](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37626987773) and [CI37626987787](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37626987787) SUCCESS after user-requested rerun. Actual PostgreSQL18 Node22/24 confirmation/cancellation/slot/current authority/delivery rollback/pinned neutral clock PASS; full local162 Node/35 migrations/both restores/38 browsers and actual image closed-release proof PASS, zero skips. Prior account billing failure is retained as historical and superseded by this real successful acceptance; billing gate resolved. Draft105 unmerged, runtime SQLite; whole plan/release PARTIAL.

CP11-AZ43365c1 exact final acceptance2026-10-07: [FARO37645803759](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37645803759) and [CI37645803771](https://github.com/eagleblastmusic-lgtm/Job/actions/runs/37645803771) SUCCESS after user-requested rerun. Actual PostgreSQL18 Node22/24 mutual evidence/first duplicate JSON key/consent/dedupe/analytics rollback/private payload PASS; full local162 Node/35 migrations/both actual restores/38 browsers and actual image closed-release proof PASS, zero skips. Prior account billing failure remains historical; real AY/AZ acceptance supersedes pending/blocking notes. Draft106 unmerged, runtime SQLite; whole plan/release PARTIAL. Continue native mutual completion/discrepancy/tick and remaining auth/MFA/privacy/worker/recovery/operator integration, independent review and external gates.
