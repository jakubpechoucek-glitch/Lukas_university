const { getDb } = require('../../db/db');
const repo = require('../repositories/student.repository');
const v = require('../utils/validate');

function student() {
  const s = repo.getStudent();
  if (!s) throw { status: 404, message: 'Student neexistuje' };
  return s;
}

function getData() {
  const s = student();
  return {
    student: s,
    subjects: repo.getSubjects(s.id),
    scenarios: repo.getScenarios(s.id),
    assessments: repo.getAssessments(s.id),
    examComponents: repo.getExamComponents(s.id),
  };
}

function updateSubject(id, body) {
  const current = repo.findSubject(id);
  if (!current) throw { status: 404, message: 'Předmět neexistuje' };
  repo.updateSubject(id, {
    displayName: body.displayName !== undefined ? v.requiredText(body.displayName, 'Název předmětu') : null,
    code: body.code !== undefined ? v.requiredText(body.code, 'Kód předmětu') : null,
    level: v.oneOf(body.level, 'Úroveň', ['HL', 'SL']),
    ismMean2025: body.ismMean2025 !== undefined ? v.optionalNumber(body.ismMean2025, 'ISM průměr', { min: 1, max: 7 }) : current.ismMean2025,
    worldMean2025: body.worldMean2025 !== undefined ? v.optionalNumber(body.worldMean2025, 'Světový průměr', { min: 1, max: 7 }) : current.worldMean2025,
  });
  return repo.findSubject(id);
}

function scenarioOrFail(id) {
  const s = repo.findScenario(id);
  if (!s) throw { status: 404, message: 'Scénář neexistuje' };
  return s;
}

function createScenario(body) {
  const s = student();
  const name = v.requiredText(body.name, 'Název scénáře');
  if (body.copyFrom) scenarioOrFail(body.copyFrom);
  const id = repo.createScenario(s.id, name, body.copyFrom ?? null);
  return repo.getScenarios(s.id).find((x) => x.id === id);
}

function updateScenario(id, body) {
  const sc = scenarioOrFail(id);
  const data = {};
  if (body.name !== undefined) data.name = v.requiredText(body.name, 'Název scénáře');
  if (body.corePoints !== undefined) data.corePoints = v.optionalInt(body.corePoints, 'Body TOK+EE', { min: 0, max: 3 });
  if (body.tokGrade !== undefined) data.tokGrade = v.oneOf(body.tokGrade, 'TOK', ['A', 'B', 'C', 'D', 'E']);
  if (body.eeGrade !== undefined) data.eeGrade = v.oneOf(body.eeGrade, 'EE', ['A', 'B', 'C', 'D', 'E']);
  if (body.grades !== undefined) {
    if (sc.source === 'averages') v.fail('Známky scénáře „podle průměrů“ se počítají z assessmentů – nelze je měnit ručně');
    const subjectIds = new Set(repo.getSubjects(sc.student_id).map((s) => s.id));
    data.grades = {};
    for (const [subjectId, g] of Object.entries(body.grades)) {
      if (!subjectIds.has(Number(subjectId))) v.fail(`Předmět ${subjectId} neexistuje`);
      data.grades[subjectId] = v.grade(g);
    }
  }
  getDb().transaction(() => repo.updateScenario(id, data))();
  return repo.getScenarios(sc.student_id).find((x) => x.id === id);
}

function activateScenario(id) {
  const sc = scenarioOrFail(id);
  getDb().transaction(() => repo.activateScenario(sc.student_id, id))();
  return repo.getScenarios(sc.student_id);
}

function deleteScenario(id) {
  const sc = scenarioOrFail(id);
  if (sc.source === 'averages') throw { status: 409, message: 'Scénář „podle průměrů“ nelze smazat' };
  if (repo.countScenarios(sc.student_id) <= 1) throw { status: 409, message: 'Poslední scénář nelze smazat' };
  getDb().transaction(() => {
    repo.deleteScenario(id);
    if (sc.is_active) {
      const next = repo.getScenarios(sc.student_id)[0];
      repo.activateScenario(sc.student_id, next.id);
    }
  })();
  return repo.getScenarios(sc.student_id);
}

const TERM = /^G1[12]-S[12]$/;

function normalizeAssessment(body, { partial }) {
  const d = {};
  const has = (k) => Object.prototype.hasOwnProperty.call(body, k);
  if (!partial || has('subjectId')) {
    d.subjectId = v.optionalInt(body.subjectId, 'Předmět', { min: 1 });
    if (!d.subjectId || !repo.findSubject(d.subjectId)) v.fail('Předmět neexistuje');
  }
  if (!partial || has('term')) {
    d.term = v.requiredText(body.term, 'Pololetí');
    if (!TERM.test(d.term)) v.fail('Pololetí: očekáváno G11-S1, G11-S2, G12-S1 nebo G12-S2');
  }
  if (!partial || has('name')) d.name = v.requiredText(body.name, 'Název');
  if (!partial || has('weight')) d.weight = v.optionalNumber(body.weight, 'Váha', { min: 0, max: 1 }) ?? 0;
  if (has('grade')) d.grade = v.grade(body.grade);
  if (has('criterion')) d.criterion = v.optionalText(body.criterion);
  if (has('dueDate')) {
    d.dueDate = v.optionalText(body.dueDate);
    if (d.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(d.dueDate)) v.fail('Termín: očekáváno datum RRRR-MM-DD');
  }
  if (has('notes')) d.notes = v.optionalText(body.notes);
  if (has('sortOrder')) d.sortOrder = v.optionalInt(body.sortOrder, 'Pořadí', { min: 0 }) ?? 0;
  return d;
}

function createAssessment(body) {
  const id = repo.createAssessment(normalizeAssessment(body, { partial: false }));
  return repo.findAssessment(id);
}

function updateAssessment(id, body) {
  if (!repo.findAssessment(id)) throw { status: 404, message: 'Assessment neexistuje' };
  repo.updateAssessment(id, normalizeAssessment(body, { partial: true }));
  return repo.findAssessment(id);
}

function deleteAssessment(id) {
  if (!repo.deleteAssessment(id)) throw { status: 404, message: 'Assessment neexistuje' };
}

module.exports = {
  getData, updateSubject, createScenario, updateScenario, activateScenario, deleteScenario,
  createAssessment, updateAssessment, deleteAssessment,
};
