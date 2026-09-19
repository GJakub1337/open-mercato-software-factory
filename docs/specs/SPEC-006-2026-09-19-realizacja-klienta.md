# SPEC-006: Realizacja na stronie: zrealizowane zamówienie → logo klienta i karta realizacji

**Status**: Draft
**Właściciel**: zespół HackOn · **Data**: 2026-09-19 · **Tracker**: —
**Nadrzędna**: [SPEC-004](./SPEC-004-2026-09-18-demo-stal-zbiorniki.md) (scena 3b), buduje na
intake'u ze [SPEC-002](./SPEC-002-2026-09-18-tasks-module.md), zmianach `message` i `code` ze
[SPEC-003](./SPEC-003-2026-09-18-task-change-set.md) i stronie ze
[SPEC-005](./SPEC-005-2026-09-19-stal-zbiorniki-www.md).

## TLDR

Handlowiec oznacza zamówienie **Park of Poland (Suntago)** jako zrealizowane. Fabryka
scrape'uje stronę klienta (Firecrawl), znajduje logo i opis firmy, prosi o zgodę na referencję
(szkic maila, wysyła człowiek), a po zgodzie otwiera PR do strony Stal-Zbiorniki: logo w
„Zaufali nam” i karta w „Realizacje” z danymi z linii zamówienia. Gdy ktoś wrzuci zdjęcia
z montażu do zamówienia, drugi PR dodaje galerię. Wszystko klasą `content`, więc merguje Marek
po obejrzeniu preview.

Dowodzi dwóch rzeczy naraz: wyzwalacz żyje w sprzedaży, nie w repo, a fabryka wciąga do
systemu ewidencji dane z internetu, których tam nie było.

## Otwarte pytania

- **Q1. Wartość statusu realizacji.** `sales_orders.fulfillment_status` to tekst ze słownika
  statusów; seed `sales` w core zna `fulfilled`, `shipped` i `delivered`. Bierzemy `fulfilled`,
  a które statusy dokładnie oznaczają „zrealizowane” w słowniku tenanta, potwierdza pierwszy
  krok Fazy 2.
- **Q2. Logo Suntago bez zgody.** Prawdziwy znak towarowy na publicznej stronie demo. Proces ma
  krok zgody, ale na scenie zgoda jest „już udzielona”. Łagodzenie: strona `realizacje`
  z `noindex`, usunięcie po hackathonie. Rozstrzyga: właściciel demo, przed deployem.
- **Q3. Krok zgody na żywo czy przed pitchem.** Pełna ścieżka (mail → odpowiedź → zgoda) to
  dwa czekania. Rekomendacja: zgoda ustawiona przed pitchem, szkic maila pokazany w `Done`
  jednym zdaniem. Rozstrzyga: próba generalna.

## Problem

Strona producenta ma sekcję referencji tylko wtedy, gdy ktoś pamięta, żeby ją zaktualizować.
Zrealizowane zamówienie to najlepszy moment na referencję i najczęściej przegapiany. Do
referencji trzeba logo (leży na stronie klienta), zgody (leży u klienta) i danych realizacji
(leżą w zamówieniu). Dziś te trzy rzeczy zbiera człowiek, więc referencje nie powstają.

## Proponowane rozwiązanie

```
sales.order.updated (fulfillment_status → zrealizowane)
  └─ tasks subscriber → zadanie „Realizacja: Park of Poland — ZDP-5000 ×2”, delegowane
        idempotencja: tasks_intake(source='sales.order', source_ref=orderId)
      ↓ factory.deliver (SPEC-001), bez zmian w grafie
INVOKE_AGENT researcher   tool web_scrape(customer.website) → { logoCandidates[], title, description }
INVOKE_AGENT sizer        small
      ↓ zależnie od customers.reference_consent (custom field: none | requested | granted)
[none]     operator → proposal: message (mail z prośbą o zgodę, do kontaktu z zamówienia)
                              + record customers.reference_consent: none → requested
           apply_change_set → zadanie Done z „czeka na zgodę klienta”
[granted]  slicer → 1 slice [code] → runner: PR do repo strony (klasa content)
           factory/catalog-match: karta realizacji zgodna z liniami zamówienia i nazwą klienta
           → preview → Marek zatwierdza → merge → strona na żywo

customers.customer.updated (reference_consent → granted)
  └─ tasks subscriber → to samo zadanie realizacji, ścieżka [granted]

attachments.attachment.created (entity = zamówienie, mime image/*)
  └─ tasks subscriber → zadanie „Galeria realizacji: Park of Poland”, delegowane
      → 1 slice [code] → runner: zdjęcia do public/realizacje/<slug>/ (max 1600 px, webp), galeria na karcie
```

