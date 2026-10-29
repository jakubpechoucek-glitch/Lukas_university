const { getDb } = require('../../db/db');

const parseJson = (v) => (v ? JSON.parse(v) : null);

function mapUniversity(r) {
  return {
    id: r.id, name: r.name, country: r.country, city: r.city, address: r.address, website: r.website,
    mapUrl: r.map_url, worldRankText: r.world_rank_text, worldRankSort: r.world_rank_sort,
    czConnection: r.cz_connection, accommodation: r.accommodation, livingCosts: r.living_costs,
    livingCostsCurrency: r.living_costs_currency, notes: r.notes,
  };
}

function mapProgram(r) {
  return {
    id: r.id, universityId: r.university_id, fieldId: r.field_id, name: r.name, degree: r.degree,
    durationYears: r.duration_years, programUrl: r.program_url, fieldRank: r.field_rank,
    subjectWorldRankText: r.subject_world_rank_text, mastersInfo: r.masters_info,
    tuitionFee: r.tuition_fee, tuitionCurrency: r.tuition_currency, applicationSystem: r.application_system,
    applicationDeadline: r.application_deadline, openDays: r.open_days, startDate: r.start_date,
    requirementsText: r.requirements_text, manualReview: !!r.manual_review, categoryOverride: r.category_override,
    status: r.status, priority: r.priority, notes: r.notes, updatedAt: r.updated_at,
    requirementSets: [],
  };
}

function mapSet(r) {
  return {
    id: r.id, label: r.label, kind: r.kind, minTotal: r.min_total, totalBasis: r.total_basis,
    hlProfile: parseJson(r.hl_profile), minHlSum: r.min_hl_sum, minEachSubject: r.min_each_subject,
    requiresFullDiploma: !!r.requires_full_diploma, subjectRules: [],
  };
}

function mapRule(r) {
  return { id: r.id, subjects: parseJson(r.subjects), level: r.level, minGrade: r.min_grade, count: r.count, note: r.note };
}

function attachRequirements(programs) {
  const db = getDb();
  const byId = new Map(programs.map((p) => [p.id, p]));
  const ids = [...byId.keys()];
  if (!ids.length) return programs;
  const marks = ids.map(() => '?').join(',');
  const sets = db.prepare(`SELECT * FROM requirement_sets WHERE program_id IN (${marks}) ORDER BY sort_order, id`).all(...ids);
  const setById = new Map();
  for (const s of sets) {
    const mapped = mapSet(s);
    setById.set(s.id, mapped);
    byId.get(s.program_id).requirementSets.push(mapped);
  }
  if (sets.length) {
    const setMarks = sets.map(() => '?').join(',');
    const rules = db.prepare(`SELECT * FROM subject_rules WHERE requirement_set_id IN (${setMarks}) ORDER BY id`)
      .all(...sets.map((s) => s.id));
    for (const r of rules) setById.get(r.requirement_set_id).subjectRules.push(mapRule(r));
  }
  return programs;
}

function getCatalog() {
  const db = getDb();
  return {
    fields: db.prepare('SELECT id, name, ranking_label AS rankingLabel, ranking_url AS rankingUrl, sort_order AS sortOrder FROM fields ORDER BY sort_order, name').all(),
    universities: db.prepare('SELECT * FROM universities ORDER BY name').all().map(mapUniversity),
    programs: attachRequirements(db.prepare('SELECT * FROM programs ORDER BY id').all().map(mapProgram)),
  };
}

function findProgram(id) {
  const row = getDb().prepare('SELECT * FROM programs WHERE id = ?').get(id);
  return row ? attachRequirements([mapProgram(row)])[0] : null;
}

function findUniversity(id) {
  const row = getDb().prepare('SELECT * FROM universities WHERE id = ?').get(id);
  return row ? mapUniversity(row) : null;
}

