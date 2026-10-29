# 02 – Analýza zdrojového Excelu

Zdroj: `Srovnání univerzit 2026 – Lukas.xlsx` (stav k 29. 10. 2026). Soubor v repozitáři
není, protože obsahuje osobní data.

## Přehled listů

| List | Obsah | Řádků s daty | Použití v aplikaci |
|---|---|---|---|
| `Sport Science` | katalog programů | 16 (UK 11, IE 4, ES 1) | F1 katalog |
| `Sport Management` | katalog programů | 8 (UK 6, IE 1, NL 1) a jedna poznámka | F1 katalog |
| `Physioteraphy` | katalog programů | 8 (UK 6, IE 2) | F1 katalog |
| `Business Management ` | katalog programů | 23 (UK 10, IE 3, NL 6, DK, SE, CH, ES) | F1 katalog |
| `Výsledky IB` | scénáře predikce a assessmenty G11 S1 | 2 bloky | F2 predikce, F4 předměty |
| `další ranking jen na Sport ` | 2 odkazy na žebříčky | – | odkazy v nastavení oboru |
| `ISM seznam` | prázdná šablona školy pro rešerši univerzit | – | inspirace pro pole (Reach/Target/Likely, poplatky, doporučení…) |

## Listy oborů (katalog)

Všechny 4 listy mají stejné sloupce A–T:

| Sl. | Hlavička | Typ | Poznámka |
|---|---|---|---|
| A | Stát | kód | UK, IR, NL, DK, SE, SUI, SPAIN, převést na ISO (GB, IE, NL, DK, SE, CH, ES) |
| B | Univerzita | text | překlepy: „Notingham“, „Edinburg“, „Limerck“ |
| C | Umístění ve světovém žebříčku | číslo nebo rozsah | „326~350“, „351-400“, „?“, uložit jako text a k řazení odvodit číslo |
| D | Ranking 2027 UK (oborový) | číslo | jen UK, liší se podle oboru, takže patří k **programu** |
| E | adresa | víceřádkový text | |
| F | mapa | – | prázdné, odkaz na mapu lze generovat z adresy |
| G | web | URL | někdy bez `https://` |
| H | spojení s ČR | – | prázdné |
| I | Studijní obor | text | často **několik programů v jedné buňce** (odrážky, nové řádky) |
| J | Délka studia | text nebo číslo | „3 roky“, 3, „BSC. - 3 roky\nMSC 4 roky“, „3\n3\n4 roky“ |
| K | Získaný titul | text | BSc / MSci / … |
| L | Předměty/oblasti výuky | URL, i víc URL | ve skutečnosti **odkaz na stránku programu** |
| M | Magisterská studia? | text | „NE“, „cca 13 MSc programů“, název programu |
| N | OPEN DAYS | – | prázdné |
| O | Přihláška do | – | prázdné (UCAS: 14. 1., Oxbridge/medicína 15. 10.) |
| P | Výuka začíná | – | prázdné |
| Q | Školné za 1 rok | číslo | měna není uvedena (UK GBP, EU EUR), jednou text „€ 2694“ |
| R | Požadavky na studenta | dlouhý text | **klíčový sloupec**, volný text v angličtině |
| S | Životní náklady | – | prázdné |
| T | Ubytování přes univerzitu? | – | prázdné, jednou omylem obsahuje text o výběru (Erasmus) |

### Zjištění o kvalitě dat

1. **Duplicity:** Erasmus University Rotterdam je v Business Management dvakrát
   (řádky 17 a 22, liší se žebříčkem 24 a 93 i školným).
2. **Omylem zkopírované řádky:** v `Business Management` jsou UCD „Sport, Health & Exercise Science“
   (řádek 15) a UCAM „Physical Activity and Sport Sciences“ (řádek 30). Patří do Sport Science.
3. **Poznámka místo záznamu:** `Sport Management` řádek 8 obsahuje „warwick, St. Andrews, UCL“,
   tedy kandidáty k doplnění. V aplikaci budou jako programy ve stavu „k prozkoumání“.
4. **Více programů v jedné buňce** (Loughborough, Birmingham, Nottingham, Bristol, Tilburg, DCU…):
   import je rozdělí na samostatné programy, protože mohou mít různé požadavky.
5. **Neznámé požadavky:** „?“ (DCU), prázdné (UCAM, Aarhus, Lausanne), nesmysl „¬l¬“ (UvA).
6. **Měna školného** není uvedena a částky v GBP a EUR nejsou přímo srovnatelné. Doplnit pole měny.
7. Univerzity se opakují napříč listy (Bath, Loughborough, Birmingham, Exeter, Edinburgh, UCD, DCU,
   Kings, Glasgow, Leeds, Liverpool, Cardiff, UEA). Údaje o univerzitě se proto ukládají jen jednou.

### Typy požadavků v textu (sloupec R)