Zgoda jest polem na kliencie, nie czekaniem w workflow. Dzięki temu proces `factory.deliver`
nie potrzebuje nowego `WAIT_FOR_SIGNAL` (którego timeout i tak nie działa, SPEC-001
ograniczenie 6), a odpowiedź klienta przychodzi dowolnym kanałem: handlowiec zaznacza pole.

### Co dodajemy

| Element | Gdzie | Uwagi |
|---|---|---|
| Subscriber `sales.order.updated` → intake, tylko przy przejściu na status zrealizowane | `src/modules/tasks/subscribers/` | ten sam wzorzec co intake z `catalog.product.created` (scena 3) |
| Subscriber `customers.customer.updated` → intake, tylko przy `reference_consent` → `granted` | j.w. | odnajduje zamówienie klienta z ostatnim statusem zrealizowane |
| Subscriber `attachments.attachment.created` → intake, tylko dla zamówienia i obrazów | j.w. | jedno zadanie na partię: `source_ref = orderId:{data}` |
| Custom field `reference_consent` na `customers` (`none`/`requested`/`granted`) | `umes`, `src/modules/tasks/ce.ts` | widoczne w formularzu klienta |
| Tool `web_scrape(url)` dla researchera | `src/modules/factory/tools/` | Firecrawl `/v1/scrape`, `formats: ['markdown']`, zwraca `metadata` + URL-e obrazów z „logo” w ścieżce lub alt; klucz z `FIRECRAWL_API_KEY` server-side |
| Runner: pobranie logo z URL do `public/logos/<slug>.svg|png` | runner | SVG zostaje SVG, raster do PNG |
| Strona: rejestr `lib/realizations.ts`, `app/realizacje/<slug>/page.tsx`, pasek „Zaufali nam” na stronie głównej, galeria | repo `hackaton-stal-zbiorniki-landing` | SPEC-005 wyłączało logotypy klientów, ten spec je włącza |
| Dane demo: klient Park of Poland z `website`, kontakt, jedno zamówienie na produkty z seedu, `reference_consent: granted` | `src/modules/demo_fixtures/lib/stalZbiorniki.ts` | zamówienie **nie** jest zrealizowane w seedzie, oznacza je handlowiec na scenie |
| Zbuforowany wynik scrape'u `parkofpoland.com` | `src/modules/demo_fixtures/lib/suntago.json` | plan awaryjny, gdy Firecrawl nie odpowie |

## Model danych (strona)

```ts
type Realization = {
  slug: string                 // 'park-of-poland'
  customerName: string         // 'Park of Poland (Suntago)'
  customerUrl: string          // z customers.website
  logo: string                 // '/logos/park-of-poland.svg'
  title: string                // 'Zbiorniki na wodę technologiczną dla parku wodnego Suntago'
  summary: string              // 1–2 zdania, z opisu firmy i linii zamówienia
  productSkus: string[]        // z linii zamówienia
  capacityLiters: number       // suma z katalogu
  deliveredAt: string          // 'YYYY-MM', z daty zmiany statusu
  photos: string[]             // '/realizacje/park-of-poland/01.webp', puste do drugiego PR-a
}
```

Sprawdzone 2026-09-19: `parkofpoland.com` daje `title`, `description` i
`build/images/logos/new/logo_dark.svg` w nagłówku, więc kandydat na logo wybiera się regułą,
bez modelu.

## Kontrakty

- `factory/catalog-match` na PR-ze realizacji porównuje `productSkus`, `customerName`
  i `capacityLiters` z zamówieniem i katalogiem. Nazwa statusu bez zmian (SPEC-005), opis mówi,
  co porównano.
