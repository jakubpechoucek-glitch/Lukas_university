const { getDb } = require('../../db/db');

function getStudent() {
  return getDb().prepare('SELECT id, name FROM students ORDER BY id LIMIT 1').get();
}

function mapSubject(r) {
  return {
    id: r.id, code: r.code, displayName: r.display_name, level: r.level, sortOrder: r.sort_order,
    ismMean2025: r.ism_mean_2025, worldMean2025: r.world_mean_2025,
  };
}

function mapAssessment(r) {
  return {
    id: r.id, subjectId: r.subject_id, term: r.term, name: r.name, criterion: r.criterion, weight: r.weight,
    grade: r.grade, dueDate: r.due_date, sortOrder: r.sort_order, notes: r.notes,
  };
}

function getSubjects(studentId) {
  return getDb().prepare('SELECT * FROM subjects WHERE student_id = ? ORDER BY sort_order, id').all(studentId).map(mapSubject);
}

function getScenarios(studentId) {
  const db = getDb();
  const scenarios = db.prepare('SELECT * FROM scenarios WHERE student_id = ? ORDER BY sort_order, id').all(studentId);
  const grades = db.prepare(`
    SELECT g.* FROM scenario_grades g JOIN scenarios s ON s.id = g.scenario_id WHERE s.student_id = ?
  `).all(studentId);
  return scenarios.map((s) => ({
    id: s.id, name: s.name, isActive: !!s.is_active, corePoints: s.core_points,
    tokGrade: s.tok_grade, eeGrade: s.ee_grade, sortOrder: s.sort_order,
    grades: Object.fromEntries(grades.filter((g) => g.scenario_id === s.id).map((g) => [g.subject_id, g.grade])),
  }));
}

function getAssessments(studentId) {
  return getDb().prepare(`
    SELECT a.* FROM assessments a JOIN subjects s ON s.id = a.subject_id
    WHERE s.student_id = ? ORDER BY a.subject_id, a.term, a.sort_order, a.id
  `).all(studentId).map(mapAssessment);
}

function getExamComponents(studentId) {
  return getDb().prepare(`
    SELECT e.id, e.subject_id AS subjectId, e.name, e.weight, e.sort_order AS sortOrder
    FROM exam_components e JOIN subjects s ON s.id = e.subject_id
    WHERE s.student_id = ? ORDER BY e.subject_id, e.sort_order
  `).all(studentId);
}

const findSubject = (id) => {
  const r = getDb().prepare('SELECT * FROM subjects WHERE id = ?').get(id);
  return r ? mapSubject(r) : null;
};

function updateSubject(id, d) {
  getDb().prepare(`
    UPDATE subjects SET display_name = COALESCE(@displayName, display_name), code = COALESCE(@code, code),
      level = COALESCE(@level, level), ism_mean_2025 = @ismMean2025, world_mean_2025 = @worldMean2025
    WHERE id = @id
  `).run({ ...d, id });
}

const findScenario = (id) => getDb().prepare('SELECT * FROM scenarios WHERE id = ?').get(id);

function createScenario(studentId, name, copyFromId) {
  const db = getDb();
  const order = db.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM scenarios WHERE student_id = ?').get(studentId).n;
  const source = copyFromId ? findScenario(copyFromId) : null;
  const id = db.prepare(
    'INSERT INTO scenarios (student_id, name, core_points, tok_grade, ee_grade, sort_order) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(studentId, name, source?.core_points ?? null, source?.tok_grade ?? null, source?.ee_grade ?? null, order).lastInsertRowid;
  if (source) {
    db.prepare(`
      INSERT INTO scenario_grades (scenario_id, subject_id, grade)
      SELECT ?, subject_id, grade FROM scenario_grades WHERE scenario_id = ?
    `).run(id, source.id);
  }
  return id;
}

function updateScenario(id, d) {
  const db = getDb();
  const sets = [];
  if ('name' in d) sets.push('name = @name');
  if ('corePoints' in d) sets.push('core_points = @corePoints');
  if ('tokGrade' in d) sets.push('tok_grade = @tokGrade');
  if ('eeGrade' in d) sets.push('ee_grade = @eeGrade');
  if (sets.length) db.prepare(`UPDATE scenarios SET ${sets.join(', ')} WHERE id = @id`).run({ ...d, id });
  if (d.grades) {
    const upsert = db.prepare(`
      INSERT INTO scenario_grades (scenario_id, subject_id, grade) VALUES (?, ?, ?)
      ON CONFLICT(scenario_id, subject_id) DO UPDATE SET grade = excluded.grade
    `);
    for (const [subjectId, grade] of Object.entries(d.grades)) upsert.run(id, Number(subjectId), grade);
  }
}

function activateScenario(studentId, id) {
  const db = getDb();
  db.prepare('UPDATE scenarios SET is_active = 0 WHERE student_id = ?').run(studentId);
  db.prepare('UPDATE scenarios SET is_active = 1 WHERE id = ?').run(id);
}

function deleteScenario(id) {
  return getDb().prepare('DELETE FROM scenarios WHERE id = ?').run(id).changes;
}

function countScenarios(studentId) {
  return getDb().prepare('SELECT COUNT(*) AS n FROM scenarios WHERE student_id = ?').get(studentId).n;
}

const findAssessment = (id) => {
  const r = getDb().prepare('SELECT * FROM assessments WHERE id = ?').get(id);
  return r ? mapAssessment(r) : null;
};

const ASSESSMENT_COLUMNS = {
  subjectId: 'subject_id', term: 'term', name: 'name', criterion: 'criterion', weight: 'weight',
  grade: 'grade', dueDate: 'due_date', sortOrder: 'sort_order', notes: 'notes',
};

function createAssessment(d) {
  const db = getDb();
  if (d.sortOrder === undefined) {
    d.sortOrder = db.prepare('SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM assessments WHERE subject_id = ? AND term = ?')
      .get(d.subjectId, d.term).n;
  }
  const keys = Object.keys(d).filter((k) => ASSESSMENT_COLUMNS[k]);
  return db.prepare(
    `INSERT INTO assessments (${keys.map((k) => ASSESSMENT_COLUMNS[k]).join(', ')}) VALUES (${keys.map((k) => '@' + k).join(', ')})`
  ).run(d).lastInsertRowid;
}

function updateAssessment(id, d) {
  const keys = Object.keys(d).filter((k) => ASSESSMENT_COLUMNS[k]);
  if (!keys.length) return;
  getDb().prepare(
    `UPDATE assessments SET ${keys.map((k) => `${ASSESSMENT_COLUMNS[k]} = @${k}`).join(', ')}, updated_at = datetime('now') WHERE id = @id`
  ).run({ ...d, id });
}

const deleteAssessment = (id) => getDb().prepare('DELETE FROM assessments WHERE id = ?').run(id).changes;

module.exports = {
  getStudent, getSubjects, getScenarios, getAssessments, getExamComponents, findSubject, updateSubject,
  findScenario, createScenario, updateScenario, activateScenario, deleteScenario, countScenarios,
  findAssessment, createAssessment, updateAssessment, deleteAssessment,
};
