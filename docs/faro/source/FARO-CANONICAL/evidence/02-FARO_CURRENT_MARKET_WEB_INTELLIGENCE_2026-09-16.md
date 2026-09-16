# FARO — CURRENT MARKET & WEB INTELLIGENCE REPORT
**Polska | stan researchu: 16 września 2026 r.**

Zakres tego raportu to bieżący rynek, konkurencja, GTM, kanały dystrybucji, źródła danych, infrastruktura i ryzyka produktowe. Nie traktuję go jako Evidence Base ani opinii prawnej. Tam, gdzie nie znalazłem wystarczająco wiarygodnego potwierdzenia, oznaczam **NOT VERIFIED**.

---

# 1. Executive Summary

Najważniejszy wniosek jest taki: **Faro nie wchodzi na pusty rynek i większość jego pojedynczych mechanizmów już istnieje gdzieś na świecie.** Skills-first, blind hiring, work-sample assessments, AI matching, explainable fit, career assistants, salary transparency, candidate tracking czy automatyzacja komunikacji są już rozwijane przez różne firmy. Przewaga Faro może powstać dopiero z **integracji tych elementów w jeden polski produkt**, który zmienia logikę rekrutacji, a nie dodaje kolejną warstwę AI do CV.

Jednocześnie polski rynek jest bardzo dobry do testowania takiego modelu. Pracuj.pl podaje ponad **6 mln użytkowników miesięcznie**, OLX Ads deklaruje ok. **7 mln miesięcznie w kategorii Praca**, Praca.pl blisko **2 mln**, a GoWork ok. **3,5–4 mln**. To oznacza, że kandydatów nie trzeba najpierw „nauczyć szukać pracy online”; problemem Faro będzie **przechwycenie istniejącej intencji** i przekonanie użytkownika, że nowy sposób poszukiwania pracy daje mu więcej informacji i kontroli.

Co szczególnie istotne: pomysł reklamowania Faro **wewnątrz lub bezpośrednio wokół miejsc, w których Polacy już szukają pracy, jest wykonalny**. Pracuj.pl oficjalnie oferuje display, mailing i sponsored content; OLX ma self-service display i targetowanie kategorii/fraz; Praca.pl display, mailingi i artykuły sponsorowane; JOBS.pl mailing i newsletter; RocketJobs content, display i współprace niestandardowe; Just Join IT przyjmuje zapytania reklamowe dla serwisu contentowego; Bulldogjob sprzedaje employer branding, newsletter i kampanie; Solid.jobs otwarcie zaprasza partnerów. Nie udało się natomiast potwierdzić, że każdy z nich przyjmie reklamę **bezpośredniego konkurenta typu Faro** — to wymaga osobnego RFP.

Rynek sam dostarcza też argumentu za Faro. Dane Pracuj.pl za 2025 r. pokazują wzrost liczby aplikacji o 5% r/r i 20% w dwa lata; 127 tys. ofert skierowano do pracowników fizycznych, 14% do początkujących, a najważniejsze grupy obejmowały sprzedaż, pracę fizyczną, IT, obsługę klienta oraz finanse. Faro nie powinno więc powstać jako „kolejny portal dla specjalistów IT”.

Drugi fundamentalny wniosek: **„transparentne wynagrodzenie” przestało być wystarczającym wyróżnikiem.** Od 24 grudnia 2025 r. kandydat w Polsce ma już otrzymywać informację o oferowanym wynagrodzeniu lub przedziale najpóźniej przed rozmową, jeżeli nie została podana wcześniej. Faro musi pójść dalej: wynagrodzenie porównywalne między umowami, szacowane netto, koszt dojazdu, czas dojazdu, kwota „po koszcie pracy dla Ciebie” i historia zmian warunków.

Trzeci: **Faro powinno potraktować assessment jako część infrastruktury zaufania, a nie „test przed aplikacją”.** Rynek assessmentów jest dojrzały: TestGorilla ma ponad 350 testów, Codility, HackerRank i Harver specjalizują się w role-specific evaluation, a Vervoe idzie w real-work assessment z explainable scoring. Kopiowanie modelu „każdy kandydat robi 45 minut testów przed pierwszym kontaktem” byłoby błędem.

Czwarty: **Faro nie powinno budować ontologii kompetencji od zera.** ESCO daje europejską, wielojęzyczną klasyfikację occupations/skills i API; O*NET 31.0 jest dostępne pod CC BY 4.0; polski INFOdoradca+ ma opisy 1000 zawodów, z zadaniami i wymaganymi kompetencjami, oraz odniesienia do ESCO.

Piąty: **najlepszym rozwiązaniem cold-startu Faro nie jest regionalne ograniczenie produktu.** Faro powinno publicznie działać od startu w całej Polsce, ale pozyskiwać płynność w „komórkach” **zawód × lokalizacja/tryb × typ pracy**, prowadząc różne kampanie i zdobywając grupy pracodawców tam, gdzie może szybko osiągnąć realne dopasowania. Sam produkt pozostaje nationwide.

Największa szansa produktowa, której nie widzę dziś jako dobrze połączonego standardu w Polsce, to:

> **profil kompetencji + dowody kompetencji + transferowalność + assessment + transparentna oferta + realny koszt pracy dla kandydata + kontrolowane ujawnianie tożsamości + widoczny proces + odpowiedzialność pracodawcy + konkretna rekomendacja „co dalej”.**

To jest dużo silniejsze niż hasło „AI znajduje pracę”.

---

## Rejestr najważniejszych ustaleń

| FINDING | SOURCE / DATE | WHY IT MATTERS TO FARO | ACTION | CONFIDENCE |
|---|---|---|---|---|
| Pracuj.pl ma oficjalny inventory reklamowy: display, mailing, sponsored content; >6 mln użytkowników/mies. | Pracuj.pl, dane 2025, strona aktualna 2026 | Można kupować uwagę w samym kontekście poszukiwania pracy | Poprosić o media kit + zgodę na reklamę konkurencyjnej platformy | High |
| OLX Ads deklaruje 7 mln miesięcznie dla kategorii Praca i targetowanie kategorii/fraz | OLX Ads, 2026 | Bardzo silny kanał blue collar/general market | Test kategorii Praca + konkretne frazy, po akceptacji Faro jako reklamodawcy | High |
| Transparentność płac jest już częściowo obowiązkiem prawnym | PIP / Dz.U. 2025 poz. 807 | Same widełki nie wystarczą jako USP | Budować „total job economics” | High |
| Annex III AI stosowany do zatrudnienia wejdzie w reżim high-risk od 2.12.2027 | KE, stan 2026 | Matching/ranking trzeba od początku projektować audytowalnie | AI governance już w MVP | High |
| Działalność pośrednictwa pracy wymaga KRAZ | WUP/MRPiPS | Model Faro może wejść w zakres regulowany zależnie od finalnej usługi | Formalna analiza kwalifikacji Faro przed launch | High |
| ESCO można używać jako foundation skills graph | Komisja Europejska, v1.2.1 | Nie ma sensu tworzyć własnego słownika kompetencji od zera | ESCO-first skill graph | High |
| O*NET 31.0 jest CC BY 4.0 | O*NET, VIII 2026 | Można wzbogacić ESCO o activities/interests/abilities | Warstwa enrichment, nie główna polska taxonomy | High |
| Google Routes nie gwarantuje taryfy transportu dla każdej podróży | Google, 2026 | Jedno API nie rozwiąże kalkulatora dojazdu w Polsce | Routing + osobna warstwa taryf | High |
| Google i TikTok nie mają w Polsce tych samych HEC restrictions co USA/Canada, ale wrażliwe dane nadal są ograniczane | Google/TikTok, 2026 | Nie trzeba rezygnować z performance marketingu, lecz targetowanie musi być fair | Context/intention first | Medium-High |
| TikTok mocno ogranicza personalizację reklam dla <18 w EEA | TikTok, VII–VIII 2026 | Kampanie „pierwsza praca” dla nieletnich wymagają osobnej konstrukcji | Default campaign 18+ | High |
| Career assistants już istnieją za granicą | Jobright/Teal/Huntr | „AI career assistant” sam w sobie nie jest moat | Faro musi wygrać procesem i marketplace | High |
| Marketplace'y HR często pivotują/konsolidują się | Mercor, Triplebyte, Otta, Paradox | Generalist marketplace bez liquidity jest ryzykowny | Utility-first + employer seed + liquidity cells | Medium-High |

