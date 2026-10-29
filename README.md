# Lukas University

Webová aplikace pro výběr vysoké školy v Evropě podle oboru a podle predikce
výsledků IB Diploma. Nahrazuje Excel `Srovnání univerzit 2026 – Lukas.xlsx`.

> **Stav:** fáze 2 hotová. Kostra, přihlášení, výpočty a data z Excelu (67 programů, 36 univerzit)
> jsou v databázi. Obrazovky přijdou ve fázi 3 (viz [roadmapa](docs/06-roadmapa.md)).
> Běží na **https://lukas-university.onrender.com** (Render, Singapore, nasazuje větev `claude/amazing-cori-0abi6p`).

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

## Spuštění lokálně

```bash
cp .env.example .env      # vyplnit BOOTSTRAP_USERS a INITIAL_PASSWORD
npm run setup             # závislosti serveru i klienta + migrace
npm run dev               # backend :3000, frontend :5173
npm test                  # unit testy výpočtů, katalogu a API
npm run seed:catalog      # katalog škol do prázdné DB (při startu serveru se děje automaticky)
npm run import:private -- data/private/lukas-private.json   # známky a assessmenty (viz docs/07)
```

Požadavek: Node.js ≥ 22.12 (server načítá sdílené ES moduly z `shared/calc`).

## Nasazení na Render

1. V Renderu: **New → Blueprint** → vybrat tento repozitář (`render.yaml`).
2. V nastavení služby doplnit proměnné, které nejsou v repozitáři:
   - `BOOTSTRAP_USERS` = `Jakub|<email>|parent;Jana|<email>|parent;Lukas|<email>|student`
   - `INITIAL_PASSWORD` = dočasné heslo (každý si ho při prvním přihlášení změní)
   - volitelně `PRIVATE_SEED_JSON` = obsah `data/private/lukas-private.json` (jednorázový import známek)
3. Účty se vytvoří při startu serveru. Existující účty se nemění.
4. **Persistent disk** (Settings → Disks) s mount path `/opt/render/project/src/data` – bez něj se databáze
   při každém nasazení smaže.

## Struktura

```
client/         React + Vite + Tailwind (build → server/public)
server/         Express API (routes → controllers → services → repositories)
shared/calc/    výpočty IB skóre, vyhodnocení škol a váženého průměru (server i klient)
db/             SQLite, migrace, bootstrap účtů a základních dat
tests/          node:test (calc, catalog, api)
tools/          extract_private.py – osobní data z Excelu do JSON (mimo git)
docs/           dokumentace
```

## Dokumentace

| Dokument | Obsah |
|---|---|
| [docs/01-zadani.md](docs/01-zadani.md) | Cíl, uživatelé, funkční a nefunkční požadavky, uživatelské příběhy |
| [docs/02-analyza-excelu.md](docs/02-analyza-excelu.md) | Rozbor zdrojového Excelu, kvalita dat, chyby ve vzorcích |
| [docs/03-datovy-model.md](docs/03-datovy-model.md) | Entity, atributy, vazby, strukturované požadavky IB |
| [docs/04-vypocty.md](docs/04-vypocty.md) | Výpočet IB skóre, pravidla vyhodnocení, vážený průměr |
| [docs/05-architektura.md](docs/05-architektura.md) | Technologie, nasazení, soukromí dat |
| [docs/06-roadmapa.md](docs/06-roadmapa.md) | Fáze vývoje, rozhodnutí, otevřené otázky |
| [docs/07-import-dat.md](docs/07-import-dat.md) | Import z Excelu, pravidla převodu požadavků, přehled všech programů, body k ověření |

## Soukromí

Repozitář je **veřejný**. Neukládejte sem známky, predikce ani zdrojový Excel.
Osobní data patří jen do databáze aplikace. Lokální kopie dat patří do
`data/private/`, kterou ignoruje git (viz [docs/05-architektura.md](docs/05-architektura.md#soukromí-a-bezpečnost)).
