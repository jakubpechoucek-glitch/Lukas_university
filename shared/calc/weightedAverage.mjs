// Vážený průměr předmětu z průběžných assessmentů.
// Viz docs/04-vypocty.md#vážený-průměr-předmětu

const EPS = 1e-9;

/**
 * Známka z průměru zaokrouhlená matematicky (5,49 → 5, 5,5 → 6), omezená na 1–7.
 * EPS chrání před chybou plovoucí čárky (5,4999999999 má dát 6 stejně jako 5,5).
 */
export function roundGrade(average) {
  if (average === null || average === undefined) return null;
  return Math.min(7, Math.max(1, Math.round(average + EPS)));
}

/**
 * Jmenovatel = součet vah jen hodnocených položek, takže se nic nepřepisuje ručně.
 * @param {{weight: number, grade: number|null}[]} assessments
 */
export function weightedAverage(assessments) {
  const valid = assessments.filter((a) => Number.isFinite(a.weight) && a.weight > 0);
  const graded = valid.filter((a) => Number.isFinite(a.grade));

  const weightTotal = valid.reduce((s, a) => s + a.weight, 0);
  const gradedWeight = graded.reduce((s, a) => s + a.weight, 0);
  const average = gradedWeight > 0
    ? graded.reduce((s, a) => s + a.weight * a.grade, 0) / gradedWeight
    : null;

  return {
    average,
    rounded: roundGrade(average),
    gradedCount: graded.length,
    count: valid.length,
    weightTotal,
    gradedWeight,
    coverage: weightTotal > 0 ? gradedWeight / weightTotal : 0,
    // Upozornění, když se váhy všech položek nesčítají na 100 %.
    weightWarning: valid.length > 0 && Math.abs(weightTotal - 1) > EPS,
  };
}

/** Průměr podle kritéria (KU, TL…). */
export function averageByCriterion(assessments) {
  const groups = {};
  for (const a of assessments) {
    if (!a.criterion) continue;
    (groups[a.criterion] ??= []).push(a);
  }
  return Object.fromEntries(
    Object.entries(groups).map(([k, list]) => [k, weightedAverage(list).average]),
  );
}

/**
 * Roční průměr z průměrů pololetí.
 * @param {{term: string, average: number|null}[]} terms
 * @param {Record<string, number>} [termWeights] výchozí: rovnoměrně
 */
export function yearAverage(terms, termWeights = {}) {
  const items = terms
    .filter((t) => t.average !== null && t.average !== undefined)
    .map((t) => ({ weight: termWeights[t.term] ?? 1, grade: t.average }));
  return weightedAverage(items).average;
}
