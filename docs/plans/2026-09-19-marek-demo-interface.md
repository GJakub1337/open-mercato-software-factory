# Plan: odchudzony interfejs demo dla Marka

**Data**: 2026-09-19
**Status**: zaakceptowany do lokalnego prototypu
**Źródło scenariusza**: [SPEC-004](../specs/SPEC-004-2026-09-18-demo-stal-zbiorniki.md)

## Cel

Przygotować lokalny interfejs Open Mercato dla Marka, właściciela Stal-Zbiorniki, który pokazuje
wyłącznie powierzchnie potrzebne do trzech scen na żywo z SPEC-004. Odchudzenie ma skrócić czas
szukania funkcji podczas pięciominutowego pitchu, ale nie może usuwać modułów ani osłabiać
autoryzacji potrzebnej do wykonania scenariuszy.

Plan dotyczy konfiguracji persony, nawigacji i przygotowania prezentacji. Nie zastępuje
funkcjonalnych braków opisanych w SPEC-004.

## Decyzje zamknięte

- Dashboard nie jest częścią prezentacji i nie jest ekranem startowym Marka.
- Nie usuwamy modułów z `src/modules.ts`. Ograniczamy widoczność przez osobną rolę demo oraz
  preferencje bocznego menu.
- Marek ma osobnego użytkownika przypisanego wyłącznie do roli demo. Nie łączymy jej z rolą
  administratora, ponieważ uprawnienia są sumowane.
- Wybranym wariantem prezentacyjnym czatu jest bezpośredni panel „Chat” zadokowany po prawej
  stronie. Marek otwiera go z górnego paska lub istniejącym skrótem i wpisuje w nim polecenie.
- Selektor „AI assistants” pozostaje zainstalowany, ale nie jest częścią ścieżki pitchu. Nie
  pokazujemy jury ekranu konfiguracji providera i nie dodajemy drugiej pozycji czatu do menu.
- Wersja demo używa świeżego tenanta utworzonego z `--no-examples` oraz danych Stal-Zbiorniki.
- Pitch używa jednego okna z wcześniej przygotowanymi kartami. Prezenter nie wpisuje adresów URL.
- Język widoczny podczas prezentacji jest polski.

## Trzy user stories i potrzebne powierzchnie

| ID | User story | Wejście | Potrzebne powierzchnie | Widoczny wynik |
|---|---|---|---|---|
| US-01 | Jako Marek chcę poprawić błędne dane ZDP-5000 po rozmowie z asystentem, żebym mógł zatwierdzić zmianę przed jej zastosowaniem. | Produkt `ZDP-5000` | Produkty, czat AI, Tablica zadań, Caseload, szuflada zadania | Pojemność 5200 l i wymiary, propozycja zatwierdzona, status `applied` |
| US-02 | Jako Marek chcę dodać ZWM-1500 jako produkt „Od ręki”, żeby agent przygotował stronę produktu, którą zatwierdzę po obejrzeniu podglądu. | Formularz nowego produktu | Produkty, formularz produktu, Tablica zadań, szuflada zadania, PR, preview, strona na żywo | Nowa karta produktu, zielone checki, kliknięcie publikacji, zadanie w `Done` |
| US-03 | Jako handlowiec chcę oznaczyć zamówienie Park of Poland jako zrealizowane, żeby agent przygotował logo klienta i kartę realizacji do zatwierdzenia przez Marka. | Zamówienie `SO-2026-0042` | Zamówienia, Tablica zadań, szuflada zadania, artefakt researchera, PR, preview, strona na żywo | Status `Fulfilled`, logo i realizacja na stronie po zatwierdzeniu |

## Minimalny kontrakt interfejsu

### Boczne menu

Widoczne są tylko cztery główne miejsca pracy:

1. **Zadania**: `/backend/staff/time-tracking/board`
2. **Produkty i usługi**: `/backend/catalog/products`
3. **Zamówienia**: `/backend/sales/orders`
4. **Caseload**: `/backend/caseload`

Ekrany szczegółów i formularze pozostają osiągalne z powyższych list, ale nie dostają osobnych
pozycji w menu. Dotyczy to między innymi szczegółów produktu, formularza nowego produktu,
szczegółów zamówienia, tablicy projektu DEMO i szczegółów propozycji w Caseloadzie.

Z menu ukrywamy między innymi Dashboard, Kategorie, Firmy, Projekty, kanały sprzedaży, oferty,
zasoby, zespoły, urlopy, ewidencję czasu, raporty, automatyzacje, ustawienia techniczne agentów,
Playground, procesy, ślady i audyt. Ukrycie pozycji menu nie zastępuje kontroli dostępu do trasy.

### Górny pasek

