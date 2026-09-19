# Odtwarzalna personalizacja Stal-Zbiorniki

Status: Implemented. Powiązanie: docs/specs/SPEC-004-2026-09-18-demo-stal-zbiorniki.md.

## TLDR
Jedna lokalna firma demonstracyjna: katalog zgodny z landingiem, fikcyjni klienci, zespół i tablice pracy. Rozszerzenie modułu demo_fixtures przez istniejące komendy Open Mercato 0.8.0, bez zmiany Core i wyglądu interfejsu.

## Proposed Solution
Rozszerzenie istniejącego polecenia seedowania i skrypt izolowanego środowiska. Stabilny dziennik seedowania w istniejącym module configs chroni rekordy po ręcznej zmianie nazwy. Istniejący seed scenariusza Park of Poland jest ponownie używany, a jego dane pozostają bez nadpisywania.

## Open Questions
Brak pytań blokujących. Użytkownik zlecił cały ciąg plan, specyfikacja, implementacja i weryfikacja. Dodatkowe osoby i klienci są jawną fikcją. Zmieniamy dane i ustawienia dostępne przez istniejące kontrakty, nie dodajemy własnego UI ani integracji repozytoriów.

## Problem Statement
Stary seed zapewnia katalog i jeden scenariusz sprzedaży, ale organizacja, zespół i projekty nie opowiadają spójnej historii. Identyfikacja po edytowalnej nazwie może powielać rekordy po zmianie ręcznej.

## Overview and Success Measures
Pierwszy przebieg tworzy brakujące dane. Drugi nie zmienia rekordów biznesowych. Zmiana nazw, opisów, ceny lub statusu przez człowieka pozostaje zachowana. Nie powstaje żaden proces factory.

## Goals
Odtwarzalne dane polskiej firmy demonstracyjnej w katalogu, CRM, staff i sprzedaży; bezpieczne wznowienie i instrukcja lokalna.

## Non-goals
Publikacja strony, GitHub App, broker, uruchomienia LLM, reset bazy, zmiana istniejących kont i uprawnień, własny design system, Core, integracja repozytoriów.

## Domain Vocabulary and Business Rules
Firma i parametry katalogu to fikcja demonstracyjna potwierdzona kodem landingu. Nowe osoby i klienci są autorskimi fikcyjnymi danymi, adresy e-mail używają .example. Nie dodajemy telefonów ani numerów podatkowych. ZDP-5000 pozostaje celowo niepoprawny; ZWM-1500 nie jest seedowany. Siedem produktów, sześć kategorii. Trzy zespoły, sześć osób, czterech dodatkowych klientów (w tym wewnętrzna firma), obok zachowanych Park of Poland i Internal, trzy projekty, dwanaście zadań na czterech domyślnych kolumnach staff. Liczby dotyczą świeżej instancji; kolizje pozostają nietknięte.

## Users, Permissions, and Scope
Wyłącznie lokalne CLI z dostępem do bazy. Wymagane jawne UUID tenant i org; organizacja musi należeć do tenanta. Nie ma HTTP do seedowania. Istniejące role i ACL pozostają bez zmian. Właściciel projektu to istniejący człowiek w podanym zakresie.

## Reuse and Ownership Map
Moduł demo_fixtures posiada dane i koordynację. catalog, customers, staff i sales pozostają właścicielami rekordów; zapisy przez commandBus. configs.moduleConfigService przechowuje dziennik operacji, z organizationId zarówno w kluczu, jak i zakresie. task_delegation zapewnia systemContext oraz tożsamość factory / Software Engineer.

## Architecture and Data Flow
CLI -> walidacja scope -> blokada transakcyjna PostgreSQL na zakres -> dziennik configs -> komendy właścicieli. Dziennik przed wywołaniem komendy zapisuje pending, po wyniku zapisuje identyfikator. Powtórzenie nie korzysta z edytowalnej nazwy, lecz ze stałego klucza w dzienniku. Kolizja z istniejącym rekordem oznacza zachowanie i przyjęcie jako referencji, bez aktualizacji. Nie dodajemy cen ani pozycji do cudzych produktów/zamówień.

Alternatywa nowej tabeli odrzucona: istniejący serwis configs wystarcza, bez migracji. Alternatywa samego wyszukiwania po nazwie odrzucona: nie zachowuje idempotencji po zmianie nazwy.

## User Journeys
Operator tworzy odrębną lokalną bazę, inicjalizuje ją bez przykładów i uruchamia CLI. Loguje się, widzi firmę, polskie opisy produktów i fikcyjne relacje CRM. Na tablicy przegląda zadania produkcji, sprzedaży i strony, a w pickerze widzi Software Engineer. Powtarza CLI po ręcznej edycji; rekord pozostaje bez zmian.

## UI and Interaction Contracts
Brak nowych/zmienianych komponentów. Zachowane widoki Open Mercato: katalog produktów i kategorii, firmy CRM, staff members/teams, projekty i tasks board. Źródła: istniejące API właścicieli. Kanoniczne DataTable, CrudForm i board z upstream, wraz z ich loading/empty/error/conflict, obsługą klawiatury i motywami. Dane polskie nie zmieniają nazw czterech kolumn. QA sprawdza renderowanie danych i picker; nie twierdzi, że ponownie certyfikuje wszystkie stany frameworka.