const UNIVERSITY_COLUMNS = {
  name: 'name', country: 'country', city: 'city', address: 'address', website: 'website', mapUrl: 'map_url',
  worldRankText: 'world_rank_text', worldRankSort: 'world_rank_sort', czConnection: 'cz_connection',
  accommodation: 'accommodation', livingCosts: 'living_costs', livingCostsCurrency: 'living_costs_currency', notes: 'notes',
};

const PROGRAM_COLUMNS = {
  universityId: 'university_id', fieldId: 'field_id', name: 'name', degree: 'degree', durationYears: 'duration_years',
  programUrl: 'program_url', fieldRank: 'field_rank', subjectWorldRankText: 'subject_world_rank_text',
  mastersInfo: 'masters_info', tuitionFee: 'tuition_fee', tuitionCurrency: 'tuition_currency',
  applicationSystem: 'application_system', applicationDeadline: 'application_deadline', openDays: 'open_days',
  startDate: 'start_date', requirementsText: 'requirements_text', manualReview: 'manual_review',
  categoryOverride: 'category_override', status: 'status', priority: 'priority', notes: 'notes',
};

function insert(table, columns, data) {
  const keys = Object.keys(data).filter((k) => columns[k]);
  const sql = `INSERT INTO ${table} (${keys.map((k) => columns[k]).join(', ')}) VALUES (${keys.map((k) => '@' + k).join(', ')})`;
  return getDb().prepare(sql).run(data).lastInsertRowid;
}

function update(table, columns, id, data) {
  const keys = Object.keys(data).filter((k) => columns[k]);
  if (!keys.length) return;
  const stamp = table === 'universities' || table === 'programs' ? ", updated_at = datetime('now')" : '';
  const sql = `UPDATE ${table} SET ${keys.map((k) => `${columns[k]} = @${k}`).join(', ')}${stamp} WHERE id = @id`;
  getDb().prepare(sql).run({ ...data, id });
}

const createUniversity = (data) => insert('universities', UNIVERSITY_COLUMNS, data);
const updateUniversity = (id, data) => update('universities', UNIVERSITY_COLUMNS, id, data);
const deleteUniversity = (id) => getDb().prepare('DELETE FROM universities WHERE id = ?').run(id).changes;
const countPrograms = (universityId) => getDb().prepare('SELECT COUNT(*) AS n FROM programs WHERE university_id = ?').get(universityId).n;

const createProgram = (data) => insert('programs', PROGRAM_COLUMNS, data);
const updateProgram = (id, data) => update('programs', PROGRAM_COLUMNS, id, data);
const deleteProgram = (id) => getDb().prepare('DELETE FROM programs WHERE id = ?').run(id).changes;

function replaceRequirementSets(programId, sets) {
  const db = getDb();
  db.prepare('DELETE FROM requirement_sets WHERE program_id = ?').run(programId);
  const insSet = db.prepare(`
    INSERT INTO requirement_sets (program_id, label, kind, min_total, total_basis, hl_profile, min_hl_sum,
      min_each_subject, requires_full_diploma, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insRule = db.prepare(
    'INSERT INTO subject_rules (requirement_set_id, subjects, level, min_grade, count, note) VALUES (?, ?, ?, ?, ?, ?)'
  );
  sets.forEach((s, i) => {
    const setId = insSet.run(programId, s.label, s.kind, s.minTotal, s.totalBasis,
      s.hlProfile ? JSON.stringify(s.hlProfile) : null, s.minHlSum, s.minEachSubject, s.requiresFullDiploma ? 1 : 0, i,
    ).lastInsertRowid;
    for (const r of s.subjectRules) insRule.run(setId, JSON.stringify(r.subjects), r.level, r.minGrade, r.count, r.note);
  });
}

module.exports = {
  getCatalog, findProgram, findUniversity, createUniversity, updateUniversity, deleteUniversity, countPrograms,
  createProgram, updateProgram, deleteProgram, replaceRequirementSets,
};
