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
