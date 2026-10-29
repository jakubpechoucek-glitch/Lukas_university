# 07 – Import dat z Excelu

Fáze 2 převedla Excel do dvou oddělených zdrojů:

| Soubor | Obsah | V gitu? |
|---|---|---|
| `db/seed/catalog.json` | veřejný katalog: 36 univerzit, 67 programů, původní texty požadavků a jejich strukturovaná podoba | ano |
| `data/private/lukas-private.json` | scénáře predikce, assessmenty G11 S1, váhy složek zkoušek | **ne** (`.gitignore`) |

## Katalog

- Při startu serveru se katalog nahraje automaticky, pokud je DB prázdná (`db/seed-catalog.js`).
  Ručně: `npm run seed:catalog`, přepsání: `npm run seed:catalog -- --force` (smaže i změny provedené v aplikaci!).
- Po spuštění aplikace je zdrojem pravdy **databáze**. `catalog.json` slouží jen pro první naplnění.

### Provedené úpravy oproti Excelu
- Opravené názvy: King's College London, University of Nottingham, University of Edinburgh, University of Limerick,
  University of East Anglia (bez „, Norwich“), UCAM s plným názvem.
- Země převedeny na ISO kódy (UK → GB, IR → IE, SPAIN → ES, SUI → CH); doplněna měna školného podle země.
- Buňky s více programy rozděleny na samostatné programy (Bath, Loughborough, Birmingham, Nottingham, Bristol,
  City, DCU, Tilburg) – každý má vlastní odkaz.
- Erasmus Rotterdam (2 řádky) sloučen do jednoho programu, oba texty požadavků zachovány.
- Řádky omylem zkopírované do Business Management (UCD Sport, UCAM) vynechány – jsou ve Sport Science.
- Poznámka „warwick, St. Andrews, UCL“ → 3 univerzity s programem „(program k doplnění)“ ve stavu *research*.
- Sloupec C v listu Business Management je oborový žebříček → uložen u programu (`subject_world_rank_text`),
  u ostatních listů je to celkový žebříček univerzity.

### Pravidla převodu požadavků
- **Rozsah** (např. 34–31, 665–555): jako *typical* se počítá horní (přísnější) hranice, spodní je *contextual* –
  zobrazí se jen jako informace „splňuje contextual offer“.
