# Lukas University

Webová aplikace pro výběr vysoké školy v Evropě podle oboru a podle predikce
výsledků IB Diploma. Nahrazuje Excel `Srovnání univerzit 2026 – Lukas.xlsx`.

> **Stav:** fáze 0 – analýza a dokumentace. Kód zatím neexistuje.

## Co bude aplikace umět (MVP)

1. **Katalog škol a programů** pro 4 obory (Sport Science, Sport Management,
   Physiotherapy, Business Management): přidat, upravit a smazat položku, filtrovat, řadit.
2. **Predikce IB**: editovatelné známky (6 předmětů + body za TOK/EE) ve více
   scénářích. Celkové skóre (max. 45) se počítá automaticky.
3. **Vyhodnocení dosažitelnosti**: u každého programu se podle zvolené predikce
   zobrazí, jestli požadavky splňuje ✅, je těsně pod nimi ⚠️, nesplňuje je ❌
   (škrtnuté), nebo je nelze vyhodnotit automaticky ❔.
4. **Hodnocení předmětů G11/G12**: editovatelná tabulka assessmentů (název,
   váha, známka, termín) a automatický vážený průměr pro každý předmět.

## Dokumentace

| Dokument | Obsah |
|---|---|
| [docs/01-zadani.md](docs/01-zadani.md) | Cíl, uživatelé, funkční a nefunkční požadavky, uživatelské příběhy |
| [docs/02-analyza-excelu.md](docs/02-analyza-excelu.md) | Rozbor zdrojového Excelu, kvalita dat, chyby ve vzorcích |
| [docs/03-datovy-model.md](docs/03-datovy-model.md) | Entity, atributy, vazby, strukturované požadavky IB |
| [docs/04-vypocty.md](docs/04-vypocty.md) | Výpočet IB skóre, pravidla vyhodnocení, vážený průměr |
| [docs/05-architektura.md](docs/05-architektura.md) | Technologie, nasazení, soukromí dat |
| [docs/06-roadmapa.md](docs/06-roadmapa.md) | Fáze vývoje, otevřené otázky |

## Soukromí

Repozitář je **veřejný**. Neukládejte sem známky, predikce ani zdrojový Excel.
Osobní data patří jen do databáze aplikace. Lokální kopie dat patří do
`data/private/`, kterou ignoruje git (viz [docs/05-architektura.md](docs/05-architektura.md#soukromí-a-bezpečnost)).
