# Stal-Zbiorniki: lokalna instancja demo

Ta konfiguracja przedstawia fikcyjną firmę ze strony hackathonowej: katalog zbiorników, klientów przemysłowych, zespół, projekty, zadania i zamówienie. Zachowuje interfejs Open Mercato oraz Software Engineer (`factory`). Źródła i rozróżnienie faktów od fikcji opisuje [manifest](plans/stal-zbiorniki-sources.md).

## Nowa izolowana instancja

Wymagane: Node >=24, Corepack, Docker i wolne porty. W osobnym checkoutcie aplikacji:

```bash
corepack yarn install --immutable
node scripts/steel-demo.mjs prepare
node scripts/steel-demo.mjs init
node scripts/steel-demo.mjs seed
node scripts/verify-steel-demo.mjs
node scripts/steel-demo.mjs start
```

`prepare` tworzy własny kontener PostgreSQL i własną bazę; domyślnie port bazy 55433, aplikacji 5003. Porty można wybrać przed przygotowaniem:

```bash
STEEL_DEMO_PORT=5013 STEEL_DEMO_POSTGRES_PORT=55443 node scripts/steel-demo.mjs prepare
```

Pierwsze `prepare` wymaga checkoutu bez `.env`. Ponowne `prepare` w przygotowanym checkoutcie wznawia uruchamianie tego samego kontenera bez zmiany haseł; użyj go po włączeniu Dockera lub zwolnieniu portu. Jeśli `yarn generate` utworzył `.env` z przykładu, zachowaj go pod inną nazwą przed `prepare`. Nie kopiuj konfiguracji działającej instancji. Kontener może potrzebować kilku sekund na gotowość przed `init`; sprawdź `docker logs <nazwa-z-prepare>`. Po przerwanym init nie uruchamiaj resetu, sprawdź log i dokończ brakujący krok zwykłym CLI.

`init` stosuje istniejące migracje wyłącznie na nowej pustej bazie, następnie uruchamia `mercato init --no-examples --org="Stal-Zbiorniki Sp. z o.o."`. Nie seeduje mebli ani starszego klienta Park of Poland. Nie dodaje kluczy AI, GitHub App ani połączenia repozytorium. `start` uruchamia tylko lokalny serwer WWW, bez workerów/providerów.

Otwórz `http://127.0.0.1:5003/backend`. Login właściciela: `marek@stal-zbiorniki.example`; losowe hasło jest lokalnie w `.env` jako `OM_INIT_SUPERADMIN_PASSWORD`. Nie publikuj `.env`, logów inicjalizacji ani katalogu `.steel-demo` (jest ignorowany przez Git). Interfejs tej instancji jest po polsku przez `OM_FORCE_LOCALE=pl`. Nazwa organizacji pochodzi z init; logo organizacji to nowy znak zbiornika ze spoiną i napis STAL-ZBIORNIKI, zaprojektowane na życzenie użytkownika (public/brand/stal-zbiorniki-icon.png; wariant pełny: stal-zbiorniki-pro.png). Shell i design system pozostają Open Mercato. Logo jest ustawiane tylko dla organizacji Stal-Zbiorniki z pustym logo i korzysta z APP_URL tej instancji; po zmianie hosta popraw adres w ustawieniach organizacji.

## Istniejąca lokalna instancja

Po instalacji zależności i `corepack yarn generate`:

```bash
corepack yarn mercato demo_fixtures personalize-stal-zbiorniki \
  --tenant UUID_TENANTA --org UUID_ORGANIZACJI
```

Wymagane aktywne moduły z repo i ich domyślne dane, istniejąca organizacja oraz człowiek z kontem w tej organizacji. UUID odczytaj ze swojej instancji; CLI sprawdza relację organizacji i tenanta. Seeder nie zmienia nazwy istniejącej organizacji, kont, haseł, ACL ani ustawień ręcznych. Nazwę można zmienić przez standardowe ustawienia organizacji. Nie uruchamiaj starego `seed-stal-zbiorniki`, jeżeli chcesz wyłącznie fikcyjnych klientów: stare polecenie zachowuje wcześniejszy scenariusz SPEC-004.

## Co obejmuje seed

- 7 produktów i 6 kategorii, ceny netto PLN, parametry i opisy z istniejącego katalogu demo zgodne ze źródłem landingowym.
- 4 firmy: Stal-Zbiorniki (wewnętrzna), Browar Rzemieślniczy Ostrów, Aqua Dolina i Trans-Sud. Tylko fikcyjne dane kontaktowe `.example`, bez numerów telefonu i NIP.
- 3 zespoły i 6 osób: sprzedaż, technologia/jakość, produkcja/logistyka. Jedynie Marek jest połączony z istniejącym kontem właściciela; pozostałe osoby nie otrzymują kont ani uprawnień.
- Projekty DEMO, BROWAR, AQUA, członkostwa i 12 zadań. Każdy nowy projekt ma domyślne cztery kolumny staff. Wspólny picker Assigned to pozostaje bez zmian.
- Zamówienie `SZ-DEMO-0042`: 1 x ZPPOZ-20 i 2 x ZCH-3000, 126400 PLN netto. Status początkowy pochodzi ze standardowej komendy sprzedaży, nie udajemy zrealizowanego zamówienia.
- Principal Software Engineer o identyfikatorze `factory`, gdy orchestrator jest włączony. Żadne zadanie nie jest automatycznie delegowane, seed nie uruchamia procesów agenta.

ZDP-5000 zachowuje celowy błąd (5000 zamiast 5200 l, brak wymiarów), a ZWM-1500 pozostaje nieutworzony do sceny pokazu. Dodatkowa historia Aqua Dolina zastępuje dla tej instancji prawdziwą markę klienta; nie realizuje zewnętrznego scrape'u ani publikacji referencji.

## Powtórzenia i odzyskiwanie

Seeder zapisuje klucze i identyfikatory w tenantowym `configs`, z UUID organizacji w każdym kluczu. Drugi przebieg nie aktualizuje rekordów biznesowych. Zmienione nazwy, opisy, ceny, przypisania i statusy pozostają. Usunięte rekordy nie są wskrzeszane. Kolizje z istniejącymi produktami i projektami są zachowane; skrypt nie dopisuje ceny do cudzego produktu ani zadań/członkostw do cudzego projektu. W rezultacie istniejąca instancja może otrzymać mniej rekordów niż świeża.

Jedna blokada zakresu chroni przed równoległymi uruchomieniami. Jeśli proces urwie się pomiędzy komendą i zapisem wyniku, pojawi się błąd `Unresolved seed receipt`. Najpierw sprawdź wynik komendy w rejestrze działań i rekord w UI. Dopiero po ustaleniu wyniku napraw odpowiedni wpis `demo_fixtures / steel-demo:<org>:<klucz>` przez standardowe ustawienia configs: zapisz `{version:1,state:"complete",id:"UUID",owned:true}` dla potwierdzonego utworzenia, albo usuń wyłącznie ten wpis, gdy potwierdzono brak zapisu. Nie kasuj dziennika w ciemno i nie resetuj bazy.

Skrypty nie mają polecenia usuwającego dane. Zachowaj własny kontener i checkout do końca pokazu. Cofnięcie kodu nie usuwa rekordów; ewentualne porządki wykonaj przez zwykłe UI/undo po zakończeniu demonstracji.
