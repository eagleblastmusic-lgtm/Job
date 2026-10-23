# K062 — techniczna kontrola i protokół niezależnego odbioru

23.10.2026. K062 nadal EXTERNAL_BLOCKED. Wykonanie automatycznych sekwencji w prawdziwym Chromium nie jest badaniem z użytkownikiem, odsłuchem czytnika ani certyfikacją WCAG. Bazą jest [WCAG2.2](https://www.w3.org/TR/WCAG22/) oraz [WAI Easy Checks](https://www.w3.org/WAI/test-evaluate/preliminary/), które wyraźnie ograniczają zakres wstępnych sprawdzeń.

## Zakres techniczny

`e2e/faro-accessibility.spec.ts` wykonuje realne Tab/Shift+Tab/Enter/Escape i wpisywanie tekstu, bez programmatycznego focusowania kontrolek w teście. Synthetic fixtures uruchamiają realne HTTP/DB. Ten sam plik jest w default SQLite i jawnej liście PostgreSQL Node22/24, desktop i emulowany Pixel7. To emulacja przeglądarkowa, nie fizyczny telefon.

| Przepływ | Właściwość sprawdzana | Ograniczenie |
|---|---|---|
|Login kandydata i powrót do workspace|Kolejność Tab, rzeczywiste Enter, focus po zakończeniu odczytu, outline i brak zasłonięcia punktu centralnego|Nie mierzy odsłuchu czytnika ani wszystkich wariantów przeglądarki.|
|Profil → realny server400 → poprawka i zapis|Używalna klawiaturą ścieżka błędu; komunikat role=alert, atomic, fokusowany; następnie poprawny zapis|Generyczny błąd serwera nie jest mapowany na konkretne pole bez dowodu. Nie oznaczono wszystkich pól jako invalid.|
|Disclosure kompetencji, własna prywatność/eksport|Enter otwiera details, role/name kontrolek, brak pułapki klawiaturowej, axe|Badanie rozumienia informacji pozostaje K007.|
|Przestrzeń pracodawcy, edytor oferty i organizacja|Zmiana natywnego select klawiaturą; reflow320 CSSpx i powiększony tekst; brak poziomego overflow dokumentu|320 CSSpx to odpowiednik reflow desktop1280 przy400%; nie wykonano natywnego zoom400%. Powiększenie tekstu przez CSS jest jawnie technicznym przybliżeniem200%.|
|Modalny preview NO-CV|Nazwa z widocznego nagłówka, initial focus, brak dostępu Tab do tła, Escape i powrót do trigger, brak utworzenia interest bez potwierdzenia|Natywny dialog pozwala przejść do chrome przeglądarki; test dopuszcza tę granicę, ale kolejny Tab musi wrócić do dialogu. Nie dodano niestandardowej pułapki blokującej przeglądarkę.|
|Dotychczasowe process/assessment/MFA/incident/restriction flows|Istniejące realne journeys i axe/reflow; autosave/live status, wersje i expiry|Same istniejące axe nie oznacza pełnego manualnego odbioru każdego flow.|

Dowody i ostateczne wyniki poleceń: INDEPENDENT_READINESS_2026_10_23.md oraz evidence/independent-readiness-20261023. Wcześniejszy failing run z24be6a3 jest zachowany jako dowód błędu formularza. Reflow z powiększonym tekstem odtworzył overflow f-session; modalny flow wykazał utratę focusu po Escape, ponieważ wywołujący przycisk był czasowo disabled przy otwieraniu. Nie wyłączono reguł axe.

Poprawki ograniczone do przyczyny: fokusowany error alert, aria-labelledby dialogu projekcji, jawny powrót focusu do nadal istniejącego aktywnego triggera w obu modalach, zawijanie sesji/nazw w wąskim widoku. Public-shell cachev3 dostarcza aktualny klient/CSS; API/odpowiedzi nadal nie są trwałym cache.

## Gotowy protokół manualny recenzenta

Recenzent zapisuje actual build/URL, datę, OS, przeglądarkę/wersję, rozmiar i ustawienia zoom/tekstu, urządzenie wejściowe, czytnik/wersję i zakres niezależności. Syntetyczne konta z właściwymi rolami, bez realnych odpowiedzi/telefonów. Nie wyłączać MFA/RBAC, żeby ułatwić test.

| Próba | Działanie i oczekiwany obserwowalny efekt | Dowód zwrotny |
|---|---|---|
|Keyboard-only|Login, skip link, nawigacja, profil, oferta, preview/close/confirm, proces, assessment, privacy, MFA. Tab/ShiftTab/Enter/Space/strzałki; żadnej myszy. Focus widoczny i nie całkiem zasłonięty, logiczna kolejność i możliwość wyjścia.|Krok, active control, zrzut/krótki zapis i faktyczny blocker/NO_ISSUE; zachowanie na błędzie/opóźnieniu.|
|Desktop reader|NVDA/Firefox lub NVDA/Chrome według kompetencji recenzenta; nagłówki, landmarks, nazwy i stany kontrolek, przegląd formularzy. Odsłuchać login error, dynamiczny skill search, form error, dialog title/close, autosave/offline/conflict/expiry i aktualną ważność wyniku.|Dokładnie co zostało odczytane i kiedy; brakujący/powtórny/niezrozumiały komunikat. DOM aria snapshot nie jest odsłuchem.|
|Native zoom / resize|Natywny zoom200% i400% na desktop; tekst-only200%, text spacing1.5line-height/2em paragraph/.12em letter/.16em word. Brak utraty treści i funkcji; kontrolowane przewijanie tabel porównania zamiast całego dokumentu.|Zrzuty pełnej strony + elementy przycięte/nałożone; browser settings jako część dowodu.|
|Kontrast / preferencje|Kontrast treści, placeholder, focus, disabled/error/selected; forced colors/high contrast i reduced motion. Nie polegać wyłącznie na kolorze.|Zmierzony kolor/tło/stan i obserwacja funkcji. Nie deklarować AA na podstawie samego paletowego koloru.|
|Mobile reader / touch|Fizyczny Android+TalkBack lub iOS+VoiceOver; swipe reading, activation, virtual keyboard, dialog, live message, sticky nav. Kontrolki nie zasłonięte; target size/spacing właściwe.|Urządzenie, gest, bariera, screenshot/nagranie za zgodą. Emulacja viewport nie jest tym dowodem.|
|Awarie i timer|Offline/reconnect/409, niepewne potwierdzenie, submit i expiry; możliwość rozpoznania i odzyskania stanu. Sprawdzić zasady czasu i ewentualne accommodations z ekspertem.|Realna sekwencja, co użytkownik zrozumiał; brak ukrytego resetu expiry czy automatycznej odmowy.|

Dla znalezionej bariery: `findingId, flow, build, device/AT, steps, expected, observed, impact, applicableCriterion, evidenceRef, fixRef, retestBy/date, residualLimitations`. Kryteria m.in.2.1.1/2.1.2 keyboard,2.4.3/2.4.7/2.4.11 focus,1.4.4/1.4.10/1.4.12 resize/reflow/spacing,3.3.1/3.3.2 errors/labels,4.1.2/4.1.3 names/status. To mapa do weryfikacji, nie deklaracja zgodności wszystkich kryteriów.

Pole końcowego odbioru: reviewerReference=null; independence=null; actual AT evidence=[]; unresolved barriers=UNKNOWN; decision=null. Nie traktować UNKNOWN jako brak barier. Nie wykonano odsłuchu czytnika, natywnego zoom ani fizycznego mobile i pozostają one jawnie do rzeczywistego odbioru.
