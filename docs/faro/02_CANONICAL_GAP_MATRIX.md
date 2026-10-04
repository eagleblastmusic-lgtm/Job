# CANONICAL GAP MATRIX

Baseline: fetched origin/main `ae4af4e`; current worktree changes are not baseline evidence. Status is audit classification, not completion. Delivery status lives in checkpoint register.

Coverage: 71/71 decisions + 86/86 backlog items + 16/16 invariants + 72/72 legacy crosswalk entries. UNMAPPED = 0. Research records are supporting evidence, not additional approved product features. Full acceptance wording is preserved below for every K item and in unmodified source specs.

| ID | Canonical requirement | Audit status | Implementation state | Checkpoint | Code evidence / gap |
|---|---|---|---|---|---|
| C001 | ZERO CV w procesie; przyszły import tylko prywatny | PARTIAL | DELTA_REQUIRED | CP01 | src/server/app.ts: CV/package/billing; effectiveWageApi.ts; publicJobIngestionService.ts; extendedApp.ts; baseline 90/92 tests |
| C002 | Serwerowa projekcja z imieniem i kontrolą ujawnienia telefonu po awansie | MISSING | DELTA_REQUIRED | CP02 | users role USER/ADMIN, no organizations in migrations/0001–0019; store.ts returns full private user only |
| C003 | Zakaz także w późniejszych projekcjach; zadania i praktyka zamiast etykiet | MISSING | DELTA_REQUIRED | CP02 | users role USER/ADMIN, no organizations in migrations/0001–0019; store.ts returns full private user only |
| C004 | Proposal nie jest SkillClaim; tytuł pracy nie dowodzi wykonywania czynności | PARTIAL | DELTA_REQUIRED | CP03 | careerTruth.ts confirmed/inferred; ontology.ts curated aliases; career_experiences employer/title; no proposal/claim versions |
| C005 | Cztery sekcje; krótki start bez obowiązkowego testu lub liczby kompetencji | PARTIAL | DELTA_REQUIRED | CP03 | careerTruth.ts confirmed/inferred; ontology.ts curated aliases; career_experiences employer/title; no proposal/claim versions |
| C006 | Nie zrównywać automatycznie hobby i pracy; nie dyskwalifikować hobby | PARTIAL | DELTA_REQUIRED | CP03 | careerTruth.ts confirmed/inferred; ontology.ts curated aliases; career_experiences employer/title; no proposal/claim versions |
| C007 | Podstawy / samodzielnie / swobodnie z kotwicą zadaniową | PARTIAL | DELTA_REQUIRED | CP03 | careerTruth.ts confirmed/inferred; ontology.ts curated aliases; career_experiences employer/title; no proposal/claim versions |
| C008 | Brak doświadczenia nie blokuje konta ani wartości; profil aspiracji dozwolony | PARTIAL | DELTA_REQUIRED | CP03 | careerTruth.ts confirmed/inferred; ontology.ts curated aliases; career_experiences employer/title; no proposal/claim versions |
| C009 | Nauka nie jest blokadą; firma opisuje realną pomoc | MISSING | DELTA_REQUIRED | CP04 | jobs are user-owned imported text; no employer native offers or immutable versions (0001_init.sql) |
| C010 | Wyjaśnienie bez globalnego werdyktu o człowieku | PARTIAL | DELTA_REQUIRED | CP05 | decisionEngine.ts aggregate scores + explanations; jobSearch.ts salary filters; no WILL_TEACH |
| C011 | Spełnione/niepotwierdzone/niespełnione na wymaganie | PARTIAL | DELTA_REQUIRED | CP05 | decisionEngine.ts aggregate scores + explanations; jobSearch.ts salary filters; no WILL_TEACH |
| C012 | IMMEDIATE/AFTER_PERIOD/ON_DATE; czas odniesienia i data aktualizacji | PARTIAL | DELTA_REQUIRED | CP03 | careerTruth.ts confirmed/inferred; ontology.ts curated aliases; career_experiences employer/title; no proposal/claim versions |
| C013 | Wersjonowane fakty pracodawcy; AI jedynie redakcja draftu | MISSING | DELTA_REQUIRED | CP04 | jobs are user-owned imported text; no employer native offers or immutable versions (0001_init.sql) |
| C014 | Pierwsza merytoryczna odpowiedź i późniejsze deadline osobno | MISSING | DELTA_REQUIRED | CP06 | statusTransitions.ts SAVED/APPLIED/CONTACTED/INTERVIEW/OFFER/CLOSED; notificationService.ts user-scoped dedupe, no outbox or process clocks |
| C015 | ReasonCode oraz requirementId przy porównaniu; brak fikcyjnego braku kompetencji | MISSING | DELTA_REQUIRED | CP06 | statusTransitions.ts SAVED/APPLIED/CONTACTED/INTERVIEW/OFFER/CLOSED; notificationService.ts user-scoped dedupe, no outbox or process clocks |
| C016 | Takie same prawa korekty i odwołania, różne obowiązki ról | MISSING | DELTA_REQUIRED | CP06 | statusTransitions.ts SAVED/APPLIED/CONTACTED/INTERVIEW/OFFER/CLOSED; notificationService.ts user-scoped dedupe, no outbox or process clocks |
| C017 | Sygnał do sprawy moderacyjnej; nigdy automatyczna etykieta oszustwa | MISSING | DELTA_REQUIRED | CP07 | no moderation case, reconfirmation or appeal schema in migrations; no trust worker |
| C018 | Reconfirmation i pauza nowych zgłoszeń; istniejące procesy nadal obsługiwane | MISSING | DELTA_REQUIRED | CP04 | jobs are user-owned imported text; no employer native offers or immutable versions (0001_init.sql) |
| C019 | Snapshot wersji przy zainteresowaniu; odróżnij zmianę danych i nowy szacunek netto | MISSING | DELTA_REQUIRED | CP04 | jobs are user-owned imported text; no employer native offers or immutable versions (0001_init.sql) |
| C020 | Watchlist poza employer API i analytics; oddzielny consent kanałów | MISSING | DELTA_REQUIRED | CP06 | statusTransitions.ts SAVED/APPLIED/CONTACTED/INTERVIEW/OFFER/CLOSED; notificationService.ts user-scoped dedupe, no outbox or process clocks |
| C021 | Szacunki, źródła, daty, założenia; nie wymuszamy dokładnego adresu | PARTIAL | DELTA_REQUIRED | CP09 | effectiveWage.ts rejected quotient; no versioned tax engine; imported salary grossNet mixes bases |
| C022 | Nie implementować ani ukrytej pochodnej tej miary | REMOVE | DELTA_REQUIRED | CP01 | src/server/app.ts: CV/package/billing; effectiveWageApi.ts; publicJobIngestionService.ts; extendedApp.ts; baseline 90/92 tests |
| C023 | Porównywalne podstawy i jawne braki danych; czas nie monetyzowany | PARTIAL | DELTA_REQUIRED | CP09 | effectiveWage.ts rejected quotient; no versioned tax engine; imported salary grossNet mixes bases |
| C024 | Jawny filtr wybrany przez kandydata; unknown nie jest spełnione ani niespełnione | PARTIAL | DELTA_REQUIRED | CP05 | decisionEngine.ts aggregate scores + explanations; jobSearch.ts salary filters; no WILL_TEACH |
| C025 | To samo DTO i polityka co rzeczywista projekcja, nie makieta | MISSING | DELTA_REQUIRED | CP02 | users role USER/ADMIN, no organizations in migrations/0001–0019; store.ts returns full private user only |
| C026 | Timer serwerowy od jawnego Start; deadline niezależny | MISSING | DELTA_REQUIRED | CP10 | no definitions/attempts/rubrics in schema; existing interviewPack is preparation only |
| C027 | Draft→review→approved version; edycja unieważnia approval | MISSING | DELTA_REQUIRED | CP10 | no definitions/attempts/rubrics in schema; existing interviewPack is preparation only |
| C028 | Brak polityk i pól tak/nie; ograniczanie narzędzi wyłącznie przyszły research | DEFER | SPEC_BLOCKED | CP01 | src/server/app.ts: CV/package/billing; effectiveWageApi.ts; publicJobIngestionService.ts; extendedApp.ts; baseline 90/92 tests |
| C029 | Wynik tasku oddzielny od decyzji rekrutacyjnej | MISSING | DELTA_REQUIRED | CP10 | no definitions/attempts/rubrics in schema; existing interviewPack is preparation only |
| C030 | Tylko porównywalne wersje i rubryki jednej rekrutacji; człowiek decyduje | MISSING | DELTA_REQUIRED | CP10 | no definitions/attempts/rubrics in schema; existing interviewPack is preparation only |
| C031 | Standardowy zakres/wynik/data/wersja; company result nie jest certyfikatem Faro | DEFER | SPEC_BLOCKED | CP10 | no definitions/attempts/rubrics in schema; existing interviewPack is preparation only |
| C032 | Metryki zdarzeń, nie opinie; prywatne zgłoszenia nadużycia zachowane | EXISTS | ALREADY_CLOSED | CP01 | src/server/app.ts: CV/package/billing; effectiveWageApi.ts; publicJobIngestionService.ts; extendedApp.ts; baseline 90/92 tests |
| C033 | Cały startowy produkt bezpłatny; zero komunikatu Free Plan | MISSING | DELTA_REQUIRED | CP01 | src/server/app.ts: CV/package/billing; effectiveWageApi.ts; publicJobIngestionService.ts; extendedApp.ts; baseline 90/92 tests |
| C034 | P5 narzędzia po walidacji, nie zasoby lepszych kandydatów | DEFER | SPEC_BLOCKED | CP12 | analytics_events consent gated; no marketplace progress cohort, no operational or user research evidence |
| C035 | Brak roadmapy i checkout kandydata | REMOVE | DELTA_REQUIRED | CP01 | src/server/app.ts: CV/package/billing; effectiveWageApi.ts; publicJobIngestionService.ts; extendedApp.ts; baseline 90/92 tests |
| C036 | Żadnego geofence; budżet kampanii można koncentrować w komórkach | EXISTS | ALREADY_CLOSED | CP12 | analytics_events consent gated; no marketplace progress cohort, no operational or user research evidence |
| C037 | Admin-approved organic community; Meta testy; nie scraping członków | DEFER | SPEC_BLOCKED | CP12 | analytics_events consent gated; no marketplace progress cohort, no operational or user research evidence |
| C038 | Zachować intelligence, nie wysyłać RFP jako przyjętego działania | DEFER | SPEC_BLOCKED | CP01 | src/server/app.ts: CV/package/billing; effectiveWageApi.ts; publicJobIngestionService.ts; extendedApp.ts; baseline 90/92 tests |
| C039 | Aktualne hasła; starsze I wiesz historyczne, bez nowego redesignu logo | PARTIAL | DELTA_REQUIRED | CP08 | public/index.html appView, src/client/app.ts DOM/hash navigation; public/styles.css; sw.js broad cache; playwright + axe |
| C040 | Nie ma zwolnienia tylko przez darmowość; kwalifikacja funkcji i wpis przed usługą jeśli wymagany | LEGAL REVIEW | SPEC_BLOCKED | CP11 | auth.ts scrypt, HttpOnly session, origin checks; files.ts scanner; export/delete; SQLite migrations; Render free ephemeral disk |
| C041 | Purpose inventory, funkcje osobno; ranking/ocena wymagają analizy high-risk | LEGAL REVIEW | SPEC_BLOCKED | CP11 | auth.ts scrypt, HttpOnly session, origin checks; files.ts scanner; export/delete; SQLite migrations; Render free ephemeral disk |
| C042 | Ocena rzeczywistego wpływu, nie samego przycisku człowieka; art6 i art22 osobno | LEGAL REVIEW | SPEC_BLOCKED | CP11 | auth.ts scrypt, HttpOnly session, origin checks; files.ts scanner; export/delete; SQLite migrations; Render free ephemeral disk |
| C043 | Zwykły wynik SQL nie staje się automatycznie art9; JDG/rekruter to także dane osobowe | LEGAL REVIEW | SPEC_BLOCKED | CP11 | auth.ts scrypt, HttpOnly session, origin checks; files.ts scanner; export/delete; SQLite migrations; Render free ephemeral disk |
| C044 | Polityka Faro ponad minimum; obowiązek info ma ustawowe warianty terminu | MISSING | DELTA_REQUIRED | CP04 | jobs are user-owned imported text; no employer native offers or immutable versions (0001_init.sql) |
| C045 | Art113,183a–e; art187/188 nie są podstawą zakazu dyskryminacji | LEGAL REVIEW | SPEC_BLOCKED | CP11 | auth.ts scrypt, HttpOnly session, origin checks; files.ts scanner; export/delete; SQLite migrations; Render free ephemeral disk |
| C046 | Stabilne URI i wersja; license manifest per dataset/pillar | PARTIAL | DELTA_REQUIRED | CP03 | careerTruth.ts confirmed/inferred; ontology.ts curated aliases; career_experiences employer/title; no proposal/claim versions |
| C047 | O*NET DB CC BY4 z obowiązkami; ZRK/INFO dostępność nie jest licencją | DEFER | SPEC_BLOCKED | CP03 | careerTruth.ts confirmed/inferred; ontology.ts curated aliases; career_experiences employer/title; no proposal/claim versions |
| C048 | Nieznana taryfa=null, nie0; transitFare nie zawsze dostępne | PARTIAL | DELTA_REQUIRED | CP09 | effectiveWage.ts rejected quotient; no versioned tax engine; imported salary grossNet mixes bases |
| C049 | Scenariusz użytkownika + wersja prawa + zakres niepewności | PARTIAL | DELTA_REQUIRED | CP09 | effectiveWage.ts rejected quotient; no versioned tax engine; imported salary grossNet mixes bases |
| C050 | Nie utożsamiać CV z latami edukacji; nie dzielić r jako skuteczności; testy wymagają walidacji | TEST FIRST | SPEC_BLOCKED | CP12 | analytics_events consent gated; no marketplace progress cohort, no operational or user research evidence |
| C051 | Imię i dowody nadal mogą być proxy; monitorować, nie przywracać danych po cichu | TEST FIRST | SPEC_BLOCKED | CP12 | analytics_events consent gated; no marketplace progress cohort, no operational or user research evidence |
| C052 | Kwarantanna liczbowych tez do oryginału, próby, daty i metodologii | TEST FIRST | SPEC_BLOCKED | CP12 | analytics_events consent gated; no marketplace progress cohort, no operational or user research evidence |
| C053 | Mechanizmy jako hipotezy UX, nie recepta neuro; brak95%/dopamine hacks | PARTIAL | DELTA_REQUIRED | CP08 | public/index.html appView, src/client/app.ts DOM/hash navigation; public/styles.css; sw.js broad cache; playwright + axe |
| C054 | Nie budować specjalnego modułu; podstawowa dostępność i prawny obowiązek dostosowań pozostają | PARTIAL | DELTA_REQUIRED | CP08 | public/index.html appView, src/client/app.ts DOM/hash navigation; public/styles.css; sw.js broad cache; playwright + axe |
| C055 | Jawny czas per test i zgłoszenie nadużycia; brak globalnego limitera | DEFER | SPEC_BLOCKED | CP01 | src/server/app.ts: CV/package/billing; effectiveWageApi.ts; publicJobIngestionService.ts; extendedApp.ts; baseline 90/92 tests |
| C056 | Data i wersja widoczne; brak automatycznej utraty skill; retention osobno | PARTIAL | DELTA_REQUIRED | CP01 | src/server/app.ts: CV/package/billing; effectiveWageApi.ts; publicJobIngestionService.ts; extendedApp.ts; baseline 90/92 tests |
| C057 | Nie budować teraz; wersjonowanie nie oznacza banku losującego | DEFER | SPEC_BLOCKED | CP01 | src/server/app.ts: CV/package/billing; effectiveWageApi.ts; publicJobIngestionService.ts; extendedApp.ts; baseline 90/92 tests |
| C058 | Brak produktu Spróbuj pracy i generatora rozmów; syntetyczne zadanie assessment to inny zakres | DEFER | SPEC_BLOCKED | CP01 | src/server/app.ts: CV/package/billing; effectiveWageApi.ts; publicJobIngestionService.ts; extendedApp.ts; baseline 90/92 tests |
| C059 | Brak Potential/Life/global ranking; lokalne wyniki testu dozwolone warunkowo | EXISTS | ALREADY_CLOSED | CP01 | src/server/app.ts: CV/package/billing; effectiveWageApi.ts; publicJobIngestionService.ts; extendedApp.ts; baseline 90/92 tests |
| C060 | Sprawdzić czy istniejące interest/accept wystarczają; nie dodawać obowiązkowego kliknięcia | TEST FIRST | SPEC_BLOCKED | CP06 | statusTransitions.ts SAVED/APPLIED/CONTACTED/INTERVIEW/OFFER/CLOSED; notificationService.ts user-scoped dedupe, no outbox or process clocks |
| C061 | Proste uzasadnienie wymogu w core; osobny AI checker FUTURE | DEFER | SPEC_BLOCKED | CP12 | analytics_events consent gated; no marketplace progress cohort, no operational or user research evidence |
| C062 | Proporcjonalne limity nadużyć; brak kary za samą poprawność tekstu czy użycie AI | PARTIAL | DELTA_REQUIRED | CP07 | no moderation case, reconfirmation or appeal schema in migrations; no trust worker |
| C063 | Zachować foundation; employer projection i private wallet grant doprecyzować | PARTIAL | DELTA_REQUIRED | CP02 | users role USER/ADMIN, no organizations in migrations/0001–0019; store.ts returns full private user only |
| C064 | Rights registry nadal gate; jobgroup marketing nie uprawnia do kopiowania postów/ofert | PARTIAL | DELTA_REQUIRED | CP01 | src/server/app.ts: CV/package/billing; effectiveWageApi.ts; publicJobIngestionService.ts; extendedApp.ts; baseline 90/92 tests |
| C065 | Arytmetyka daje447.03; prezentować około450zł przy tych hipotetycznych danych | EXISTS | ALREADY_CLOSED | CP09 | effectiveWage.ts rejected quotient; no versioned tax engine; imported salary grossNet mixes bases |
| C066 | Zachować intel z datą i etykietą źródła; ceny nie są WTP Faro | TEST FIRST | SPEC_BLOCKED | CP12 | analytics_events consent gated; no marketplace progress cohort, no operational or user research evidence |
| C067 | Testować układ i zrozumienie; nie łamać NO CV/salary/privacy w live A/B | PARTIAL | DELTA_REQUIRED | CP08 | public/index.html appView, src/client/app.ts DOM/hash navigation; public/styles.css; sw.js broad cache; playwright + axe |
| C068 | Osobny gate wieku/umów/dostawcy; nie wprowadzać po cichu18+ całego Faro | LEGAL REVIEW | SPEC_BLOCKED | CP11 | auth.ts scrypt, HttpOnly session, origin checks; files.ts scanner; export/delete; SQLite migrations; Render free ephemeral disk |
| C069 | Pauza nieaktualnej oferty i sprawa moderacyjna; reputacja nie zmienia skillmatch | MISSING | DELTA_REQUIRED | CP07 | no moderation case, reconfirmation or appeal schema in migrations; no trust worker |
| C070 | Oddziel entitlements i ranking także pośrednio: cache,tie-break,featured,lepszy dostęp | PARTIAL | DELTA_REQUIRED | CP05 | decisionEngine.ts aggregate scores + explanations; jobSearch.ts salary filters; no WILL_TEACH |
| C071 | MVP proces i jawność; economics,wallet,assessment etapami bez usuwania z wizji | MISSING | DELTA_REQUIRED | CP12 | analytics_events consent gated; no marketplace progress cohort, no operational or user research evidence |
| K001 | KRAZ: pisemna kwalifikacja i realizacja wymaganych obowiązków | LEGAL REVIEW | SPEC_BLOCKED | CP11 | auth.ts scrypt, HttpOnly session, origin checks; files.ts scanner; export/delete; SQLite migrations; Render free ephemeral disk |
| K002 | Free-first obu stron i brak candidate checkout | REBUILD | DELTA_REQUIRED | CP01 | src/server/app.ts: CV/package/billing; effectiveWageApi.ts; publicJobIngestionService.ts; extendedApp.ts; baseline 90/92 tests |
| K003 | AI intended purpose i klasyfikacja każdego modułu | LEGAL REVIEW | SPEC_BLOCKED | CP11 | auth.ts scrypt, HttpOnly session, origin checks; files.ts scanner; export/delete; SQLite migrations; Render free ephemeral disk |
| K004 | DPIA, art6/art22 i mapa ról administratorów | LEGAL REVIEW | SPEC_BLOCKED | CP11 | auth.ts scrypt, HttpOnly session, origin checks; files.ts scanner; export/delete; SQLite migrations; Render free ephemeral disk |
| K005 | Konstytucja, rejestr decyzji i kontrola superseded | MISSING | DELTA_REQUIRED | CP01 | src/server/app.ts: CV/package/billing; effectiveWageApi.ts; publicJobIngestionService.ts; extendedApp.ts; baseline 90/92 tests |
| K006 | Wywiady z kandydatami i firmami z wielu sytuacji | TEST FIRST | SPEC_BLOCKED | CP12 | analytics_events consent gated; no marketplace progress cohort, no operational or user research evidence |
| K007 | Prototyp NO-CV i test dokładnej projekcji | TEST FIRST | SPEC_BLOCKED | CP08 | public/index.html appView, src/client/app.ts DOM/hash navigation; public/styles.css; sw.js broad cache; playwright + axe |
| K008 | Founder Employer Program na realne wakaty | TEST FIRST | SPEC_BLOCKED | CP12 | analytics_events consent gated; no marketplace progress cohort, no operational or user research evidence |
| K009 | Trwałość danych i restore | PARTIAL | DELTA_REQUIRED | CP11 | auth.ts scrypt, HttpOnly session, origin checks; files.ts scanner; export/delete; SQLite migrations; Render free ephemeral disk |
| K010 | Finalny runtime image | PARTIAL | DELTA_REQUIRED | CP11 | auth.ts scrypt, HttpOnly session, origin checks; files.ts scanner; export/delete; SQLite migrations; Render free ephemeral disk |
| K011 | Zawiesić niedopuszczone fetch capabilities | MISSING | DELTA_REQUIRED | CP01 | src/server/app.ts: CV/package/billing; effectiveWageApi.ts; publicJobIngestionService.ts; extendedApp.ts; baseline 90/92 tests |
| K012 | Naprawić czerwony CI importerów | PARTIAL | DELTA_REQUIRED | CP01 | src/server/app.ts: CV/package/billing; effectiveWageApi.ts; publicJobIngestionService.ts; extendedApp.ts; baseline 90/92 tests |
| K013 | Centralna polityka egress | PARTIAL | DELTA_REQUIRED | CP01 | src/server/app.ts: CV/package/billing; effectiveWageApi.ts; publicJobIngestionService.ts; extendedApp.ts; baseline 90/92 tests |
| K014 | Bezpieczne uploady | PARTIAL | DELTA_REQUIRED | CP11 | auth.ts scrypt, HttpOnly session, origin checks; files.ts scanner; export/delete; SQLite migrations; Render free ephemeral disk |
| K015 | Redakcja logów i błędów | PARTIAL | DELTA_REQUIRED | CP01 | src/server/app.ts: CV/package/billing; effectiveWageApi.ts; publicJobIngestionService.ts; extendedApp.ts; baseline 90/92 tests |
| K016 | PostgreSQL i model migracji | MISSING | DELTA_REQUIRED | CP11 | auth.ts scrypt, HttpOnly session, origin checks; files.ts scanner; export/delete; SQLite migrations; Render free ephemeral disk |
| K017 | Granice modularnego monolitu | PARTIAL | DELTA_REQUIRED | CP01 | src/server/app.ts: CV/package/billing; effectiveWageApi.ts; publicJobIngestionService.ts; extendedApp.ts; baseline 90/92 tests |
| K018 | Membership/RBAC i tenant isolation | MISSING | DELTA_REQUIRED | CP02 | users role USER/ADMIN, no organizations in migrations/0001–0019; store.ts returns full private user only |
| K019 | MFA, recovery i revoke | PARTIAL | DELTA_REQUIRED | CP02 | users role USER/ADMIN, no organizations in migrations/0001–0019; store.ts returns full private user only |
| K020 | Outbox i idempotentny worker | PARTIAL | DELTA_REQUIRED | CP06 | statusTransitions.ts SAVED/APPLIED/CONTACTED/INTERVIEW/OFFER/CLOSED; notificationService.ts user-scoped dedupe, no outbox or process clocks |
| K021 | Regulaminy, DPA i publikacja firmy | LEGAL REVIEW | SPEC_BLOCKED | CP11 | auth.ts scrypt, HttpOnly session, origin checks; files.ts scanner; export/delete; SQLite migrations; Render free ephemeral disk |
| K022 | Czteroczęściowy profil możliwości | PARTIAL | DELTA_REQUIRED | CP03 | careerTruth.ts confirmed/inferred; ontology.ts curated aliases; career_experiences employer/title; no proposal/claim versions |
| K023 | ESCO foundation i polskie aliasy z rights manifest | PARTIAL | DELTA_REQUIRED | CP03 | careerTruth.ts confirmed/inferred; ontology.ts curated aliases; career_experiences employer/title; no proposal/claim versions |
| K024 | Snapshot i serwerowa employer projection | MISSING | DELTA_REQUIRED | CP02 | users role USER/ADMIN, no organizations in migrations/0001–0019; store.ts returns full private user only |
| K025 | Portal organizacji i zaproszenia | MISSING | DELTA_REQUIRED | CP02 | users role USER/ADMIN, no organizations in migrations/0001–0019; store.ts returns full private user only |
| K026 | Weryfikacja firmy i first-offer review | MISSING | DELTA_REQUIRED | CP02 | users role USER/ADMIN, no organizations in migrations/0001–0019; store.ts returns full private user only |
| K027 | Kreator natywnej oferty MUST/NICE/WILL_TEACH | MISSING | DELTA_REQUIRED | CP04 | jobs are user-owned imported text; no employer native offers or immutable versions (0001_init.sql) |
| K028 | Typed salary options i walidacja publikacji | MISSING | DELTA_REQUIRED | CP04 | jobs are user-owned imported text; no employer native offers or immutable versions (0001_init.sql) |
| K029 | Zweryfikować stare błędy scoringu i odłączyć legacy person score | PARTIAL | DELTA_REQUIRED | CP01 | src/server/app.ts: CV/package/billing; effectiveWageApi.ts; publicJobIngestionService.ts; extendedApp.ts; baseline 90/92 tests |
| K030 | Explainable matching bez person score | PARTIAL | DELTA_REQUIRED | CP05 | decisionEngine.ts aggregate scores + explanations; jobSearch.ts salary filters; no WILL_TEACH |
| K031 | Ranking independence contract i testy metamorfizmu | PARTIAL | DELTA_REQUIRED | CP01 | src/server/app.ts: CV/package/billing; effectiveWageApi.ts; publicJobIngestionService.ts; extendedApp.ts; baseline 90/92 tests |
| K032 | Product shell obu ról | PARTIAL | DELTA_REQUIRED | CP08 | public/index.html appView, src/client/app.ts DOM/hash navigation; public/styles.css; sw.js broad cache; playwright + axe |
| K033 | Interest i state machine | MISSING | DELTA_REQUIRED | CP06 | statusTransitions.ts SAVED/APPLIED/CONTACTED/INTERVIEW/OFFER/CLOSED; notificationService.ts user-scoped dedupe, no outbox or process clocks |
| K034 | Structured rejection i konkretny requirement | MISSING | DELTA_REQUIRED | CP06 | statusTransitions.ts SAVED/APPLIED/CONTACTED/INTERVIEW/OFFER/CLOSED; notificationService.ts user-scoped dedupe, no outbox or process clocks |
| K035 | Powiadomienia transakcyjne | PARTIAL | DELTA_REQUIRED | CP06 | statusTransitions.ts SAVED/APPLIED/CONTACTED/INTERVIEW/OFFER/CLOSED; notificationService.ts user-scoped dedupe, no outbox or process clocks |
| K036 | Dzisiaj / Action Bar | PARTIAL | DELTA_REQUIRED | CP06 | statusTransitions.ts SAVED/APPLIED/CONTACTED/INTERVIEW/OFFER/CLOSED; notificationService.ts user-scoped dedupe, no outbox or process clocks |
| K037 | Ręczna dostępność, propozycja i potwierdzenie rozmowy | MISSING | DELTA_REQUIRED | CP06 | statusTransitions.ts SAVED/APPLIED/CONTACTED/INTERVIEW/OFFER/CLOSED; notificationService.ts user-scoped dedupe, no outbox or process clocks |
| K038 | Report flow i moderation cases | MISSING | DELTA_REQUIRED | CP07 | no moderation case, reconfirmation or appeal schema in migrations; no trust worker |
| K039 | Deletion/export z pochodnymi | PARTIAL | DELTA_REQUIRED | CP11 | auth.ts scrypt, HttpOnly session, origin checks; files.ts scanner; export/delete; SQLite migrations; Render free ephemeral disk |
| K040 | Dwa zegary, capacity i przypomnienia | MISSING | DELTA_REQUIRED | CP06 | statusTransitions.ts SAVED/APPLIED/CONTACTED/INTERVIEW/OFFER/CLOSED; notificationService.ts user-scoped dedupe, no outbox or process clocks |
| K041 | Jawne metryki rzetelności bez zbiorczego score | MISSING | DELTA_REQUIRED | CP07 | no moderation case, reconfirmation or appeal schema in migrations; no trust worker |
| K042 | No-show claims i appeals | MISSING | DELTA_REQUIRED | CP07 | no moderation case, reconfirmation or appeal schema in migrations; no trust worker |
| K043 | Marketplace metrics i NSM quality gates | MISSING | DELTA_REQUIRED | CP12 | analytics_events consent gated; no marketplace progress cohort, no operational or user research evidence |
| K044 | Bezpieczna beta procesu przed nationwide public launch | TEST FIRST | SPEC_BLOCKED | CP12 | analytics_events consent gated; no marketplace progress cohort, no operational or user research evidence |
| K045 | Assessment Definition draft/review/approved version | MISSING | DELTA_REQUIRED | CP10 | no definitions/attempts/rubrics in schema; existing interviewPack is preparation only |
| K046 | Walidacja pierwszego typu assessmentu | TEST FIRST | SPEC_BLOCKED | CP10 | no definitions/attempts/rubrics in schema; existing interviewPack is preparation only |
| K047 | Timer serwerowy, autosave, awarie i podstawowa dostępność | MISSING | DELTA_REQUIRED | CP10 | no definitions/attempts/rubrics in schema; existing interviewPack is preparation only |
| K048 | Objective/manual grading i lokalne zestawienie wyników | MISSING | DELTA_REQUIRED | CP10 | no definitions/attempts/rubrics in schema; existing interviewPack is preparation only |
| K049 | AI gateway jako generator propozycji i draftów | PARTIAL | DELTA_REQUIRED | CP03 | careerTruth.ts confirmed/inferred; ontology.ts curated aliases; career_experiences employer/title; no proposal/claim versions |
| K050 | AI-assisted grading shadow evaluation | TEST FIRST | SPEC_BLOCKED | CP10 | no definitions/attempts/rubrics in schema; existing interviewPack is preparation only |
| K051 | Fairness i human oversight gate | LEGAL REVIEW | SPEC_BLOCKED | CP10 | no definitions/attempts/rubrics in schema; existing interviewPack is preparation only |
| K052 | Anty-darmowa praca i jasny czas per assessment | MISSING | DELTA_REQUIRED | CP10 | no definitions/attempts/rubrics in schema; existing interviewPack is preparation only |
| K053 | Późniejsza walidacja WTP pracodawców | TEST FIRST | SPEC_BLOCKED | CP12 | analytics_events consent gated; no marketplace progress cohort, no operational or user research evidence |
| K054 | Employer billing/entitlements narzędzi | DEFER | SPEC_BLOCKED | CP12 | analytics_events consent gated; no marketplace progress cohort, no operational or user research evidence |
| K055 | Dwie ścieżki marketingowe z inkluzywnym copy | TEST FIRST | SPEC_BLOCKED | CP12 | analytics_events consent gated; no marketplace progress cohort, no operational or user research evidence |
| K056 | SEO z rzeczywistą wartością i prywatnym profilem | DEFER | SPEC_BLOCKED | CP12 | analytics_events consent gated; no marketplace progress cohort, no operational or user research evidence |
| K057 | Facebook job groups i segmented nationwide campaigns | TEST FIRST | SPEC_BLOCKED | CP12 | analytics_events consent gated; no marketplace progress cohort, no operational or user research evidence |
| K058 | Employer acquisition i jakość wakatów | TEST FIRST | SPEC_BLOCKED | CP12 | analytics_events consent gated; no marketplace progress cohort, no operational or user research evidence |
| K059 | Referral bez boost i danych znajomych | DEFER | SPEC_BLOCKED | CP12 | analytics_events consent gated; no marketplace progress cohort, no operational or user research evidence |
| K060 | Zgodny język marki i semantyczne tokens | PARTIAL | DELTA_REQUIRED | CP08 | public/index.html appView, src/client/app.ts DOM/hash navigation; public/styles.css; sw.js broad cache; playwright + axe |
| K061 | PWA cache i asset update | PARTIAL | DELTA_REQUIRED | CP08 | public/index.html appView, src/client/app.ts DOM/hash navigation; public/styles.css; sw.js broad cache; playwright + axe |
| K062 | WCAG krytycznych ścieżek | PARTIAL | DELTA_REQUIRED | CP08 | public/index.html appView, src/client/app.ts DOM/hash navigation; public/styles.css; sw.js broad cache; playwright + axe |
| K063 | Performance i obserwowalność | PARTIAL | DELTA_REQUIRED | CP11 | auth.ts scrypt, HttpOnly session, origin checks; files.ts scanner; export/delete; SQLite migrations; Render free ephemeral disk |
| K064 | Supply chain i release gates | PARTIAL | DELTA_REQUIRED | CP01 | src/server/app.ts: CV/package/billing; effectiveWageApi.ts; publicJobIngestionService.ts; extendedApp.ts; baseline 90/92 tests |
| K065 | Incident response i dyżury T&S | TEST FIRST | SPEC_BLOCKED | CP11 | auth.ts scrypt, HttpOnly session, origin checks; files.ts scanner; export/delete; SQLite migrations; Render free ephemeral disk |
| K066 | Source Rights Registry v2 | PARTIAL | DELTA_REQUIRED | CP01 | src/server/app.ts: CV/package/billing; effectiveWageApi.ts; publicJobIngestionService.ts; extendedApp.ts; baseline 90/92 tests |
| K067 | Integracja źródła/ATS po licencji | DEFER | SPEC_BLOCKED | CP12 | analytics_events consent gated; no marketplace progress cohort, no operational or user research evidence |
| K068 | Integracje kalendarza po minimalnym schedulerze | DEFER | SPEC_BLOCKED | CP12 | analytics_events consent gated; no marketplace progress cohort, no operational or user research evidence |
| K069 | Ocena potrzeby Windows shell | TEST FIRST | SPEC_BLOCKED | CP12 | analytics_events consent gated; no marketplace progress cohort, no operational or user research evidence |
| K070 | Ocena potrzeby native mobile | TEST FIRST | SPEC_BLOCKED | CP12 | analytics_events consent gated; no marketplace progress cohort, no operational or user research evidence |
| K071 | Standard Faro i portable verified skills wallet | DEFER | SPEC_BLOCKED | CP10 | no definitions/attempts/rubrics in schema; existing interviewPack is preparation only |
| K072 | Regularny review rynku i jakości dowodów | TEST FIRST | SPEC_BLOCKED | CP12 | analytics_events consent gated; no marketplace progress cohort, no operational or user research evidence |
| K073 | Prywatne obserwowanie i alerty | MISSING | DELTA_REQUIRED | CP06 | statusTransitions.ts SAVED/APPLIED/CONTACTED/INTERVIEW/OFFER/CLOSED; notificationService.ts user-scoped dedupe, no outbox or process clocks |
| K074 | Konkretny diff od zgłoszenia | MISSING | DELTA_REQUIRED | CP04 | jobs are user-owned imported text; no employer native offers or immutable versions (0001_init.sql) |
| K075 | JobEconomics model i ręczny fallback | PARTIAL | DELTA_REQUIRED | CP09 | effectiveWage.ts rejected quotient; no versioned tax engine; imported salary grossNet mixes bases |
| K076 | Versioned netto rules engine | DEFER | SPEC_BLOCKED | CP09 | effectiveWage.ts rejected quotient; no versioned tax engine; imported salary grossNet mixes bases |
| K077 | Routing fuel tariffs rail adapters | DEFER | SPEC_BLOCKED | CP09 | effectiveWage.ts rejected quotient; no versioned tax engine; imported salary grossNet mixes bases |
| K078 | Porównywarka wpływu pracy na życie | PARTIAL | DELTA_REQUIRED | CP09 | effectiveWage.ts rejected quotient; no versioned tax engine; imported salary grossNet mixes bases |
| K079 | Grant telefonu po zaakceptowaniu etapu | MISSING | DELTA_REQUIRED | CP02 | users role USER/ADMIN, no organizations in migrations/0001–0019; store.ts returns full private user only |
| K080 | Activity decomposition z zatwierdzaniem | MISSING | DELTA_REQUIRED | CP03 | careerTruth.ts confirmed/inferred; ontology.ts curated aliases; career_experiences employer/title; no proposal/claim versions |
| K081 | Periodic still-recruiting confirmation | MISSING | DELTA_REQUIRED | CP04 | jobs are user-owned imported text; no employer native offers or immutable versions (0001_init.sql) |
| K082 | Ghost-job pattern review | MISSING | DELTA_REQUIRED | CP07 | no moderation case, reconfirmation or appeal schema in migrations; no trust worker |
| K083 | Małoletni, pierwsza praca i warunki dostawcy | LEGAL REVIEW | SPEC_BLOCKED | CP11 | auth.ts scrypt, HttpOnly session, origin checks; files.ts scanner; export/delete; SQLite migrations; Render free ephemeral disk |
| K084 | Canonical invariants regression suite | PARTIAL | DELTA_REQUIRED | CP01 | src/server/app.ts: CV/package/billing; effectiveWageApi.ts; publicJobIngestionService.ts; extendedApp.ts; baseline 90/92 tests |
| K085 | Późniejszy zakres ujawnienia tożsamości | LEGAL REVIEW | SPEC_BLOCKED | CP02 | users role USER/ADMIN, no organizations in migrations/0001–0019; store.ts returns full private user only |
| K086 | Evidence-to-claim marketing gate | TEST FIRST | SPEC_BLOCKED | CP12 | analytics_events consent gated; no marketplace progress cohort, no operational or user research evidence |