- Przycisk AI pozostaje widoczny dzięki `ai_assistant.view`.
- Akcja używana przez Marka ma otwierać bezpośredni panel „Chat”. Selektor „AI assistants” może
  pozostać dostępny poza prezentacją, ale nie może przerwać sceny ekranem konfiguracji.
- Provider i jeden właściwy asystent są przygotowane przed próbą. Sekrety pozostają wyłącznie w
  zatwierdzonym lokalnym magazynie lub środowisku uruchomieniowym.
- Nie tworzymy osobnego ekranu ani pozycji menu dla czatu.
- Wyszukiwanie globalne, wiadomości i powiadomienia nie są potrzebne w pitchu i nie otrzymują
  uprawnień roli demo.
- Przełącznik organizacji i profil mogą pozostać jako standardowe elementy powłoki.

### Ekran startowy i karty prezentacji

Sesja prezentacyjna zaczyna się na tablicy zadań, nie na Dashboardzie. Karty są przygotowane
zgodnie z SPEC-004:

1. Tablica zadań projektu DEMO.
2. Produkt `ZDP-5000`.
3. Caseload.
4. Formularz nowego produktu.
5. PR i preview sceny produktu.
6. Zamówienie `SO-2026-0042`.
7. PR i preview sceny realizacji.
8. Strona na żywo.

## Persona i uprawnienia

Rola demo ma najmniejszy zestaw funkcji pozwalający przeprowadzić trzy sceny:

- `catalog.products.view`
- `catalog.products.manage`
- `catalog.categories.view`
- `customers.companies.view`
- `sales.orders.view`
- `sales.orders.manage`
- `sales.orders.approve`
- `staff.timesheets.projects.view`
- `staff.timesheets.tasks.view`
- `staff.timesheets.tasks.manage`
- `task_delegation.view`
- `task_delegation.delegate`
- `agent_orchestrator.proposals.view`
- `agent_orchestrator.proposals.dispose`
- `ai_assistant.view`

Lista jest punktem wyjścia do lokalnej próby. Przed utrwaleniem konfiguracji trzeba potwierdzić
rzeczywiste wymagania każdej trasy i komendy. Nie dodajemy wildcardów. `tenantId` i
`organizationId` pochodzą z zalogowanej sesji i każda operacja ma działać wyłącznie w wybranej
organizacji.

Użytkownik Marka musi być członkiem projektu DEMO, osobą przypisaną do odpowiednich zadań oraz
osobą uprawnioną do zatwierdzenia publikacji. Dane logowania nie trafiają do repozytorium,
dokumentacji ani logów.

## Realizacja

### Etap 1: lokalny prototyp bez zmian w kodzie

1. Uruchomić świeżą, jednorazową bazę i wykonać inicjalizację z `--no-examples`.
2. Uruchomić `demo_fixtures seed-stal-zbiorniki` dla właściwego tenanta i organizacji.
3. Utworzyć lokalnego użytkownika Marka i rolę demo przez wspierane mechanizmy `auth`.
4. Nadać wyłącznie wymagane funkcje i członkostwo w projekcie DEMO.
5. Zapisać preferencje bocznego menu dla roli lub użytkownika z czterema widocznymi miejscami
   pracy.
6. Ustawić polski locale, sprawdzić bezpośrednie otwarcie panelu „Chat” i przygotować karty
   prezentacji.
7. Wykonać zrzuty przed i po oraz przejść nawigacyjnie przez powierzchnie trzech scen bez
   wpisywania adresów.

Ten etap nie tworzy commita i nie zmienia wspólnego `main`.

### Etap 2: powtarzalna konfiguracja po akceptacji zespołu

Po zaakceptowaniu prototypu konfigurację można utrwalić w `demo_fixtures` jako idempotentny,
lokalny profil demonstracyjny:

- osobna funkcja konfigurująca rolę, funkcje, preferencje menu i członkostwo w projekcie DEMO;
- wywołanie z istniejącej komendy `seed-stal-zbiorniki`;
- testy ponownego uruchomienia, izolacji organizacji, dokładnego zestawu funkcji i menu;
- aktualizacja runbooka demo bez zapisywania sekretów.

Utrwalenie jest osobnym krokiem implementacyjnym. Przed jego rozpoczęciem należy podać dokładną
listę plików, ryzyka i komendy weryfikacyjne, ponieważ zmiana obejmie co najmniej trzy pliki.

## Kryteria odbioru

- **AC-01**: po zalogowaniu Marek zaczyna pracę na tablicy DEMO, a Dashboard nie jest potrzebny.
- **AC-02**: boczne menu pokazuje tylko Zadania, Produkty i usługi, Zamówienia oraz Caseload.
- **AC-03**: przycisk AI pozostaje widoczny na stronie `ZDP-5000`, otwiera bezpośredni panel
  „Chat”, nie pokazuje podczas pitchu konfiguracji providera i nie ma duplikatu w menu.
