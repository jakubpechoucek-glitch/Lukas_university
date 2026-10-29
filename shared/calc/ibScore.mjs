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

/**
 * @param {{code: string, level: 'HL'|'SL', grade: number|null}[]} subjects
 * @param {number|null} corePoints 0–3
 * @param {{tok?: string, ee?: string}} [core] volitelné známky A–E
 */
export function ibTotals(subjects, corePoints, core = {}) {
  const graded = subjects.filter((s) => Number.isFinite(s.grade));
  const hl = graded.filter((s) => s.level === 'HL').map((s) => s.grade);
  const sl = graded.filter((s) => s.level === 'SL').map((s) => s.grade);

  let core_ = corePoints;
  const fromGrades = corePointsFromGrades(core.tok, core.ee);
  if (fromGrades !== null) core_ = fromGrades === 'fail' ? 0 : fromGrades;
  core_ = Number.isFinite(core_) ? core_ : 0;

  const subjectsTotal = sum(hl) + sum(sl);
  const totals = {
    subjectsTotal,
    corePoints: core_,
    total: subjectsTotal + core_,
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
  if (t.total < 24) issues.push(`celkové skóre ${t.total} < 24`);
  if (grades.includes(1)) issues.push('známka 1 z předmětu');
  if (grades.filter((g) => g === 2).length > 2) issues.push('více než dvě známky 2');
  if (grades.filter((g) => g <= 3).length > 3) issues.push('více než tři známky 3 a horší');
  if (t.hlSum < 12) issues.push(`součet HL ${t.hlSum} < 12`);
  if (t.slSum < 9) issues.push(`součet SL ${t.slSum} < 9`);
  if (coreFailed) issues.push('známka E z TOK nebo EE');
  return issues;
}

const sum = (arr) => arr.reduce((a, b) => a + b, 0);
