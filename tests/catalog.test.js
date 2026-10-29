const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lukas-catalog-'));
process.env.DATABASE_URL = path.join(tmpDir, 'test.db');

const { getDb, closeDb } = require('../db/db');
const { runMigrations } = require('../db/migrate');
const { ensureBaseData, ensurePrivateSeed } = require('../db/bootstrap');
const { seedCatalog, loadCatalogFile } = require('../db/seed-catalog');
const { importPrivate } = require('../db/import-private');
const { ibTotals, evaluateProgram, STATUS } = require('../shared/calc/index.mjs');

after(() => {
  closeDb();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

runMigrations();
ensureBaseData();
const db = getDb();
const catalog = loadCatalogFile();

test('katalog.json je konzistentní', () => {
  const unis = new Set(catalog.universities.map((u) => u.name));
  assert.equal(unis.size, catalog.universities.length, 'duplicitní univerzita');
  const fields = new Set(['Sport Science', 'Sport Management', 'Physiotherapy', 'Business Management']);
  for (const p of catalog.programs) {
    assert.ok(unis.has(p.university), p.university);
    assert.ok(fields.has(p.field), p.field);
    for (const s of p.requirementSets) {
      for (const r of s.subjectRules) {
        assert.ok(r.minGrade >= 1 && r.minGrade <= 7, `${p.name}: minGrade`);
        assert.ok(r.subjects.length, `${p.name}: prázdný seznam předmětů`);
      }
      if (s.hlProfile) assert.ok(s.hlProfile.every((g) => g >= 1 && g <= 7));
    }
  }
  const key = (p) => `${p.university}|${p.field}|${p.name}`;
  assert.equal(new Set(catalog.programs.map(key)).size, catalog.programs.length, 'duplicitní program');
});

test('opravy z analýzy Excelu', () => {
  const names = catalog.universities.map((u) => u.name);
  for (const typo of ['University of Notingham', 'University of Edinburg', 'University of Limerck', 'Kings College']) {
    assert.ok(!names.includes(typo), typo);
  }
  const erasmus = catalog.programs.filter((p) => p.university === 'Erasmus University Rotterdam');
  assert.equal(erasmus.length, 1, 'Erasmus sloučen');
  const business = catalog.programs.filter((p) => p.field === 'Business Management');
  assert.ok(!business.some((p) => p.university.startsWith('UCAM')), 'UCAM není v Business');
  assert.ok(!business.some((p) => p.university === 'University College Dublin'), 'UCD Sport není v Business');
});

test('seed nahraje katalog jen do prázdné DB, --force přepíše', () => {
  const r = seedCatalog(db, catalog);
  assert.equal(r.programs, catalog.programs.length);
  assert.equal(seedCatalog(db, catalog).skipped, true);
  const r2 = seedCatalog(db, catalog, { force: true });
  assert.equal(r2.programs, catalog.programs.length);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM programs').get().n, catalog.programs.length);
  const sets = catalog.programs.reduce((n, p) => n + p.requirementSets.length, 0);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM requirement_sets').get().n, sets, 'staré sady smazány kaskádou');
});

test('všechny programy jdou vyhodnotit a výsledky dávají smysl', () => {
  const subjects = [
    { code: 'SEHS', level: 'HL', grade: 7 }, { code: 'BIO', level: 'HL', grade: 7 }, { code: 'BM', level: 'HL', grade: 7 },
    { code: 'ENG_A', level: 'SL', grade: 7 }, { code: 'SPA_B', level: 'SL', grade: 7 }, { code: 'MATH_AA', level: 'SL', grade: 7 },
  ];
  const totals = ibTotals(subjects, 3);
  const byStatus = {};
  for (const p of catalog.programs) {
    const r = evaluateProgram(p, subjects, totals);
    (byStatus[r.status] ??= []).push(`${p.university} – ${p.name}`);
  }
  // Při 45 bodech nesmí být nic hraniční. Nesplnitelné jsou jen programy vyžadující nestudovaný předmět (TCD: HL Math).
  assert.equal(byStatus[STATUS.BORDERLINE], undefined);
  assert.deepEqual(byStatus[STATUS.FAILS], ['Trinity College Dublin – Business (Joint Honours)']);
});

test('import osobních dat (fiktivní data) a jednorázový PRIVATE_SEED_JSON', () => {
  const data = {
    scenarios: [{ name: 'test', corePoints: 2, grades: { SEHS: 6, BIO: 5, BM: 5, ENG_A: 5, SPA_B: 5, MATH_AA: 5 } }],
    assessments: [
      { subject: 'BIO', term: 'G11-S1', name: 'Unit 01 - KU', criterion: 'KU', weight: 0.5, grade: 6, sortOrder: 0 },
      { subject: 'BIO', term: 'G11-S1', name: 'Unit 01 - TL', criterion: 'TL', weight: 0.5, grade: null, sortOrder: 1 },
    ],
    examComponents: [{ subject: 'BIO', name: 'Paper 1', weight: 0.36 }],
  };

  process.env.PRIVATE_SEED_JSON = JSON.stringify(data);
  ensurePrivateSeed(db);
  ensurePrivateSeed(db); // podruhé se nic nestane
  delete process.env.PRIVATE_SEED_JSON;
  assert.equal(db.prepare('SELECT COUNT(*) n FROM assessments').get().n, 2);
  assert.equal(db.prepare("SELECT core_points FROM scenarios WHERE name = 'test'").get().core_points, 2);

  // Opakovaný import nahradí pololetí, neduplikuje.
  const stats = importPrivate(db, data);
  assert.equal(stats.assessments, 2);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM assessments').get().n, 2);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM exam_components').get().n, 1);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM scenario_grades').get().n, 6);

  assert.throws(() => importPrivate(db, { assessments: [{ subject: 'CHEM', term: 'G11-S1', name: 'x', weight: 1 }] }), /CHEM/);
});
