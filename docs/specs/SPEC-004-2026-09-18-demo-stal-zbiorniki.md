# SPEC-004: Demo: Stal-Zbiorniki, producent zbiorników stalowych prowadzi swoją stronę z Open Mercato

**Status**: Draft
**Właściciel**: zespół HackOn · **Data**: 2026-09-18 · **Tracker**: —
**Nadrzędna**: [SPEC-001](./SPEC-001-2026-09-18-agentic-software-factory.md) (persona właściciela
firmy i scenariusz danych biznesowych), pokazuje [SPEC-002](./SPEC-002-2026-09-18-tasks-module.md)
(delegowanie na tablicy) i [SPEC-003](./SPEC-003-2026-09-18-task-change-set.md) (zmiany rekordów
z widokiem przed → po).

## TLDR

Niedzielny pitch to 5 minut prezentacji i 3 minuty Q&A. Opowiada jedną historię o jednej firmie.
**Stal-Zbiorniki Sp. z o.o.** to fikcyjny producent zbiorników stalowych wzorowany na
[metal-zbiorniki.pl](https://metal-zbiorniki.pl/). Jej właściciel, Marek, nie ma programisty i nigdy
nie czyta diffów. Z tablicy zadań w Open Mercato poprawia błędny rekord produktu, wprowadza nowy
zbiornik z magazynu na stronę jako zrecenzowany PR z preview i widzi, że zmiana regulaminu czeka
na prawnika. Ten spec ustala fabułę, dane demo (seedowane przez moduł `demo_fixtures`), docelową
stronę, plany awaryjne i odpowiedzi na Q&A. Nie dodaje żadnego zachowania produktu.

## Otwarte pytania

- **Q1. Stack docelowej strony.** (a) WordPress, czyli to, co miałaby prawdziwa firma. Jego
  strony żyją w bazie danych, więc preview dla każdego uruchomienia wymaga osobnej bazy. (b) Strona
  statyczna (Astro albo eksport Next), w której każdy produkt to plik Markdown w repo. PR jest
  wtedy czytelnym diffem, a preview na Vercel lub Cloudflare dostajemy za darmo. Rekomendacja: (b),
  ostylowana jak prawdziwa strona i przedstawiana jako „strona firmy”. WordPress trafia na slajd
  z roadmapą.
- **Q2. Język pitchu.** Polski (jury i persona) albo angielski (odbiorcy Open Mercato). Slajdy
  i dane na ekranie idą za tym wyborem. Seedowany katalog jest po polsku w obu przypadkach, bo
  firma jest polska.
- **Q3. Uruchomienia agenta na żywo czy nagrane.** Uruchomienie kodujące w scenie 3 trwa kilka
  minut. Opcje: (a) uruchomić je przed pitchem i pokazać gotowy PR na żywo; (b) odtworzyć nagrany
  40-sekundowy zapis ekranu z uruchomienia, a resztę pokazać na żywo. Rekomendacja: (a), z (b)
  jako zapasem.

## Opis problemu

Dotychczasowe demo ze SPEC-001 było generyczne: „docelowe repo z jednym feature requestem”. Jury
zapamiętuje osobę z problemem, nie architekturę. Najmocniejsza teza fabryki, że wyzwalacz żyje
we własnym systemie ewidencji firmy, potrzebuje firmy, której rekordy i strona widocznie się
rozjeżdżają. Prawdziwa metal-zbiorniki.pl dobrze pokazuje ten wzorzec:

- Sprzedaż przychodzi przez formularz „Wyślij zapytanie”, trzy skrzynki mailowe i trzy numery
  telefonów. Oferty żyją w Excelu i mailach.
- Sekcja „Od ręki” (dostępne od ręki) wymienia trzy gotowe zbiorniki. Gdy zbiornik zostanie
  zbudowany albo sprzedany, strona musi się zmienić tego samego dnia, inaczej firma wycenia
  zbiorniki, których już nie ma.
- Produkty mają parametry techniczne (pojemność, gatunek stali, atesty PZH i UDT), w których błędna
  liczba sporo kosztuje, więc zmiany potrzebują widoku przed → po i możliwości cofnięcia.

Używamy fikcyjnej nazwy, żeby w demo nie pojawiła się żadna prawdziwa marka bez zgody właściciela.

## Persona

**Marek, 52 lata, właściciel Stal-Zbiorniki** (okolice Wrocławia, założona w 2008, ~35 osób, 20+
klientów przemysłowych). Prowadzi sprzedaż, katalog i pracowników w Open Mercato. Strona firmy to
repo podłączone jako projekt. W firmie nie ma programisty. Agencja kasuje go za każdą zmianę
i robi ją dwa tygodnie. Zatwierdza plany i preview, ale nigdy kod. Jego prawnik recenzuje
wszystko, co dotyczy warunków sprzedaży.

## Fabuła (5:00)

| Czas | Scena | Na ekranie | Dowodzi | Zależy od |
|---|---|---|---|---|
| 0:00–0:35 | **1. Hook** | Slajd: Marek, realistycznie wyglądająca strona, nieaktualna sekcja „Od ręki”, Excel z ofertami | problemu, w jednej osobie | niczego |
| 0:35–1:50 | **2. Poprawa rekordu** | Marek na stronie produktu, asystent AI: „ZDP-5000 ma 5200 l, nie 5000, i brakuje wymiarów”. Pojawia się zadanie, delegowane. Caseload pokazuje jedną zmianę w *ZDP-5000*: tytuł, opis, wymiary przed → po. Zatwierdza, rekord się aktualizuje, a szuflada zadania pokazuje `applied`. | plan przed działaniem; bramka człowieka; compare-and-set; nic ukrytego | SPEC-002 chat intake, SPEC-003 Faza 1 |
| 1:50–3:40 | **3. Katalog → strona** | Marek dodaje *ZWM-1500 Zbiornik mobilny na wodę pitną 1500 l* z zaznaczonym „Od ręki”. Tablica pokazuje nowe zadanie, delegowane, z `catalog.product.created`. Przeskok do gotowego uruchomienia: „single shot” sizera, PR w repo strony, link do preview z nową kartą w „Od ręki”, ścieżka recenzji *waiver: new product page*, zmergowany. Strona na żywo pokazuje zbiornik. | wyzwalacz jest w systemie ewidencji, którego fabryki widzące tylko repo nie widzą; recenzja kierowana według klasy zmiany | SPEC-001 kroki 2–3 i scenariusz danych biznesowych |
| 3:40–4:20 | **4. Kontrast** | Zadanie „Wydłuż gwarancję w regulaminie do 5 lat” dochodzi do PR, a zadanie stoi w `in_review` z „waiting for: legal”. Element Caseload recenzenta prawnego pokazuje wyrenderowany diff tekstu. | zmiany niskiego ryzyka mergują się według polityki, tekst prawny nigdy | SPEC-001 kierowanie recenzji |
| 4:20–5:00 | **5. Co dalej** | Jeden slajd: InboxOps (mail z zapytaniem ofertowym → zadanie), WordPress, wyniki ewaluacji i koszt na zadanie z orkiestratora | że to uogólnia się poza kod | niczego |

Zasady części na żywo:

- Jedno okno przeglądarki z otwartymi już kartami: tablica, strona produktu, Caseload, PR, preview,
  strona na żywo. Żadnego wpisywania URL-i na scenie.
- Mówimy „Marek” i „zbiornik”, nigdy „encja”, „instancja workflow” ani „efektor”.
- Każda scena kończy się widoczną zmianą stanu: kolumną, znaczkiem, stroną.

## Dane demo

Seedowane przez moduł `demo_fixtures` (`src/modules/demo_fixtures/lib/stalZbiorniki.ts`):

- Sześć kategorii: woda, paliwa, chemia, ochrona przeciwpożarowa, urządzenia procesowe oraz
  **„Od ręki”** (lista dostępnych od ręki, którą renderuje strona).
- Siedem produktów z cenami netto w PLN (brutto z 23% VAT), wagą, wymiarami w mm i parametrami
  technicznymi w `metadata` (`capacityLiters`, `material`, `certifications`, `inStock`).
- **`ZDP-5000` jest błędny celowo.** Pojemność wynosi 5000 l, a prawdziwa wartość to 5200 l,
  a wymiary są puste. Scena 2 to poprawia. Seeder jest idempotentny po handle i nigdy nie
  nadpisuje, więc poprawiony rekord zostaje poprawiony po kolejnych seedach. Żeby zresetować stan
  między próbami, trzeba odtworzyć tenant demo.
- **`ZWM-1500` nie jest seedowany.** Marek dodaje go na żywo w scenie 3: tytuł *Zbiornik mobilny
  na wodę pitną 1500 l*, SKU `ZWM-1500`, stal nierdzewna 1.4301, PZH, 1500 l, 11 900 PLN netto,
  w kategorii „Od ręki”.

Seedowanie zapisuje przez entity manager, tak jak przykładowy seeder katalogu w core, więc nie
emituje `catalog.product.created` i nigdy nie uruchamia fabryki.

Punkty wejścia:

- `yarn initialize` seeduje go razem z przykładami z core, w tym produktami meblowymi. Wystarczy
  do developmentu.
- Dla instancji demo `yarn mercato init --no-examples`, a potem
  `yarn mercato demo_fixtures seed-stal-zbiorniki --tenant <id> --org <id>` daje katalog, który
  zawiera tylko zbiorniki.

Moduł włącza z core `catalog` i `sales` (`src/modules.ts`). `sales` jest potrzebny, bo przykładowy
seeder katalogu w core zapisuje kanał sprzedaży i stawki podatku, a SPEC-003 i tak potrzebuje
`catalog`.

## Docelowa strona

Osobne repo, `stal-zbiorniki-www`, z takim samym wyglądem jak prawdziwa strona: strona główna,
strony kategorii, „Od ręki”, szablon strony produktu i `regulamin` (warunki sprzedaży). Jej build
czyta produkty z plików w repo (Q1 (b)), więc PR ze sceny 3 dodaje jeden plik i obrazek. Ma:

- deployment preview dla każdego PR, do którego linkuje ścieżka recenzji;
- test Playwright sprawdzający, że strona nowego produktu się renderuje i pojawia w „Od ręki”. To
  teza „done sprawdzane względem danych” ze SPEC-001, bo test czyta SKU z zadania;
- zainstalowaną GitHub App ze SPEC-001 i ochronę gałęzi z jednym wymaganym checkiem.

## Plany awaryjne

Każdy plan awaryjny zachowuje historię. Zmieniają się tylko sceny, których dotyczy.

| Jeśli to nie działa do zamrożenia w niedzielę o 11:00 | Scena | Zamiast tego |
|---|---|---|
| Chat intake (SPEC-002) | 2 | Marek tworzy zadanie na tablicy ręcznie i je deleguje |
| Zmiany `record` (SPEC-003) | 2 | wyciąć scenę 2 i oddać czas scenie 3 |
| Runner nie otwiera PR-ów | 3 | fallback runnera ze SPEC-001 (Claude Managed Agents); jeśli i on zawiedzie, nagrane uruchomienie (Q3 (b)) |
| Kierowanie recenzji według klasy zmiany | 4 | powiedzieć to przy PR ze sceny 3; ścieżkę prawną pokazać jako jeden slajd |
| Wszystko, co wymaga runnera | 3, 4 | proces `factory.status` ze SPEC-001: cotygodniowy status dla Marka, harmonogram → artefakt → zatwierdzenie → publikacja |
| Sieć na miejscu | wszystkie | nagrane pełne uruchomienie, komentowane na żywo |

## Przygotowanie do Q&A (3:00)

Prawdopodobne pytania i odpowiedź w dwóch zdaniach na każde:

- **„Co jeśli agent się myli?”** Proponuje, zanim działa. Marek zatwierdza widok przed → po,
  nieaktualna propozycja przechodzi w `conflict` zamiast nadpisywać, a zmianę rekordu można cofnąć.
  Kod wychodzi tylko jako PR z preview i polityką, kto go recenzuje.
- **„Dlaczego nie agenci Linear, Jira albo Copilot?”** Widzą repo, a nie biznes. Tutaj zadanie
  zaczyna się od dodania produktu, a „done” jest sprawdzane względem tego produktu.
- **„Kto odpowiada?”** Człowiek przypisany do zadania. Agent jest delegatem, a każda akcja jest
  w logu audytu pod osobą, która ją zatwierdziła.
- **„Ile kosztuje zadanie?”** Orkiestrator zapisuje koszt każdego uruchomienia, a my pokazujemy go
  przy zadaniu. Podajemy liczbę zmierzoną na próbie generalnej, nie szacunek.
- **„Czy to open source?”** Open Mercato jest na MIT. Agent Orchestrator jest source-available:
  darmowy lokalnie, a produkcja wymaga licencji enterprise. Nasze moduły to zwykłe moduły Open
  Mercato.
- **„Czy działa z WordPressem?”** Nie w demo. To kolejny cel, a kontrakt runnera się nie zmienia.
- **„A dane z maili?”** InboxOps jest na roadmapie: mail z zapytaniem ofertowym staje się
  zadaniem dopasowanym do produktów z katalogu.

## Ryzyka

- **LLM na żywo na scenie.** Łagodzimy przez wcześniejsze uruchomienie sceny 3 (Q3) i przez to, że
  każdy krok na żywo to jedno kliknięcie na stanie, który próba generalna już osiągnęła.
- **Pomylenie z prawdziwą marką.** Nazwa, logo i numery telefonów są fikcyjne. Spec przywołuje
  prawdziwą stronę tylko jako materiał badawczy.
- **Seedowane meble na instancji demo.** Używamy punktu wejścia `--no-examples`.

## Plan wdrożenia

### Faza 1: Dane i skrypt (piątek)

1. Moduł `demo_fixtures` z seedem Stal-Zbiorniki i CLI; włączenie `catalog` i `sales`.
   *Test:* init jednorazowej bazy; siedem produktów w PLN, sześć kategorii, `ZDP-5000` bez
   wymiarów; drugie uruchomienie tworzy 0 produktów. **Zrobione.**
2. Przykłady ze SPEC-001 i SPEC-003 przeniesione na ZDP-5000. **Zrobione.**

### Faza 2: Strona (sobota rano, właściciel infrastruktury)

3. Repo `stal-zbiorniki-www` (zgodnie z Q1), produkty jako pliki, strony „Od ręki” i `regulamin`,
   preview dla każdego PR. *Test:* ręcznie zrobiony PR dodający `ZWM-1500` dostaje preview
   pokazujące go w „Od ręki”.
4. Test Playwright czytający SKU. *Test:* nie przechodzi na `main` i przechodzi na PR z kroku 3.

### Faza 3: Połączenie scen (sobota, razem z krokami 2–4 ze SPEC-001)

5. Scena 2 end to end na seedowanym `ZDP-5000`. *Test:* zatwierdzenie → rekord ma 5200 l
   i wymiary; szuflada pokazuje `applied`.
6. Scena 3 end to end od dodania `ZWM-1500` w UI katalogu. *Test:* zmergowany PR, strona na żywo
   pokazuje zbiornik, zadanie w `Done`.
7. Ścieżka prawna ze sceny 4. *Test:* zmiana w `regulamin` zostawia zadanie czekające na rolę
   prawną.

### Faza 4: Próby (sobota wieczór, niedziela do 11:00)

8. Slajdy do scen 1 i 5; nagranie zapasowego wideo z pełnego uruchomienia.
9. Dwie mierzone próby generalne na świeżym tenancie z punktem wejścia `--no-examples`. Zanotować
   koszt na zadanie do Q&A.

## Historia zmian

<!-- Record, not state: rows are closed once dated — append, never rewrite. -->

| Data | Zmiana |
|------|--------|
| 2026-09-18 | Szkic: persona i fabuła Stal-Zbiorniki, seed katalogu demo (`demo_fixtures`), docelowa strona, plany awaryjne, Q&A. |