---

# 2. Polish Job Market Web Map

## Najważniejsze miejsca

| Miejsce | Typ / audience | Skala dostępna publicznie | Główne segmenty | Reklama / partnerstwo |
|---|---|---:|---|---|
| **Pracuj.pl** | General job board | >6 mln użytkowników/mies., 33,35 mln odsłon; 4,2 mln kont mailingowych — dane własne 2025 | white collar, sales, services, physical, juniors | **Display, mailing, sponsored article, reklama w ofercie**. 35 kategorii, 11 poziomów, 17 regionów. |
| **OLX Praca** | Classifieds/job marketplace | OLX podaje ok. 7 mln/mies. dla kategorii Praca | bardzo mocny blue collar, services, retail, logistics, local jobs | Self-service od 20 zł; display/premium banners, category/region/keyword targeting. |
| **Indeed** | Global aggregator/search engine | Polska scale: **NOT VERIFIED** | broad | Employer branding/display istnieje globalnie; reklama konkurencyjnego job boardu w PL: **NOT VERIFIED** |
| **Jooble** | Aggregator | Globalnie deklaruje dziesiątki milionów użytkowników; Polska: **NOT VERIFIED** | broad | premium/CPC/job promotion; generic competitor advertising: **NOT VERIFIED** |
| **GoWork** | Jobs + employer reviews | serwis deklaruje ok. 3,5–4 mln użytkowników miesięcznie, 7 mln opinii | broad, strong employer research | GoWork ADS Profile, GoWork ADS Job’s; ceny po kontakcie. |
| **Praca.pl** | General job board | blisko 2 mln użytkowników/mies.; >12 mln PV; >1,3 mln aktywnych kont mailingowych | general | display flat fee/impressions, targeted mailing, sponsored/expert articles; `reklama@praca.pl`. |
| **Aplikuj.pl** | General job board | aktualna PL scale: **NOT VERIFIED** | general/local | bardzo interesujący program afiliacyjny/CPL; 25 zł za klienta, 2 zł rejestracja kandydata, 1 zł CV w podanych modelach. |
| **JOBS.pl** | General job board | mailing >750 tys. aktualnych kont; newsletter 66 tys. | praca, szkolenia, rozwój | mailing dedykowany, banner, artykuł reklamowy; `marketing@jobs.pl`. |
| **Gratka Praca** | Classifieds | current scale: **NOT VERIFIED** | broad/local | znalazłem starsze rate cards, ale aktualny 2026 media kit: **NOT VERIFIED** |
| **No Fluff Jobs** | Job board, dziś znacznie szerzej niż samo IT | bieżąca witryna pokazywała >22 tys. ofert podczas scan; user reach: **NOT VERIFIED** | IT, marketing, sales, customer service, HR, engineering | publikacje 1190–2990 PLN; promocja, PPC, mailing priority, social. Generic Faro advertising: **NOT VERIFIED**. |
| **Just Join IT** | tech job board/content | current reach: **NOT VERIFIED** | IT/tech | reklama w serwisie contentowym dostępna przez kontakt reklamowy. |
| **RocketJobs** | white-collar job board + media/community | deklaruje setki tys. white collars; FB groups >260 tys. łącznie | marketing, HR, sales, office, creative | content marketing, display, niestandardowe współprace; `sales@rocketjobs.pl`. |
| **The Protocol** | tech job board | **NOT VERIFIED** | IT/tech | publiczny current media kit dla konkurencyjnej platformy: **NOT VERIFIED** |
| **Bulldogjob** | IT job board/media | aktualny audience scale: **NOT VERIFIED** | IT | employer branding, newsletter, content, social campaigns; job ads 790–2190 PLN. |
| **Solid.jobs** | IT/tech | **NOT VERIFIED** | IT | partnerstwa + API; newsletter może zawierać bannery/promocje. |
| **LinkedIn** | professional network | 9,2 mln registered members in PL in late 2025; nie MAU | white collar, B2B, HR | szczególnie mocny po stronie pozyskiwania pracodawców. |
| **Google Search** | intent engine | volume konkretnych fraz: **NOT VERIFIED** | wszystkie | kluczowy acquisition layer |
| **Facebook / grupy FB** | social/community | Facebook ad reach ok. 18,7 mln w PL late-2025 | blue collar, local, switchers, SMB | ważny organic/community + paid layer. |
| **TikTok** | short video/search/discovery | ad audience 18+: ok. 12,4 mln PL late-2025 | first job, juniors, career switch | mocny discovery/education channel. |
| **YouTube** | video/search | potential ad reach 27,1 mln PL late-2025 | wszystkie | edukacja + performance + retargeting/context. |

**Wniosek:** nie ma jednego „polskiego internetu pracy”. Kandydat magazynowy z Radomia, junior marketer, senior Java developer i osoba wracająca po przerwie mają zupełnie inne ścieżki wejścia.

---

# 3. Advertising Opportunities

## Najbardziej interesujące inventory dla Faro

### Tier strategiczny 1

- **Pracuj.pl** — bardzo wysoki intent; display + mailing + sponsored content.
- **OLX Praca** — szczególnie wartościowe dla blue collar/local/general.
- **Google Search** — przechwytywanie jawnej intencji.
- **Meta** — skalowanie zainteresowania i powroty.
- **YouTube** — edukacja „dlaczego Faro działa inaczej”.
- **TikTok** — pierwsza praca, juniors, switchers.
- **RocketJobs/JustJoinIT/NFJ** — test wybranych white-collar/tech audiences.

### Tier eksperymentalny

Praca.pl, JOBS.pl, GoWork, Bulldogjob, Solid.jobs, Aplikuj.pl partnerships.

### Szczególnie ciekawe kontakty

- Praca.pl: `reklama@praca.pl`, tel. 22 567 16 12.
- JOBS.pl: `marketing@jobs.pl`.
- RocketJobs: `sales@rocketjobs.pl`, redakcyjnie `marketing@rocketjobs.pl`.
- Just Join IT blog: `natalia.szczerbik@justjoin.it`.
- Solid.jobs: `kontakt@solid.jobs`.

### Krytyczna uwaga

Dla żadnego z największych polskich job boardów nie znalazłem publicznej, wiążącej polityki mówiącej:

