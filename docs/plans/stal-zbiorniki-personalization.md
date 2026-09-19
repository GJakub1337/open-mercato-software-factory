# Plan personalizacji

Cel: odtwarzalna lokalna firma demo, zgodna z fikcyjną stroną Stal-Zbiorniki.
Specyfikacja: [.ai/specs/2026-09-19-stal-zbiorniki-personalization.md](../../.ai/specs/2026-09-19-stal-zbiorniki-personalization.md).

1. Potwierdzić źródła i scope. Repo aplikacji na origin/main 67a838f; landing 580d1f32c93b4eb229c1aa0316e9d47751c9a6c8. Brak zmian Core i landingu.
2. Test RED ochrony ponownego seedowania i ręcznych edycji. Dodać dane i CLI przez publiczne komendy, istniejący configs jako dziennik. Test GREEN; testy scope, kolizji i awarii.
3. Udokumentować bootstrap bez przykładów, uruchomić własny Postgres i aplikację na wolnym porcie. Sprawdzić pierwsze/ponowne seedowanie i UI. Uruchomić bramki oraz niezależny przegląd.

Worktree należy do tego taska: open-mercato-software-factory-steel-demo, branch codex/steel-demo-personalization. Stan KEEP do odbioru. Baza/porty tylko własne, bez dotykania 5001. Ryzyko: pending po niepewnym wyniku wymaga uzgodnienia dziennika; brak resetu i usuwania danych jako naprawy.
