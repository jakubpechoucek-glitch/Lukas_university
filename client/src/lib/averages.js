import { weightedAverage, yearAverage, roundGrade } from '@calc';
import { TERMS } from './format';

/** Vážený průměr předmětu přes všechna pololetí (null, když není žádná známka). */
export function subjectAverage(assessments, subjectId) {
  const terms = TERMS.map((term) => ({
    term,
    average: weightedAverage(assessments.filter((a) => a.subjectId === subjectId && a.term === term)).average,
  }));
  return yearAverage(terms);
}

/** Známky podle aktuálních průměrů: { subjectId: známka zaokrouhlená matematicky | null }. */
export function averageGrades(subjects, assessments) {
  return Object.fromEntries(subjects.map((s) => [s.id, roundGrade(subjectAverage(assessments, s.id))]));
}

export const fmtAvg = (a) => (a === null || a === undefined ? '–' : a.toFixed(2));