- Klasa zmiany dla `app/realizacje/**`, `lib/realizations.ts`, `public/logos/**`,
  `public/realizacje/**`: `content`. Bez wpisów w `regulamin`.
- `web_scrape` jest read-only i nie trafia do agentów piszących; runner dostaje gotowy URL logo
  w slice'ie.

## Scena 3b (SPEC-004, 3:40–4:30)

Handlowiec zmienia status zamówienia Park of Poland na zrealizowane. Tablica pokazuje zadanie
delegowane, z `sales.order.updated`. Przeskok do gotowego uruchomienia: artefakt researchera
z logo Suntago i opisem, PR z preview: logo w „Zaufali nam”, karta „Zbiorniki dla Suntago”.
Marek zatwierdza, strona na żywo. Jeśli jest czas: przeciągnięcie dwóch zdjęć na zamówienie,
drugie zadanie, PR z galerią.

## Plany awaryjne

| Jeśli nie działa | Zamiast tego |
|---|---|
| Firecrawl | researcher czyta `suntago.json` z fixtures; mówimy, skąd to jest |
| Subscriber na `sales.order.updated` | handlowiec tworzy zadanie ręcznie z linkiem do zamówienia |
| Runner | nagrane uruchomienie, jak w scenie 3 |
| Zdjęcia (drugi PR) | wyciąć, zostaje logo i karta |

## Ryzyka

- **Prawdziwa marka** (Q2). Logo Suntago na publicznej stronie demo bez zgody.
- **Firecrawl na żywo** to kolejna usługa zewnętrzna na scenie; scrape robimy przed pitchem
  (jak uruchomienie kodujące ze sceny 3) i buforujemy.
- **Zdjęcia**: własne albo wygenerowane, nigdy ze strony klienta.

## Plan wdrożenia

### Faza 1: Strona (repo landing)

1. `lib/realizations.ts`, strona `realizacje/<slug>`, pasek „Zaufali nam”, galeria; `noindex`
   na `realizacje`. *Test:* ręczny PR z realizacją Park of Poland dostaje preview z logo na
   stronie głównej i kartą; Playwright ze SPEC-005 przechodzi.

### Faza 2: Intake i dane

2. Wartość statusu zrealizowane (Q1); subscriber `sales.order.updated` → intake. *Test:* zmiana
   statusu w UI tworzy jedno delegowane zadanie; ponowny zapis zamówienia nie tworzy drugiego.
3. Custom field `reference_consent`; subscriber `customers.customer.updated`. *Test:* zmiana na
   `granted` tworzy zadanie realizacji dla zamówienia klienta.
4. Klient, kontakt i zamówienie w `demo_fixtures`; `suntago.json`. *Test:* seed idempotentny.

### Faza 3: Agenci i runner

5. Tool `web_scrape`; researcher używa go, gdy klient ma `website`. *Test:* artefakt dla
   `parkofpoland.com` zawiera URL `logo_dark.svg` i opis.
6. Operator: ścieżka `[none]` (mail + `requested`). *Test:* Caseload pokazuje szkic maila i
   zmianę pola przed → po; po zatwierdzeniu pole ma `requested`.
7. Runner: pobranie logo, PR z realizacją, `catalog-match`. *Test:* PR zielony, preview pokazuje
   logo i kartę, `catalog-match` czerwony po podmianie SKU w PR.

### Faza 4: Zdjęcia (jeśli zostanie czas)

8. Subscriber `attachments.attachment.created`; runner dodaje galerię. *Test:* dwa zdjęcia
   na zamówieniu → jedno zadanie → PR z dwoma plikami webp i galerią na karcie.

### Faza 5: Próba

9. Scena 3b w próbie generalnej na świeżym tenancie; zanotować koszt zadania.

## Historia zmian

<!-- Record, not state: rows are closed once dated — append, never rewrite. -->

| Data | Zmiana |
|------|--------|
| 2026-09-19 | Szkic: zrealizowane zamówienie → scrape strony klienta (Firecrawl) → zgoda jako pole klienta → PR z logo i kartą realizacji; zdjęcia z załączników jako drugi PR; Park of Poland jako klient demo; scena 3b zastępuje scenę prawnika w SPEC-004. |