## Backlog acceptance and dependencies

### K001 — KRAZ: pisemna kwalifikacja i realizacja wymaganych obowiązków
Priority P0; owner Legal/Founder; checkpoint CP11; dependencies: —.
Acceptance: Memo per usługa na ustawie2025/620, decyzja o wpisie i wykonane obowiązki przed udostępnieniem właściwej usługi.

### K002 — Free-first obu stron i brak candidate checkout
Priority P0; owner Legal/Product; checkpoint CP01; dependencies: K001.
Acceptance: Regulamin i wszystkie ekrany startowe mówią Faro jest darmowe; kandydat i firma bez opłat; brak candidate subscription w scope.

### K003 — AI intended purpose i klasyfikacja każdego modułu
Priority P0; owner Legal/AI; checkpoint CP11; dependencies: —.
Acceptance: Zmapowane role, ranking, evaluation, draft generation, harmonogram obowiązków i warunki GO; nie ogólny disclaimer.

### K004 — DPIA, art6/art22 i mapa ról administratorów
Priority P0; owner Privacy/Legal; checkpoint CP11; dependencies: K001,K003.
Acceptance: Podstawy per cel, ocena realnego nadzoru, dane szczególne oddzielnie, zatwierdzona retencja i prawa osoby.

### K005 — Konstytucja, rejestr decyzji i kontrola superseded
Priority P0; owner Founder/Product; checkpoint CP01; dependencies: —.
Acceptance: Jedna aktywna wersja canonical; zakazy przeniesione do testowalnych kontraktów; 72stare zadania rozliczone.

