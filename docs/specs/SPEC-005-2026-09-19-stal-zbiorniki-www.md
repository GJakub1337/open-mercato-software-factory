# SPEC-005: Strona Stal-Zbiorniki, docelowe repo fabryki na demo

**Status**: Draft (szkielet, czeka na odpowiedzi na otwarte pytania)
**Właściciel**: zespół HackOn · **Data**: 2026-09-19 · **Tracker**: —
**Nadrzędna**: [SPEC-004](./SPEC-004-2026-09-18-demo-stal-zbiorniki.md) (Q1 i sekcja „Docelowa
strona”), korzysta z kontraktu runnera i kierowania recenzji ze
[SPEC-001](./SPEC-001-2026-09-18-agentic-software-factory.md).

## TLDR

Firmowa strona Stal-Zbiorniki to repo, w którym fabryka otwiera PR-y w scenach 3 i 4 demo. Jest
statyczna, a każdy produkt to jeden plik z treścią w repo. Dzięki temu PR „nowy zbiornik od ręki”
to czytelny diff z jednym plikiem i obrazkiem, a każdy PR dostaje własne preview. Wygląda jak
prawdziwa strona producenta, ale ma to, czego fabryka potrzebuje do weryfikacji: jedną komendę do
lokalnego uruchomienia, test Playwright, CI z wymaganym checkiem i mapę recenzji po ścieżkach
(`content` → waiver, `legal` → prawnik).

## Otwarte pytania

- **Q1. Framework.** (a) Astro z content collections: produkty to Markdown z frontmatterem
  walidowanym schematem Zod, a build jest statyczny. (b) Next.js ze static export: ten sam stack co
  Open Mercato, ale więcej kodu na to samo. Rekomendacja: (a).
- **Q2. Hosting i preview per PR.** (a) Vercel: preview dla każdego PR bez konfiguracji, URL
  w GitHub deployment status, skąd runner go odczyta. (b) Cloudflare Pages: to samo, inny panel.
  (c) GitHub Pages: brak preview per PR, więc odpada dla scen 3–4. Rekomendacja: (a). Na czyim
  koncie?
- **Q3. Gdzie repo.** (a) Osobne publiczne repo `jtomaszewski/stal-zbiorniki-www`. GitHub App
  fabryki dostaje dostęp tylko do niego, więc agent nie może pisać do repo samej fabryki. (b) Katalog
  `apps/www` w tym repo: prościej, ale bot fabryki pisałby do własnego kodu, a SPEC-001 wymaga
  „one repo” w tokenie. Rekomendacja: (a).
- **Q4. Skąd strona bierze dane produktów.** (a) Z plików w repo. Pliki pisze agent na podstawie
  rekordu z katalogu Open Mercato, więc zmiana w katalogu → PR → recenzja → merge. (b) Z API
  Open Mercato w czasie buildu. Wtedy nie ma PR-a, recenzji ani sceny 3. Rekomendacja: (a).
  Pierwsze 7 plików generujemy jednorazowo z seedu `demo_fixtures`.

## Problem

SPEC-001 zakłada, że możliwości agenta równają się temu, jak dobrze da się zweryfikować docelowe
repo: testy, lokalne uruchomienie jedną komendą, CI, preview. Na demo nie mamy żadnego docelowego
repo. Scena 3 („katalog → strona”) i scena 4 („regulamin czeka na prawnika”) potrzebują strony,
która:

- wygląda jak strona producenta, bo jury ma uwierzyć w Marka;
- przyjmuje nowy produkt jako mały, czytelny PR;
- ma preview per PR, do którego linkuje ścieżka recenzji i które otworzy prawnik bez konta GitHub;
- ma test, który sprawdza „done” względem danych z katalogu, a nie opinii agenta;
- rozdziela ścieżki tak, że mapa recenzji ze SPEC-001 działa na niej bez wyjątków.

## Proponowane rozwiązanie (zarys)

**Treść, którą zmienia fabryka:**

| Ścieżka | Klasa zmiany (SPEC-001) | Recenzja |
|---|---|---|
| `src/content/products/<handle>.md` + `public/products/<handle>.*` | `content` | waiver, jeśli checki zielone |
| `src/content/legal/regulamin.md` | `legal` | prawnik w Caseload |
| wszystko inne (layout, komponenty, CI, config) | `code` | developer |

**Strony:** główna, kategoria (6 z seedu), „Od ręki” (produkty z `inStock: true`), karta produktu
(nazwa, SKU, pojemność, materiał, atesty, cena netto i brutto, „Wyślij zapytanie”), regulamin.
Wygląd wzorowany na układzie prawdziwej strony: fikcyjna nazwa, logo i telefony.

**Weryfikacja:** `npm run build` odrzuca plik produktu niezgodny ze schematem. Test Playwright
przechodzi po wszystkich plikach produktów i sprawdza, że każda karta renderuje nazwę, SKU i cenę,
a każdy produkt `inStock` jest w „Od ręki”. Test jest sterowany danymi, więc nowy produkt nie
wymaga nowego testu. Sprawdzenie względem rekordu z katalogu (nazwa, cena, SKU z payloadu runu
na preview) robi runner, zgodnie ze SPEC-001.

Dalsze sekcje (architektura, schemat produktu, CI i ochrona gałęzi, przypadki brzegowe, plan
wdrożenia) powstaną po odpowiedziach na Q1–Q4.

## Historia zmian

<!-- Record, not state: rows are closed once dated — append, never rewrite. -->

| Data | Zmiana |
|------|--------|
| 2026-09-19 | Szkielet: cel, mapa ścieżek na klasy zmian, otwarte pytania o framework, hosting, repo i źródło danych. |