## Data Models
Brak nowych encji. Dziennik configs: wersja 1, stan pending/complete, recordId, owned. Klucz zawiera org UUID; wartość i rekord wymagają zgodnego tenant/org. Tombstone lub brak wcześniej seedowanego rekordu nie powoduje odtworzenia. Zależna operacja kończy się błędem, jeżeli wymaga usuniętej referencji.

## API, Command, and Error Contracts
Istniejące CLI, rozszerzone o uzupełnianie danych: `mercato demo_fixtures seed-stal-zbiorniki --tenant UUID --org UUID`. Błędny scope, brak zależności, aktywna blokada i pending po przerwaniu kończą się niezerowym statusem. Raport: liczby created/preserved/adopted i identyfikatory zakresu. Komendy catalog.categories/products/prices.create, customers.companies.create, staff.teams/team-members/timesheets.time_projects/time_project_members/tasks oraz sales, o ile wymagane przez dane. Bez nowych API.

## Events, Jobs, Notifications, and Cross-Module Flows
Komendy otrzymują bulkImport.skipEvents i skipNotifications; indeksowanie pozostaje włączone. Zadania nie są delegowane agentowi. Provision agenta jest lokalnym serwisem i nie uruchamia procesu. QA wymaga zerowej liczby procesów.

## Security, Privacy, and Compliance
Fikcyjne dane; .example; brak kluczy providerów, repo tokenów i prawdziwych danych klientów. Przykłady regulacyjne i ceny nie są ofertą handlową. Dziennik nie zawiera danych osobowych. Brak importów wewnętrznych encji staff.

## Integration Coverage
AC-1: pierwszy i drugi seed na izolowanej bazie, porównanie liczników i rekordów.
AC-2: ręczne zmiany nazwy/opisu/ceny/statusu, ponowienie bez nadpisania/duplikatu.
AC-3: błędny tenant/org, kolizja, usunięcie, przerwany zapis i blokada; brak rozszerzenia zakresu.
AC-4: katalog, CRM, zespół, projekty, tablica i Assigned to w UI; agent factory / Software Engineer, cztery kolumny i zero procesów.
AC-5: skrypt świeżego środowiska i instrukcja bez cudzych portów/baz/sesji.

## Implementation Phases
1. Plan i źródła: specyfikacja, manifest pochodzenia, kontrakty. Wyjście: zakres i testy opisane.
2. Jeden kompletny seed: dane, dziennik, CLI, testy jednostkowe oraz pierwszego i ponownego uruchomienia. Wyjście: AC-1/2/3.
3. Instrukcja, izolowane środowisko, UI i przegląd. Wyjście: AC-4/5 oraz jawne wyniki typecheck/lint/test/build.

## Requirement Traceability
| Wymaganie | Powierzchnia | Faza | Weryfikacja |
|---|---|---|---|
| Dane i ochrona edycji | demo_fixtures/lib, CLI | 2 | AC-1/2/3 |
| Odtwarzalność | scripts, docs | 3 | AC-5 |
| Zgodność UI i upstream | istniejące hosty catalog/customers/staff | 3 | AC-4 |
Addytywna powierzchnia CLI adaptuje istniejący src/modules/demo_fixtures/cli.ts; brak nowego mechanizmu discovery, istniejący module.cli (emitted-example: src/modules/example/cli.ts).

## Rollout, Migration, and Rollback
Bez migracji i resetu. Jedno istniejące polecenie CLI; setup zachowuje dotychczasową funkcję seedowania przykładów. Rollback kodu przez cofnięcie zmiany. Dane usuwa operator przez istniejące UI/undo komend; skrypt nie kasuje rekordów ani baz. Przerwany pending wymaga sprawdzenia wyniku komendy przed naprawą dziennika, nigdy automatycznego ponowienia niepewnego zapisu. Blokada scope zapobiega dwóm równoległym seedom, nie blokuje zwykłych operacji UI.

## Migration & Backward Compatibility
Dotychczasowe nazwy i eksporty pozostają. Nie dodajemy drugiego polecenia CLI. Skrypt nowej instancji ustawia nazwę firmy przy init; personalizacja istniejącej organizacji nie zmienia jej ręcznie nadanej nazwy.

## Risks and Tradeoffs
Komendy starszych modułów nie obsługują wspólnej transakcji, dlatego pending chroni przed duplikacją po niepewnym wyniku, zamiast deklarować atomowość całego seedowania. Dane ręcznie usunięte nie są wskrzeszane. Dodatkowi ludzie to staff, bez nowych kont loginowych. Branding: nazwa organizacji i nowe logo zbiornika z public/brand/stal-zbiorniki-icon.png; ustawienie directory.organizations.update tylko przy pustym logo i zgodnej nazwie firmy. Shell Open Mercato pozostaje.

## Acceptance Criteria
AC-1 do AC-5 z Integration Coverage. Nieudane bramki raportowane jako nieudane; brak fałszywego PASS.

## Final Compliance Report
Implementacja i lokalna weryfikacja zakończone. Wyniki i ograniczenia: docs/evidence/steel-demo/verification.md.

## Changelog
2026-09-19: plan na podstawie aktualnego origin/main i źródła landingowego; użytkownik autoryzował cały ciąg lokalnego wdrożenia.

## Implementation Status
Fazy 1-3 zakończone w zakresie lokalnego demo. 209 testów PASS, ponowienie i ręczne edycje zweryfikowane, UI i branding sprawdzone, przegląd kodu PASS. Ograniczenia końcowego builda i QA opisane w raporcie weryfikacji.