### K006 — Wywiady z kandydatami i firmami z wielu sytuacji
Priority P0; owner Research/Founder; checkpoint CP12; dependencies: K005.
Acceptance: Próba obejmuje pierwszą pracę, brak doświadczenia, przerwy i zmiany; bez z góry regionalnego produktu; zapis kontrdowodów.

### K007 — Prototyp NO-CV i test dokładnej projekcji
Priority P0; owner UX/Research; checkpoint CP08; dependencies: K005,K006.
Acceptance: Uczestnicy rozumieją skill source, WILL_TEACH, prywatność, watch vs interest oraz dwa zegary.

### K008 — Founder Employer Program na realne wakaty
Priority P4; owner Founder/Sales; checkpoint CP12; dependencies: K001,K005.
Acceptance: Zweryfikowane potrzeby i zgoda na zasady; nationwide availability, bez obietnicy płatnej widoczności; żadnego automatycznego outreach.

### K009 — Trwałość danych i restore
Priority P0; owner Ops; checkpoint CP11; dependencies: —.
Acceptance: Restart/redeploy zachowuje dane, restore sprawdzony

### K010 — Finalny runtime image
Priority P0; owner DevOps; checkpoint CP11; dependencies: K011.
Acceptance: Zbudowany końcowy obraz uruchamia health i scenariusz bez lokalnych modułów