> „akceptujemy reklamy konkurencyjnych platform rekrutacyjnych”.

Dlatego **COMPETITOR ACCEPTANCE = NOT VERIFIED**.

Pierwszą akcją zakupową Faro powinno być wysłanie jednego zunifikowanego RFP do wszystkich 15 serwisów z pytaniem o:

1. dopuszczalność reklamy platformy rekrutacyjnej,
2. display,
3. mailing/newsletter,
4. sponsored content/native,
5. programmatic/private marketplace,
6. audience targeting,
7. minimalny budżet,
8. CPM/CPC/flat fee,
9. dostępny inventory,
10. wyłączności/category conflicts.

To może od razu wykryć kanały, których konkurenci Faro nie będą chcieli sprzedać.

---

# 4. Candidate Acquisition

Marketing powinien być segmentowany według **problemu użytkownika**, nie tylko stanowiska.

| Segment | Gdzie szukać | Najlepszy hook produktowy |
|---|---|---|
| Pierwsza praca | TikTok, YouTube, Google, szkoły/uczelnie, RocketJobs groups, Meta | „Nie potrzebujesz idealnego CV, żeby pokazać potencjał.” |
| Junior | Google, TikTok, LinkedIn, Rocket/NFJ/JJIT branżowo | skill proof, learning path, transparent requirements |
| Bez doświadczenia | OLX, Meta/groups, Google, TikTok | hidden skills + assessment zamiast „2 lata doświadczenia” |
| Career switch | Search, YouTube, Meta, LinkedIn | transferowalne kompetencje + role discovery |
| Powrót po przerwie | Search, Meta, partnerzy społeczni/professional communities | aktualne kompetencje zamiast interpretowania przerwy |
| Częste zmiany pracy | broad social/Search | konkretne kompetencje i aktualne cele |
| Blue collar | OLX, GoWork, Facebook local/groups, Google | wynagrodzenie + zmiany + dojazd + szybki proces |
| Logistyka/produkcja | OLX, FB/local, Google, partnerships | netto po dojeździe, zmiany, weekendy, start date |
| Handel/usługi | OLX, Meta, local search | grafik, lokalizacja, netto, szybki kontakt |
| Administracja | Pracuj, Praca.pl, LinkedIn, Google | transparent requirements + transferability |
| IT | NFJ, JJIT, Bulldog, Solid, LinkedIn | skill evidence + technical assessments |
| Doświadczeni specjaliści | Pracuj, LinkedIn, Google/YouTube | real fit, job comparison, confidentiality |

Ważne: **„bez CV” samo w sobie nie powinno być całą kampanią Faro.** Dla części użytkowników CV nie jest problemem. Problemem jest to, że CV redukuje ich do nazw stanowisk, firm i linearnej historii.

---

# 5. Employer Acquisition

Tu Faro potrzebuje osobnego GTM.

## SME

Najlepsze kanały:

- outbound owner/founder,
- lokalne organizacje biznesowe,
- izby gospodarcze,
- LinkedIn,
- księgowość/payroll/HR SaaS partnerships,
- programy partnerskie,
- „zero-cost first recruitment”.

Kluczowa wartość: **mniej czasu ręcznej preselekcji + kandydaci, którzy wiedzą, na co aplikują.**

## Mid-market

- Head of HR,
- Talent Acquisition,
- HR Business Partners,
- Recruitment Leads,
- Operations/Plant/Store managers dla high-volume.

LinkedIn oferuje targetowanie m.in. po job function, seniority, company size, industry i listach konkretnych firm, co czyni go znacznie bardziej wartościowym dla B2B Faro niż dla masowego candidate acquisition.

## Enterprise

Nie sprzedawać „job boardu”.

Sprzedawać:

- structured hiring,
- candidate pipeline,
- skill evidence,
- configurable assessments,
- recruiter/hiring manager collaboration,
- analytics,
- SLA/status automation,
- auditability,
- ATS/API integrations,
- AI governance.

## Konkretne kanały

**Polskie Forum HR** prowadzi technologieHR, daneHR, eduHR i HR Tech Changer i ma bezpośredni kontakt partnerski.

**Rzeczpospolita HR Insights, 16 listopada 2026** jawnie zaprasza dostawców technologii HR i AI do partnerstwa.

To jest bardzo konkretny, aktualny lead GTM dla Faro.

---

# 6. Google / Search Opportunity

Nie znalazłem wiarygodnego publicznego źródła pozwalającego podać aktualne polskie miesięczne wolumeny tych fraz.

**WOLUMENY: NOT VERIFIED. Nie podaję wymyślonych liczb.**

Zamiast tysięcy keywordów Faro powinno zbudować klastry.

## A. High-intent job search

`praca`  
`oferty pracy`  
`praca [miasto]`  
`praca [stanowisko]`  
`praca od zaraz`  
`praca blisko mnie`

## B. First-job / no-experience

`pierwsza praca`  
`praca bez doświadczenia`  
`praca po liceum`  
`praca po studiach`  
`praca dla juniora`  
`staż / praktyki`

## C. Career switch

`zmiana pracy`  
`jak zmienić zawód`  
`przebranżowienie`  
`jaki zawód dla mnie`  
`co mogę robić po [zawód]`

Ta ostatnia grupa jest szczególnie wartościowa dla Faro i jego transferable-skills engine.

## D. Return-to-work

`powrót do pracy po przerwie`  
`szukanie pracy po przerwie`  
`jak wrócić na rynek pracy`

## E. Work modality

`praca zdalna`  
`praca hybrydowa`  
`[zawód] zdalnie`

## F. Salary

`zarobki [stanowisko]`  
`[kwota] brutto ile netto`  
`wynagrodzenie [stanowisko]`  
`stawka [stanowisko]`

To może być osobny, potężny SEO utility funnel.

## G. Commute

`koszt dojazdu do pracy`  
`ile kosztuje dojazd do pracy`  
`praca [dzielnica/powiat]`

## H. Recruitment help

`rozmowa kwalifikacyjna pytania`  
`jak przygotować się do rozmowy`  
`test rekrutacyjny`  
`assessment center`  
`test kompetencji`

## Strategia

Nie prowadzić wszystkich fraz na homepage Faro.

Tworzyć narzędziowe landing pages:

**Brutto → netto → netto po dojeździe → oferty, które realnie poprawiają wynik.**

To daje Faro wartościową relację z użytkownikiem **zanim marketplace osiągnie pełną płynność**.

---

# 7. Social Media

## Skala

Według DataReportal dla Polski, na podstawie danych reklamowych platform z końca 2025:

- YouTube: ok. **27,1 mln** potential ad reach,
- Facebook: **18,7 mln**,
- Instagram: **12,4 mln**,
- TikTok 18+: **12,4 mln**,
- LinkedIn: **9,2 mln registered members**.

To nie są identyczne metryki MAU i nie należy ich ze sobą mechanicznie porównywać.

## Google / YouTube

Google klasyfikuje job search databases, recruitment services i services for job seekers jako employment. Jego najostrzejsze ograniczenia „access to opportunities” dotyczące age/gender/marital/parental/ZIP są według aktualnej dokumentacji skierowane do **USA i Kanady**, nie Polski. Google nadal ogranicza personalizację na podstawie kategorii wrażliwych i nie personalizuje reklam dla osób <18.

