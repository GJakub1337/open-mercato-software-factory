export const DEMO_COMPANY_NAME = 'Stal-Zbiorniki Sp. z o.o.'
export const DEMO_NOTICE = 'Dane fikcyjne do demonstracji; nie stanowią oferty handlowej.'

export const DEMO_CUSTOMERS = [
  { key: 'internal', displayName: DEMO_COMPANY_NAME, industry: 'Produkcja zbiorników stalowych', domain: 'stal-zbiorniki.example', description: 'Prace wewnętrzne: katalog, strona i przygotowanie dokumentacji zbiorników.' },
  { key: 'brewery', displayName: 'Browar Rzemieślniczy Ostrów', industry: 'Browarnictwo', domain: 'browar-ostrow.example', description: 'Scenariusz z landingu: dwa zbiorniki ZWP-2000 zasilające linię warzelną, łącznie 4000 l.' },
  { key: 'water', displayName: 'Aqua Dolina - park wodny (demo)', industry: 'Rekreacja', domain: 'aqua-dolina.example', description: 'Fikcyjny odbiorca zbiornika ppoż. ZPPOZ-20 i dwóch zbiorników ZCH-3000. Odbiór techniczny przed przygotowaniem referencji.' },
  { key: 'transport', displayName: 'Trans-Sud - baza transportowa (demo)', industry: 'Transport', domain: 'trans-sud.example', description: 'Zapytanie o zbiornik dwupłaszczowy ZDP-5000 do własnej bazy transportowej. Parametry wymagają potwierdzenia.' },
] as const

export const DEMO_TEAMS = [
  { key: 'office', name: 'Sprzedaż i obsługa klienta', description: 'Zapytania, oferty, terminy dostaw i treści na stronie.' },
  { key: 'engineering', name: 'Technologia i jakość', description: 'Dokumentacja techniczna, weryfikacja parametrów i odbiory.' },
  { key: 'production', name: 'Produkcja i logistyka', description: 'Wytwarzanie, kompletacja i transport zbiorników.' },
] as const

export const DEMO_PEOPLE = [
  { key: 'owner', name: 'Marek Wolski', team: 'office', role: 'Właściciel; zatwierdza treści strony i oferty' },
  { key: 'sales', name: 'Katarzyna Lis', team: 'office', role: 'Koordynatorka sprzedaży i kontaktów z klientami' },
  { key: 'engineer', name: 'Piotr Domański', team: 'engineering', role: 'Technolog; dokumentacja i dobór materiałów' },
  { key: 'quality', name: 'Ewa Górecka', team: 'engineering', role: 'Kontrola jakości; weryfikacja dokumentów odbiorowych' },
  { key: 'production', name: 'Tomasz Borkowski', team: 'production', role: 'Planowanie produkcji i kompletacja' },
  { key: 'logistics', name: 'Alicja Sikora', team: 'production', role: 'Logistyka i uzgodnienie dostaw' },
] as const

export const DEMO_PROJECTS = [
  { key: 'website', code: 'DEMO', name: 'Strona i katalog Stal-Zbiorniki', customer: 'internal', description: 'Aktualność katalogu i sekcji Od ręki. Software Engineer pomaga po świadomym przypisaniu zadania; publikację zatwierdza człowiek.', people: ['owner', 'sales', 'engineer', 'quality'] },
  { key: 'brewery', code: 'BROWAR', name: 'Browar Ostrów - dwa zbiorniki ZWP-2000', customer: 'brewery', description: 'Historia realizacji z landingu. Dwa zbiorniki na wodę technologiczną, łącznie 4000 l. Dokumentacja i obsługa po dostawie.', people: ['owner', 'sales', 'quality', 'logistics'] },
  { key: 'water', code: 'AQUA', name: 'Aqua Dolina - instalacja technologiczna', customer: 'water', description: 'Fikcyjna realizacja: ZPPOZ-20 i 2 x ZCH-3000. Odbiór, transport i przygotowanie materiałów referencyjnych.', people: ['owner', 'engineer', 'quality', 'production', 'logistics'] },
] as const

