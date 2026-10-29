import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ibTotals, corePointsFromGrades, evaluateProgram, evaluateSet, category, STATUS,
  weightedAverage, averageByCriterion, yearAverage, roundGrade,
} from '../shared/calc/index.mjs';

// Fiktivní scénář z docs/04-vypocty.md (ne skutečné známky).
const subjects = [
  { code: 'SEHS', level: 'HL', grade: 7 },
  { code: 'BIO', level: 'HL', grade: 5 },
  { code: 'BM', level: 'HL', grade: 5 },
  { code: 'ENG_A', level: 'SL', grade: 5 },
  { code: 'SPA_B', level: 'SL', grade: 6 },
  { code: 'MATH_AA', level: 'SL', grade: 6 },
];
const totals = ibTotals(subjects, 3);

test('celkové skóre 7+5+5+5+6+6+3 = 37', () => {
  assert.equal(totals.total, 37);
  assert.equal(totals.subjectsTotal, 34);
  assert.equal(totals.hlSum, 17);
  assert.equal(totals.slSum, 17);
  assert.deepEqual(totals.hlProfile, [7, 5, 5]);
  assert.equal(totals.complete, true);
  assert.deepEqual(totals.diplomaIssues, []);
});

test('core points z TOK/EE', () => {
  assert.equal(corePointsFromGrades('B', 'C'), 2);
  assert.equal(corePointsFromGrades('A', 'A'), 3);
  assert.equal(corePointsFromGrades('D', 'D'), 0);
  assert.equal(corePointsFromGrades('E', 'A'), 'fail');
  assert.equal(corePointsFromGrades(null, 'A'), null);
  assert.equal(ibTotals(subjects, 0, { tok: 'B', ee: 'C' }).total, 36);
});

test('podmínky diplomu', () => {
  const weak = subjects.map((s) => ({ ...s, grade: 3 }));
  const t = ibTotals(weak, 0);
  assert.equal(t.total, 18);
  assert.ok(t.diplomaIssues.some((i) => i.includes('< 24')));
  assert.ok(t.diplomaIssues.some((i) => i.includes('tři známky 3')));
  assert.ok(ibTotals(subjects, 3, { tok: 'E', ee: 'A' }).diplomaIssues.some((i) => i.includes('TOK')));
});

test('profil HL [7,5,5] vs [6,6,5] → −1, vs [6,5,5] → 0', () => {
  assert.equal(evaluateSet({ hlProfile: [6, 6, 5] }, subjects, totals).margin, -1);
  assert.equal(evaluateSet({ hlProfile: [6, 5, 5] }, subjects, totals).margin, 0);
  assert.equal(evaluateSet({ hlProfile: [5, 6, 6] }, subjects, totals).margin, -1, 'pořadí profilu nehraje roli');
});

test('subject rule: 2× HL min 6 ze skupiny bez BM → druhý nejlepší 5 → −1', () => {
  const set = { subjectRules: [{ subjects: ['BIO', 'CHEM', 'MATH', 'PHYS', 'PSYCH', 'SEHS'], level: 'HL', minGrade: 6, count: 2 }] };
  assert.equal(evaluateSet(set, subjects, totals).margin, -1);
});

test('subject rule: nestudovaný předmět je nesplnitelný', () => {
  const r = evaluateSet({ subjectRules: [{ subjects: ['CHEM'], level: 'HL', minGrade: 4 }] }, subjects, totals);
  assert.equal(r.margin, -Infinity);
  assert.match(r.reasons[0], /nestuduje/);
});

test('subject rule: skupina SCIENCE a úroveň ANY', () => {
  assert.equal(evaluateSet({ subjectRules: [{ subjects: ['SCIENCE'], level: 'HL', minGrade: 6 }] }, subjects, totals).margin, 1);
  assert.equal(evaluateSet({ subjectRules: [{ subjects: ['ENGLISH'], level: 'ANY', minGrade: 5 }] }, subjects, totals).margin, 0);
});

test('total_basis subjects_only odečte core', () => {
  assert.equal(evaluateSet({ minTotal: 33, totalBasis: 'subjects_only' }, subjects, totals).margin, 1);
  assert.equal(evaluateSet({ minTotal: 33 }, subjects, totals).margin, 4);
});

test('min_each_subject', () => {
  assert.equal(evaluateSet({ minEachSubject: 4 }, subjects, totals).margin, 1);
});

