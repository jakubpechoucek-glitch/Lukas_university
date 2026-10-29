// Číselník IB předmětů a skupin používaných v požadavcích škol.
// Viz docs/03-datovy-model.md#číselník-předmětů-subject_code

export const SUBJECT_CODES = {
  BIO: 'Biology',
  CHEM: 'Chemistry',
  PHYS: 'Physics',
  SEHS: 'Sports, Exercise and Health Science',
  PSYCH: 'Psychology',
  SOC: 'Sociology',
  BM: 'Business Management',
  ECON: 'Economics',
  GEO: 'Geography',
  HIST: 'History',
  SCA: 'Social and Cultural Anthropology',
  MATH_AA: 'Mathematics: Analysis & Approaches',
  MATH_AI: 'Mathematics: Applications & Interpretation',
  ENG_A: 'English A',
  ENG_B: 'English B',
  SPA_B: 'Spanish B',
  SPA_AB: 'Spanish ab initio',
};

export const SUBJECT_GROUPS = {
  SCIENCE: ['BIO', 'CHEM', 'PHYS', 'SEHS'],
  MATH: ['MATH_AA', 'MATH_AI'],
  ENGLISH: ['ENG_A', 'ENG_B'],
};

/** Rozbalí kódy skupin (SCIENCE, MATH…) na konkrétní předměty. */
export function expandSubjects(codes = []) {
  const out = new Set();
  for (const code of codes) {
    for (const c of SUBJECT_GROUPS[code] ?? [code]) out.add(c);
  }
  return out;
}

export function subjectLabel(code) {
  return SUBJECT_CODES[code] ?? code;
}