### K011 — Zawiesić niedopuszczone fetch capabilities
Priority P0; owner SourceOps/Backend; checkpoint CP01; dependencies: —.
Acceptance: Deny bez policy, brak maskowania i fallback po odmowie

### K012 — Naprawić czerwony CI importerów
Priority P0; owner Backend/QA; checkpoint CP01; dependencies: K011.
Acceptance: Nowy pinned run zielony, błędy OLX/LinkedIn rozstrzygnięte bez wyłączania testu

### K013 — Centralna polityka egress
Priority P0; owner Security/Backend; checkpoint CP01; dependencies: K011.
Acceptance: Każdy redirect i finalny cel ocenione, limity czasu i bajtów

### K014 — Bezpieczne uploady
Priority P0; owner Security/Ops; checkpoint CP11; dependencies: K009.
Acceptance: Kwarantanna, limity, skan, prywatne pobranie i cleanup

### K015 — Redakcja logów i błędów
Priority P0; owner Backend/Privacy; checkpoint CP01; dependencies: —.
Acceptance: PII i raw odpowiedzi nie trafiają do logów i analytics

### K016 — PostgreSQL i model migracji
Priority P0; owner Backend/Ops; checkpoint CP11; dependencies: K004,K009.
Acceptance: Import próbny zgodny, FK działają, rollback opisany

