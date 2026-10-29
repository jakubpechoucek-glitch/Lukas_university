// Import osobních dat (scénáře predikce, assessmenty, váhy zkoušek) z JSON souboru.
// Soubor nepatří do gitu – drží se v data/private/. Formát viz docs/07-import-dat.md.
//   npm run import:private -- data/private/lukas-private.json
// V produkci totéž přes POST /api/import/private (jen role parent).
require('dotenv').config();
const fs = require('fs');
const { getDb } = require('./db');

function importPrivate(db, data) {
  const student = db.prepare('SELECT id FROM students ORDER BY id LIMIT 1').get();
  if (!student) throw new Error('V DB chybí student – spusťte nejdřív server nebo migrace');

  const subjects = db.prepare('SELECT id, code FROM subjects WHERE student_id = ?').all(student.id);
  const subjectId = (code) => {
    const s = subjects.find((x) => x.code === code);
    if (!s) throw new Error(`Předmět ${code} v DB neexistuje`);
    return s.id;
  };

  const stats = { scenarios: 0, grades: 0, assessments: 0, examComponents: 0 };

  db.transaction(() => {
    for (const s of data.subjects ?? []) {
      db.prepare('UPDATE subjects SET ism_mean_2025 = COALESCE(?, ism_mean_2025), world_mean_2025 = COALESCE(?, world_mean_2025) WHERE id = ?')
        .run(s.ismMean2025 ?? null, s.worldMean2025 ?? null, subjectId(s.code));
    }

    const findScenario = db.prepare('SELECT id FROM scenarios WHERE student_id = ? AND name = ?');
    const insScenario = db.prepare('INSERT INTO scenarios (student_id, name, sort_order) VALUES (?, ?, ?)');
    const updScenario = db.prepare('UPDATE scenarios SET core_points = ? WHERE id = ?');
    const upsertGrade = db.prepare(`
      INSERT INTO scenario_grades (scenario_id, subject_id, grade) VALUES (?, ?, ?)
      ON CONFLICT(scenario_id, subject_id) DO UPDATE SET grade = excluded.grade
    `);
    (data.scenarios ?? []).forEach((sc, i) => {
      const id = findScenario.get(student.id, sc.name)?.id
        ?? insScenario.run(student.id, sc.name, 100 + i).lastInsertRowid;
      updScenario.run(sc.corePoints ?? null, id);
      for (const [code, grade] of Object.entries(sc.grades ?? {})) {
        upsertGrade.run(id, subjectId(code), grade ?? null);
        stats.grades++;
      }
      stats.scenarios++;
    });

    // Assessmenty: nahradí se celé pololetí u předmětů, které jsou v souboru.
    const assessments = data.assessments ?? [];
    const pairs = new Set(assessments.map((a) => `${a.subject}|${a.term}`));
    for (const pair of pairs) {
      const [code, term] = pair.split('|');
      db.prepare('DELETE FROM assessments WHERE subject_id = ? AND term = ?').run(subjectId(code), term);
    }
    const insAssessment = db.prepare(`
      INSERT INTO assessments (subject_id, term, name, criterion, weight, grade, due_date, sort_order, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const a of assessments) {
      insAssessment.run(subjectId(a.subject), a.term, a.name, a.criterion ?? null, a.weight, a.grade ?? null,
        a.dueDate ?? null, a.sortOrder ?? 0, a.notes ?? null);
      stats.assessments++;
    }

    const components = data.examComponents ?? [];
    for (const code of new Set(components.map((c) => c.subject))) {
      db.prepare('DELETE FROM exam_components WHERE subject_id = ?').run(subjectId(code));
    }
    const insComponent = db.prepare('INSERT INTO exam_components (subject_id, name, weight, sort_order) VALUES (?, ?, ?, ?)');
    for (const c of components) {
      insComponent.run(subjectId(c.subject), c.name, c.weight, c.sortOrder ?? 0);
      stats.examComponents++;
    }
  })();

  return stats;
}

if (require.main === module) {
  const file = process.argv[2];
  if (!file) {
    console.error('Použití: npm run import:private -- <soubor.json>');
    process.exit(1);
  }
  const { runMigrations } = require('./migrate');
  const { ensureBaseData } = require('./bootstrap');
  runMigrations();
  ensureBaseData();
  const stats = importPrivate(getDb(), JSON.parse(fs.readFileSync(file, 'utf8')));
  console.log('Importováno:', stats);
}

module.exports = { importPrivate };
