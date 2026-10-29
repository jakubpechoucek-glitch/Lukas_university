# 01 – Zadání

## Cíl

Lukas je ve 2. ročníku IB Diploma Programme (G11) na ISM. Během G12 si bude podávat
přihlášky na vysoké školy v Evropě (hlavně UK přes UCAS, dál Irsko a Nizozemsko).
Školy dávají IB studentům obvykle **conditional offer**: přijetí platí, pokud student
v závěrečných zkouškách dosáhne stanoveného skóre nebo stanovených známek.

Aplikace má odpovědět na otázku:

> **Na které školy (ve všech 4 oborech) se při mé aktuální predikci IB vyplatí hlásit
> a které mají vyšší požadavky?**

Zároveň má sledovat průběžné výsledky v jednotlivých předmětech. Ty jsou nejlepším
podkladem pro realistickou predikci.

## Uživatelé

| Uživatel | Co dělá |
|---|---|
| Rodič (Jakub) | Spravuje katalog škol, nastavuje scénáře predikce, vyhodnocuje |
| Lukas | Zapisuje známky z assessmentů, termíny, prohlíží si vyhodnocení |

Aplikace je soukromá a má 1–3 uživatele. Nejde o veřejnou službu.

## Funkční požadavky

### F1 – Katalog škol a programů (MVP)
- F1.1 Seznam programů rozdělený podle oborů (záložky nebo filtr): Sport Science,
  Sport Management, Physiotherapy, Business Management. Obory lze přidávat.
- F1.2 Jedna univerzita může mít programy ve více oborech. Údaje o univerzitě
  (adresa, web, světový žebříček) se zadávají jen jednou.
- F1.3 Přidání, úprava a smazání univerzity i programu (formulář nebo editace přímo v tabulce).
- F1.4 Uchovají se všechny sloupce z Excelu (viz [02](02-analyza-excelu.md)), včetně
  odkazů na web, stránku programu a mapu.
- F1.5 Řazení a filtr: země, žebříček, školné, stav vyhodnocení.
- F1.6 Požadavky na IB se ukládají **dvakrát**: jako původní text (citace ze stránek
  školy) a ve strukturované podobě, ze které lze počítat (viz [03](03-datovy-model.md#požadavky-na-ib)).
- F1.7 Stav přihlášky u programu: zvažuji → hlásím se → podáno → offer (conditional/unconditional) → odmítnuto/přijato.
- F1.8 Termíny: open days, uzávěrka přihlášek, začátek výuky.

### F2 – Predikce IB (MVP)
- F2.1 Tabulka předmětů: 3× HL, 3× SL (dnes HL Sports Exercise & Health Science, Biology,
  Business Management; SL English, Spanish, Math). Předměty a úrovně lze změnit.
- F2.2 Několik **scénářů** vedle sebe, stejně jako v Excelu: „kašle na to“, „průměr“,
  „dře/maká“, „zázrak“, „moje predikce“. Scénáře lze přidat, přejmenovat a smazat.
  Jeden scénář je aktivní a podle něj se vyhodnocují školy.
- F2.3 Známky 1–7 u předmětů a body za jádro (TOK + EE) 0–3.
- F2.4 Automaticky se spočítá celkové skóre (max. 45), součet HL, součet SL a „profil HL“ (např. 7-5-5).
- F2.5 Pro srovnání se zobrazí průměry ISM a světové průměry za rok 2025 (jen ke čtení, s možností úpravy).
- F2.6 Volitelně: u každého předmětu se vedle predikce ukáže aktuální vážený průměr z F4.

### F3 – Vyhodnocení dosažitelnosti (MVP)
- F3.1 Každý program se porovná s aktivním scénářem. Výsledek je jeden ze stavů ✅ / ⚠️ / ❌ / ❔
  (pravidla jsou v [04](04-vypocty.md#vyhodnocení-dosažitelnosti)).
- F3.2 Programy, které scénář nesplňuje, se v seznamu **přeškrtnou**. Lze je skrýt přepínačem.
- F3.3 U každého programu je vidět **důvod**, například „chybí 2 body do 36“ nebo „Biology HL 5 < 6“.
- F3.4 Přehledová matice: řádky jsou programy, sloupce scénáře, v buňkách stav.
  Hned je vidět, co se změní, když se Lukas „zlepší“.
- F3.5 Shrnutí po oborech: kolik programů je dosažitelných, hraničních a nedosažitelných.
- F3.6 Rozdělení na Reach / Target / Likely (pojmy z ISM šablony) odvozené z rezervy bodů.

### F4 – Hodnocení předmětů (MVP)
- F4.1 Pro každý předmět lze editovat **celou tabulku** assessmentů: přidat, smazat, přejmenovat,
  změnit pořadí a upravit váhu, známku (1–7), termín, pololetí a kritérium (KU/TL).
- F4.2 Automatický **vážený průměr** za předmět, který počítá jen hodnocené položky
  (vzorec je v [04](04-vypocty.md#vážený-průměr-předmětu)).
- F4.3 Ukazatel, jaký podíl vah je už hodnocený, a upozornění, když součet vah není 100 %.
- F4.4 Pololetí (G11 S1, G11 S2, G12 S1…) se dají přepínat a předmět má průměr za každé pololetí zvlášť.
- F4.5 Termíny assessmentů se zobrazí jako seznam „nadcházející“ (případně později v kalendáři).
- F4.6 Váhy složek závěrečné zkoušky (Paper 1/2/3, Internal Assessment) se ukládají
  u předmětu jako informace.

### F5 – Import a export
- F5.1 Jednorázový import dnešního Excelu (skript) do databáze.
- F5.2 Export celé databáze do JSON (záloha) a katalogu do CSV/XLSX.

## Nefunkční požadavky

- N1 Česky psané rozhraní. Názvy škol a programů zůstávají v originále.
- N2 Funguje na mobilu (Lukas) i na počítači.
- N3 Přístup jen po přihlášení, protože jde o data nezletilého.
- N4 Data se trvale ukládají a dají se zálohovat (export).
- N5 Výpočty se přepočítají okamžitě po změně známky, bez ukládání a obnovování stránky.
- N6 Nízké náklady na provoz (ideálně zdarma, nejvýš jednotky USD měsíčně).

## Uživatelské příběhy (výběr)

1. *Jako rodič* změním predikci z Biology HL 5 na 6 a hned vidím, že se odškrtla Bath i Nottingham.
2. *Jako rodič* přidám novou univerzitu (třeba Warwick) do Sport Management, vložím text požadavků
   a vyplním „36, HL 6-6-5“.
3. *Jako Lukas* zapíšu známku 6 z „Unit 3 Test“ v Business Management a uvidím nový průměr.
4. *Jako Lukas* si zobrazím assessmenty na příštích 14 dní.
5. *Jako rodič* v matici porovnám scénáře „průměr“ a „dře/maká“ a uvidím, kolik škol navíc se otevře.

## Mimo rozsah MVP

- Automatické stahování požadavků ze stránek škol.
- Integrace s UCAS a Cialfo.
- Sdílení s poradcem ze školy.
