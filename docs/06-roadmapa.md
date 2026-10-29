# 06 – Roadmapa a otevřené otázky

## Fáze

### Fáze 0 – Analýza a dokumentace ✅
- Rozbor Excelu, zadání, datový model, výpočetní pravidla, návrh architektury.

### Fáze 1 – Základ a výpočty ✅
- Kostra projektu (client/server/db), migrace celého datového modelu, přihlášení
  (3 účty z `BOOTSTRAP_USERS`, povinná změna hesla při prvním přihlášení).
- Bootstrap základních dat: 4 obory, 6 předmětů s průměry ISM/World 2025, 5 scénářů (bez známek).
- Modul `shared/calc` (IB skóre, podmínky diplomu, vyhodnocení, Reach/Target/Likely, vážený průměr)
  s 17 unit testy podle [04](04-vypocty.md#testovací-případy-pro-unit-testy) a 6 testy API.
- Navigace a prázdné stránky ve frontendu.

### Fáze 2 – Import dat ✅
- Skript `import-xlsx`: rozdělí buňky s více programy, sloučí duplicitní univerzity,
  přesune omylem zkopírované řádky, opraví překlepy v názvech, doplní měnu.
- **Ruční převod požadavků** (sloupec R) do strukturovaných sad. Je to cca 50 programů.
  Návrh převede Claude, uživatel ho zkontroluje. Programy s nejasnými požadavky
  dostanou `manual_review`.
- Hotovo: 67 programů / 36 univerzit, 28 testů. Podrobnosti a body k ověření v [07](07-import-dat.md).

### Fáze 3 – MVP obrazovky ✅
1. **Predikce**: tabulka scénářů jako v Excelu, editace buněk, živý součet, výběr aktivního scénáře.
2. **Katalog**: záložky oborů, tabulka programů se stavem ✅⚠️❌❔, přeškrtnutí, důvod
   v tooltipu, filtr a řazení, formulář programu včetně editoru požadavků.
3. **Předměty**: pro každý předmět editovatelná tabulka assessmentů (váha, známka, termín,
   kritérium), vážený průměr, pokrytí vah, přepínač pololetí.
4. **Matice** program × scénář.
5. ✅ Navíc **Přehled**: skóre aktivního scénáře, dosažitelnost po oborech, „kde se vyplatí přidat“
   (o kolik programů víc by Lukas splňoval při +1 známce v daném předmětu), nadcházející termíny, přihlášky.
- Vyhodnocení běží v prohlížeči (`shared/calc`), takže změna známky se projeví okamžitě bez dotazu na server.
- 33 testů (výpočty, katalog, import, API včetně CRUD), UI ověřeno v prohlížeči (desktop i mobil).

### Fáze 4 – Nasazení ✅
- ✅ Render služba `lukas-university` (Starter, Singapore), 3 účty.
- ✅ Persistent disk 1 GB (`/opt/render/project/src/data`), osobní data naimportována, `PRIVATE_SEED_JSON` vyprázdněno.
- ✅ Vývoj sloučen do `main`; Render nasazuje z `main` (`render.yaml: branch: main`).
- ✅ Dlaždice „Lukas University“ v rozcestníku (sekce Vzdělání).
- Postup pro další změny: vývoj ve vlastní větvi → merge do `main` → Render nasadí automaticky.

### Fáze 5 – Rozšíření (podle potřeby)
- Nadcházející termíny a kalendář (export do Google Calendar).
- Sledování přihlášek (stav, deadline UCAS 14. 1., personal statement, reference).
- Scénář z aktuálních průměrů.
- Srovnání nákladů (školné + život) v jedné měně.
- Mapa škol.

## Rozhodnutí (29. 10. 2026)

| # | Otázka | Rozhodnutí |
|---|---|---|
| Q1 | „Cenové skóre“ | překlep, myslí se **celkové skóre IB** (max. 45) |
| Q2 | Hosting | **Render** (varianta A: Express + SQLite + persistent disk) |
| Q3 | Účty | **3 účty**: rodiče Jakub a Jana (role `parent`), Lukas (role `student`). E-maily jsou jen v proměnné prostředí `BOOTSTRAP_USERS` na Renderu, ne v repozitáři. |
| Q4 | Private repo | **ne**, repozitář zůstane veřejný, osobní data jen v DB |
| Q5 | SL Math | **Mathematics: Analysis & Approaches** (`MATH_AA`) |
| Q6 | English / Spanish | **English A** (`ENG_A`), **Spanish B** (`SPA_B`) |

## Otevřené otázky

| # | Otázka | Proč je důležitá | Výchozí předpoklad |
|---|---|---|---|
| Q7 | Kde jsou dnes termíny assessmentů (kalendář školy, Google Calendar, ManageBac)? Jde je importovat? | F4.5 | ruční zadání |
| Q8 | Hranice „hraniční“ (tolerance) = 1 bod? Hranice Reach/Target/Likely? | F3 | 1 bod; Target 0–1, Likely ≥ 2 |
| Q9 | Má aplikace řešit i školy mimo IB logiku (NL výběrová řízení, Lund GPA) víc než poznámkou? | rozsah | jen poznámka a `manual_review` |
| Q10 | Mají se při importu opravit chyby v Excelu (duplicitní Erasmus, UCD a UCAM v Business)? | čistota dat | ano, podle [02](02-analyza-excelu.md#zjištění-o-kvalitě-dat) |
