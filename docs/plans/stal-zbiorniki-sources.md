# Pochodzenie danych

Odczyt 2026-09-19. Źródło: https://github.com/jtomaszewski/hackaton-stal-zbiorniki-landing/tree/580d1f32c93b4eb229c1aa0316e9d47751c9a6c8 . Repo określa się jako demo. Firma, certyfikaty, ceny i realizacje są treścią scenariusza, nie zweryfikowanymi faktami gospodarczymi.

| Treść | Źródło | Użycie |
|---|---|---|
| Nazwa firmy, Kobierzyce, 2008 | lib/product.ts COMPANY | Nazwa organizacji; pozostałe jako kontekst fikcyjny |
| 7 produktów, SKU, parametry, ceny | app/produkty/*/product.ts i page.tsx; istniejący demo_fixtures/lib/stalZbiorniki.ts | Ponowne użycie istniejących danych aplikacji |
| Browar Rzemieślniczy Ostrów, 2 x ZWP-2000 | lib/realizations.ts | Fikcyjny klient i projekt |
| ZDP-5000, brak ZWM-1500, kontrola człowieka | docs/specs/SPEC-004 | Zachowana historia demonstracji |
| Dodatkowi klienci, osoby, zadania, terminy | Autorskie dane tego zadania | Jawna fikcja, .example, bez telefonów/NIP |

Nie kopiujemy zdjęć. Nazwa Software Engineer i identyfikator factory pochodzą z upstream SPEC-008; picker i cztery kolumny z SPEC-009 oraz commit dca9cbb.

## Logo

Nowy znak wygenerowano narzędziem image_gen na zamówienie dla fikcyjnej firmy demo: płaszcz zbiornika, ukośna spoina i pomarańczowy akcent na granacie. Nie jest logotypem pobranym ze strony firmy.

- `public/brand/stal-zbiorniki-icon.png`: kwadratowy sygnet 1254 x 1254 px używany przez seed w bocznym pasku Open Mercato.
- `public/brand/stal-zbiorniki-pro.png`: pełne logo z napisem, 2172 x 724 px, do strony i materiałów.

Pliki PNG mają granatowe tło i nie są wektorowe. [Prompty generowania](../evidence/steel-demo/logo-prompts.txt).
