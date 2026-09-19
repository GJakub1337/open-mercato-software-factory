# SPEC-005: Strona Stal-Zbiorniki, docelowe repo fabryki na demo

**Status**: Draft
**Właściciel**: zespół HackOn · **Data**: 2026-09-19 · **Tracker**: —
**Nadrzędna**: [SPEC-004](./SPEC-004-2026-09-18-demo-stal-zbiorniki.md) (Q1 i sekcja „Docelowa
strona”), korzysta z kontraktu runnera i kierowania recenzji ze
[SPEC-001](./SPEC-001-2026-09-18-agentic-software-factory.md).

## TLDR

Firmowa strona Stal-Zbiorniki to publiczne repo
[`jtomaszewski/hackaton-stal-zbiorniki-landing`](https://github.com/jtomaszewski/hackaton-stal-zbiorniki-landing),
w którym fabryka otwiera PR-y w scenach 3 i 4 demo. To statyczna strona na **Astro**, a każdy
produkt to jeden plik Markdown w repo. PR „nowy zbiornik od ręki” to więc czytelny diff z jednym
plikiem. **Vercel** buduje preview dla każdego PR. Repo ma to, czego fabryka potrzebuje do
weryfikacji: jedną komendę do lokalnego uruchomienia, schemat odrzucający błędne dane, test
Playwright sterowany danymi, wymagany check w CI i ścieżki, które mapa recenzji ze SPEC-001
rozpoznaje bez wyjątków (`content` → waiver, `legal` → prawnik). Źródłem prawdy o produktach jest
katalog Open Mercato. Strona dostaje zmiany wyłącznie przez PR. Waiver merguje osobna tożsamość,
nigdy bot, który pisał kod.

## Problem

SPEC-001 zakłada, że możliwości agenta zależą od tego, jak dobrze da się zweryfikować docelowe
repo: testy, lokalne uruchomienie jedną komendą, CI, preview. Na demo nie ma jeszcze docelowego
repo. Sceny 3 („katalog → strona”) i 4 („regulamin czeka na prawnika”) potrzebują strony, która:

- wygląda jak strona producenta, bo jury ma uwierzyć w Marka;
- przyjmuje nowy produkt jako mały, czytelny PR;
- ma preview dla każdego PR. Linkuje do niego ścieżka recenzji i prawnik otwiera je bez konta
  GitHub ani Vercel;
- ma checki, które sprawdzają „done” względem katalogu, a nie tylko względem tego, co agent sam
  napisał;
- rozdziela ścieżki tak, że mapa recenzji ze SPEC-001 działa bez wyjątków.

## Proponowane rozwiązanie

**Produkty jako pliki w repo, nie pobierane z API.** Gdyby strona czytała katalog Open Mercato
przy buildzie, zmiana w katalogu trafiałaby na produkcję bez PR-a, bez recenzji i bez sceny 3.
Przy plikach droga jest jedna i widoczna: rekord w katalogu → zadanie → PR z plikiem → preview →
recenzja według klasy zmiany → merge → deploy.

**Astro zamiast Next.** Content collections walidują frontmatter schematem Zod przy buildzie, więc
błędny plik od agenta zatrzymuje build, zanim ktokolwiek go zobaczy. Strona nie ma JavaScriptu po
stronie klienta ani backendu. Next ze static export dałby to samo przy większej ilości kodu.

**Vercel.** Buduje preview dla każdego PR bez konfiguracji i publikuje jego URL w GitHub
deployment status. Projekt stoi na koncie Jacka, na planie Hobby, co wystarcza na niekomercyjny
hackathon. Odchodzi to od domyślnego preview ze SPEC-001 i SPEC-003 (stack runu na maszynie
runnera za Caddy) i dodaje wariant „preview hostowane przez docelowe repo”. Szczegóły są
w *Kontraktach*.

**Osobne publiczne repo.** GitHub App fabryki instalujemy tylko na nim, więc token bota ma dostęp
do jednego repo (wymaganie SPEC-001), a agent nie może pisać do kodu samej fabryki.

## Architektura

```
hackaton-stal-zbiorniki-landing/
├── AGENTS.md                         instrukcje dla agenta kodującego (patrz niżej)
├── README.md                         uruchomienie + ustawienia Vercel i rulesetu
├── astro.config.mjs                  output: 'static', site: produkcyjny URL
├── src/
│   ├── content.config.ts             kolekcje products, categories, legal ze schematami
│   ├── content/
│   │   ├── products/<sku>.md         jeden plik na produkt   ← klasa `content`
│   │   ├── categories.json           5 kategorii             ← klasa `content`
│   │   └── legal/regulamin.md        warunki sprzedaży       ← klasa `legal`
│   ├── assets/products/<shape>.svg   4 ilustracje według kształtu ← klasa `code`
│   └── layouts/, components/, pages/ wygląd i routing         ← klasa `code`
├── tests/site.spec.ts                Playwright, sterowany danymi
└── .github/workflows/site.yml        check `site`: build + Playwright
```

**Ścieżki a klasy zmian.** Mapa recenzji jest konfiguracją projektu w Open Mercato (SPEC-001),
nie plikiem w repo. Repo zobowiązuje się tylko do stałych ścieżek:

| Ścieżka | Klasa zmiany | Recenzja |
|---|---|---|
| `src/content/products/**`, `src/content/categories.json` | `content` | waiver, jeśli checki `site` i `factory/catalog-match` są zielone |
| `src/content/legal/**` | `legal` | prawnik w Caseload, na preview |
| wszystko inne | `code` | developer w GitHub |

Domyślna mapa SPEC-001 wysyła do `legal` także „pricing copy, product claims”, a plik produktu
ma cenę i atesty. W tym projekcie mapa celowo traktuje pliki produktów jako `content`. Zgodność
ceny i atestów z katalogiem sprawdza `factory/catalog-match`, a nie człowiek, bo źródłem tych
wartości jest rekord, który Marek już zatwierdził w katalogu.

**Strony.** Tylko te, które pojawiają się w scenach 3 i 4:

| Trasa | Zawartość |
|---|---|
| `/` | hero, pas „Od ręki” (do 3 produktów), lista wszystkich produktów pogrupowana po kategoriach, sekcja atestów (PZH, UDT, CNBOP), stopka z fikcyjnymi danymi kontaktowymi |
| `/od-reki` | produkty z `inStock: true` |
| `/produkty/<sku>` | ilustracja, nazwa, SKU, kategoria, tabela parametrów (pojemność, materiał, wymiary, waga, atesty), cena netto i brutto albo „Cena na zapytanie”, przycisk „Wyślij zapytanie” (`mailto:` na fikcyjny adres) |
| `/regulamin` | wyrenderowany `regulamin.md` |

Wygląd wzorujemy na układzie prawdziwej strony producenta (ciemny granat i stal, zdjęcie hali
w hero, gęsta tabela parametrów), ale nazwa, logo, telefony i klienci są fikcyjni. Strona jest po
polsku i responsywna, bo w demo pokażemy ją też na telefonie.

**Weryfikacja.** Trzy warstwy, z czego tylko ostatnia porównuje z katalogiem:

1. `astro build` odrzuca plik produktu, który nie spełnia schematu.
2. `tests/site.spec.ts` (check `site`) sam parsuje `src/content/products/*.md` przez
   `gray-matter`, bo `astro:content` nie działa w procesie Node Playwrighta. Test sprawdza
   unikalność SKU i to, że nazwa pliku to `sku` małymi literami. Potem na `astro preview`
   sprawdza, że każda karta pokazuje nazwę, SKU i cenę (albo „Cena na zapytanie”), że każdy
   produkt `inStock` jest na `/od-reki`, a żaden inny tam nie trafia, i że `/regulamin` się
   renderuje. Test czyta dane z plików, więc nowy produkt nie wymaga nowego testu.
3. **`factory/catalog-match`**, commit status wystawiany przez runner (SPEC-001) po otwarciu PR.
   Runner bierze rekord produktu z payloadu runu, otwiera `/produkty/<sku>` na preview Vercela
   i porównuje nazwę, SKU, cenę netto, pojemność i atesty. Tylko ta warstwa łapie błąd, w którym
   agent zapisał złą cenę spójnie w pliku i na stronie.

Checka `site` w CI nie odpalamy na preview Vercela, więc nie zależy od Vercela. Gałąź `main`
wymaga tylko `site`, żeby PR-y ludzi i PR-y ze zmianą regulaminu dało się zmergować bez
`catalog-match`. `catalog-match` wymaga polityka waivera, a nie ochrona gałęzi.

**`AGENTS.md` w repo** mówi agentowi kodującemu:

- komendy: `npm ci`, `npm run dev`, `npm run build`, `npm test`;
- jak zamienić rekord katalogu na plik produktu (tabela w *Model danych*);
- że nowy albo zmieniony produkt dotyka tylko `src/content/products/<sku>.md`;
- że `src/content/legal/**` zmienia tylko wtedy, gdy zadanie mówi o regulaminie;
- że brakującej wartości wymaganej nie zgaduje, tylko kończy run pytaniem do człowieka;
- że nie zmienia CI, testów, `package.json` ani lockfile, chyba że zadanie tego dotyczy. SPEC-001
  i tak oznacza takie pliki jako flagowane.

## Model danych

Kolekcja `products` (`glob` loader, `src/content/products/*.md`, ID wpisu = nazwa pliku = `sku`
małymi literami). Body pliku to opis produktu. Frontmatter nie ma pola `slug`, bo glob loader
użyłby go jako ID.

| Pole frontmattera | Typ | Z rekordu katalogu Open Mercato |
|---|---|---|
| (nazwa pliku) | `<sku małymi literami>.md` | `sku`; `handle` z katalogu pomijamy, bo UI generuje go z tytułu |
| `sku` | string | `sku` |
| `title` | string | `title` |
| `subtitle` | string, opcjonalne | `subtitle` |
| `category` | `reference('categories')` | pierwsza przypisana kategoria inna niż `od-reki`; brak takiej → run pyta człowieka |
| `inStock` | boolean | produkt jest w kategorii `od-reki`; `metadata.inStock` pomijamy |
| `capacityLiters` | number | `metadata.capacityLiters`, a gdy go brak, liczba przed „l” lub „m³” w tytule albo podtytule |
| `material` | string | `metadata.material`, a gdy go brak, gatunek stali z podtytułu lub opisu (`1.4301`, `S235JR`…) |
| `certifications` | string[] | `metadata.certifications` (w UI to tekst rozdzielony przecinkami), a gdy go brak, znane skróty (PZH, UDT, CNBOP) z podtytułu lub opisu; może być puste |
| `dimensionsMm` | `{ width, height, depth }` albo `null` | `dimensions` (mm) |
| `weightKg` | number, opcjonalne | `weightValue` przy `weightUnit: kg` |
| `priceNetPln` | number albo `null` | `unitPriceNet` ceny `regular` w PLN (string z 4 miejscami po przecinku → number); brak → `null`, na stronie „Cena na zapytanie” |
| `vatRate` | number, domyślnie 23 | `taxRate` |
| `shape` | `vertical` \| `horizontal` \| `underground` \| `mixer` | `metadata.installation === 'underground'` → `underground`; inaczej `metadata.orientation`; inaczej kategoria `urzadzenia` → `mixer`; inaczej `vertical` |
| (body) | Markdown | `description` |

Pole `metadata.leadTimeWeeks` z seedu celowo pomijamy. Cenę brutto liczy strona, nie plik.
Wartości z `metadata` wpisane w UI przychodzą jako tekst, więc schemat używa `z.coerce.number()`
tam, gdzie to liczba.

Kolekcja `categories` (`file` loader, `src/content/categories.json`) to tablica pięciu wpisów
z polami `id` (slug z seedu: `woda-pitna`, `paliwa`, `chemia`, `ppoz`, `urzadzenia`), `name`
i `description`. „Od ręki” nie jest tu kategorią, tylko widokiem na `inStock`. Kolekcja `legal`
ma jeden wpis, `regulamin`. Jego § „Gwarancja” mówi o 24 miesiącach, a scena 4 zmienia to na 5 lat.

Pierwsze 7 plików produktów przepisujemy raz, ręcznie, z seedu `demo_fixtures`. Nie ma skryptu
synchronizacji: synchronizacja to praca fabryki. `ZDP-5000` trafia na stronę z tym samym błędem
co w katalogu (5000 l, bez wymiarów).

Ilustracje to cztery SVG według `shape`, nie zdjęcia. PR z nowym produktem nie dodaje więc
żadnego obrazka, a strona nie używa cudzych zdjęć.

## Kontrakty

- **Wymagany check na `main`:** `site` (GitHub Actions, na `pull_request` i na `push` do `main`).
- **Status fabryki:** `factory/catalog-match` (commit status na SHA heada PR, `success`
  lub `failure` z opisem pierwszej niezgodności), wystawiany przez runner tylko na PR-ach
  z produktem. Wymagany przez politykę waivera, nie przez ochronę gałęzi.
- **Preview hostowane przez repo.** Runner nie stawia własnego stacku do preview. Po pushu czeka
  na GitHub deployment status: environment `Preview`, `sha` równe headowi PR, `state: success`,
  i bierze z niego `environment_url` jako `previewUrl`. Jeśli nie ma go po 5 minutach, sygnał
  `factory.run.finished` idzie z `previewUrl: null`, bez `catalog-match`, więc bez waivera.
  Link w Open Mercato prowadzi prosto na URL Vercela, bez podpisanego przekierowania ze SPEC-003,
  bo repo i jego treść są publiczne.
- **Merge.** Ruleset na `main`: PR wymagany, check `site` wymagany, 1 approve wymagany. Bypass ma
  tylko druga GitHub App, „merge identity” ze SPEC-001 (decyzja 6). Waiver ze SPEC-001 merguje
  PR tą aplikacją, gdy klasa to `content`, a `site` i `catalog-match` są zielone. GitHub App
  fabryki (bot kodujący) ma `contents: write` i `pull_requests: write`, ale nie ma bypassu, więc
  nie zmerguje własnego PR-a. PR z klasą `legal` merguje człowiek po zatwierdzeniu prawnika
  w Caseload. Jeśli na drugą aplikację zabraknie czasu, Marek klika merge na scenie po obejrzeniu
  preview, a waiver pokazujemy na slajdzie.
- **Produkcja:** merge do `main` → deploy produkcyjny Vercela na domenie `*.vercel.app` projektu.

## Przypadki brzegowe

| Co się dzieje | Co widać |
|---|---|
| Agent zapisze plik niezgodny ze schematem | build czerwony, check `site` czerwony, waiver niemożliwy; runner ma jedną rundę poprawek CI (SPEC-001), potem zadanie wraca z błędem buildu |
| Agent zapisze złą cenę spójnie w pliku i na stronie | `site` zielony, `catalog-match` czerwony, brak waivera, zadanie czeka na developera z opisem niezgodności |
| Produkt dodany w UI bez kategorii innej niż „Od ręki” albo bez pojemności w tytule, podtytule i `metadata` | run kończy się pytaniem do Marka, bez PR-a |
| Produkt w katalogu nie ma ceny | `priceNetPln: null`, strona pokazuje „Cena na zapytanie”; to częste przy zbiornikach na zamówienie |
| Produkt w katalogu nie ma wymiarów (`ZDP-5000` przed sceną 2) | `dimensionsMm: null`, wiersz wymiarów znika z tabeli |
| Zduplikowane SKU albo nazwa pliku ≠ `sku` | `site` czerwony |
| Vercel nie zbuduje preview w 5 minut | `previewUrl: null`, brak `catalog-match`, brak waivera; zadanie czeka na developera |
| Preview zabezpieczone logowaniem Vercel | prawnik nie otworzy linku; dlatego w projekcie wyłączamy Deployment Protection dla preview (repo i tak jest publiczne); krok 5 to sprawdza |
| Vercel nie zbuduje commita od bota | na Hobby blokada dotyczy commitów spoza zespołu w repo prywatnych; repo jest publiczne, a krok 6 to sprawdza na prawdziwym PR bota |
| Korekta w katalogu po publikacji (scena 2 poprawia `ZDP-5000`) | strona rozjeżdża się z katalogiem do następnego PR-a; wyzwalacz `catalog.product.updated` jest poza zakresem, to odpowiedź na Q&A |

## Ryzyka

- **Konto Vercel Jacka.** Hobby nie ma członków zespołu, więc tylko Jacek zmieni ustawienia
  projektu. README repo spisuje wszystkie ustawienia (Deployment Protection, gałąź produkcyjna,
  env), żeby w razie potrzeby dało się je odtworzyć na innym koncie w kilka minut.
- **Podobieństwo do prawdziwej firmy.** Fikcyjna nazwa, logo, dane kontaktowe i klienci. Układ
  inspirowany, bez kopiowania tekstów ani zdjęć.
- **Wygląd poniżej oczekiwań jury.** Krok 3 kończy się zrzutami na desktopie i telefonie
  przeglądanymi przez zespół, zanim ktokolwiek zacznie łączyć sceny.

## Poza zakresem

- Strony kategorii, logotypy klientów, wersja angielska.
- WordPress (slajd z roadmapą w SPEC-004).
- Formularz zapytania z backendem i InboxOps (roadmapa).
- Synchronizacja katalog → strona inna niż przez PR fabryki, w tym `catalog.product.updated`.

## Plan wdrożenia

Właściciel: osoba od infrastruktury. Termin: sobota rano, przed połączeniem scen (SPEC-004
Faza 3). Kroki 1–5 nie zależą od fabryki.

### Faza 1: Repo, które się buduje

1. Publiczne repo `jtomaszewski/hackaton-stal-zbiorniki-landing`, Astro (szablon minimal,
   TypeScript strict), skrypty npm, `AGENTS.md`, README. *Test:* `npm ci && npm run build`
   przechodzi.
2. `content.config.ts` z trzema kolekcjami, 7 produktów, `categories.json`, `regulamin.md`,
   cztery ilustracje. *Test:* build przechodzi; plik z usuniętym `sku` zatrzymuje build
   z komunikatem wskazującym pole.
3. Layout i strony z tabeli *Strony*. *Test:* zrzuty `/`, `/od-reki`, `/produkty/zdp-5000`
   i `/regulamin` na 1440 px i 390 px, przejrzane przez zespół.

### Faza 2: Weryfikacja

4. `tests/site.spec.ts` i workflow `site`. *Test:* check zielony na `main`; czerwony na PR ze
   zduplikowanym SKU i na celowo zepsutej gałęzi, w której `/od-reki` pomija jeden produkt.

### Faza 3: Deploy, preview i merge

5. Projekt Vercel na koncie Jacka podpięty do repo, Deployment Protection wyłączone dla preview,
   produkcja z `main`, ustawienia spisane w README. *Test:* dla PR-a
   `gh api repos/jtomaszewski/hackaton-stal-zbiorniki-landing/deployments?sha=<head>` i jego
   statusy zwracają `environment_url`; preview otwiera się w oknie incognito.
6. Ruleset na `main` (PR, `site`, 1 approve) z bypassem dla merge App; GitHub App fabryki ze
   SPEC-001 zainstalowana tylko na tym repo. *Test:* token bota wypycha gałąź i otwiera PR, który
   dostaje deployment Vercela `success`; ten sam token nie może zmergować PR-a; merge App może.
7. Próba sceny 3 bez fabryki: `ZWM-1500` dodany w UI katalogu tak, jak zrobi to Marek (SPEC-004),
   a potem ręcznie przepisany na plik według tabeli *Model danych*. *Test:* każde pole da się
   wyprowadzić z rekordu utworzonego w UI; check zielony; preview pokazuje zbiornik na `/od-reki`
   i na `/produkty/zwm-1500`. PR zamykamy bez merge'a, bo na scenie zrobi go fabryka.

`factory/catalog-match` i odczyt preview z deployment status należą do runnera i powstają razem
z krokiem 3 SPEC-001. Ich test: PR z celowo złą ceną dostaje `catalog-match: failure`.

## Historia zmian

<!-- Record, not state: rows are closed once dated — append, never rewrite. -->

| Data | Zmiana |
|------|--------|
| 2026-09-19 | Szkielet: cel, mapa ścieżek na klasy zmian, otwarte pytania o framework, hosting, repo i źródło danych. |
| 2026-09-19 | Rozstrzygnięte: Astro, Vercel na koncie Jacka, publiczne repo `hackaton-stal-zbiorniki-landing`, produkty z plików w repo. Pełny spec: architektura, model danych z mapowaniem z katalogu, kontrakty, przypadki brzegowe, plan wdrożenia. |
| 2026-09-19 | Po recenzji: merge przez osobną App z bypassem (bot kodujący nie merguje), status `factory/catalog-match` jako warunek waivera, preview z GitHub deployment status zamiast stacku runnera, plik produktu nazwany po SKU, mapowanie odporne na produkt dodany w UI, kształt ilustracji, `id` w `categories.json`, test parsuje pliki sam, zakres zawężony do stron ze scen 3 i 4. |