- **AC-04**: z odchudzonego interfejsu można otworzyć formularz produktu, tablicę DEMO, szufladę
  zadania i Caseload. Gotowość operacji biznesowych ocenia SPEC-004, nie ten plan.
- **AC-05**: z odchudzonego interfejsu można otworzyć `SO-2026-0042` i kontrolkę zmiany statusu.
  Działanie intake sceny 3b pozostaje zewnętrznym warunkiem funkcjonalnym.
- **AC-06**: pozycje spoza whitelisty są ukryte, a bezpośrednie wejście na trasę bez wymaganej
  funkcji kończy się odmową dostępu.
- **AC-07**: na ekranie nie ma przykładowych danych Acme ani ogólnych widgetów Dashboardu.
- **AC-08**: wszystkie widoczne etykiety, statusy, komunikaty błędu i puste stany używane w pitchu
  są po polsku.
- **AC-09**: powierzchnie trzech scen da się odwiedzić w kolejności SPEC-004 bez wpisywania URL i
  bez szukania funkcji poza przygotowanymi kartami.
- **AC-10**: menu oraz czat są obsługiwalne klawiaturą, a główne ekrany przechodzą smoke test przy
  szerokim i wąskim widoku.

## Weryfikacja

### Lokalny prototyp

- zalogowanie jako Marek i kontrola widocznych pozycji menu;
- kontrola odmowy dostępu dla co najmniej jednej trasy spoza zakresu;
- otwarcie bezpośredniego panelu „Chat” z produktu `ZDP-5000`, bez selektora i komunikatu o
  brakującym providerze;
- smoke nawigacyjny powierzchni US-01, US-02 i US-03 na danych Stal-Zbiorniki;
- zrzuty ekranu szerokiego i wąskiego widoku;
- potwierdzenie braku danych Acme i pustych widgetów Dashboardu.

### Utrwalona konfiguracja

- `yarn generate`
- testy jednostkowe konfiguracji persony demo;
- samodzielny test integracyjny roli, nawigacji i trzech wymaganych tras;
- `yarn typecheck`
- `yarn lint`
- `yarn ds:check`
- `yarn build`

## Ryzyka i zabezpieczenia

| Ryzyko | Zabezpieczenie |
|---|---|
| Połączenie roli demo z rolą administratora ponownie pokaże całe menu. | Osobny użytkownik z jedną rolą demo; test dokładnego zestawu ról. |
| Ukryte menu zostanie potraktowane jako autoryzacja. | Każdą trasę nadal chroni ACL; osobny test bezpośredniego wejścia. |
| `--no-examples` pominie dane wymagane przez fabrykę. | Po inicjalizacji uruchomić wyłącznie seed Stal-Zbiorniki i sprawdzić agenta, projekt DEMO oraz kolumny. |
| Marek nie będzie właścicielem zadania i nie zobaczy zatwierdzenia publikacji. | Jawnie przypisać Marka do projektu i zadań; sprawdzić przycisk przed próbą generalną. |
| Przycisk AI otworzy selektor asystentów lub komunikat o brakującym providerze zamiast czatu. | Skonfigurować provider poza repo, wskazać właściwego asystenta i sprawdzić bezpośrednie otwarcie panelu „Chat” przed prezentacją. |
| Czat będzie widoczny, ale intake nie zadziała. | Traktować pełny przepływ US-01 jako zewnętrzny warunek funkcjonalny SPEC-004 i sprawdzić go osobno przed prezentacją. |
| Nowa trasa modułu pojawi się w menu po aktualizacji frameworka. | Preferować minimalne ACL oraz test whitelisty nawigacji, nie tylko listę ukrytych elementów. |
| Odchudzenie UI zostanie uznane za zakończenie funkcjonalnych braków scen. | Gotowość każdej sceny oceniać według sekcji „Stan na dziś” w SPEC-004. |

## Stan funkcjonalny poza tym planem

Na dzień zapisania planu SPEC-004 nadal wskazuje braki niezależne od odchudzenia interfejsu:

- scena 2 wymaga pełnego chat intake i zmian rekordu widocznych w Caseloadzie;
- scena 3 wymaga ostatecznej próby na prawdziwym repo i stabilnego wyniku agenta Developer;
- scena 3b wymaga intake z `sales.order.updated`, researchera i runnera.

Lokalny prototyp menu może powstać wcześniej, ale nie może być przedstawiony jako dowód, że te
przepływy są ukończone.
