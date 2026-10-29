// Vyhodnocení, zda scénář predikce splňuje požadavky programu.
// Viz docs/04-vypocty.md#vyhodnocení-dosažitelnosti

import { expandSubjects, subjectLabel } from './subjects.mjs';

export const STATUS = {
  MEETS: 'meets', // ✅
  BORDERLINE: 'borderline', // ⚠️
  FAILS: 'fails', // ❌
  UNKNOWN: 'unknown', // ❔
};

export const DEFAULT_OPTIONS = {
  tolerance: 1, // kolik bodů pod požadavkem je ještě „hraniční“
  targetMax: 1, // rezerva 0..targetMax = Target, víc = Likely
};

/**
 * Vyhodnotí jednu sadu požadavků (podmínky platí současně).
 * @returns {{margin: number, reasons: string[]}} margin = nejhorší rezerva; -Infinity = nesplnitelné
 */
export function evaluateSet(set, subjects, totals) {
  const checks = [];

  if (set.requiresFullDiploma !== false && totals.diplomaIssues?.length) {
    checks.push({ margin: -Infinity, reason: `diplom by nebyl udělen (${totals.diplomaIssues.join(', ')})` });
  }

  if (Number.isFinite(set.minTotal)) {
    const total = set.totalBasis === 'subjects_only' ? totals.subjectsTotal : totals.total;
    const label = set.totalBasis === 'subjects_only' ? 'skóre bez TOK/EE' : 'celkové skóre';
    checks.push(diff(total - set.minTotal, `${label} ${total} vs. požadováno ${set.minTotal}`));
  }

  if (Number.isFinite(set.minHlSum)) {
    checks.push(diff(totals.hlSum - set.minHlSum, `součet HL ${totals.hlSum} vs. požadováno ${set.minHlSum}`));
  }

  if (Array.isArray(set.hlProfile) && set.hlProfile.length) {
    const required = [...set.hlProfile].sort((a, b) => b - a);
    const actual = totals.hlProfile;
    if (actual.length < required.length) {
      checks.push({ margin: -Infinity, reason: `chybí HL předměty pro profil ${required.join('-')}` });
    } else {
      // Přebytek na jedné pozici nevyrovná chybějící bod na jiné.
      const missing = required.reduce((acc, r, i) => acc + Math.min(0, actual[i] - r), 0);
      checks.push(diff(missing, `profil HL ${actual.slice(0, required.length).join('-')} vs. požadováno ${required.join('-')}`));
    }
  }

  if (Number.isFinite(set.minEachSubject)) {
    const grades = subjects.filter((s) => Number.isFinite(s.grade)).map((s) => s.grade);
    const min = grades.length ? Math.min(...grades) : 0;
    checks.push(diff(min - set.minEachSubject, `nejnižší známka ${min} vs. minimum ${set.minEachSubject}`));
  }

  for (const rule of set.subjectRules ?? []) {
    checks.push(evaluateSubjectRule(rule, subjects));
  }

  if (!checks.length) return { margin: null, reasons: ['sada neobsahuje žádnou podmínku'] };

  const margin = Math.min(...checks.map((c) => c.margin));
  const reasons = checks.filter((c) => c.margin < 0).map((c) => c.reason);
  return { margin, reasons, checks };
}

function evaluateSubjectRule(rule, subjects) {
  const allowed = expandSubjects(rule.subjects);
  const level = rule.level ?? 'ANY';
  const count = rule.count ?? 1;
  const names = [...allowed].map(subjectLabel).join(', ');
  const levelText = level === 'ANY' ? '' : `${level} `;

  const candidates = subjects
    .filter((s) => allowed.has(s.code) && (level === 'ANY' || s.level === level))
    .sort((a, b) => (b.grade ?? 0) - (a.grade ?? 0));

  if (candidates.length < count) {
    return {
      margin: -Infinity,
      reason: `nestuduje ${count}× ${levelText}z: ${names}`,
    };
  }
  const nth = candidates[count - 1];
  const grade = nth.grade ?? 0;
  const what = count > 1 ? `${count}. nejlepší ${levelText}předmět` : `${levelText}${subjectLabel(nth.code)}`;
  return diff(grade - rule.minGrade, `${what} ${grade} vs. požadováno ${rule.minGrade} (${names})`);
}

const diff = (margin, reason) => ({ margin, reason });

/**
 * Vyhodnotí program vůči spočítanému scénáři.
 * @param {{manualReview?: boolean, requirementSets?: object[]}} program
 * @param {{code, level, grade}[]} subjects předměty scénáře
 * @param {object} totals výsledek ibTotals()
 */
export function evaluateProgram(program, subjects, totals, options = {}) {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const sets = program.requirementSets ?? [];
  const typical = sets.filter((s) => (s.kind ?? 'typical') === 'typical');
  const contextual = sets.filter((s) => s.kind === 'contextual');

  if (program.manualReview || !typical.length) {
    return {
      status: STATUS.UNKNOWN,
      margin: null,
      category: null,
      reasons: [program.manualReview ? 'požadavky nelze vyhodnotit automaticky' : 'chybí strukturované požadavky'],
      contextualMet: null,
    };
  }

  const results = typical.map((set) => ({ set, ...evaluateSet(set, subjects, totals) }));
  const best = results.reduce((a, b) => ((b.margin ?? -Infinity) > (a.margin ?? -Infinity) ? b : a));

  let status;
  if (best.margin === null) status = STATUS.UNKNOWN;
  else if (best.margin >= 0) status = STATUS.MEETS;
  else if (best.margin >= -opts.tolerance) status = STATUS.BORDERLINE;
  else status = STATUS.FAILS;

  const contextualMet = contextual.length
    ? contextual.some((set) => (evaluateSet(set, subjects, totals).margin ?? -Infinity) >= 0)
    : null;

  return {
    status,
    margin: best.margin,
    category: program.categoryOverride ?? category(best.margin, opts),
    reasons: best.reasons,
    bestSetLabel: best.set.label ?? null,
    contextualMet,
  };
}

/** Reach / Target / Likely podle rezervy. */
export function category(margin, options = {}) {
  const { targetMax } = { ...DEFAULT_OPTIONS, ...options };
  if (margin === null || margin === undefined) return null;
  if (margin < 0) return 'Reach';
  if (margin <= targetMax) return 'Target';
  return 'Likely';
}