Dla Faro oznacza to: Search intent może być bardzo precyzyjny; w display/YouTube lepiej budować segmentację wokół treści, intencji i kontekstu niż cech chronionych.

## TikTok

TikTok HEC Special Ad Category w aktualnej dokumentacji z kwietnia 2026 dotyczy reklamodawców w USA albo kampanii kierowanych do USA/Kanady.

W EEA obowiązują natomiast mocne ograniczenia dla użytkowników poniżej 18 lat: m.in. brak detailed targeting o gender, audiences, interests/behaviors i innych sygnałach oraz brak Lead Generation w kampaniach obejmujących tę grupę.

**Rekomendacja Faro:** większość performance acquisition na TikToku ustawić 18+, a kampanie edukacyjne do młodszych prowadzić broad/contextual.

## Meta

Meta historycznie rozszerzyła zabezpieczenia Housing/Employment/Credit również na UE i jej API Ad Library jawnie wyróżnia kategorię `EMPLOYMENT_ADS`.

Dokładnej, aktualnej tabeli wszystkich opcji Ads Manager **specyficznie dla Polski** nie udało mi się potwierdzić w indeksowalnej dokumentacji Meta.

**Poland-specific targeting matrix: NOT VERIFIED.**

Projekt kampanii powinien więc z góry działać przy ograniczonym demographic microtargeting:

**creative segmentation > discriminatory audience segmentation.**

---

# 8. Competitive Landscape

Poniższa tabela pokazuje najważniejsze klasy konkurencji, nie tylko bezpośrednich job boardów.

| Produkt | Rynek / target | Model | CV | Skills / assessment | Anonymous | Salary / feedback | AI | Lekcja dla Faro |
|---|---|---|---|---|---|---|---|---|
| Pracuj.pl | PL general | employer paid listings + ads | często | częściowe matching | nie jako core | rosnąca transparency | tak | ogromna dystrybucja i search habit |
| OLX Praca | PL broad/local | employer/classified | zależy | słabe jako core | nie | oferta-level | częściowo | blue collar/local acquisition |
| NFJ | PL/international | paid employer listing | tak/zależnie | skill-oriented IT | nie | salary core | tak | transparentny format ofert |
| JJIT | PL tech | employer listing | tak/zależnie | tech taxonomy | nie | salary strong | tak | tech community |
| RocketJobs | PL white collar | listing/media | tak/zależnie | taxonomy | nie | salary | tak | content/community distribution |
| GoWork | PL | jobs + employer reputation | zależy | nie core | nie | employer feedback | częściowo | accountability/reputation |
| TRAFFIT | PL ATS | subscription B2B | tak | AI candidate scoring | configurable data handling | process analytics | tak | Faro employer tooling benchmark |
| Element ATS | PL ATS | subscription | tak | workflow | nie core | process | automation | SMB simplicity |
| Greenhouse | global ATS | enterprise SaaS | tak | structured scorecards | resume anonymization | candidate surveys | tak | structured hiring + governance |
| Workable | global ATS | SaaS | tak | assessments/sourcing | limited | workflow | tak | all-in-one SME recruiting |
| Applied | UK/global | structured/blind hiring | często później | **work samples first** | **tak** | structured | algorithmic support | najbliższa filozofia blind skills-first |
| Eightfold | global enterprise | Talent Intelligence SaaS | profile/resume | strong skills graph | nie core | internal mobility | strong AI | potencjał > job title |
| Gloat | global enterprise | internal talent marketplace | profile | skills/aspirations | nie | career opportunity | AI | jobs + gigs + learning |
| Fuel50 | global enterprise | talent marketplace | profile | skills architecture | nie | development | explainable AI | learning-first model |
| TestGorilla | global assessment | subscription/credits | opcjonalnie | 350+ tests | nie | scoring | tak | modular assessment |
| HackerRank | global tech | SaaS | poza core | coding/AI assessments | nie | scores | tak | real skill evidence |
| Codility | global tech | SaaS | poza core | technical assessments | nie | scores | AI | anti-leak/integrity |
| Harver | global high-volume | enterprise | nie musi być core | predictive assessment | nie | fit | tak | high-volume role matching |
| Jobright | US/global | candidate AI assistant | profile/resume | match/gaps | nie | match explanations | **tak** | explainable career assistance już istnieje |
| Teal | US/global | freemium candidate tools | **tak** | keyword matching | nie | tracker | AI | candidate workflow |
| Huntr | US/global | freemium | tak | job match | nie | tracker | AI | application OS |
| Wellfound | global startup jobs | free core + employer paid | profile | matching | częściowo | salary/equity | tak | free core marketplace możliwy |
| Standout | US/YC 2026 | agentic marketplace | profile | mutual assessment | **identity hidden until intro accepted** | mutual | agents | bardzo istotny emerging comparable |

## Co Faro powinno uznać za już skomodytyzowane

Nie przedstawiałbym publicznie jako „rewolucyjnie unikalne” samych:

- AI matching,
- skills-first,
- blind screening,
- assessment,
- AI resume/job assistant,
- salary transparency,
- application tracking,
- structured interviews.

Moat musi być systemowy.

---

# 9. Skills-first Products

Najciekawsze wzorce nie pochodzą wyłącznie z job boardów.

**Applied** jest ważne, bo stosuje anonymous application + work samples zamiast oceniania po pedigree. To bardzo blisko filozofii Faro, choć zależnie od procesu CV może pojawiać się później.

**Eightfold** pokazuje, że człowieka można modelować przez skills/capabilities/current context, a nie tylko stanowisko.

**Gloat/Fuel50** pokazują jeszcze ważniejszą rzecz: skill profile powinien odpowiadać nie tylko:

> „do jakiej pracy pasujesz?”

ale także:

> „co możesz zrobić dalej?”  
> „czego Ci brakuje?”  
> „czego warto się nauczyć?”

To bardzo dobrze pasuje do „Faro. Wiesz, co dalej.”

## Faro powinno więc mieć trzy warstwy skill graph

**I. deklarowane umiejętności**  
„umiem X”.

**II. inferred skills**  
„na podstawie opisanej czynności prawdopodobnie używałeś X”.

**III. evidenced skills**  
„X zostało potwierdzone przykładem, doświadczeniem albo assessmentem”.

Nie wrzucałbym ich do jednego worka.

---

# 10. Assessments

## Aktualny rynek

**TestGorilla**: Free $0, Core $142/mies. przy zobowiązaniu rocznym, Plus od $400/mies.; >350 testów, AI interviews, simulations, coding, ID verification.

W styczniu 2026 zmieniło model credits: lekkie screening workflows mogą kosztować 0 credits, skills tests 1 credit/candidate, pełniejsze evaluation więcej.

**Codility**: Starter $1,200 rocznie / 120 invites; Scale $6,000; coding, SQL, AI skills, leakage protection, plagiarism/integrity.

**HackerRank**: Starter $199/mies. lub ok. $165 przy rozliczeniu rocznym; 120 assessment attempts rocznie, 2,000+ technical questions według vendor page.

**Harver**: 900+ gotowych job profiles i deklarowane >100 mln obsłużonych kandydatów; pricing po kontakcie.

**Criteria**: cognitive, personality, emotional intelligence, risk, skills, adaptive/game-based assessments, candidate feedback; pricing po kontakcie.

**Vervoe**: real-work skills assessments z explainable/auditable AI grading.

## Dobre praktyki dla Faro

