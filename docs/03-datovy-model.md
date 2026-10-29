# 03 – Datový model

## Přehled entit

```
Field (obor) 1───* Program *───1 University
                     │
                     ├──* RequirementSet 1───* SubjectRule
                     └──* Deadline / stav přihlášky

Student 1───* Subject 1───* Assessment
   │             └──* ExamComponent (Paper 1/2/IA – info)
   └──* Scenario 1───* ScenarioGrade (subject × známka)
```

Model počítá s jedním studentem. Entita `Student` existuje, aby šlo později přidat
dalšího (sourozence) bez změny schématu.

## Katalog

### `field` – obor
| Pole | Typ | Pozn. |
|---|---|---|
| id | PK | |
| name | text | „Sport Science“, „Sport Management“, „Physiotherapy“, „Business Management“ |
| ranking_label | text | např. „Ranking 2027 UK Sport Science“ |
| ranking_url | text | odkaz na oborový žebříček |
| sort_order | int | |

### `university`
| Pole | Typ | Pozn. |
|---|---|---|
| id | PK | |
| name | text | unikátní |
| country | char(2) | ISO 3166 (GB, IE, NL, …) |
| city | text | |
| address | text | |
| website | text | URL |
| map_url | text | volitelné, jinak se vygeneruje z adresy |
| world_rank_text | text | „326~350“, „?“ |
| world_rank_sort | int | odvozené číslo k řazení (dolní mez rozsahu) |
| cz_connection | text | „spojení s ČR“ (let, vlak…) |
| accommodation | text | ubytování přes univerzitu |
| living_costs | int | odhad za rok |
| living_costs_currency | char(3) | |
| notes | text | |

### `program`
| Pole | Typ | Pozn. |
|---|---|---|
| id | PK | |
| university_id | FK | |
| field_id | FK | jeden program patří do jednoho oboru, kopie do dalšího oboru je samostatný řádek |
| name | text | „Sport and Exercise Science BSc“ |
| degree | text | BSc / MSci / BA / … |
| duration_years | numeric | |
| program_url | text | (Excel sl. L) |
| field_rank | int | oborový žebříček (Excel sl. D) |
| masters_info | text | (Excel sl. M) |
| tuition_fee | int | za rok |
| tuition_currency | char(3) | GBP / EUR / CHF / … |
| application_system | enum | UCAS, Studielink, CAO, direct, other |
| application_deadline | date | |
| open_days | text | |
| start_date | date | |
| requirements_text | text | **původní znění** požadavků (Excel sl. R) |
| manual_review | bool | požadavky nelze automaticky vyhodnotit (výběrové řízení, GPA…) |
| category_override | enum | Reach / Target / Likely, ruční přepsání vypočtené kategorie |
| status | enum | `research`, `considering`, `applying`, `applied`, `offer_conditional`, `offer_unconditional`, `rejected`, `accepted`, `dropped` |
| priority | int | vlastní pořadí („My Rank“ z ISM šablony) |
| notes | text | |
| created_at / updated_at | timestamp | |

### Požadavky na IB

Program má 0..N **sad požadavků** (`requirement_set`). Mezi sadami platí **NEBO**
(stačí splnit jednu). Podmínky uvnitř jedné sady platí **A ZÁROVEŇ**.

#### `requirement_set`
| Pole | Typ | Pozn. |
|---|---|---|
| id | PK | |
| program_id | FK | |
| label | text | „Typical offer“, „Contextual offer“, „Alternativa B“ |
| kind | enum | `typical` (výchozí), `contextual` (snížená nabídka, jen informativní) |
| min_total | int? | minimální celkové skóre |
| total_basis | enum | `with_core` (45, výchozí) / `subjects_only` (42, bez TOK/EE) |
| hl_profile | int[]? | např. `[6,6,5]`, porovnává se se seřazenými HL známkami |
| min_hl_sum | int? | součet 3 HL (např. 17) |
| min_each_subject | int? | „no score less than 4“ |
| requires_full_diploma | bool | výchozí true |

