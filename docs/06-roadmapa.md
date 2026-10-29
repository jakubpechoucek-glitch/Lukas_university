# 06 – Roadmapa a otevřené otázky

## Fáze

### Fáze 0 – Analýza a dokumentace ✅ (tento commit)
- Rozbor Excelu, zadání, datový model, výpočetní pravidla, návrh architektury.

### Fáze 1 – Základ a výpočty
- Kostra projektu (client/server/db), migrace, autentizace.
- Modul `shared/calc` (IB skóre, vyhodnocení, vážený průměr) s unit testy podle [04](04-vypocty.md#testovací-případy-pro-unit-testy).

### Fáze 2 – Import dat
- Skript `import-xlsx`: rozdělí buňky s více programy, sloučí duplicitní univerzity,
  přesune omylem zkopírované řádky, opraví překlepy v názvech, doplní měnu.
- **Ruční převod požadavků** (sloupec R) do strukturovaných sad. Je to cca 50 programů.
  Návrh převede Claude, uživatel ho zkontroluje. Programy s nejasnými požadavky
  dostanou `manual_review`.

### Fáze 3 – MVP obrazovky
1. **Predikce**: tabulka scénářů jako v Excelu, editace buněk, živý součet, výběr aktivního scénáře.
2. **Katalog**: záložky oborů, tabulka programů se stavem ✅⚠️❌❔, přeškrtnutí, důvod
   v tooltipu, filtr a řazení, formulář programu včetně editoru požadavků.
3. **Předměty**: pro každý předmět editovatelná tabulka assessmentů (váha, známka, termín,
   kritérium), vážený průměr, pokrytí vah, přepínač pololetí.
4. **Matice** program × scénář.

### Fáze 4 – Nasazení
- Render, doména, uživatelské účty, dlaždice v rozcestníku.

### Fáze 5 – Rozšíření (podle potřeby)
- Nadcházející termíny a kalendář (export do Google Calendar).
- Sledování přihlášek (stav, deadline UCAS 14. 1., personal statement, reference).
- Scénář z aktuálních průměrů.
- Srovnání nákladů (školné + život) v jedné měně.
- Mapa škol.

## Otevřené otázky

| # | Otázka | Proč je důležitá | Výchozí předpoklad |
|---|---|---|---|
| Q1 | „Cenové skóre“ v zadání znamená **celkové skóre** IB (součet bodů, max. 45)? | výpočet F2 | ano, celkové skóre |
| Q2 | Kterou variantu hostingu zvolit (A–D v [05](05-architektura.md#zvážené-alternativy))? Je OK platit ~7 USD/měsíc? | architektura | A (jako project_tracker) |
| Q3 | Bude data editovat i Lukas (vlastní účet), nebo jen rodič? | autentizace, role | dva účty |
| Q4 | Převést repo na **private**? | soukromí, seed dat | zůstane public, osobní data jen v DB |
| Q5 | Která matematika je SL Math, **AA, nebo AI**? | některé školy (Erasmus, Groningen, TCD) to rozlišují | AA |
| Q6 | Je English **Language A (Lang & Lit)**, nebo **B**? A Spanish B, nebo ab initio? | požadavky na angličtinu a jazykové výjimky | English A Lang & Lit, Spanish B |
| Q7 | Kde jsou dnes termíny assessmentů (kalendář školy, Google Calendar, ManageBac)? Jde je importovat? | F4.5 | ruční zadání |
| Q8 | Hranice „hraniční“ (tolerance) = 1 bod? Hranice Reach/Target/Likely? | F3 | 1 bod; Target 0–1, Likely ≥ 2 |
| Q9 | Má aplikace řešit i školy mimo IB logiku (NL výběrová řízení, Lund GPA) víc než poznámkou? | rozsah | jen poznámka a `manual_review` |
| Q10 | Mají se při importu opravit chyby v Excelu (duplicitní Erasmus, UCD a UCAM v Business)? | čistota dat | ano, podle [02](02-analyza-excelu.md#zjištění-o-kvalitě-dat) |