Assessment powinien być:

- krótki,
- związany z konkretną rolą,
- uruchamiany dopiero, kiedy daje wartość,
- możliwy do przerwania/wznowienia,
- mobile friendly tam, gdzie jest to racjonalne,
- dostępny z accommodations,
- z jawnym zakresem danych,
- oceniany wg jawnego konstruktu/rubryki,
- ze wskaźnikiem pewności,
- z możliwością human review,
- możliwie reusable.

## Bardzo interesująca szansa Faro

**Portable assessment passport.**

Kandydat wykonał np.:

`Excel — 82/100 — potwierdzone 12.09.2026 — advanced formulas / pivots`

i może użyć tego przy więcej niż jednej zgodnej rekrutacji.

Ale wynik powinien mieć:

- wersję testu,
- datę,
- zakres,
- confidence,
- okres ważności,
- informację, czy assessment był proctored,
- możliwość ukrycia przez użytkownika.

## Czego nie kopiować

Nie budowałbym modelu:

> „Zanim w ogóle powiemy Ci, czy pracodawca jest zainteresowany — zrób godzinę testów.”

To generuje assessment fatigue i asymetrię procesu.

---

# 11. Transferable Skills Data

## ESCO — najlepszy fundament europejski

ESCO to oficjalna unijna wielojęzyczna klasyfikacja umiejętności, kompetencji, kwalifikacji i zawodów. Jest dostępna w **28 językach, w tym po polsku**, jako pliki i API. Aktualna wersja widoczna podczas researchu to **v1.2.1**, ostatnia aktualizacja 10.12.2025.

ESCO udostępnia Web API oraz downloadable Local API.

Software Local API używa EUPL 1.2; licencję danych trzeba traktować oddzielnie zgodnie z warunkami Komisji.

## O*NET

Obecna wersja to **31.0, August 2026**. Jest dostępna jako CSV, JSON, SQL, RDF itd. i objęta **CC BY 4.0**, z obowiązkiem atrybucji i wskazania zmian.

O*NET jest świetne do:

- work activities,
- knowledge,
- abilities,
- interests,
- work styles,
- tools/technology.

Ale jest amerykańskie, więc nie należy bezpośrednio kopiować occupational assumptions na Polskę.

## Polska

**INFOdoradca+** ma 1000 opisów zawodów obejmujących:

- zadania zawodowe,
- wymagane kompetencje,
- rozwój,
- rynek pracy,
- odniesienie do ESCO.

**ZRK** ma publiczne API v1 dla Zintegrowanego Rejestru Kwalifikacji.

Licencja umożliwiająca masowe komercyjne reuse wszystkich danych INFOdoradca+/ZRK w dokładnie planowanym modelu Faro:

**NOT VERIFIED.**

## Rekomendowana architektura

`ESCO`  
↓  
`Polish aliases / terminology`  
↓  
`INFOdoradca / ZRK enrichment`  
↓  
`optional O*NET mappings`  
↓  
`Faro empirical skill graph`

Faro następnie może nauczyć się np.:

> magazynier → skanery / stock accuracy / SOP / inventory handling / tempo / safety / shift work  
> gastronomia → customer interaction / prioritisation / teamwork / cash handling / pressure management  
> opiekun klienta → CRM / conflict handling / negotiation / written communication

Ale system powinien mówić:

**„Na podstawie Twojego doświadczenia prawdopodobnie używałeś tych umiejętności. Potwierdź lub popraw.”**

Nie:

**„Masz tę kompetencję.”**

---

# 12. Commute Data Sources

Ta funkcja jest wykonalna, ale nie jednym API.

## Routing

Google Routes API daje:

- driving,
- transit,
- duration,
- distance,
- traffic-aware routes,
- transit details,
- wybrane dodatkowe parametry.

W przypadku transit może zwrócić estimated fare **tylko wtedy, gdy potrafi wyliczyć fare dla wszystkich odcinków**.

To oznacza:

**nie wolno projektować kalkulatora Faro z założeniem, że Google zwróci cenę całej komunikacji publicznej w Polsce.**

Google Routes jest pay-as-you-go; Compute Routes płatne per query, Route Matrix per element.

## Paliwo

Najlepszy publiczny benchmark znalazłem w **European Commission Weekly Oil Bulletin**, aktualizowanym co tydzień. Ostatni dostępny podczas researchu: **10 września 2026 r.** — ceny z podatkami i bez podatków dla państw UE.

To dobre do nationwide benchmark.

Nie wystarczy jednak do:

- dokładnej lokalnej stacji,
- każdej odmiany benzyny,
- pełnego LPG/local,
- EV charging.

## Public transport

Polska jest fragmentaryczna:

- część operatorów udostępnia GTFS,
- część GTFS-Realtime,
- kolej ma osobne taryfy,
- miasta mają własne cenniki,
- taryfy integracyjne komplikują sytuację.

Dlatego architektura powinna być:

**routing layer**  
+  
**tariff adapters**  
+  
**rail/regional adapters**  
+  
**fallback estimate**

Nigdy udawana jedna ogólnopolska cena.

## Co pokazywać

Przykład:

**Dojazd autem — szacunek**
- 38 km/dzień
- 21 dni pracy
- spalanie użytkownika: 7,1 l/100 km
- cena paliwa: 7,89 zł/l
- paliwo: ~471 zł/mies.
- czas: ~17 h 40 min/mies.

I obok:

**Źródło ceny:** data + provider.  
**Ostatnia aktualizacja:** konkretna data.

To zwiększa zaufanie.

---

# 13. Salary / Netto Infrastructure

Faro nie powinno zapisywać wartości „netto” w ogłoszeniu jako jednej stałej.

Powinno mieć **wersjonowany rules engine**.

W 2026 skala PIT pozostaje 12% do 120 tys. zł podstawy i 32% powyżej; kwota zmniejszająca wynosi 3 600 zł.

Do UoP trzeba brać pod uwagę m.in.:

- PIT-2,
- koszty uzyskania,
- kilka źródeł zatrudnienia,
- PPK,
- ulgi,
- progi roczne,
- składki,
- miesiąc w roku.

Zlecenie dodatkowo:

- status studenta,
- wiek,
- inne tytuły ubezpieczeniowe,
- dobrowolne chorobowe,
- KUP.

B2B:

- skala / liniowy / ryczałt,
- społeczny ZUS,
- zdrowotna,
- ulgi,
- koszty,
- VAT ≠ dochód.

## Interfejs

Nie:

> **„Dostaniesz 7 842,17 zł.”**

Lepiej:

> **Szacowane netto: ok. 7 840 zł / mies.**  
> Założenia: UoP, PIT-2, standardowe KUP, bez PPK, reguły podatkowe 2026.  
> Twoja rzeczywista wypłata może się różnić.

Dla skomplikowanych przypadków pokazać scenariusze.

Jeszcze lepiej:

## FARO Effective Job Value

**Netto**  
− **koszt dojazdu**  
= **netto po dojeździe**

oraz osobno:

**czas pracy + czas dojazdu**

Pozwala to porównać dwie oferty, które na papierze mają tę samą pensję, ale zupełnie inny realny koszt.

---

# 14. Legal Current Scan

**To jest current web scan, nie opinia prawna.**

## KRAZ