- **„A nebo B“** (Bath 666 / 765, KCL 33 bodů / 16 ze 3 HL, Nottingham 34 / 666): samostatné sady, stačí jedna.
- **Neuvedená minimální známka** u povinného předmětu: odvozena z HL profilu, jinak předpoklad 5 (vyznačeno v poznámce).
- **„HL 4 / SL 5“** (City, DCU): zjednodušeno na „≥ 5 na libovolné úrovni“ (pro SL přesné, pro HL přísnější).
- **Nečíselné výběrové řízení** (Erasmus, Groningen, Maastricht, Lund): `manual_review` → stav ❔.
- **Chybějící požadavky** („?“, prázdné, „¬l¬“): bez sad → stav ❔. Je potřeba je doplnit.
- Kódy předmětů a skupin (`SCIENCE`, `MATH`, `ENGLISH`) viz [03](03-datovy-model.md#číselník-předmětů-subject_code).

### K ověření (prosím zkontrolovat)
1. **Glasgow Business**: počítá Business Management jako „humanities“?
2. **Nottingham Sport Rehabilitation**: požadavky převzaty ze Sport and Exercise Science.
3. **UCC**: „Award of diploma with 24 overall, Minimum 31“ – použito 31.
4. **Loughborough Sport and Exercise Science**: typical 38–37 → použito 37 / 6,6,6.
5. **Erasmus**: žebříček 24 vs. 93 a kapacita 650 vs. 750 – který řádek je aktuální?
6. **Leeds Business**: 31 je minimum univerzity, program může chtít víc.
7. Programy bez požadavků: DCU (2×), Limerick, UCAM, UvA, Aarhus, Lausanne, Warwick, St Andrews, UCL.

## Osobní data

```bash
# 1) z Excelu do JSON (výstup mimo git)
python3 tools/extract_private.py "Srovnání univerzit 2026 – Lukas.xlsx" data/private/lukas-private.json
# 2a) lokálně do DB
npm run import:private -- data/private/lukas-private.json
# 2b) v produkci: POST /api/import/private (role parent), nebo jednorázově proměnná PRIVATE_SEED_JSON
```

`PRIVATE_SEED_JSON` (obsah JSON souboru) se importuje při startu serveru **jen pokud v DB ještě nejsou žádné
známky ani assessmenty** – pozdější úpravy v aplikaci se tedy nepřepíšou.

Formát:
```json
{
  "subjects":   [{ "code": "BIO", "ismMean2025": 4.71, "worldMean2025": 4.45 }],
  "scenarios":  [{ "name": "moje predikce", "corePoints": 3, "grades": { "SEHS": 7, "BIO": 5, "…": 0 } }],
  "assessments":[{ "subject": "BIO", "term": "G11-S1", "name": "Unit 01 - KU", "criterion": "KU",
                   "weight": 0.125, "grade": 5, "dueDate": null, "sortOrder": 0 }],
  "examComponents": [{ "subject": "BIO", "name": "PAPER 1", "weight": 0.36, "sortOrder": 0 }]
}
```
Import je idempotentní: scénáře se párují podle názvu, assessmenty se nahrazují po dvojicích předmět + pololetí.
Kritérium „ToL“ z listu Sports Science se převádí na „TL“.

## Přehled převedených požadavků

### Sport Science

| Univerzita | Program | Požadavky (sady = NEBO) | Poznámka |
|---|---|---|---|
| University of Bath | Health and Exercise Science BSc | 36 b. · HL 6,6,6 · HL ≥6 z [BIO, CHEM, MATH, PHYS, PSYCH, SEHS] <br>NEBO 36 b. · HL 7,6,5 · HL ≥6 z [BIO, CHEM, MATH, PHYS, PSYCH, SEHS] |  |
| University of Bath | Sport and Exercise Science BSc | 36 b. · HL 6,6,6 · HL ≥6 z [BIO, CHEM, MATH, PHYS, PSYCH, SEHS] <br>NEBO 36 b. · HL 7,6,5 · HL ≥6 z [BIO, CHEM, MATH, PHYS, PSYCH, SEHS] |  |
| University of Bath | Sport and Exercise Science MSci | 36 b. · HL 6,6,6 · HL ≥6 z [BIO, CHEM, MATH, PHYS, PSYCH, SEHS] <br>NEBO 36 b. · HL 7,6,5 · HL ≥6 z [BIO, CHEM, MATH, PHYS, PSYCH, SEHS] |  |
| Loughborough University | Sport and Exercise Science BSc (Hons) | 37 b. · HL 6,6,6 · 2× HL ≥6 z [BIO, CHEM, MATH, PHYS, PSYCH, SEHS] | Typical offer 38–37 (7,6,6 – 6,6,6 HL). Použita spodní hranice 37 / 6,6,6. |
| Loughborough University | Sport Science, Coaching and Physical Education BSc (Hons) | 35 b. · HL 6,6,5 · HL ≥5 z [BIO, MATH, PHYS, CHEM, PSYCH, SCA, HIST, GEO, SEHS, ENGLISH] | Předmět ze seznamu na HL – minimální známka neuvedena, předpoklad 5 (z profilu 6,6,5). |
| Durham University | Sport and Exercise Sciences BSc | 35 b. · HL 6,6,5 |  |
| King's College London | Sport & Exercise Medical Sciences BSc | 33 b. · 2× HL ≥5 z [BIO, CHEM, PHYS, PSYCH, SEHS, MATH] <br>NEBO ΣHL ≥ 16 · 2× HL ≥5 z [BIO, CHEM, PHYS, PSYCH, SEHS, MATH] |  |
| University of Exeter | Exercise and Sport Sciences BSc | 31 b. · HL 6,6,5 · HL ≥5 z [SCIENCE] |  |
| University of Birmingham | Sport, PE and Coaching Science BSc | 32 b. · HL 6,6,5 <br>NEBO *contextual:* 32 b. · HL 6,5,5 | Rozsah 6,6,5 – 6,5,5 podle počtu „preferred subjects“. Jako typical se počítá přísnější 6,6,5. |
| University of Birmingham | Sport, Exercise and Health Sciences BSc | 32 b. · HL 6,6,5 <br>NEBO *contextual:* 32 b. · HL 6,5,5 | Rozsah 6,6,5 – 6,5,5 podle počtu „preferred subjects“. Jako typical se počítá přísnější 6,6,5. |
| University of Glasgow | Sport & Exercise Science BSc/MSci | 34 b. · HL 6,5,5 · HL ≥5 z [BIO, CHEM] | HL Biology nebo Chemistry – minimální známka neuvedena, předpoklad 5. |
| University of Leeds | Sport and Exercise Sciences BSc | 31 b. · HL 6,6,5 · HL ≥5 z [SCIENCE] |  |
| University of Nottingham | Sport and Exercise Science BSc (Hons) | 34 b. · 2× HL ≥6 z [BIO, CHEM, MATH, PHYS, PSYCH, SEHS] <br>NEBO HL 6,6,6 · 2× HL ≥6 z [BIO, CHEM, MATH, PHYS, PSYCH, SEHS] |  |
| University of Nottingham | Sport Rehabilitation BSc (Hons) | 34 b. · 2× HL ≥6 z [BIO, CHEM, MATH, PHYS, PSYCH, SEHS] <br>NEBO HL 6,6,6 · 2× HL ≥6 z [BIO, CHEM, MATH, PHYS, PSYCH, SEHS] | Požadavky převzaty ze Sport and Exercise Science – ověřit na stránce programu. |
| University of Edinburgh | Applied Sport Science BSc (Hons) | 34 b. · HL 6,5,5 · HL ≥5 z [BIO, CHEM, MATH, PHYS, PSYCH, SEHS] · ≥5 z [ENGLISH] |  |
| Newcastle University | Sport and Exercise Science BSc Honours | 34 b. · HL ≥5 z [SCIENCE] · ≥4 z [MATH] <br>NEBO *contextual:* 32 b. · HL ≥5 z [SCIENCE] · ≥4 z [MATH] | Rozsah 32–34; jako typical se počítá 34. |
| University College Dublin | Sport, Health & Exercise Science | 35 b. |  |
| Dublin City University | Sport Science and Health | ❔ neuvedeno | Požadavky v Excelu neuvedeny („?“). |
| University College Cork | Physical Education, Sports Studies | 31 b. | Text „Award of diploma with 24 overall, Minimum 31“ – použito 31 (opatrnější varianta), ověřit. |
| University of Limerick | Bachelor of Science in Exercise and Health Fitness Management | ❔ neuvedeno | Požadavky v Excelu neuvedeny. |
| UCAM – Universidad Católica San Antonio de Murcia | Physical Activity and Sport Sciences | ❔ neuvedeno | Požadavky v Excelu neuvedeny. |

### Sport Management

| Univerzita | Program | Požadavky (sady = NEBO) | Poznámka |
|---|---|---|---|
| University of Bath | Sport Management and Coaching BSc (Hons) | 36 b. · HL 6,6,5 |  |
| Loughborough University | Sport Management BSc (Hons) | 35 b. · HL 6,6,5 |  |
| University of Exeter | BSc Sport Business Management | 32 b. · HL 6,5,5 |  |
| University of Birmingham | Sport Sciences with Business BSc | 32 b. · HL 6,6,5 <br>NEBO *contextual:* 32 b. · HL 6,5,5 | Rozsah 6,6,5 – 6,5,5 podle počtu „preferred subjects“. Jako typical se počítá přísnější 6,6,5. |
| University of Birmingham | Sport, Coaching Sciences and Business BSc | 32 b. · HL 6,6,5 <br>NEBO *contextual:* 32 b. · HL 6,5,5 | Rozsah 6,6,5 – 6,5,5 podle počtu „preferred subjects“. Jako typical se počítá přísnější 6,6,5. |
| University of Edinburgh | Sport Management BSc (Hons) | 34 b. · HL 6,5,5 · ≥5 z [ENGLISH] |  |
| University of East Anglia | Sports Development BSc | 32 b. |  |
| University College Dublin | Sport & Exercise Management BSc | 35 b. |  |
| The Hague University of Applied Sciences | Sport Studies / International Sport Management | 24 b. · ΣHL ≥ 12 |  |
| University of Warwick | (program k doplnění) | ❔ neuvedeno | Kandidát z poznámky v Excelu („warwick, St. Andrews, UCL“). |
| University of St Andrews | (program k doplnění) | ❔ neuvedeno | Kandidát z poznámky v Excelu („warwick, St. Andrews, UCL“). |
| University College London | (program k doplnění) | ❔ neuvedeno | Kandidát z poznámky v Excelu („warwick, St. Andrews, UCL“). |

### Physiotherapy

| Univerzita | Program | Požadavky (sady = NEBO) | Poznámka |
|---|---|---|---|
| University of Liverpool | Physiotherapy BSc (Hons) | 34 b. · HL 6,6,5 · vše ≥ 4 · HL ≥5 z [BIO, SEHS] |  |
| University of East Anglia | BSc (Hons) Physiotherapy | 33 b. · HL ≥5 z [BIO, SEHS] |  |
| University of Birmingham | Physiotherapy MSci | 32 b. · HL 6,6,5 · HL ≥6 z [BIO, SEHS] |  |
| Cardiff University | Physiotherapy (BSc) | 34 b. · HL ≥5 z [BIO] <br>NEBO HL 6,6,5 · HL ≥5 z [BIO] <br>NEBO *contextual:* 31 b. · HL ≥5 z [BIO] <br>NEBO *contextual:* HL 5,5,5 · HL ≥5 z [BIO] | Rozsah 34–31 / 665–555; jako typical se počítá horní hranice. |
| University of Southampton | Physiotherapy (BSc) | 34 b. · ΣHL ≥ 17 · HL ≥4 z [SCIENCE] |  |
| King's College London | Physiotherapy BSc | 35 b. · HL ≥6 z [BIO, CHEM, PHYS, PSYCH, SOC, SEHS, MATH] · 2× HL ≥5 z [BIO, CHEM, PHYS, PSYCH, SOC, SEHS, MATH] <br>NEBO ΣHL ≥ 17 · HL ≥6 z [BIO, CHEM, PHYS, PSYCH, SOC, SEHS, MATH] · 2× HL ≥5 z [BIO, CHEM, PHYS, PSYCH, SOC, SEHS, MATH] |  |
| University College Dublin | Physiotherapy BSc | 35 b. |  |
| Dublin City University | Athletic Therapy and Training / Athletic Therapy and Strength and Conditioning (Integrated MSc) | ❔ neuvedeno | Požadavky v Excelu neuvedeny („?“). |

### Business Management

| Univerzita | Program | Požadavky (sady = NEBO) | Poznámka |
|---|---|---|---|
| University of Exeter | BSc Business and Management | 34 b. · HL 6,6,5 |  |
| University of Leeds | Business Management and Leadership BSc | 31 b. | Minimum univerzity 31, program může vyžadovat víc – ověřit. |
| University of Bristol | BSc International Business Management | 36 b. · ΣHL ≥ 18 |  |
| University of Bristol | BSc Business and Management | 36 b. · ΣHL ≥ 18 |  |
| University of Bristol | MSci Business and Management with Innovation | 36 b. · ΣHL ≥ 18 |  |
| University of Birmingham | Business Management BSc | 32 b. · HL 6,6,5 |  |
| Loughborough University | Business and Management BSc | 35 b. · HL 6,6,5 |  |
| Loughborough University | International Business BSc | 35 b. · HL 6,6,5 |  |
| University of Glasgow | Business & Management MA(SocSci)/BSc | 36 b. · HL 6,6,5 · HL ≥6 z [ENGLISH] <br>NEBO 36 b. · HL 6,6,5 · HL ≥6 z [HIST, GEO, ECON, PSYCH, SCA, BM] · ≥6 z [ENGLISH] |  |
| City St George's, University of London | Business Management BSc | 35 b. · ≥5 z [MATH] · ≥5 z [ENGLISH] |  |
| City St George's, University of London | International Business BSc | 35 b. · ≥5 z [MATH] · ≥5 z [ENGLISH] |  |
| Cardiff University | Business Management (BSc) | 34 b. <br>NEBO HL 6,6,5 <br>NEBO *contextual:* 31 b. <br>NEBO *contextual:* HL 5,5,5 | Rozsah 34–31 / 665–555; jako typical se počítá horní hranice. |
| Lancaster University | Business Management BSc Hons | 32 b. · ΣHL ≥ 16 |  |
| University of Liverpool | Business Management | 34 b. · vše ≥ 4 <br>NEBO HL 6,6,5 |  |
| Trinity College Dublin | Business (Joint Honours) | HL ≥5 z [MATH] | Přijímá se přes CAO body; v Excelu jen podmínka HL Math 5. |
| Dublin City University | Bachelor of Business Studies | 37 b. · ≥5 z [MATH] |  |
| Dublin City University | BSc Digital Business and Innovation | 34 b. · ≥5 z [MATH] |  |
| Erasmus University Rotterdam | Bachelor International Business Administration (IBA) | ❔ ruční posouzení · ≥5 z [MATH_AA] | Numerus fixus – výběr podle známek (75 %) a motivace (25 %). Sloučeno se zdvojeným řádkem 22. As a numerux fixus programme, IBA applicants are given selection points, which are used for ranking and selecting the top 650 applicants. The selection points are based on your grades and your motivation; Grades 75%: Your average grade counts the most for the final ranking. The lower your grades, the fewer selection points you'll receive. Motivation 25%: You will answer 3 motivation questions when applying. You must also meet the minimum English and Mathematics requirements listed for your diploma type. Žebříček: 24 (řádek 17) / 93 (řádek 22) – který je oborový, ověřit. |
| Tilburg University | International Business Administration BSc | 24 b. | Predicted grades se nepoužívají – rozhoduje finální diplom. |
| Tilburg University | Entrepreneurship and Business Innovation BSc | 24 b. | Predicted grades se nepoužívají – rozhoduje finální diplom. |
| University of Groningen | International Business | ❔ ruční posouzení · ≥1 z [MATH_AA] | Výběrové testy. |
| Maastricht University | International Business Economics | ❔ ruční posouzení | Esej „International Classroom“ a požadavek na matematiku. |
| University of Amsterdam | Liberal Arts and Sciences (Amsterdam University College) | ❔ neuvedeno | Požadavky v Excelu neuvedeny. |
| Aarhus University | Economics and Business Administration | ❔ neuvedeno | Požadavky v Excelu neuvedeny. |
| Lund University | International Business – Bachelor's Programme | ❔ ruční posouzení | Výběr podle GPA. |
| University of Lausanne | Bachelor of Science in Management | ❔ neuvedeno | Požadavky v Excelu neuvedeny. |
