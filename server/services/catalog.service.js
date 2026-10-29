const { getDb } = require('../../db/db');
const repo = require('../repositories/catalog.repository');
const v = require('../utils/validate');
const { SUBJECT_CODES, SUBJECT_GROUPS } = require('../../shared/calc/subjects.mjs');

const STATUSES = ['research', 'considering', 'applying', 'applied', 'offer_conditional',
  'offer_unconditional', 'rejected', 'accepted', 'dropped'];
const KNOWN_SUBJECTS = new Set([...Object.keys(SUBJECT_CODES), ...Object.keys(SUBJECT_GROUPS)]);

function rankSort(text) {
  const m = text ? String(text).match(/\d+/) : null;
  return m ? Number(m[0]) : null;
}

// Pouze pole, která přišla v požadavku – PUT tak funguje i jako částečná úprava.
function pick(body, normalizers) {
  const out = {};
  for (const [key, fn] of Object.entries(normalizers)) {
    if (Object.prototype.hasOwnProperty.call(body, key)) out[key] = fn(body[key], key);
  }
  return out;
}

const UNIVERSITY_FIELDS = {
  name: (x) => v.requiredText(x, 'Název univerzity'),
  country: (x) => v.optionalText(x)?.toUpperCase().slice(0, 2) ?? null,
  city: v.optionalText, address: v.optionalText, website: v.optionalText, mapUrl: v.optionalText,
  worldRankText: v.optionalText, czConnection: v.optionalText, accommodation: v.optionalText,
  livingCosts: (x) => v.optionalInt(x, 'Životní náklady', { min: 0 }),
  livingCostsCurrency: v.optionalText, notes: v.optionalText,
};

function normalizeUniversity(body, { partial }) {
  if (!partial && body.name === undefined) v.fail('Název univerzity: povinné pole');
  const data = pick(body, UNIVERSITY_FIELDS);
  if ('worldRankText' in data) data.worldRankSort = rankSort(data.worldRankText);
  return data;
}

const PROGRAM_FIELDS = {
  universityId: (x) => v.optionalInt(x, 'Univerzita', { min: 1 }),
  fieldId: (x) => v.optionalInt(x, 'Obor', { min: 1 }),
  name: (x) => v.requiredText(x, 'Název programu'),
  degree: v.optionalText,
  durationYears: (x) => v.optionalNumber(x, 'Délka studia', { min: 0, max: 10 }),
  programUrl: v.optionalText,
  fieldRank: (x) => v.optionalInt(x, 'Oborový žebříček', { min: 1 }),
  subjectWorldRankText: v.optionalText, mastersInfo: v.optionalText,
  tuitionFee: (x) => v.optionalInt(x, 'Školné', { min: 0 }),
  tuitionCurrency: v.optionalText,
  applicationSystem: (x) => v.oneOf(x, 'Přihláškový systém', ['UCAS', 'Studielink', 'CAO', 'direct', 'other']),
  applicationDeadline: v.optionalText, openDays: v.optionalText, startDate: v.optionalText,
  requirementsText: v.optionalText,
  manualReview: (x) => (x ? 1 : 0),
  categoryOverride: (x) => v.oneOf(x, 'Kategorie', ['Reach', 'Target', 'Likely']),
  status: (x) => v.oneOf(x, 'Stav', STATUSES, 'research'),
  priority: (x) => v.optionalInt(x, 'Priorita', { min: 0 }),
  notes: v.optionalText,
};

function normalizeRequirementSets(sets) {
  if (!Array.isArray(sets)) v.fail('requirementSets: očekáváno pole');
  return sets.map((s, i) => {
    const label = `Sada ${i + 1}`;
    const hlProfile = Array.isArray(s.hlProfile) && s.hlProfile.length
      ? s.hlProfile.map((g) => v.grade(g, `${label}: HL profil`)).filter((g) => g !== null)
      : null;
    return {
      label: v.optionalText(s.label),
      kind: v.oneOf(s.kind, `${label}: druh`, ['typical', 'contextual'], 'typical'),
      minTotal: v.optionalInt(s.minTotal, `${label}: celkové skóre`, { min: 0, max: 45 }),
      totalBasis: v.oneOf(s.totalBasis, `${label}: základ skóre`, ['with_core', 'subjects_only'], 'with_core'),
      hlProfile: hlProfile?.length ? hlProfile : null,
      minHlSum: v.optionalInt(s.minHlSum, `${label}: součet HL`, { min: 0, max: 21 }),
      minEachSubject: v.optionalInt(s.minEachSubject, `${label}: minimum předmětu`, { min: 1, max: 7 }),
      requiresFullDiploma: s.requiresFullDiploma !== false,
      subjectRules: (s.subjectRules ?? []).map((r, j) => {
        const subjects = Array.isArray(r.subjects) ? r.subjects.filter(Boolean) : [];
        if (!subjects.length) v.fail(`${label}, pravidlo ${j + 1}: vyberte aspoň jeden předmět`);
        const unknown = subjects.filter((c) => !KNOWN_SUBJECTS.has(c));
        if (unknown.length) v.fail(`${label}, pravidlo ${j + 1}: neznámý předmět ${unknown.join(', ')}`);
        return {
          subjects,
          level: v.oneOf(r.level, `${label}: úroveň`, ['HL', 'SL', 'ANY'], 'ANY'),
          minGrade: v.grade(r.minGrade, `${label}, pravidlo ${j + 1}: minimální známka`) ?? v.fail(`${label}, pravidlo ${j + 1}: chybí minimální známka`),
          count: v.optionalInt(r.count, `${label}: počet`, { min: 1, max: 6 }) ?? 1,
          note: v.optionalText(r.note),
        };
      }),
    };
  });
}

function getCatalog() {
  return repo.getCatalog();
}

function createUniversity(body) {
  const id = repo.createUniversity(normalizeUniversity(body, { partial: false }));
  return repo.findUniversity(id);
}

function updateUniversity(id, body) {
  if (!repo.findUniversity(id)) throw { status: 404, message: 'Univerzita neexistuje' };
  repo.updateUniversity(id, normalizeUniversity(body, { partial: true }));
  return repo.findUniversity(id);
}

function deleteUniversity(id) {
  const n = repo.countPrograms(id);
  if (n) throw { status: 409, message: `Univerzita má ${n} program(ů) – nejdřív je smažte` };
  if (!repo.deleteUniversity(id)) throw { status: 404, message: 'Univerzita neexistuje' };
}

function saveProgram(id, body) {
  const db = getDb();
  return db.transaction(() => {
    const data = pick(body, PROGRAM_FIELDS);
    let programId = id;
    if (id) {
      if (!repo.findProgram(id)) throw { status: 404, message: 'Program neexistuje' };
      repo.updateProgram(id, data);
    } else {
      if (!data.universityId) v.fail('Univerzita: povinné pole');
      if (!data.fieldId) v.fail('Obor: povinné pole');
      if (!data.name) v.fail('Název programu: povinné pole');
      programId = repo.createProgram(data);
    }
    if (body.requirementSets !== undefined) {
      repo.replaceRequirementSets(programId, normalizeRequirementSets(body.requirementSets));
    }
    return repo.findProgram(programId);
  })();
}

function deleteProgram(id) {
  if (!repo.deleteProgram(id)) throw { status: 404, message: 'Program neexistuje' };
}

module.exports = {
  getCatalog, createUniversity, updateUniversity, deleteUniversity,
  createProgram: (body) => saveProgram(null, body),
  updateProgram: (id, body) => saveProgram(id, body),
  deleteProgram, STATUSES,
};
