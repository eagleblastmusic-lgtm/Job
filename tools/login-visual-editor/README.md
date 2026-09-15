# Job — Login Visual Editor

Prosty, niezależny edytor wyglądu ekranu logowania. Nie modyfikuje działania głównej aplikacji.

## Funkcje

- podgląd ekranu logowania na żywo,
- użycie aktualnego `public/login-background.png`,
- wgranie własnego obrazu tła,
- zmiana koloru tła,
- ustawienie pozycji tła w osi X/Y,
- włączenie/wyłączenie ciemnej warstwy,
- regulacja siły przyciemnienia,
- edycja logo, nadtytułu, nagłówka, opisu, trzech punktów, nazwy zakładki i tekstu przycisku,
- zapis ustawień w `localStorage`,
- eksport ustawień do pliku JSON,
- reset do wartości początkowych.

## Uruchomienie

Najprościej na Windows uruchomić:

```text
tools/login-visual-editor/Start-Editor.bat
```

Można też po prostu otworzyć `tools/login-visual-editor/index.html` w przeglądarce.

Alternatywnie, z katalogu głównego repozytorium:

```bash
python -m http.server 8080
```

A potem wejść na:

```text
http://localhost:8080/tools/login-visual-editor/
```

## Uwaga o wgranym tle

Własny obraz wybrany z dysku jest używany tylko w bieżącej sesji przeglądarki. Zapis/eksport zachowuje pozostałe ustawienia, ale celowo nie zapisuje danych obrazu jako Base64, aby nie rozdmuchiwać `localStorage` i plików JSON.