Rozbor všech textů ukázal tyto vzory. Ty určují, jak budou požadavky strukturované:

| Vzor | Příklad | Strukturované pole |
|---|---|---|
| Celkové skóre | „IB 35“, „32 points overall“ | `min_total` |
| Rozsah skóre (typical–contextual) | „34-31 overall“, „38–37“ | `min_total` + `min_total_contextual` |
| Profil HL známek | „6,6,5 in three HL“, „655 at HL“ | `hl_profile = [6,6,5]` |
| Alternativní profil | „6,6,6 **or** 7,6,5“ | více sad požadavků (NEBO) |
| Součet HL | „17 points at Higher Level“, „16 from best 3 HL“ | `min_hl_sum` |
| Konkrétní předmět | „HL Biology or Chemistry“, „grade 5 in HL Biology“ | `subject_rules[]` |
| N z množiny | „HL6 and HL6 in two of: biology; chemistry; …“ | `subject_rules[].count = 2` |
| SL požadavek | „English at SL 5“, „SL Maths 4 if not at HL“ | `subject_rules[]` s `level = SL/ANY` |
| Minimum všech předmětů | „no score less than 4“ | `min_each_subject` |
| Co se počítá do součtu | „35 includes TOK/EE“, „33 based on 6 subjects excluding TOK and EE“ | `total_basis` |
| Nečíselné přijímací řízení | NL numerus fixus, výběrové testy (Groningen), esej (Maastricht), GPA (Lund), „≥ 24, predicted grades not used“ (Tilburg) | `manual_review = true` a poznámka |

## List `Výsledky IB`

### Blok 1: scénáře (A1:I10)

- Řádky: HL × 3, SL × 3, „Extended Essay“ (v praxi **body za jádro TOK+EE**, 0–3),
  „Theory of Knowledge“ (prázdný), `SUMA`.
- Sloupce: scénáře `kašle na to`, `průměr`, `dře/maká`, `zázrak`, `moje predikce`
  a referenční `2025 ISM mean`, `2025 World mean`.
- `SUMA` = `SUM` sloupce, tedy celkové skóre IB (max. 45). Logika je správná.
- Řádek TOK je zbytečný, protože IB uděluje body za TOK a EE dohromady (matice 0–3).
  V aplikaci bude jedno pole „Core (TOK+EE)“ a volitelně známky A–E pro TOK a EE,
  ze kterých se body dopočítají.

### Blok 2: assessmenty G11 Semester 1 (A17:O35)

Každý předmět zabírá 3 řádky: **názvy assessmentů**, **váhy**, **známky**. Sloupce C–J jsou
assessmenty, K je průměr a L–O jsou váhy složek závěrečné zkoušky (Paper 1/2/3, IA).

| Předmět | Assessmentů | Součet vah | Vzorec průměru (K) | Problém |
|---|---|---|---|---|
| Sports Science HL | 8 | 1,00 | **chybí** | známka 6 je v G20 pod „Do now ass“, ale průměr se nepočítá |
| Biology HL | 4 | 0,50 | `(C·w+…+F·w)/SUM(C:F)` | správně |
| Business Mgmt HL | 5 | **1,25** | `(C..F)/SUM(C25:D25)` | jmenovatel bere jen 2 váhy, takže po doplnění E a F bude výsledek **nadhodnocený**. 5. položka (G) se nepočítá. Váhy dávají v součtu 125 %. |
| English SL | 8 | 1,00 | `(C..F)/SUM(E28:F28)` | jmenovatel ručně upravený na vyplněné buňky. G–J se nepočítají. |
| Spanish SL | 4 | 1,00 | **chybí** | |
| Math SL | 8 | 1,00 | `(C..F)/SUM(C34:D34)` | stejný problém jako Business, G–J se nepočítají |

**Závěr:** v Excelu se jmenovatel ručně upravuje podle toho, které známky už existují.
Je to náchylné k chybám a výsledky jsou dnes nekonzistentní. Aplikace bude počítat
jmenovatel automaticky jen z hodnocených položek
(viz [04](04-vypocty.md#vážený-průměr-předmětu)).

Další poznámky:
- Názvy assessmentů nesou kritérium: **KU** (Knowledge & Understanding) a **TL**.
  Kritérium bude samostatné pole, aby šlo počítat i průměr podle kritéria.
- **Termíny** assessmentů v Excelu nejsou. Uživatel je má jinde, takže v aplikaci bude pole `due_date`.
- Kolonka „Internal Essessment“ je překlep (Internal Assessment).

## List `ISM seznam`

Šablona školního poradce (Cialfo). Pole, která se hodí do aplikace jako volitelná
u programu: **Reach / Target / Likely**, acceptance rate, typ přihlášky (UCAS / Studielink / přímo),
požadavky na personal statement, doporučení, poplatek za přihlášku, náklady celkem,
stipendia, podíl zahraničních studentů, další požadavky.
