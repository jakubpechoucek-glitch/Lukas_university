// Výpočet celkového skóre IB a kontrola podmínek udělení diplomu.
// Viz docs/04-vypocty.md#celkové-skóre-ib

const CORE_MATRIX = {
  // TOK → EE: A B C D
  A: { A: 3, B: 3, C: 2, D: 2 },
  B: { A: 3, B: 2, C: 2, D: 1 },
  C: { A: 2, B: 2, C: 1, D: 0 },
  D: { A: 2, B: 1, C: 0, D: 0 },
};

/**
 * Body za jádro (TOK + EE) podle matice IB.
 * Vrací null, když některá známka chybí, a 'fail', když je E (diplom se neuděluje).
 */
export function corePointsFromGrades(tok, ee) {
  if (!tok || !ee) return null;
  const t = tok.toUpperCase();
  const e = ee.toUpperCase();
  if (t === 'E' || e === 'E') return 'fail';
  const points = CORE_MATRIX[t]?.[e];
  if (points === undefined) throw new Error(`Neplatná známka TOK/EE: ${tok}/${ee}`);
  return points;
}

export const MAX_SUBJECT_POINTS = 42; // 6 předmětů × 7
export const MAX_CORE_POINTS = 3;
export const MAX_TOTAL_POINTS = MAX_SUBJECT_POINTS + MAX_CORE_POINTS; // 45

/**
 * @param {{code: string, level: 'HL'|'SL', grade: number|null}[]} subjects
 * @param {number|null} corePoints 0–3; null/undefined = TOK+EE zatím není zadáno (skóre je pak rozpětí 0–3 b.)
 * @param {{tok?: string, ee?: string}} [core] volitelné známky A–E
 */
export function ibTotals(subjects, corePoints, core = {}) {
  const graded = subjects.filter((s) => Number.isFinite(s.grade));
  const hl = graded.filter((s) => s.level === 'HL').map((s) => s.grade);
  const sl = graded.filter((s) => s.level === 'SL').map((s) => s.grade);

  let core_ = corePoints;
  const fromGrades = corePointsFromGrades(core.tok, core.ee);
  if (fromGrades !== null) core_ = fromGrades === 'fail' ? 0 : fromGrades;
  // Zadáno = body (i 0) nebo obě známky TOK a EE. Jinak je jádro neznámé a celkem je rozpětí.
  const coreKnown = fromGrades !== null || Number.isFinite(core_);
  core_ = Number.isFinite(core_) ? core_ : 0;

  const subjectsTotal = sum(hl) + sum(sl);
  const totals = {
    subjectsTotal,
    corePoints: core_,
    total: subjectsTotal + core_,
    coreKnown,
    // Celkem, jak ho počítají univerzity (předměty + TOK/EE). Bez zadaného jádra rozpětí od 0 do 3 bodů navíc.
    totalMin: subjectsTotal + core_,
    totalMax: subjectsTotal + (coreKnown ? core_ : MAX_CORE_POINTS),
    hlSum: sum(hl),
    slSum: sum(sl),
    hlProfile: [...hl].sort((a, b) => b - a),
    complete: graded.length === subjects.length && subjects.length === 6,
  };
  totals.diplomaIssues = diplomaIssues(graded.map((s) => s.grade), totals, fromGrades === 'fail');
  return totals;
}

function diplomaIssues(grades, t, coreFailed) {
  const issues = [];
  if (t.totalMax < 24) issues.push(`celkové skóre ${t.totalMax} < 24`);
  if (grades.includes(1)) issues.push('známka 1 z předmětu');
  if (grades.filter((g) => g === 2).length > 2) issues.push('více než dvě známky 2');
  if (grades.filter((g) => g <= 3).length > 3) issues.push('více než tři známky 3 a horší');
  if (t.hlSum < 12) issues.push(`součet HL ${t.hlSum} < 12`);
  if (t.slSum < 9) issues.push(`součet SL ${t.slSum} < 9`);
  if (coreFailed) issues.push('známka E z TOK nebo EE');
  return issues;
}

const sum = (arr) => arr.reduce((a, b) => a + b, 0);
