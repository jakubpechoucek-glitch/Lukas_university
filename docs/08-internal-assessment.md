# Internal Assessment (sekce IA)

Pomůcka pro psaní vědecké zprávy (Scientific investigation) v předmětech s rubrikou. Zatím **SEHS**
(Sports, exercise and health science, 4 kritéria × 6 bodů = 24 b., 24 % výsledné známky, max. 3 200 slov).

## Co umí
- **Výzkumná otázka**: uloží se k předmětu; tlačítko „Zkontrolovat otázku (AI)“ vrátí zpětnou vazbu
  (co se povedlo, co zlepšit, na co musí umět odpovědět v Research design, kostra otázky k doplnění).
- **Kontrola práce**: vložený text, PDF, Word (.docx) nebo odkaz na Google Doc (sdílený „kdokoli s odkazem“).
  Lze vyhodnotit všechna 4 kritéria, nebo jen vybraná. Výstup pro každé kritérium: odhad pásma a bodů,
  splnění jednotlivých deskriptorů pásma 5–6 s citací z textu, odpovědi na oficiální checklist a co chybí
  k dalšímu pásmu. Počítá slova (odhad bez tabulek a bibliografie).
- **Průvodce k maximu bodů**: oficiální pásma, tipy „co má obsahovat“ obecně i k tématu plank + EMG
  a checklist k odškrtávání (ukládá se v prohlížeči).
- **Historie**: každá kontrola se ukládá, takže je vidět posun mezi koncepty.

## Důležité zásady
- Výstup je **neoficiální orientační odhad** pro učení. Hodnotí učitel a IB.
- Nástroj **nepíše text do zprávy** (prompt to zakazuje): jen hodnotí, ptá se a radí. Zpráva musí být vlastní práce.
- Zprávy se ukládají jen do databáze na Renderu (ne do gitu) a při kontrole se posílají do Claude API.
- Před použitím AI zpětné vazby je dobré ověřit, že ji škola dovoluje.

## Architektura
- Rubrika jako data: `shared/ia/rubrics.json` (klíč = kód předmětu v tabulce `subjects`). Sdílí ji server i klient.
  Další předmět = nový klíč se stejnou strukturou (kritéria, pásma, checklisty, tipy).
- Server: `server/routes/ia.routes.js` → `controllers/ia.controller.js` → `services/ia.service.js`
  (DB, běh na pozadí), `ia-extract.service.js` (PDF/Word/Google Doc, počítání slov), `ia-ai.service.js` (Claude API).
- Kontrola běží **na pozadí**: `POST …/review-*` hned vrátí `id`, klient se každé 3 s ptá na `GET /api/ia/reviews/:id`.
  Rozběhlá kontrola přerušená restartem se po 10 min označí jako chyba.
- Strukturovaný výstup přes volání nástroje (`tool_choice: auto` + instrukce; novější modely vynucený `tool_choice` nepodporují,
  při chybějícím volání se jednou zopakuje), server body ořízne na rozsah 0–6 a pásmo
  dopočítá sám, takže model nemůže vrátit nekonzistentní hodnoty.
- Tabulky: `ia_projects` (výzkumná otázka), `ia_reviews` (historie), migrace `006_ia.sql`.

## Nastavení
- `ANTHROPIC_API_KEY` (povinné pro AI), volitelně `ANTHROPIC_MODEL` (výchozí `claude-sonnet-5-5`).
- Strop 40 spuštění za hodinu (`express-rate-limit`), soubory do 10 MB.