#### `subject_rule`
| Pole | Typ | Pozn. |
|---|---|---|
| id | PK | |
| requirement_set_id | FK | |
| subjects | text[] | kódy předmětů nebo skupin, např. `["BIO","CHEM","PHYS","SEHS","MATH_AA","MATH_AI","PSYCH"]` |
| level | enum | `HL`, `SL`, `ANY` |
| min_grade | int | 1–7 |
| count | int | kolik předmětů z množiny musí podmínku splnit (výchozí 1) |
| note | text | |

Příklad, Nottingham Sport and Exercise Science: *34 points, HL 6 a HL 6 ve dvou z biology,
chemistry, maths, physics, psychology, SEHS*
```json
{ "label": "Typical", "min_total": 34,
  "subject_rules": [{ "subjects": ["BIO","CHEM","MATH_AA","MATH_AI","PHYS","PSYCH","SEHS"],
                      "level": "HL", "min_grade": 6, "count": 2 }] }
```
Alternativa „6,6,6 in three HL“ je druhá sada `{ "hl_profile": [6,6,6] }`.

Příklad, Bath: *36 overall a 6,6,6 nebo 7,6,5 v HL včetně 6 v jedné science/maths*,
tedy dvě sady se stejnými `min_total = 36` a `subject_rule`, lišící se `hl_profile`.

### Číselník předmětů `subject_code`
Kódy IB předmětů (BIO, CHEM, PHYS, SEHS, BM, ECON, PSYCH, ENG_A_LIT, ENG_A_LANGLIT, ENG_B,
SPA_B, SPA_AB_INITIO, MATH_AA, MATH_AI, …) a **skupiny** pro zkrácený zápis:
- `SCIENCE` = BIO, CHEM, PHYS, SEHS (některé školy SEHS jako science nepočítají, takže je v pravidle
  potřeba rozepsat konkrétní předměty)
- `MATH` = MATH_AA, MATH_AI
- `ENGLISH` = ENG_A_*, ENG_B

## Student a předměty

### `subject` – předmět, který Lukas studuje
| Pole | Typ | Pozn. |
|---|---|---|
| id | PK | |
| student_id | FK | |
| code | FK → subject_code | |
| display_name | text | „Sports Science“ |
| level | enum | HL / SL |
| sort_order | int | |
| ism_mean_2025 | numeric | referenční průměr ISM |
| world_mean_2025 | numeric | světový průměr |

### `exam_component` – váhy závěrečné zkoušky (informativní)
| Pole | Typ |
|---|---|
| id, subject_id | |
| name | „Paper 1“, „Paper 2“, „Paper 3“, „Internal Assessment“, „Individual Oral“ |
| weight | numeric (0–1) |

### `assessment` – průběžné hodnocení
| Pole | Typ | Pozn. |
|---|---|---|
| id | PK | |
| subject_id | FK | |
| term | text | `G11-S1`, `G11-S2`, `G12-S1`, `G12-S2` |
| name | text | „Unit 1 Test“ |
| criterion | text? | KU / TL / … |
| weight | numeric | 0–1 (v UI zobrazeno v %) |
| grade | int? | 1–7, prázdné = zatím neohodnoceno |
| due_date | date? | termín |
| sort_order | int | pořadí sloupců jako v Excelu |
| notes | text | |

## Predikce

### `scenario`
| Pole | Typ | Pozn. |
|---|---|---|
| id | PK | |
| student_id | FK | |
| name | text | „kašle na to“, „průměr“, „dře/maká“, „zázrak“, „moje predikce“, později „Official predicted (škola)“ |
| is_active | bool | právě jeden aktivní, podle něj se vyhodnocuje katalog |
| core_points | int | 0–3 (TOK+EE) |
| tok_grade / ee_grade | char? | A–E, volitelné, body se pak dopočítají |
| sort_order | int | |

### `scenario_grade`
| Pole | Typ |
|---|---|
| scenario_id, subject_id | složený PK |
| grade | int 1–7 |

## Odvozené (nepersistované) hodnoty

Počítají se při každém dotazu nebo na klientovi, **neukládají se**:
- celkové skóre scénáře, součet HL a SL, profil HL
- vážený průměr předmětu za pololetí
- výsledek vyhodnocení programu × scénář (stav, rezerva, důvody)
- kategorie Reach / Target / Likely
