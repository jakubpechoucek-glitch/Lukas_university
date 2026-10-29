# 05 – Architektura a technologie

## Doporučení: stejný stack jako `project_tracker`

Autor už má zkušenosti s `project_tracker` (Node/Express + SQLite + React/Vite/Tailwind
na Renderu). Navrhuju stejný stack. Projekt pak bude povědomý, půjde z něj převzít
autentizaci, deploy i strukturu.

| Vrstva | Volba | Proč |
|---|---|---|
| Frontend | React + Vite + Tailwind | známé, rychlé. Tabulky s editací v buňkách přes TanStack Table |
| Výpočty | čistý TypeScript/JS modul `shared/calc` | **stejný kód na klientovi (okamžitý přepočet) i na serveru (testy, export)** |
| Backend | Node.js + Express, REST API | jednoduché CRUD |
| Databáze | SQLite (better-sqlite3), migrace v SQL | 1–3 uživatelé, desítky až stovky řádků |
| Autentizace | e-mail + heslo, JWT (převzít z project_tracker) | data nezletilého |
| Hosting | Render Web Service + persistent disk (Starter) | stejné jako project_tracker |
| Testy | Jest (výpočty, API) | testovací případy viz [04](04-vypocty.md#testovací-případy-pro-unit-testy) |

### Struktura repozitáře (návrh)

```
Lukas_university/
├── client/              React SPA
│   └── src/pages/       Katalog, Predikce, Předměty, Matice, Nastavení
├── server/
│   ├── routes/ controllers/ services/ repositories/   (stejné vrstvy jako project_tracker)
│   └── index.js
├── shared/calc/         ibScore.js, eligibility.js, weightedAverage.js (+ testy)
├── db/
│   ├── migrations/
│   ├── seed-catalog.json   veřejná data o školách (bez osobních údajů)
│   └── import-xlsx.js      jednorázový import z Excelu (čte data/private/*.xlsx)
├── data/private/        ⛔ ignorováno gitem
├── docs/
└── render.yaml
```

### API (náčrt)

```
GET/POST        /api/fields
GET/POST        /api/universities          PUT/DELETE /api/universities/:id
GET/POST        /api/programs?field=…      PUT/DELETE /api/programs/:id
PUT             /api/programs/:id/requirements     (celé sady najednou)
GET/POST        /api/scenarios             PUT/DELETE /api/scenarios/:id
PUT             /api/scenarios/:id/grades
POST            /api/scenarios/:id/activate
GET/POST        /api/subjects              PUT/DELETE /api/subjects/:id
GET/POST        /api/subjects/:id/assessments
PUT/DELETE      /api/assessments/:id
GET             /api/evaluation?scenario=… (výsledky ✅⚠️❌❔ pro všechny programy)
GET             /api/export                (JSON záloha)
```

## Zvážené alternativy

| Varianta | Plusy | Minusy |
|---|---|---|
| **A) Express + SQLite na Renderu** (doporučeno) | známý stack, plná kontrola, sdílení mezi zařízeními | Starter plán + disk ≈ 7,25 USD/měsíc. Na free plánu se data při deployi smažou. |
| B) Statická SPA na GitHub Pages + localStorage | zdarma, nejjednodušší (jako ostatní projekty v rozcestníku) | data jen v jednom prohlížeči, žádné sdílení s Lukasem, riziko ztráty dat. Repo je veřejné, takže kód je vidět (data ne). |
| C) Statická SPA + Supabase/Firebase (free tier) | zdarma, sdílení, autentizace v ceně | další služba a nová technologie |
| D) Express + PostgreSQL (Render) | trvalá data bez disku | Free Postgres na Renderu po 30 dnech vyprší, placený od ≈ 7 USD/měsíc |

**Rozhodnutí čeká na uživatele** (viz [06 – otevřené otázky](06-roadmapa.md#otevřené-otázky)).
Výpočetní modul `shared/calc` je ve všech variantách stejný, takže na volbě nezávisí.

## Soukromí a bezpečnost

- Repozitář `Lukas_university` je **veřejný**. Do gitu nepatří známky, predikce, jméno školy
  studenta spojené s výsledky, zdrojový Excel ani `.env`. `.gitignore` už ignoruje
  `*.xlsx`, `data/private/` a `*.db`.
- Do gitu lze dát jen **veřejný katalog** (názvy škol, požadavky, odkazy, školné) jako seed.
- Zvážit převedení repozitáře na **private**. Pak by šlo verzovat i seed s osobními daty.
- Všechna API kromě loginu vyžadují přihlášení. Dva účty: rodič (admin) a Lukas (editor).
- HTTPS (Render ho poskytuje), hesla hashovaná bcryptem, rate-limit loginu.
- Záloha: tlačítko „Export JSON“ a volitelně noční cron se zálohou (jako `jobs/` v project_tracker).

## Napojení na rozcestník

Po nasazení přidat dlaždici do repozitáře `rozcestnik` (`index.html`) s odkazem na aplikaci.
