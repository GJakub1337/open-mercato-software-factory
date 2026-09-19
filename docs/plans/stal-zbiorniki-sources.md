# Pochodzenie danych

Odczyt 2026-09-19. Źródło: https://github.com/jtomaszewski/hackaton-stal-zbiorniki-landing/tree/580d1f32c93b4eb229c1aa0316e9d47751c9a6c8 . Repo określa się jako demo. Firma, certyfikaty, ceny i realizacje są treścią scenariusza, nie zweryfikowanymi faktami gospodarczymi.

| Treść | Źródło | Użycie |
|---|---|---|
| Nazwa firmy, Kobierzyce, 2008 | lib/product.ts COMPANY | Nazwa organizacji; pozostałe jako kontekst fikcyjny |
| 7 produktów, SKU, parametry, ceny | app/produkty/*/product.ts i page.tsx; istniejący demo_fixtures/lib/stalZbiorniki.ts | Ponowne użycie istniejących danych aplikacji |
| Browar Rzemieślniczy Ostrów, 2 x ZWP-2000 | lib/realizations.ts | Fikcyjny klient i projekt |
| ZDP-5000, brak ZWM-1500, kontrola człowieka | docs/specs/SPEC-004 | Zachowana historia demonstracji |
| Dodatkowi klienci, osoby, zadania, terminy | Autorskie dane tego zadania | Jawna fikcja, .example, bez telefonów/NIP |

Nie kopiujemy zdjęć. public/brand/stal-zbiorniki.svg to lokalne odwzorowanie tekstowego znaku SZ i nazwy z components/site-header.tsx, w kolorach z app/globals.css (#0a1826, #e8742a), z oryginalnym Barlow Condensed Bold (Google Fonts, licencja SIL OFL w scripts/assets/BarlowCondensed-OFL.txt). Eksport scripts/export-steel-logo.mjs zamienia tekst na ścieżki SVG, więc logo nie wymaga pobierania fontów w przeglądarce. Jest to znak fikcyjnego demo, nie niezależnie potwierdzony logotyp realnej firmy. Nazwa Software Engineer i identyfikator factory pochodzą z upstream SPEC-008; picker i cztery kolumny z SPEC-009 oraz commit dca9cbb.

## Nowy znak na życzenie użytkownika

2026-09-19: użytkownik odrzucił inicjały SZ i zamówił nowy projekt logo. Aktualny plik public/brand/stal-zbiorniki-pro.png wygenerowano wbudowanym narzędziem image_gen: geometryczny płaszcz zbiornika, ukośna spoina, pomarańczowy akcent i napis STAL-ZBIORNIKI na granacie. Jest autorskim projektem generowanym dla demo, nie logotypem pobranym ze strony firmy. Wcześniejszy SVG i jego eksporter pozostają jako archiwum odwzorowania landingu. Seed wskazuje nowy PNG; oryginalny wynik generatora zachowano bez zmian. PNG ma 2172 x 724 px, tło granatowe, nie jest plikiem wektorowym. Prompty: ../evidence/steel-demo/logo-prompts.txt.

W Open Mercato seed używa public/brand/stal-zbiorniki-icon.png: kwadratowego sygnetu na granacie, bez drobnego napisu. Pełny wariant poziomy pozostaje w stal-zbiorniki-pro.png. Wersja przezroczysta generatora miała artefakty krawędzi i nie została użyta.
