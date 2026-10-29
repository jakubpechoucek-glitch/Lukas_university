# 04 – Výpočty

## Celkové skóre IB

```
total = Σ grade(subject) za 6 předmětů   (každý 1–7, max. 42)
      + core_points                     (TOK+EE, 0–3)
                                        → max. 45
hl_sum   = Σ grade(HL předměty)          (max. 21)
hl_profile = HL známky seřazené sestupně, např. [7,5,5]
```

**Core points z TOK a EE** (oficiální matice IB, pro případ zadání známek A–E):

| TOK \ EE | A | B | C | D | E |
|---|---|---|---|---|---|
| **A** | 3 | 3 | 2 | 2 | ✗ |
| **B** | 3 | 2 | 2 | 1 | ✗ |
| **C** | 2 | 2 | 1 | 0 | ✗ |
| **D** | 2 | 1 | 0 | 0 | ✗ |
| **E** | ✗ | ✗ | ✗ | ✗ | ✗ |

✗ = diplom se neuděluje (failing condition).

**Podmínky udělení diplomu** (zjednodušené, kontrolují se jako varování): total ≥ 24, žádná
známka 1, nejvýš dvě známky 2, nejvýš tři známky 3 a horší, hl_sum ≥ 12, SL součet ≥ 9,
žádné E z TOK/EE.

## Vyhodnocení dosažitelnosti

Vstup: aktivní scénář a program se sadami požadavků. Pro každou sadu se vyhodnotí všechny
podmínky. Každá podmínka vrátí **rezervu** (o kolik je splněna, záporné číslo = chybí) a text důvodu.

| Podmínka | Rezerva |
|---|---|
| `min_total` | `total − min_total` (při `total_basis = subjects_only` se core points odečtou) |
| `min_hl_sum` | `hl_sum − min_hl_sum` |
| `hl_profile` | Seřazené HL známky se porovnají po pozicích s požadovaným profilem. Rezerva = **součet záporných rozdílů**. Příklad: [7,5,5] vs [6,6,5] → rozdíly (+1, −1, 0) → rezerva −1. Přebytek na jedné pozici nevyrovná chybějící bod na jiné, stejně jako u skutečné nabídky. |
| `min_each_subject` | `min(grade) − min_each_subject` |
| `subject_rule` | Vezmou se předměty z množiny na požadované úrovni (u `ANY` libovolná), seřadí se sestupně a vezme se `count`-tý nejlepší. Rezerva = `ta známka − min_grade`. Když takových předmětů není dost, podmínka je **nesplnitelná** (❌ s důvodem „nestuduje HL Chemistry“), nezávisle na známkách. |

Výsledek sady = nejhorší rezerva (minimum) ze všech jejích podmínek.
Výsledek programu = **nejlepší** sada typu `typical` (maximum).
Sady `contextual` se ukazují jen jako doplňková informace („splňuje contextual offer“).

### Stavy

| Stav | Podmínka | Zobrazení |
|---|---|---|
| ✅ Splňuje | rezerva ≥ 0 | normálně, zeleně |
| ⚠️ Hraniční | −`tolerance` ≤ rezerva < 0 (výchozí `tolerance = 1`, nastavitelná) | oranžově |
| ❌ Nesplňuje | rezerva < −`tolerance` nebo nesplnitelné pravidlo | **přeškrtnutě**, šedě, lze skrýt |
| ❔ Nelze určit | program nemá žádnou sadu, nebo `manual_review = true` | šedě s ikonou |

Splnění podmínek diplomu (viz výše) se hlídá zvlášť. Pokud je scénář nesplňuje,
zobrazí se globální varování a všechny programy s `requires_full_diploma` dostanou ❌.

### Kategorie Reach / Target / Likely

Odvozuje se z rezervy (pokud není `category_override`):

| Rezerva | Kategorie |
|---|---|
| < 0 | Reach |
| 0 až +1 | Target |
| ≥ +2 | Likely |

Hranice budou v nastavení.

### Příklad (fiktivní čísla)

Scénář: HL 7, 5, 5 · SL 5, 6, 6 · core 3 → total 37, hl_sum 17, profil [7,5,5].

| Program | Požadavek | Výpočet | Stav |
|---|---|---|---|
| Durham | 35, HL 665 | total +2; profil (+1,−1,0) → −1 | ⚠️ (−1) |
| Glasgow | 34 (6,5,5), HL Biology nebo Chemistry (min. známka neuvedena, předpoklad 5) | total +3; profil (+1,0,0) → 0; BIO HL 5 → 0 | ✅ Target |
| KCL Physio | 35, HL 6 a HL 5 ze skupiny [BIO, CHEM, PHYS, PSYCH, SOC, SEHS, MATH] | total +2; nejlepší ze skupiny SEHS 7 ≥ 6 → +1; druhý nejlepší BIO 5 ≥ 5 → 0 | ✅ Target |
| Bath Sport Sci. | 36, HL 666 nebo 765, 6 ve science | sada A: (+1,−1,−1) → −2; sada B: (0,−1,0) → −1 | ⚠️ (−1) |

> Pravidlo „HL 6 a 5“ se zapíše jako dvě `subject_rule`: (`count = 1`, `min_grade = 6`) a (`count = 2`, `min_grade = 5`).

## Vážený průměr předmětu

Pro předmět a pololetí:

```
hodnocené = assessmenty s vyplněnou známkou
průměr    = Σ (weight_i × grade_i) / Σ weight_i     přes hodnocené
pokrytí   = Σ weight hodnocených / Σ weight všech   (zobrazit jako %)
```

- Jmenovatel je **jen součet vah hodnocených položek**. Tím se automaticky řeší problém
  z Excelu, kde se jmenovatel přepisoval ručně (viz [02](02-analyza-excelu.md#blok-2-assessmenty-g11-semester-1-a17o35)).
- Váhy se nemusí sčítat na 1. Vzorec je normalizuje. Pokud součet vah všech položek ≠ 100 %,
  zobrazí se varování (Business Management dnes 125 %).
- Průměr se zobrazí na 2 desetinná místa a vedle něj známka 1–7 **zaokrouhlená matematicky** (5,49 → 5, 5,50 → 6).
- Bez hodnocených položek se průměr nezobrazí (pomlčka), nikdy ne 0.
- Volitelně se průměr počítá i podle kritéria (KU, TL) a za celý rok
  (vážený přes pololetí, váhy pololetí jsou nastavitelné, výchozí 50/50).

### Vazba na predikci (nice-to-have)

Scénář **„podle průměrů“** (`scenarios.source = 'averages'`) nemá ručně zadané známky:
známka každého předmětu = vážený průměr přes všechna pololetí **zaokrouhlený matematicky** (od ,50 nahoru).
Přepočítává se živě při každé změně assessmentu. Body TOK+EE se zadávají ručně (assessmenty k nim nejsou).
Scénář lze nastavit jako aktivní, nelze ho smazat; předmět bez jediné známky zůstane prázdný.

## Testovací případy (pro unit testy)

1. total: 7+5+5+5+6+6+3 = 37
2. profil [7,5,5] vs [6,6,5] → rezerva −1. Vs [6,5,5] → 0.
3. `subject_rule` count=2 HL min 6 nad {SEHS 7, BIO 5, BM 5} se skupinou bez BM → druhý nejlepší = 5 → −1.
4. Vážený průměr: váhy 0,125 × 4, známky [5,5,7,7] → 6,00. Jen dvě známky [6,4] při vahách 0,25 → 5,00 a pokrytí 2/5 = 40 %.
5. Žádná známka → průměr `null`.
6. Core z TOK B a EE C → 2.