Od 1 czerwca 2025 r. obowiązuje nowa ustawa o rynku pracy i służbach zatrudnienia. Oficjalne informacje WUP/MRPiPS wskazują, że prowadzenie działalności w zakresie pośrednictwa pracy wymaga wpisu do KRAZ; wpis kosztuje 1000 zł.

Czy **dokładny finalny model Faro** będzie prawnie kwalifikowany jako regulowane pośrednictwo pracy:

**NOT VERIFIED — wymaga formalnej opinii po zamknięciu modelu operacyjnego.**

Nie zakładałbym, że „jesteśmy tylko platformą technologiczną” automatycznie rozwiązuje temat.

## Salary transparency

Ustawa z 4 czerwca 2025 r. zmieniła Kodeks pracy, a odpowiednie przepisy weszły w życie 24 grudnia 2025 r.

PIP wskazuje m.in. obowiązek przekazania kandydatowi informacji o wynagrodzeniu/przedziale najpóźniej przed rozmową lub zawarciem umowy zależnie od ścieżki oraz neutralność języka ogłoszeń.

Pełną polską implementację wszystkich elementów dyrektywy 2023/970 poza już obowiązującymi zmianami należy ponownie sprawdzić tuż przed launch:

**FINAL FULL TRANSPOSITION STATUS: należy reverify po 16.09.2026.**

## AI Act

To bardzo ważna aktualizacja.

AI Act jest już częściowo stosowany, ale termin dla **Annex III high-risk systems**, obejmujących m.in. użycia AI w zatrudnieniu, został przesunięty na **2 grudnia 2027 r.**

Komisja wymienia dla high-risk m.in.:

- risk management,
- data quality,
- logging,
- documentation,
- information for deployers,
- human oversight,
- robustness,
- cybersecurity,
- accuracy.

Faro powinno projektować matching już teraz jak system, który może zostać potraktowany jako high-risk.

## GDPR / automated decisions

EDPB ma osobne guidelines dotyczące automated individual decision-making i profiling.

Dlatego:

**nie robiłbym nieodwracalnego AI auto-reject jako domyślnego mechanizmu.**

Potrzebne będą co najmniej:

- logic trace,
- human oversight,
- explanation,
- correction,
- appeal,
- model/version records,
- data provenance,
- DPIA dla odpowiednich procesów.

---

# 15. Candidate Messaging

Jedno hasło nie powinno obsługiwać całego performance marketingu.

## Brand umbrella

**„Faro. Twój nawigator na rynku pracy.”**

Dobre jako marka nadrzędna, bo opisuje rolę Faro, a nie pojedynczą funkcję.

## Product promise

**„Faro. Wiesz, co dalej.”**

To jest znacznie lepsze jako obietnica doświadczenia:

- wiem dlaczego oferta pasuje,
- wiem czego mi brakuje,
- wiem jaki jest następny krok,
- wiem co stało się z aplikacją,
- wiem czy oferta nadal jest taka sama.

## Początkujący

**„Nie masz długiego CV? Pokaż, co potrafisz i czego możesz się nauczyć.”**

## Bez doświadczenia

**„Doświadczenie to więcej niż nazwa stanowiska. Faro pomaga odkryć umiejętności, które już masz.”**

## Career switcher

**„Twoje doświadczenie może pasować do więcej ról, niż mówi nazwa Twojego stanowiska.”**

## Doświadczeni

**„Porównuj oferty po tym, jak naprawdę wpłyną na Twoją pracę i życie.”**

## Luka w zatrudnieniu

**„Przerwa nie mówi pracodawcy, co potrafisz dziś.”**

## Częste zmiany

**„Liczą się aktualne kompetencje, oczekiwania i dopasowanie — nie idealnie liniowa historia.”**

W przypadku tej grupy unikałbym komunikatu, który brzmi jak „Faro ukryje Twoją historię”. To budziłoby złe skojarzenia.

---

# 16. Employer Messaging

Employer message nie może brzmieć:

> „Mamy AI i znajdziemy idealnych ludzi.”

To jest dziś commodity.

Silniejsze hipotezy:

## Hiring quality

**„Najpierw zobacz kompetencje. Dopiero potem etykiety.”**

## Efficiency

**„Mniej CV do przeklikiwania. Więcej porównywalnych informacji o tym, co kandydat potrafi.”**

## Candidate experience

**„Kandydat wie, gdzie jest w procesie. Twój zespół wie, co blokuje rekrutację.”**

## Skills-first

**„Nie odrzucaj dobrego kandydata dlatego, że miał inną nazwę stanowiska.”**

## High-volume

**„Porównuj kandydatów według tych samych kryteriów — bez ręcznego czytania setek różnych CV.”**

## Long-term paid value

Docelowo employer money powinny płynąć za:

- assessment,
- collaboration,
- automation,
- analytics,
- integrations,
- compliance/audit,
- high-volume tooling.

**Nie za kupowanie lepszego rankingu kandydata lub oferty.**

To chroni jedno z najważniejszych przyszłych aktywów Faro: **wiarygodność rankingu.**

---

# 17. Partnerships

Najbardziej interesujące kierunki:

## Distribution

Pracuj / OLX / Praca.pl / JOBS / Rocket / JJIT / Bulldog / Solid.

## HR ecosystem

Polskie Forum HR jest bardzo logicznym partnerem branżowym.

## Media / thought leadership

Rzeczpospolita HR Insights 2026 jest konkretną aktualną okazją — event odbywa się 16 listopada i jawnie szuka HR-tech/AI partners.

## Candidate side

- biura karier,
- szkoły branżowe/techniczne,
- uczelnie,
- bootcampy/reskilling,
- NGO wspierające wejście/powrót na rynek pracy,
- lokalne employment communities.

## Employer distribution

- payroll/accounting systems,
- ATS,
- HRIS,
- employer associations,
- chambers of commerce,
- recruitment agencies — ale tu równocześnie pojawia się temat KRAZ/modelu biznesowego.

## Data

- ESCO,
- ZRK,
- INFOdoradca,
- transport operators,
- map/routing vendors,
- payroll/tax-data providers.

---

# 18. Recent HR Tech Startups

Kilka szczególnie ciekawych:

## Standout — YC Spring 2026

Agentic hiring marketplace. Kandydat i firma dostają agentów prowadzących discovery/assessment; profil talentu może pozostać anonimowy do zaakceptowania introduction.

To jest **bardzo ważny comparator dla Faro**, bo łączy agentic matching i staged identity reveal.

## Mercor

Zaczynał jako AI-driven recruiting/hiring marketplace, z AI interview/assessment i matchingiem. Później biznes mocno przesunął się w stronę dostarczania wysoko kwalifikowanych ekspertów do treningu modeli AI.

**Lekcja:** ogromna wartość może pojawić się w wąskim, drogim labor marketplace, a nie w ogólnym „AI job matching”.

## Paradox

Conversational recruiting/automation, scheduling, high-volume hiring. Workday zamknął przejęcie Paradox w 2025 r.

**Lekcja:** komunikacja, scheduling i candidate experience są warte dużo również jako infrastruktura, nie tylko marketplace.

## HiredScore

Talent orchestration/AI, przejęty przez Workday.

## Otta

Candidate-first tech job platform, przejęta w 2024 przez Welcome to the Jungle.

**Lekcja:** candidate-first UX ma wartość, ale może zostać wchłonięty przez większy recruitment/employer-brand ecosystem.

---

