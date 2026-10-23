# Badania użytkowników, marketplace i assessment — pakiet do odbioru

23.10.2026; projekt protokołu, nie wykonane badanie. Participants=[], empiricalResults=[], ekspert/owner=UNASSIGNED. Nie zrekrutowano uczestników ani firm i nie wysłano wiadomości. Zakres K006/K007/K008/K043/K044/K046/K050/K051/K052/K072. Powiązania: SKILL_VALIDATION_PROCEDURE.md i istniejący SKILL_VALIDATION_PACKET.json, MARKET_REVIEW_2026_10_23.md, REVIEW_LEGAL_PRIVACY.md.

## Cel i rekrutacja K006/K007

Pytanie: czy kandydat i firma rozumieją zakres dowodów kompetencji, kontrolują ujawnianie informacji i potrafią doprowadzić proces do kolejnego kroku bez mylenia deklaracji z walidacją?

Macierz doboru celowego do zatwierdzenia badacza: pierwsza praca; brak doświadczenia; zmiana branży; powrót po przerwie; różne zawody/lokalizacje/tryby; firma JDG i zespół rekrutacyjny; osoby korzystające z klawiatury/czytnika/powiększenia. Ta macierz nie ustala nowej liczebności próby, norm populacyjnych ani ograniczenia regionalnego. Liczebność, dostępność, wynagrodzenie udziału i rekrutacja wymagają planu badacza i decyzji właściciela. Udział ma być dobrowolny i oddzielony od faktycznej szansy zatrudnienia.

Przed pierwszym badaniem: zatwierdzony zakres wieku, zgoda/informacja i podstawa przetwarzania, minimalizacja nagrań/notatek, retencja i wycofanie, osoby uprawnione do materiałów, accommodations i ścieżka przerwania. Preferować konta i scenariusze syntetyczne; realnych odpowiedzi/telefonów nie umieszczać w Git. Identyfikator uczestnika nie zawiera nazwiska/e-maila. Referencje do materiałów poza repozytorium.

## Gotowy scenariusz sesji NO-CV

Moderator czyta zadanie bez podpowiadania nazw kontrolek. Rejestruje faktyczne działanie, wypowiedź i kontrdowód, a nie własną interpretację jako odpowiedź uczestnika.

| Zadanie | Pytanie sprawdzające po wykonaniu | Co obserwować / kontrdowód |
|---|---|---|
|Opisz praktykę z poprzedniej aktywności i rozważ lokalną sugestię kompetencji|Skąd pochodzi sugestia? Co udowadnia jej potwierdzenie?|Odróżnienie autorskiego opisu, source, wersji/deklaracji i oceny; mylenie sugestii z certyfikatem.|
|Porównaj MUST_HAVE i WILL_TEACH w pokazanej ofercie|Czego firma oczekuje już teraz, a czego nauczy?|Czy WILL_TEACH nie jest interpretowane jako własna potwierdzona umiejętność; jawne warunki/nieznane wartości.|
|Obserwuj ofertę, potem świadomie zgłoś zainteresowanie|Która czynność ujawniła dane firmie i jakie?|Watch versus interest, exact preview, kontrola potwierdzenia; uczestnik błędnie uważa watch za aplikację.|
|Sprawdź prywatny kontekst, projekcję i telefon|Czego firma nie zobaczy? Jak cofniesz kontakt?|Brak nazw firm/stanowisk/CV i notatek w projekcji; osobny grant telefonu; historia procesu a cofnięcie.|
|Odczytaj odpowiedź pracodawcy i termin kolejnego etapu|Na czyj krok czekamy i który termin biegnie?|Dwa zegary, next action i neutralne expiry; błędny wniosek „czas minął = odmowa”.|
|Wpisz OPEN_ANSWER, poczekaj na potwierdzenie, wróć do próby|Co oznacza zapis? Kiedy odpowiedź zobaczy firma?|Autosave/revision, expiry bez resetu, submit osobno; offline/conflict nie przedstawiony jako pewny zapis.|
|Zobacz wynik skorygowany/unieważniony i zgłoś problem|Który wynik jest aktualny? Jak zakwestionujesz problem?|Historia a aktualna ważność; brak wniosku o ogólnej wartości osoby; appeal/incident bez resetowania timera.|
|Porównaj warunki i manual Economics z brakującą taryfą|Co jest faktem, własnym założeniem, a czego nie wiemy?|Brak automatycznej wiary w netto/dojazd; null nie jest zerowym kosztem.|

Arkusz pojedynczej obserwacji: `studyVersion, participantRef, segment(s), build, task, started/finished(optional), observedAction, participantWordsRef, successDefinitionApplied, assistance, barrier, contraryEvidence, severityRationale, proposedChange, researcherRef, limitation`. Nie narzucać arbitralnych progów sukcesu. Badacz przed sesjami ustala operacyjne znaczenie sukcesu i sposób kodowania; zmiany definicji są wersjonowane.

## Founder Employer Program K008 i beta K044

Formularz kwalifikacji firmy: rzeczywista potrzeba/wakat i uprawnienie reprezentanta, jawne warunki wynagrodzenia/czasu, dostępność osoby odpowiadającej, pojemność obsługi, akceptacja free-first/nationwide/native-only, zasady human review i zgłoszeń. Weryfikację firmy prowadzi uprawniony operator. Materiał nie zawiera listy fikcyjnych firm, deklaracji podpisanej zgody ani automatycznego outreach.