export const DEMO_TASKS = [
  { key: 'capacity', project: 'website', status: 'backlog', person: 'engineer', title: 'Zweryfikować pojemność i wymiary ZDP-5000', description: 'Scena 2: katalog pokazuje 5000 l i nie ma wymiarów. W scenariuszu właściwa pojemność to 5200 l. Nie poprawiać automatycznie; przed zmianą Marek zatwierdza propozycję.' },
  { key: 'stock', project: 'website', status: 'in-progress', person: 'sales', title: 'Potwierdzić dostępność produktów Od ręki', description: 'Sprawdzić ZWP-2000, ZDP-5000 i ZPPOZ-20. ZWM-1500 dodamy dopiero podczas demonstracji.' },
  { key: 'copy', project: 'website', status: 'in-review', person: 'owner', title: 'Zatwierdzić opisy zastosowań zbiorników', description: 'Zweryfikować spójność kart ze specyfikacją. Dane demo nie potwierdzają rzeczywistych certyfikatów ani dopuszczeń.' },
  { key: 'categories', project: 'website', status: 'done', person: 'sales', title: 'Uporządkować katalog według zastosowania', description: 'Woda pitna, paliwa, chemia, ppoż., urządzenia technologiczne oraz przekrojowa sekcja Od ręki.' },
  { key: 'brewery-service', project: 'brewery', status: 'backlog', person: 'sales', title: 'Zaplanować kontakt po dostawie do browaru', description: 'Uzyskać opinię o użytkowaniu dwóch ZWP-2000. Fikcyjny scenariusz obsługi posprzedażowej.' },
  { key: 'brewery-docs', project: 'brewery', status: 'in-progress', person: 'quality', title: 'Skompletować archiwum dokumentacji ZWP-2000', description: 'Zebrać karty dwóch zbiorników i protokół odbioru. Nie generować fikcyjnych dokumentów certyfikacyjnych.' },
  { key: 'brewery-reference', project: 'brewery', status: 'in-review', person: 'owner', title: 'Sprawdzić opis realizacji Browar Ostrów', description: 'Landing zawiera już realizację: dwa ZWP-2000, łącznie 4000 l, maj 2026. Przegląd treści bez publikacji.' },
  { key: 'brewery-delivery', project: 'brewery', status: 'done', person: 'logistics', title: 'Zamknąć checklistę dostawy dwóch zbiorników', description: 'Historia demonstracyjna zgodna z istniejącą realizacją na stronie; nie jest dowodem realnej dostawy.' },
  { key: 'water-transport', project: 'water', status: 'backlog', person: 'logistics', title: 'Uzgodnić okno transportowe Aqua Dolina', description: 'ZPPOZ-20 wymaga zaplanowania rozładunku. Potwierdzić gotowość miejsca montażu przed wysyłką.' },
  { key: 'water-production', project: 'water', status: 'in-progress', person: 'production', title: 'Przygotować komplet ZPPOZ-20 i dwóch ZCH-3000', description: 'Lista kompletacyjna dla fikcyjnego zamówienia SZ-DEMO-0042; 126400 PLN netto według katalogu demo.' },
  { key: 'water-quality', project: 'water', status: 'in-review', person: 'quality', title: 'Zweryfikować checklistę odbioru technicznego', description: 'Materiał, wymiary, króćce i komplet dokumentacji. Zakończenie wymaga akceptacji technologa.' },
  { key: 'water-scope', project: 'water', status: 'done', person: 'engineer', title: 'Uzgodnić zakres instalacji technologicznej', description: 'Zakres scenariusza: zbiornik przeciwpożarowy 20 m³ oraz dwa zbiorniki chemiczne po 3000 l.' },
] as const