# 19. Failed / Pivoted Models

Ta część jest bardzo ważna dla Faro.

## Triplebyte

Triplebyte zbudował techniczny talent marketplace oparty na assessments. Jego talent-network business został wygaszony, natomiast adaptive assessment technology i zespół przejął Karat.

**Lekcja:**

> assessment technology może mieć wartość nawet wtedy, gdy marketplace nie osiągnie trwałej płynności.

Faro powinno więc projektować employer tooling jako realny produkt, nie tylko dodatek do job boardu.

## Mercor

Pivot z szeroko rozumianego AI hiring w stronę expert marketplace dla firm AI.

**Lekcja:** vertical liquidity może być znacznie łatwiejsza niż general liquidity.

Nie oznacza to zawężenia publicznego Faro do branży. Oznacza, że **pozyskiwanie podaży/popytu powinno mieć konkretne wedges.**

## Hired / Vettery

Historyczne reverse recruiting marketplaces musiały się konsolidować.

**Lekcja:** „pracodawcy licytują się o kandydatów” brzmi świetnie w decku, ale nie usuwa problemu podaży, jakości ani częstotliwości transakcji.

## Wspólny pattern

Najbardziej niebezpieczny pomysł to:

> „Najpierw uruchomimy marketplace w całej Polsce, a użytkownicy i firmy się pojawią.”

Nie pojawią się automatycznie.

---

# 20. Marketplace Cold Start

Faro powinno być dostępne **w całej Polsce od dnia publicznego startu**.

Jednocześnie należy rozróżnić:

**product availability**  
od  
**liquidity building**.

## Model Faro

```text
CAŁA POLSKA
     │
     ▼
publiczny produkt Faro
     │
     ├─ logistics × Mazowieckie
     ├─ retail × duże miasta
     ├─ production × Śląskie / Łódzkie / Wielkopolskie
     ├─ junior white collar × nationwide
     ├─ IT × remote/hybrid
     └─ customer service × nationwide
          │
          ▼
   osobne kampanie liquidity
```

To nie są ograniczenia produktu. To **atomic liquidity cells**.

## Mechanizmy z innych marketplace'ów, które warto przejąć

### 1. Hard side first

Jeżeli trudniejszą stroną w danym segmencie są pracodawcy — seed employers przed kupowaniem dużej candidate traffic.

### 2. Single-player utility

Użytkownik powinien mieć wartość nawet bez transaction:

- netto calculator,
- commute,
- job comparison,
- transferable skills map,
- tracker,
- career direction.

To jest prawdopodobnie najważniejsze rozwiązanie problemu cold-start Faro.

### 3. Concierge na początku

Pierwsze dopasowania można ręcznie kontrolować, żeby zobaczyć, czego algorytm jeszcze nie rozumie.

### 4. Anchor employers

10 firm mających wiele rzeczywistych rekrutacji może mieć większą wartość niż 1000 przypadkowych employer accounts.

### 5. Free core

Tu koncepcja Faro jest sensowna.

Nie powinno być opłaty za dostęp do płynności na starcie.

## Bardzo ważne

Nie budowałbym mechanizmu:

**„zapłać więcej → Twoja oferta jest oceniana jako lepsza / wyświetla się jako bardziej dopasowana.”**

To niszczy wiarygodność explainable matching.

---

# 21. Opportunities Faro Has Missed

Widzę co najmniej **12 bardzo wartościowych możliwości**, które zasługują na dopisanie lub mocniejsze potraktowanie.

## 1. Skill Evidence Graph

Nie tylko skill list.

Każdy skill ma:

**źródło → dowód → confidence → aktualność.**

Przykład:

> Excel  
> deklaracja użytkownika  
> używany 3 lata  
> assessment 84/100  
> ostatnio potwierdzony: VIII 2026

To może być jeden z najważniejszych assetów Faro.

## 2. Portable assessment credentials

Raz wykonany sensowny assessment można — za zgodą użytkownika — wykorzystać ponownie.

## 3. Candidate-controlled identity reveal

Nazwisko i pedigree nie są widoczne w pierwszym review, ale Faro zna tożsamość i może ją zweryfikować.

Po mutual interest:

**Reveal identity.**

To ogranicza bias bez tworzenia świata anonimowych fake profiles.

## 4. Explainable transferable-skills bridge

Nie tylko:

> „pasujesz 76%”.

Ale:

> „Twoja obsługa klienta daje Ci 5 z 8 kompetencji wymaganych w customer success. Brakuje X, Y, Z.”

## 5. Job Economics

To powinno być pełnym modułem.

**netto + dojazd + czas + remote days + weekendy + shifts + benefits + stability.**

## 6. Effective hourly value

Opcjonalna miara:

`(netto − koszt dojazdu) / (czas pracy + czas dojazdu)`

Nie jako „ranking życia”, tylko porównywalny wskaźnik.

## 7. Process reliability score

Nie publiczne „gwiazdki, bo ktoś jest zły”.

Lepiej mierzalne:

- median response time,
- % procesów zakończonych statusem,
- % ofert zmienionych po publikacji,
- % rozmów odwołanych,
- aktualność oferty.

## 8. Mutual intent handshake

Przed długim assessmentem:

**pracodawca sygnalizuje realne zainteresowanie**.

Zmniejsza marnowanie czasu kandydata.

## 9. Anti-AI-spam design

Problem najbliższych lat to:

`AI candidate auto-apply ↔ AI employer auto-reject`.

Faro powinno celowo nie optymalizować na „wyślij 500 aplikacji”.

Lepszy KPI:

**meaningful qualified intent.**

## 10. Employer requirement quality checker

Faro może ostrzegać:

> „Wymagasz 3 lat doświadczenia, ale podałeś kompetencje typowe dla poziomu junior/mid.”

lub:

> „Ta kompetencja nie jest używana w żadnym etapie zadeklarowanych obowiązków.”

To realnie zmienia rynek.

## 11. Learning feedback loop

Gdy kandydat nie pasuje:

> „Oto trzy umiejętności, które zwiększą liczbę zgodnych ofert.”

Tu „learning-first” staje się rzeczywiste.

## 12. Changes since application

Funkcja, którą już przyjęliśmy dla Faro, okazuje się jeszcze ważniejsza w zestawieniu z rynkiem:

**„Co zmieniło się od Twojego zgłoszenia?”**

Nie widzę jej jako standardowego core experience w największych job boardach.

---

# 22. Threats Faro Has Missed

## 1. Skills-first może stać się nowym black box

Usunięcie nazwiska i CV nic nie da, jeżeli model zamieni to na niejasny:

**MATCH: 63%.**

To może być mniej transparentne niż CV.

## 2. Assessment fatigue

Jeżeli każde zgłoszenie = test, Faro stanie się bardziej męczące niż zwykły portal.

## 3. Candidate gaming + GenAI

Otwarte assessmenty generowane przez AI szybko stają się podatne na LLM assistance.

Dlatego trzeba rozróżniać:

- AI allowed,
- AI-assisted role simulation,
- no-AI test,
- proctored,
- unproctored.

## 4. Nationwide thin liquidity

Największe zagrożenie biznesowe.

Faro może mieć 50 tys. użytkowników, ale jeżeli dla konkretnego:

`operator CNC × Elbląg`

nie ma ofert, globalna liczba nic nie znaczy.

## 5. Employer effort