Przed betą owner zapisuje: zakres faktycznych użytkowników/danych, zgodność wcześniejszych bramek K001/K004/K038/K039, obsadę i zastępstwo, pojemność, jakościowe kryteria GO/STOP, sposób kontroli zgłoszeń i plan wycofania zachowujący privacy. Przerwanie przy nieautoryzowanym ujawnieniu, niewiarygodnym zapisie/restore lub braku obsługi wymaga reakcji według zatwierdzonego planu; nie wprowadza automatycznej sankcji wobec kandydatów/firm. Ograniczona beta badawcza nie zmienia nationwide public availability jako decyzji produktu. Launch nadal zamknięty.

## K043 — słownik pomiaru i ocena jakości

Istniejący producent to dobrowolny retained consenting subset zdarzeń obustronnego ukończenia etapu z deduplikacją pary/tydzień. Nie jest to population NSM, kompletna konwersja ani dowód zatrudnienia.

| Wielkość | Denominator / rozdzielenie | Brakująca decyzja |
|---|---|---|
|Obustronny postęp|Jawnie określona para/tydzień/etap; nie samo kliknięcie lub jednostronne potwierdzenie|Definicja wartości i uprawniona interpretacja na rzeczywistych procesach.|
|Konwersja|Osobno ekspozycja, interest, odpowiedź, etap, oferta, przyjęcie; odmowa/withdraw/cancel osobno|Które populacje można legalnie i kompletnie mierzyć; brakujących danych nie uzupełniać prognozą.|
|Cohort health|Rozdzielić datę wejścia/okno obserwacji, zakończone i nadal otwarte procesy|Okno i segmenty określa owner badania; nie kodować fikcyjnej „zdrowej” wartości.|
|Coverage/bias|Zgoda na analitykę, usunięcie, wycofanie, retencja, brak obserwacji poza Faro|Raportować zakres i missingness. Nie ekstrapolować consenting subset na wszystkich.|

Raport zawiera query/build/version/oknoUTC, definicje, licznik i mianownik z tego samego zakresu, missingness, kontrdowody, ograniczenia i review. Brak surowych PII, prywatnych odpowiedzi, e-maili lub pełnych opisów w analityce.

## K046 — dossier pierwszego assessmentu

Wypełnia ekspert dla dokładnego assessmentId/version/rubric/hash, nie „Faro ogólnie”:

1. Intended use, populacja, zadania pracy i konstrukt; czego wynik nie mierzy. Pochodzenie zadań i prawa użycia.
2. Mapa każdej taskId do konstruktu/zadania, poprawny klucz lub opis poziomów rubryki z przykładami granicznymi; możliwe niejednoznaczności i accommodations.
3. Jawny czas przewidywany i limit, język/urządzenie, warunki przerwania/incydentu; syntetyczna treść bez użytecznego komercyjnego deliverable.
4. Niezależne oceny ekspertów, rozbieżności i sposób rozstrzygnięcia; nie zastępować pierwszej oceny wspólnym uzgodnieniem.
5. Metoda pilotażu i uncertainty; badacz dobiera próbę i analizę do celu. Mała próba nie staje się normą populacyjną, a brak wyniku grupy oznacza UNKNOWN.
6. Raport ograniczeń, accessibility/fairness, procedura odwołania/korekty/unieważnienia i zakres porównywalności. Bez porównywania różnych definicji/rubryk/revisions jako tego samego testu.

Istniejący SKILL_VALIDATION_PACKET przypina katalog i wykrywa alias collisions, lecz nie tworzy empirycznych relacji ani walidacji testu. Nie dopisywać do niego hipotetycznych uczestników, ekspertów, confidence czy pozytywnych wyników.

## K050/K051 — protokół shadow i fairness

Eksperyment dopiero po zatwierdzeniu danych/dostawcy/age/privacy: przypięty model/provider/prompt/schema i wersja rubryki; zbiór odpowiedzi z legalnym zakresem użycia; niezależne human scores jako reference; split zapobiegający przeciekowi przykładów; blinded review rozbieżności. Model nie wpływa na publikację, ranking, odrzucenie ani obecny wynik kandydata. Manual fallback i możliwość korekty pozostają.

Analiza do uzgodnienia eksperta: rozkład błędów i niepewność, różnice według zadań/urządzenia/języka i dozwolonych grup, abstention/missingness, zgodność ocen ekspertów, false positive/negative i rozbieżności. Nie ustalono nowego progu zgodności ani nie zaczęto zbierać danych szczególnych. Grupowanie wrażliwych danych wymaga konkretnej podstawy i ochrony, nie deklaracji „dla fairness”. Udokumentować też przypadki przeczące hipotezie.

Pakiet human oversight: osoba ma kompetencje/czas do review, widzi ograniczenia i pierwotną odpowiedź/rubrykę, może odrzucić sugestię bez kary, uzasadnić korektę i obsłużyć appeal. Sam przycisk potwierdzenia nie jest dowodem rzeczywistego nadzoru. Decyzja o późniejszym wpływie AI musi być odrębna i jawna.

## Wymagany wynik badacza / eksperta

Referencja rzeczywistego recenzenta, protokół i daty, wersje wszystkich materiałów, sposób doboru i faktyczna próba, evidenceRefs do zgód/ocen poza Git, wyniki z ograniczeniami, kontrdowody, rekomendacja i konkretne warunki/NO_GO. Puste pole nie jest PASS. Wszystkie zewnętrzne zadania zachowują EXTERNAL_BLOCKED.