### K017 — Granice modularnego monolitu
Priority P0; owner Architecture; checkpoint CP01; dependencies: K005.
Acceptance: Moduły mają API i reguły zależności, brak billing w matching

### K018 — Membership/RBAC i tenant isolation
Priority P0; owner Backend/Security; checkpoint CP02; dependencies: K016,K017.
Acceptance: Dwie firmy nie odczytują cudzych zasobów, cofnięcie działa natychmiast

### K019 — MFA, recovery i revoke
Priority P0; owner Identity; checkpoint CP02; dependencies: K018.
Acceptance: Step-up operacji krytycznych, recovery i unieważnienie sesji

### K020 — Outbox i idempotentny worker
Priority P0; owner Backend/Ops; checkpoint CP06; dependencies: K016,K017.
Acceptance: Retry nie dubluje efektów, dead-letter ma obsługę

### K021 — Regulaminy, DPA i publikacja firmy
Priority P0; owner Legal; checkpoint CP11; dependencies: K001,K004.
Acceptance: Dokumenty odpowiadają ekranom, zakres licencji i praw jasny

### K022 — Czteroczęściowy profil możliwości
Priority P1; owner Product/Frontend; checkpoint CP03; dependencies: K018,K023.
Acceptance: Potrafię/rozwijam/chcę/doświadczenie; brak obowiązku posiadania historii lub określonej liczby skills; descriptive levels.

