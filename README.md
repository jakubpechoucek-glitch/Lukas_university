# Lukas University

Webová aplikace pro výběr vysoké školy v Evropě podle oboru a podle predikce
výsledků IB Diploma. Nahrazuje Excel `Srovnání univerzit 2026 – Lukas.xlsx`.

> **Stav:** fáze 1 hotová. Hotová je kostra aplikace, přihlášení a výpočetní modul s testy.
> Obrazovky katalogu, predikce a předmětů přijdou ve fázi 3 (viz [roadmapa](docs/06-roadmapa.md)).

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
npm test                  # unit testy výpočtů + API
```

Požadavek: Node.js ≥ 22.12 (server načítá sdílené ES moduly z `shared/calc`).

## Nasazení na Render

1. V Renderu: **New → Blueprint** → vybrat tento repozitář (`render.yaml`).
2. V nastavení služby doplnit proměnné, které nejsou v repozitáři:
   - `BOOTSTRAP_USERS` = `Jakub|<email>|parent;Jana|<email>|parent;Lukas|<email>|student`
   - `INITIAL_PASSWORD` = dočasné heslo (každý si ho při prvním přihlášení změní)
3. Účty se vytvoří při startu serveru. Existující účty se nemění.

## Struktura

```
client/         React + Vite + Tailwind (build → server/public)
server/         Express API (routes → controllers → services → repositories)
shared/calc/    výpočty IB skóre, vyhodnocení škol a váženého průměru (server i klient)
db/             SQLite, migrace, bootstrap účtů a základních dat
tests/          node:test (calc.test.mjs, api.test.js)
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
| [docs/06-roadmapa.md](docs/06-roadmapa.md) | Fáze vývoje, otevřené otázky |

## Soukromí

Repozitář je **veřejný**. Neukládejte sem známky, predikce ani zdrojový Excel.
Osobní data patří jen do databáze aplikace. Lokální kopie dat patří do
`data/private/`, kterou ignoruje git (viz [docs/05-architektura.md](docs/05-architektura.md#soukromí-a-bezpečnost)).