Skills-first structured hiring wymaga lepiej opisanych ofert.

Jeżeli konfiguracja Faro będzie trwała 30 minut, SME wróci do OLX.

Potrzebny jest:

**AI-assisted job structure builder** z human confirmation.

## 6. Regulatory classification

KRAZ musi zostać zamknięte przed komercyjnym startem.

## 7. AI Act

December 2027 nie jest odległą przyszłością przy budowie infrastruktury rekrutacyjnej.

## 8. Tax/routing freshness

„Netto po dojeździe” jest świetnym produktem tylko tak długo, jak Faro jasno pokazuje datę, źródło i założenia.

## 9. Incumbent copying

Pracuj, Indeed, LinkedIn lub duży ATS mogą skopiować pojedynczą funkcję Faro.

Dlatego moat nie może być „mamy AI match score”.

## 10. Monetization trust conflict

Jeżeli Faro zbuduje reputację neutralnego nawigatora, a potem wprowadzi:

> „pracodawca Premium jest wyżej w Twoich dopasowaniach”,

marka zostanie podważona.

Monetyzacja employer tooling jest znacznie bezpieczniejsza.

---

# 23. 20 Most Useful Sources

1. Pracuj.pl — oferta reklamowa: https://reklama.pracuj.pl/
2. OLX Ads — inventory i audience Praca: https://ads.olx.pl/
3. Praca.pl — reklama i mailing: https://www.praca.pl/reklama.html
4. JOBS.pl — mailing i newsletter: https://www.jobs.pl/reklama-mailing-new
5. RocketJobs — współpraca reklamowa: https://rocketjobs.pl/blog/wspolpraca-z-rocketjobs-pl
6. No Fluff Jobs — aktualne pakiety pracodawców: https://nofluffjobs.com/pl/pricing/
7. DataReportal Digital 2026 Poland: https://datareportal.com/reports/digital-2026-poland
8. Pracuj.pl — Rynek Pracy Specjalistów 2025: https://media.pracuj.pl/443001-raport-rynek-pracy-specjalistow-w-2025-roku-kolejny-wzrost-liczby-aplikacji-i-klientow-pracujpl
9. Google — employment advertising policy: https://support.google.com/adspolicy/answer/16700442
10. TikTok — Employment Special Ad Categories: https://ads.tiktok.com/help/article/choosing-special-ad-category
11. ESCO — current European skills taxonomy: https://esco.ec.europa.eu/en/about-esco
12. ESCO — API/download: https://esco.ec.europa.eu/en/use-esco/download
13. O*NET 31.0 Database: https://www.onetcenter.org/db_releases.html
14. INFOdoradca+: https://psz.praca.gov.pl/rynek-pracy/bazy-danych/infodoradca
15. ZRK API: https://api.kwalifikacje.gov.pl/pl/
16. European Commission Weekly Oil Bulletin: https://energy.ec.europa.eu/data-and-analysis/weekly-oil-bulletin_en
17. Google Routes — public transport and fares: https://developers.google.com/maps/documentation/routes/transit-route
18. AI Act — current enforcement timeline: https://digital-strategy.ec.europa.eu/en/policies/enforcement-ai-act
19. KRAZ — official information: https://psz.praca.gov.pl/rynek-pracy/bazy-danych/rejestr-agencji-zatrudnienia
20. Kodeks pracy — Dz.U. 2025 poz. 807: https://dziennikustaw.gov.pl/DU/2025/807

Dodatkowo bardzo wartościowe benchmarki produktowe: aktualny cennik TestGorilla, Codility, Criteria i Vervoe.

---

# 24. Immediate Actions

Na podstawie tego researchu ustawiłbym kolejność następująco:

## P0 — rzeczy do rozstrzygnięcia przed architekturą produkcyjną

### 1. KRAZ legal classification memo

Nie czekać do premiery.

### 2. AI decision architecture

Zdecydować już teraz:
- co AI rekomenduje,
- co AI rankuje,
- co może odrzucić,
- gdzie człowiek zatwierdza,
- co kandydat może zakwestionować.

### 3. Faro Skills Graph v0.1

ESCO-first + polskie aliasy + evidence/confidence.

### 4. Job Economics specification

Dokładnie ustalić:
- brutto/netto,
- typ umowy,
- koszt dojazdu,
- czas,
- remote days,
- shifts/weekends,
- źródła i freshness.

## P1 — acquisition infrastructure

### 5. Wysłać RFP do 15 polskich job destinations

W pierwszej kolejności:

Pracuj → OLX → RocketJobs/JJIT → Praca.pl → JOBS → GoWork → NFJ → Bulldog → Solid → pozostałe.

### 6. Założyć Keyword Planner research jako osobny dataset

Dla każdego cluster:
- volume,
- CPC,
- competition,
- location,
- mobile/desktop,
- seasonality.

Bez domyślania wolumenu.

### 7. Utworzyć 8–12 landingów zamiast jednego „Faro”

Np.:

`/pierwsza-praca`  
`/bez-doswiadczenia`  
`/zmiana-zawodu`  
`/praca-po-przerwie`  
`/praca-zdalna`  
`/brutto-netto`  
`/koszt-dojazdu`  
`/porownaj-oferty`

## P2 — employer seed

### 8. Zbudować Founder Employer Program

Nie „wrzuć darmowe ogłoszenie”.

Raczej:

> „Zaprojektujemy z Tobą pierwszą rekrutację skills-first i pokażemy, jak kandydaci przechodzą proces.”

To daje Faro dane jakościowe.

### 9. Rozpocząć kontakt z Polskim Forum HR oraz HR Insights 2026

## P3 — assessment

### 10. Nie budować od razu setek testów

Najpierw 5–10 occupation families:

- customer service,
- sales,
- logistics/warehouse,
- retail,
- administration,
- production,
- entry IT,
- marketing,
- finance/Excel,
- hospitality/services.

I przede wszystkim testować **candidate completion + perceived fairness**, nie tylko predictive score.

## P4 — cold start

### 11. Nationwide launch pozostaje bez zmian

Ale każdą złotówkę acquisition mierzyć w układzie:

`occupation × geography/work model × source`

a nie „cała Polska”.

### 12. Najpierw zbudować single-player value

To może być kluczowa decyzja strategiczna całego Faro:

> **Faro powinno być użyteczne nawet wtedy, gdy jeszcze nie ma idealnej oferty.**

Jeżeli użytkownik może dzięki Faro zrozumieć swoje kompetencje, policzyć realną wartość pracy, porównać oferty, zobaczyć luki i zdecydować co dalej, to marketplace nie zaczyna od zera.

---

# Wniosek końcowy

Po tym skanie zmieniłbym definicję Faro z:

**„nowoczesna platforma rekrutacyjna skills-first”**

na coś znacznie szerszego:

> **Faro jest systemem podejmowania decyzji na rynku pracy, który następnie łączy kandydata z pracodawcą.**

Marketplace jest ważny, ale **nie powinien być jedynym źródłem wartości**.

Największego potencjału nie widzę w samym „braku CV”. Widzę go w połączeniu:

**doświadczenie → ukryte kompetencje → dowody → możliwe role → realne oferty → realny wpływ na życie → transparentna decyzja → transparentny proces → feedback → następny krok.**

Wtedy **„Faro. Wiesz, co dalej.”** przestaje być tylko hasłem i staje się architekturą produktu.