### K023 — ESCO foundation i polskie aliasy z rights manifest
Priority P0; owner Domain/Research; checkpoint CP03; dependencies: K005.
Acceptance: Stabilne URI, wersje, licencje per dataset; brak tworzenia ontologii od zera; INFO/ZRK bez importu przed prawami.

### K024 — Snapshot i serwerowa employer projection
Priority P1; owner Backend/Privacy; checkpoint CP02; dependencies: K018,K022.
Acceptance: Bez CV, nazwiska/photo/age/phone pierwszego etapu; bez poprzednich firm/tytułów zawsze; preview to ten sam DTO.

### K025 — Portal organizacji i zaproszenia
Priority P2; owner Fullstack; checkpoint CP02; dependencies: K018,K019.
Acceptance: Role, invite TTL, ostatni owner i backup obsłużone

### K026 — Weryfikacja firmy i first-offer review
Priority P2; owner T&S/Backend; checkpoint CP02; dependencies: K021,K025.
Acceptance: Sprawa, dowody, decyzja i manualna ścieżka JDG

### K027 — Kreator natywnej oferty MUST/NICE/WILL_TEACH
Priority P1; owner Product/Frontend; checkpoint CP04; dependencies: K025,K026,K028.
Acceptance: Jawne salary, godziny, zmiany, weekendy, etapy, assessment, dwa zegary; employer approves AI draft.

### K028 — Typed salary options i walidacja publikacji
Priority P1; owner Domain/Legal; checkpoint CP04; dependencies: K001.
Acceptance: Podstawa kwoty osobno od umowy; gwarancja/zmienne/FTE/godziny; brak publikacji bez porównywalnej jawnej płacy.

### K029 — Zweryfikować stare błędy scoringu i odłączyć legacy person score
Priority P0; owner Domain/QA; checkpoint CP01; dependencies: K005.
Acceptance: Aktualny reprodukowalny test poprawności w autoryzowanym środowisku; legacy wynik nie zasila canonical UI; bez nowego magicznego %.

### K030 — Explainable matching bez person score
Priority P1; owner Domain/UX; checkpoint CP05; dependencies: K022,K027.
Acceptance: Status perrequirement, unknown oddzielnie, brak blokady WILL_TEACH, hardconstraint jawny; explanation z danych nie z opiniiAI.

### K031 — Ranking independence contract i testy metamorfizmu
Priority P0; owner Architecture/QA; checkpoint CP01; dependencies: K017.
Acceptance: Zmiana wyłącznie billing nie zmienia inputów, cache, kolejności, dostępności ani jakości match; brak paid exposure.

### K032 — Product shell obu ról
Priority P2; owner UX/Frontend; checkpoint CP08; dependencies: K007,K025.
Acceptance: Split-view i mobile single-pane, focus i back zachowane

### K033 — Interest i state machine
Priority P2; owner Backend/Frontend; checkpoint CP06; dependencies: K020,K024,K027.
Acceptance: Przejścia, terminalne stany, version conflict i duplikaty kontrolowane

