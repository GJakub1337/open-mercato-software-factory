# Weryfikacja lokalnego demo Stal-Zbiorniki

Data: 2026-09-19. Aplikacja: origin/main 67a838f, branch codex/steel-demo-personalization. Landing: 580d1f32c93b4eb229c1aa0316e9d47751c9a6c8. Instancja http://127.0.0.1:5003, własny PostgreSQL na 55433.

| Kryterium | Wynik i dowód |
|---|---|
| AC-1: dane i ponowienie | PASS: scripts/verify-steel-demo.mjs, identyczne rekordy biznesowe przed i po ponowieniu. 7 produktów, 6 kategorii, 7 cen, 6 firm i 1 osoba kontaktowa, 3 zespoły, 6 osób, 3 projekty, 12 zadań, 2 zamówienia: zachowane SO-2026-0042 i dodatkowe SZ-DEMO-0042 na 126400 PLN netto. |
| AC-2: ręczne zmiany | PASS: zmiana tytułu, opisu i handle ZWP-5000 przez API UI; ponowienie zachowało wszystkie zmiany. Przywrócenie pierwotnych wartości przez API zakończone HTTP 200. Snapshot obejmował również ceny i statusy, ale nie zmieniano ich osobno. |
| AC-3: zakres i awarie | PASS: testy jednostkowe kolizji, usunięcia, pending i rozdzielenia zakresów; rzeczywista blokada PostgreSQL odrzuciła konkurencyjny seed. CLI odrzuciło niezgodny tenant przed zapisem. Brak pending i uruchomionych procesów. |
| AC-4: UI | PASS: katalog, firmy, sześć osób, zadania projektu DEMO i picker z Software Engineer. Logo widoczne w podglądzie brandingu organizacji. Po zapisie przez UI branding odświeżył również boczne logo. W aplikacji używany jest osobny kwadratowy sygnet. |
| AC-5: odtwarzalność | PASS lokalnego bootstrapu przez scripts/steel-demo.mjs prepare/init/seed/start. Instrukcja w docs/stal-zbiorniki-demo.md. |

## Kontrole kodu

- corepack yarn test --watchman=false --runInBand: 40 suites, 209 tests PASS na końcowym kodzie.
- corepack yarn typecheck: PASS po poprawce zachowania hierarchii organizacji.
- corepack yarn lint: 0 błędów, 10 ostrzeżeń.
- corepack yarn ds:check: 306 plików PASS.
- corepack yarn build: PASS przed ostatnią poprawką przekazania parentId/childIds i eksportu logo. Końcowy build nie był powtarzany; końcowe testy i typecheck przeszły.
- Regresja prepare: testy ponowienia po błędzie demona i konfliktu portu (atrapa Dockera, rzeczywisty system plików) przeszły. Potwierdzono RED na poprzednim skrypcie i GREEN po poprawce. Ponowne prepare na działającym lokalnym kontenerze również przeszło.
- Weryfikator sprawdza nazwę organizacji, URL logo, zachowanie proporcji, sygnaturę pliku PNG i niezmienność brandingu po ponowieniu. PASS na lokalnej bazie.
- git diff --check: PASS.
- Niezależny przegląd kodu: PASS po poprawieniu czterech zgłoszonych problemów. Nie wykonano osobnego testu brandingu organizacji z istniejącą hierarchią.

## Dowody UI

[Logo i nazwa w Open Mercato](branding.png).

Obrazy sprawdzono wizualnie. Tablica ma przewijanie poziome przy szerokości 1280 px. Nie wykonano pełnego QA mobilnego. Nie testowano wywołań LLM, repozytorium, publikacji ani delegacji zadania: seed nie uruchamia agentów.

Istniejące CLI seed-stal-zbiorniki jest jedynym wejściem. Dotychczasowe funkcje scenariusza Park of Poland i tablicy są zachowane; ich zakończone kroki obejmuje dziennik. Snapshot ponowienia obejmuje również stare zamówienie, jego pozycje, adresy i powiązania kontaktów.

Regresja starszego zamówienia: produkty o ręcznie zmienionych handle są rozpoznawane po przejętych ID. Testy potwierdzają referencje pozycji zamówienia i brak tworzenia produktów w tej fazie. Katalog nie jest seedowany drugi raz.