test('příklady z dokumentace', () => {
  const durham = { requirementSets: [{ minTotal: 35, hlProfile: [6, 6, 5] }] };
  const glasgow = { requirementSets: [{ minTotal: 34, hlProfile: [6, 5, 5], subjectRules: [{ subjects: ['BIO', 'CHEM'], level: 'HL', minGrade: 5 }] }] };
  const kclPhysio = { requirementSets: [{ minTotal: 35, subjectRules: [
    { subjects: ['BIO', 'CHEM', 'PHYS', 'PSYCH', 'SOC', 'SEHS', 'MATH'], level: 'HL', minGrade: 6, count: 1 },
    { subjects: ['BIO', 'CHEM', 'PHYS', 'PSYCH', 'SOC', 'SEHS', 'MATH'], level: 'HL', minGrade: 5, count: 2 },
  ] }] };
  const scienceRule = { subjects: ['SCIENCE', 'MATH', 'PSYCH'], level: 'HL', minGrade: 6 };
  const bath = { requirementSets: [
    { label: 'A', minTotal: 36, hlProfile: [6, 6, 6], subjectRules: [scienceRule] },
    { label: 'B', minTotal: 36, hlProfile: [7, 6, 5], subjectRules: [scienceRule] },
  ] };

  const d = evaluateProgram(durham, subjects, totals);
  assert.equal(d.status, STATUS.BORDERLINE);
  assert.equal(d.margin, -1);
  assert.equal(d.category, 'Reach');

  const g = evaluateProgram(glasgow, subjects, totals);
  assert.equal(g.status, STATUS.MEETS);
  assert.equal(g.category, 'Target');

  const k = evaluateProgram(kclPhysio, subjects, totals);
  assert.equal(k.status, STATUS.MEETS);
  assert.equal(k.margin, 0);

  const b = evaluateProgram(bath, subjects, totals);
  assert.equal(b.status, STATUS.BORDERLINE);
  assert.equal(b.margin, -1);
  assert.equal(b.bestSetLabel, 'B');
});

test('stavy: nesplňuje, neznámé, contextual, tolerance', () => {
  const hard = { requirementSets: [{ minTotal: 40 }, { kind: 'contextual', minTotal: 36 }] };
  const r = evaluateProgram(hard, subjects, totals);
  assert.equal(r.status, STATUS.FAILS);
  assert.equal(r.contextualMet, true);
  assert.equal(evaluateProgram(hard, subjects, totals, { tolerance: 3 }).status, STATUS.BORDERLINE);

  assert.equal(evaluateProgram({ requirementSets: [] }, subjects, totals).status, STATUS.UNKNOWN);
  assert.equal(evaluateProgram({ manualReview: true, requirementSets: [{ minTotal: 24 }] }, subjects, totals).status, STATUS.UNKNOWN);
  assert.equal(evaluateProgram({ requirementSets: [{ minTotal: 30 }], categoryOverride: 'Reach' }, subjects, totals).category, 'Reach');
});

test('neudělený diplom shodí i snadný program', () => {
  const weak = subjects.map((s) => ({ ...s, grade: 3 }));
  const r = evaluateProgram({ requirementSets: [{ minTotal: 10 }] }, weak, ibTotals(weak, 0));
  assert.equal(r.status, STATUS.FAILS);
});

test('kategorie Reach / Target / Likely', () => {
  assert.equal(category(-1), 'Reach');
  assert.equal(category(0), 'Target');
  assert.equal(category(1), 'Target');
  assert.equal(category(2), 'Likely');
  assert.equal(category(null), null);
});

test('vážený průměr: 4 × 0,125 a známky 5,5,7,7 → 6,00', () => {
  const r = weightedAverage([5, 5, 7, 7].map((grade) => ({ weight: 0.125, grade })));
  assert.equal(r.average, 6);
  assert.equal(r.coverage, 1);
  assert.equal(r.weightWarning, true, 'součet vah 0,5 ≠ 100 %');
});

test('vážený průměr: jen hodnocené položky (Business – váhy 5 × 0,25)', () => {
  const r = weightedAverage([
    { weight: 0.25, grade: 6 }, { weight: 0.25, grade: 4 },
    { weight: 0.25, grade: null }, { weight: 0.25, grade: null }, { weight: 0.25, grade: null },
  ]);
  assert.equal(r.average, 5);
  assert.equal(r.rounded, 5);
  assert.equal(r.coverage, 0.4);
  assert.equal(r.weightWarning, true);
});

test('vážený průměr: bez známek → null, nikdy 0', () => {
  const r = weightedAverage([{ weight: 0.5, grade: null }, { weight: 0.5, grade: null }]);
  assert.equal(r.average, null);
  assert.equal(r.rounded, null);
  assert.equal(r.weightWarning, false);
  assert.equal(weightedAverage([]).average, null);
});

test('matematické zaokrouhlení průměru na známku', () => {
  assert.equal(roundGrade(5.01), 5);
  assert.equal(roundGrade(5.33), 5);
  assert.equal(roundGrade(5.49), 5);
  assert.equal(roundGrade(5.5), 6);
  assert.equal(roundGrade(5.67), 6);
  assert.equal(roundGrade(0.15 * 5 / 0.3 + 0.15 * 6 / 0.3), 6, '5,5 z vah s chybou plovoucí čárky → 6');
  assert.equal(roundGrade(7.2), 7);
  assert.equal(roundGrade(null), null);
  assert.equal(weightedAverage([{ weight: 0.15, grade: 4 }, { weight: 0.15, grade: 3 }]).rounded, 4, '3,5 → 4');
});

test('průměr podle kritéria a roční průměr', () => {
  const list = [
    { criterion: 'KU', weight: 0.15, grade: 4 },
    { criterion: 'TL', weight: 0.15, grade: 6 },
    { criterion: 'KU', weight: 0.15, grade: 6 },
  ];
  assert.deepEqual(averageByCriterion(list), { KU: 5, TL: 6 });
  assert.equal(yearAverage([{ term: 'G11-S1', average: 5 }, { term: 'G11-S2', average: 6 }]), 5.5);
  assert.equal(yearAverage([{ term: 'G11-S1', average: 5 }, { term: 'G11-S2', average: null }]), 5);
});