### K034 — Structured rejection i konkretny requirement
Priority P2; owner Product/Backend; checkpoint CP06; dependencies: K033,K027.
Acceptance: Generyczny lepszy kandydat blokowany; requirementId i truthfulness; cancelled/filled nie udają luki umiejętności.

### K035 — Powiadomienia transakcyjne
Priority P2; owner Backend/UX; checkpoint CP06; dependencies: K020,K033.
Acceptance: Inbox spójny, retry, preferencje, brak PII w push

### K036 — Dzisiaj / Action Bar
Priority P2; owner UX/Frontend; checkpoint CP06; dependencies: K032,K033,K035.
Acceptance: Priorytety z danych, jasny owner i due date

### K037 — Ręczna dostępność, propozycja i potwierdzenie rozmowy
Priority P2; owner Fullstack; checkpoint CP06; dependencies: K033,K035.
Acceptance: Slot-only, UTC/IANA, cancel/reschedule, atomowa rezerwacja, ICS; brak pełnego kalendarza i auto no-show.

### K038 — Report flow i moderation cases
Priority P2; owner T&S/Fullstack; checkpoint CP07; dependencies: K026,K033.
Acceptance: Zgłoszenie, hold, uzasadnienie, appeal i obsada

### K039 — Deletion/export z pochodnymi
Priority P0; owner Privacy/Backend; checkpoint CP11; dependencies: K004,K016,K024.
Acceptance: Job trwały, tombstone działa po restore, eksport scoped

### K040 — Dwa zegary, capacity i przypomnienia
Priority P2; owner Product/Backend; checkpoint CP06; dependencies: K033,K035.
Acceptance: Autoack nie kończyresponseclock; nowy termin nie usuwa spóźnienia; zastępstwo i pauza nowych interest.

### K041 — Jawne metryki rzetelności bez zbiorczego score
Priority P2; owner Analytics/UX; checkpoint CP07; dependencies: K040.
Acceptance: n,okno,mianownik,unanswered obok mediany; nowa firma=mało danych; brak mnożników100/50/25.

### K042 — No-show claims i appeals
Priority P2; owner T&S/Product; checkpoint CP07; dependencies: K037,K038.
Acceptance: Claim nie karze, dispute wyłącza skutki, korekta odwraca projekcje

### K043 — Marketplace metrics i NSM quality gates
Priority P2; owner Data/Product; checkpoint CP12; dependencies: K020,K033.
Acceptance: Dedup pary na tydzień, realny obustronny postęp, odmowy osobno, cohorthhealth i noPII analytics.

### K044 — Bezpieczna beta procesu przed nationwide public launch
Priority P2; owner Research/Founder; checkpoint CP12; dependencies: K001,K004,K038,K039.
Acceptance: Beta testuje zakres bez zmiany nationwide publicavailability; jakościowe kryteria GO i capacity zamiast fikcyjnych wyników.

### K045 — Assessment Definition draft/review/approved version
Priority P3; owner Domain/Assessment; checkpoint CP10; dependencies: K003,K004,K027.
Acceptance: Typ/liczba/czas/termin/rubryka przed Start; AI nie publikuje; brak pól internetAllowed/aiAllowed.

### K046 — Walidacja pierwszego typu assessmentu
Priority P3; owner Assessment/Research; checkpoint CP10; dependencies: K045.
Acceptance: Ekspertowa mapa konstruktu, poprawność klucza, testy UI i plan fairness; mała próba nie udaje norm populacyjnych.

### K047 — Timer serwerowy, autosave, awarie i podstawowa dostępność
Priority P3; owner Fullstack; checkpoint CP10; dependencies: K045,K062.
Acceptance: Start jawny/idempotentny; deadline oddzielny; reconnect bez resetu; dostępna ścieżka pomocy, bez specjalnego modułu accommodations.

### K048 — Objective/manual grading i lokalne zestawienie wyników
Priority P3; owner Assessment/Backend; checkpoint CP10; dependencies: K003,K004,K046,K047.
Acceptance: Porównywalna rubryka/wersja, breakdown, unknown≠0, review/korekta; wynik nie uruchamia auto-hire/reject.

### K049 — AI gateway jako generator propozycji i draftów
Priority P1; owner AI/Backend; checkpoint CP03; dependencies: K003,K004.
Acceptance: Schema+semantic validation; brak narzędzi publikacji/odrzucania; bezpieczny manual fallback; provider terms age/privacy checked.

### K050 — AI-assisted grading shadow evaluation
Priority P3; owner AI/Research; checkpoint CP10; dependencies: K048,K049.
Acceptance: Najpierw porównanie do ocen ekspertów; realna możliwość korekty; brak automatycznego wpływu przed zatwierdzonym gate.

### K051 — Fairness i human oversight gate
Priority P0; owner Legal/Research/QA; checkpoint CP10; dependencies: K030,K045.
Acceptance: Niedozwolone sygnały wykluczone, alternatywa manualna, appeal

### K052 — Anty-darmowa praca i jasny czas per assessment
Priority P3; owner Legal/Assessment; checkpoint CP10; dependencies: K045.
Acceptance: Zadania syntetyczne/ocenowe, zakaz komercyjnego wykorzystania, report flow; brak narzuconego limitera łącznego czasu.

### K053 — Późniejsza walidacja WTP pracodawców
Priority P5; owner Founder/Research; checkpoint CP12; dependencies: K043,K044,K048.
Acceptance: Dopiero po wykazanej wartości i decyzji o przejściu z free-first; bez sprzedaży ranking/exposure i bez ceny uznanej z góry.

### K054 — Employer billing/entitlements narzędzi
Priority P5; owner Backend/Legal; checkpoint CP12; dependencies: K053,K031.
Acceptance: Płatność tylko za zatwierdzone narzędzia; brak candidate checkout; safety/prawa/feedback bez paywall.

### K055 — Dwie ścieżki marketingowe z inkluzywnym copy
Priority P4; owner Brand/Marketing; checkpoint CP12; dependencies: K005.
Acceptance: Candidate osiem grup i B2B; Faro jest darmowe; bez gwarancji zatrudnienia i niepodpartych liczb.

### K056 — SEO z rzeczywistą wartością i prywatnym profilem
Priority P4; owner Growth/Frontend; checkpoint CP12; dependencies: K055,K027.
Acceptance: Brak pustych programmatic pages; prywatne dane noindex; aktualne oferty i weryfikacja structureddata przed publikacją.

### K057 — Facebook job groups i segmented nationwide campaigns
Priority P4; owner Growth; checkpoint CP12; dependencies: K008,K055.
Acceptance: Reguły grup/admin approvals, żadnego scrapingDM; grupa×podaż×potrzeba; brak ograniczenia produktu do miasta.

### K058 — Employer acquisition i jakość wakatów
Priority P4; owner Founder/Sales; checkpoint CP12; dependencies: K008,K026.
Acceptance: Mierzyć completeactiveoffer→response→progress; nie RFPjobboards jako founderprimary; bez nieautoryzowanych wiadomości.

### K059 — Referral bez boost i danych znajomych
Priority P2; owner Growth/Privacy; checkpoint CP12; dependencies: K044.
Acceptance: Link ofertowy, brak contact import, plan nie zmienia rankingu

### K060 — Zgodny język marki i semantyczne tokens
Priority P1; owner Brand/Frontend; checkpoint CP08; dependencies: K005.
Acceptance: Umbrella Twój nawigator, promise Wiesz co dalej; bez score pierścienia osoby; kontrast i różne stany unknown/error.

### K061 — PWA cache i asset update
Priority P0; owner Frontend; checkpoint CP08; dependencies: K032.
Acceptance: Public shell allowlist, logout cleanup, upgrade działa

### K062 — WCAG krytycznych ścieżek
Priority P0; owner UX/QA; checkpoint CP08; dependencies: K032,K033.
Acceptance: Keyboard, focus, zoom, reader, errors; bez krytycznych blokad

### K063 — Performance i obserwowalność
Priority P0; owner Ops/Frontend; checkpoint CP11; dependencies: K020,K032.
Acceptance: Budżety i p95 na ustalonym obciążeniu, alert owner

### K064 — Supply chain i release gates
Priority P0; owner DevOps/Security; checkpoint CP01; dependencies: K012.
Acceptance: Minimalne uprawnienia, skany, SBOM, branch protection

### K065 — Incident response i dyżury T&S
Priority P0; owner Ops/T&S/Legal; checkpoint CP11; dependencies: K004,K038.
Acceptance: Tabletop naruszenia i scam, kontakty i zastępstwo

### K066 — Source Rights Registry v2
Priority P0; owner SourceOps/Legal; checkpoint CP01; dependencies: K011,K021.
Acceptance: Capability-based grant, expiry i revoke egzekwowane

### K067 — Integracja źródła/ATS po licencji
Priority P2; owner Integrations; checkpoint CP12; dependencies: K044,K066.
Acceptance: Jedno uprawnione źródło, kanon, obs, update i takedown

### K068 — Integracje kalendarza po minimalnym schedulerze
Priority P2; owner Integrations/Privacy; checkpoint CP12; dependencies: K037.
Acceptance: Udostępnienie dostępności, minimalne scopes; prywatne tytuły nie trafiają do firmy; providerreview.

### K069 — Ocena potrzeby Windows shell
Priority P4; owner Frontend/Security; checkpoint CP12; dependencies: K061.
Acceptance: Dowód potrzeby i kosztu; wspólny webcore; brak trzeciego niezależnego produktu.

### K070 — Ocena potrzeby native mobile
Priority P4; owner Product/Architecture; checkpoint CP12; dependencies: K061.
Acceptance: Tylko udowodniony brak PWA i analiza kosztu/dostępności; nie warunek startu.

### K071 — Standard Faro i portable verified skills wallet
Priority P3; owner Product/Privacy; checkpoint CP10; dependencies: K046,K048,K004.
Acceptance: Zakres/wynik/data/wersja/grant; company result niecertyfikat; brak skill expiry; aplikacja możliwa bezwallet.

### K072 — Regularny review rynku i jakości dowodów
Priority P4; owner Founder/Data; checkpoint CP12; dependencies: K005.
Acceptance: Pierwotne źródła i daty; nie aktualizuje founderlock automatycznie; ceny konkurentów nie WTPFaro.

### K073 — Prywatne obserwowanie i alerty
Priority P2; owner Candidate; checkpoint CP06; dependencies: K024,K027,K035.
Acceptance: Watch nie tworzyinterest; employer nie widzi tożsamości watchers w API/analytics/eksportach.

### K074 — Konkretny diff od zgłoszenia
Priority P2; owner Offers; checkpoint CP04; dependencies: K024,K027,K033.
Acceptance: Porównuje immutable wersję przy interest do bieżącej, wysyła materialchanges, nie miesza nowego netto z edycjąfirmy.

### K075 — JobEconomics model i ręczny fallback
Priority P2; owner Economics; checkpoint CP09; dependencies: K028,K004.
Acceptance: Osobne kwoty/czas/założenia/źródła; brakEHV/LifeScore; prywatny scenariusz.

### K076 — Versioned netto rules engine
Priority P2; owner Tax/Backend; checkpoint CP09; dependencies: K075.
Acceptance: Wspierany zakresjawny, specjalistagolden cases, rulesdate; braknetto jakoofferproperty i brakB2B≈UoP.

### K077 — Routing fuel tariffs rail adapters
Priority P2; owner Data/Legal; checkpoint CP09; dependencies: K075.
Acceptance: Źródło/data/license/cachepolicy perlayer; missingtariff=null; ręcznyfallback; brakłączenia alternatywnych kosztów.

### K078 — Porównywarka wpływu pracy na życie
Priority P2; owner UX; checkpoint CP09; dependencies: K075.
Acceptance: Salarybases zgodne; warunki/process/commute osobno; brakautomatycznegozwycięzcy.

### K079 — Grant telefonu po zaakceptowaniu etapu
Priority P1; owner Privacy; checkpoint CP02; dependencies: K024,K033.
Acceptance: Employer accept nie ujawnia telefonu sam; candidate widzi zakres/grant/revoke; surname później osobnapolityka.

### K080 — Activity decomposition z zatwierdzaniem
Priority P1; owner Skills/AI; checkpoint CP03; dependencies: K022,K049.
Acceptance: Pytania o czynności; odrzucona propozycja nie fact; każdyclaim ma actor/version/confirmedAt.

### K081 — Periodic still-recruiting confirmation
Priority P2; owner Trust; checkpoint CP04; dependencies: K027,K040.
Acceptance: Brakpotwierdzenia pausujeintake; istniejąceprocesy nadalobsługiwane; repostnie resetujehistory.

### K082 — Ghost-job pattern review
Priority P2; owner Trust/Moderation; checkpoint CP07; dependencies: K038,K041,K081.
Acceptance: Sygnalizuje wzorzec, nieintencję; evergreenexceptions/manualreview/reasons/appeal.

### K083 — Małoletni, pierwsza praca i warunki dostawcy
Priority P0; owner Legal/AI; checkpoint CP11; dependencies: K001,K003,K004.
Acceptance: Jawny zakreswsparcia bez cichego18+; nieużywanie niedozwolonegoAPI, manualpath jeśli właściwa.

### K084 — Canonical invariants regression suite
Priority P0; owner QA; checkpoint CP01; dependencies: K005.
Acceptance: Testy noCV/nohistory, proposal≠claim, watchprivate, billingindependence, assessmentapproval/timer i brakwskrzeszania rejectedfeatures.

### K085 — Późniejszy zakres ujawnienia tożsamości
Priority P0; owner Product/Legal; checkpoint CP02; dependencies: K004,K024.
Acceptance: Rozstrzygnięte legalniedane na dalszych etapach; brakprzywrócenia firm/stanowisk; usercontrol.

### K086 — Evidence-to-claim marketing gate
Priority P4; owner QA/Data; checkpoint CP12; dependencies: K055.
Acceptance: Żadna niepodparta statystykaEB nie jest przedstawiana jako fakt; każda liczba ma źródło/próbę/datę.

## Acceptance invariants

| ID | Rule | Delivery proof |
|---|---|---|
| INV01 | Firma nie otrzymujeCV | CP02 DTO/API/file routes |
| INV02 | Brak historii firm/stanowisk | CP02 nested evidence allowlist |
| INV03 | Pierwszy etap ograniczony | CP02 + CP06 grants and stages |
| INV04 | PropozycjaAI nie fakt | CP03 rejected/pending proposal excluded |
| INV05 | Watch prywatny | CP06 cross-user watch/export |
| INV06 | Salarytyped | CP04 + CP09 salary basis |
| INV07 | Billingnie ranking | CP05 metamorphic ranking |
| INV08 | Draftapproval | CP10 approval/version invalidation |
| INV09 | Timerjawny | CP10 overview/start/reconnect |
| INV10 | Dwa zegary | CP06 ack/deadline policy |
| INV11 | Rejectkonkretny | CP06 rejection snapshot requirement |
| INV12 | Symetria | CP07 withdrawal/rejection neutral |
| INV13 | BrakEHV | CP01 retired route + CP09 no quotient |
| INV14 | Nationwide | CP08 no city whitelist |
| INV15 | Freefirst | CP01 no subscription checkout |
| INV16 | Retentionnieexpiry | CP03 + CP11 result retention independent of claim |

Legacy crosswalk: all 72 records retained at `source/FARO-CANONICAL/specs/legacy-backlog-crosswalk.json`; targets resolved against all 86 K IDs. Rejected historical decisions are not implementation authorization.

Execution delta2026-10-04: K041 PARTIAL — private organization owner/admin cohort report and real workspace now implemented (CP07-D); original deadline numerator/denominator, n/window/exclusions/censored unanswered/median and progress counts tested. Public reputation/low-sample policy and external validation remain LEGAL REVIEW/TEST FIRST. K082 PARTIAL — existing private cases/independent review plus these factual inputs; similarity/repost identity, evergreen exceptions and approved pattern policy remain missing. No count is a fraud verdict or automatic penalty. Baseline rows above continue to describe the audited original main.
