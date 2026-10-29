// Nahraje veřejný katalog škol a programů z db/seed/catalog.json.
// Spouští se automaticky při startu, pokud je katalog prázdný, nebo ručně:
//   npm run seed:catalog            (jen do prázdné DB)
//   npm run seed:catalog -- --force (smaže katalog a nahraje znovu)
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { getDb } = require('./db');

const CATALOG_PATH = path.join(__dirname, 'seed', 'catalog.json');

function loadCatalogFile(file = CATALOG_PATH) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

const json = (v) => (v === undefined || v === null ? null : JSON.stringify(v));
const val = (v) => (v === undefined ? null : v);
const bool = (v) => (v ? 1 : 0);

function seedCatalog(db = getDb(), catalog = loadCatalogFile(), { force = false } = {}) {
  const count = db.prepare('SELECT COUNT(*) AS n FROM universities').get().n;
  if (count && !force) return { skipped: true };

  const fieldIds = Object.fromEntries(db.prepare('SELECT id, name FROM fields').all().map((f) => [f.name, f.id]));

  const insUni = db.prepare(`
    INSERT INTO universities (name, country, city, address, website, world_rank_text, world_rank_sort)
    VALUES (@name, @country, @city, @address, @website, @worldRankText, @worldRankSort)
  `);
  const insProgram = db.prepare(`
    INSERT INTO programs (university_id, field_id, name, degree, duration_years, program_url, field_rank,
      subject_world_rank_text, masters_info, tuition_fee, tuition_currency, application_system,
      requirements_text, manual_review, status, notes)
    VALUES (@universityId, @fieldId, @name, @degree, @durationYears, @programUrl, @fieldRank,
      @subjectWorldRankText, @mastersInfo, @tuitionFee, @tuitionCurrency, @applicationSystem,
      @requirementsText, @manualReview, @status, @notes)
  `);
  const insSet = db.prepare(`
    INSERT INTO requirement_sets (program_id, label, kind, min_total, total_basis, hl_profile, min_hl_sum,
      min_each_subject, requires_full_diploma, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const insRule = db.prepare(`
    INSERT INTO subject_rules (requirement_set_id, subjects, level, min_grade, count, note)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  let programs = 0;
  db.transaction(() => {
    if (force) {
      db.prepare('DELETE FROM programs').run();
      db.prepare('DELETE FROM universities').run();
    }

    const uniIds = {};
    for (const u of catalog.universities) {
      uniIds[u.name] = insUni.run({
        name: u.name, country: val(u.country), city: val(u.city), address: val(u.address),
        website: val(u.website), worldRankText: val(u.worldRankText), worldRankSort: val(u.worldRankSort),
      }).lastInsertRowid;
    }

    for (const p of catalog.programs) {
      const fieldId = fieldIds[p.field];
      if (!fieldId) throw new Error(`Neznámý obor "${p.field}" u programu ${p.name}`);
      if (!uniIds[p.university]) throw new Error(`Neznámá univerzita "${p.university}"`);
      const programId = insProgram.run({
        universityId: uniIds[p.university], fieldId, name: p.name, degree: val(p.degree),
        durationYears: val(p.durationYears), programUrl: val(p.programUrl), fieldRank: val(p.fieldRank),
        subjectWorldRankText: val(p.subjectWorldRankText), mastersInfo: val(p.mastersInfo),
        tuitionFee: val(p.tuitionFee), tuitionCurrency: val(p.tuitionCurrency),
        applicationSystem: val(p.applicationSystem), requirementsText: val(p.requirementsText),
        manualReview: bool(p.manualReview), status: p.status ?? 'research', notes: val(p.notes),
      }).lastInsertRowid;
      programs++;

      (p.requirementSets ?? []).forEach((s, i) => {
        const setId = insSet.run(
          programId, val(s.label), s.kind ?? 'typical', val(s.minTotal), s.totalBasis ?? 'with_core',
          json(s.hlProfile), val(s.minHlSum), val(s.minEachSubject), s.requiresFullDiploma === false ? 0 : 1,
          s.sortOrder ?? i,
        ).lastInsertRowid;
        for (const r of s.subjectRules ?? []) {
          insRule.run(setId, JSON.stringify(r.subjects), r.level ?? 'ANY', r.minGrade, r.count ?? 1, val(r.note));
        }
      });
    }
  })();

  return { universities: catalog.universities.length, programs };
}

if (require.main === module) {
  const { runMigrations } = require('./migrate');
  const { ensureBaseData } = require('./bootstrap');
  runMigrations();
  ensureBaseData();
  const result = seedCatalog(getDb(), loadCatalogFile(), { force: process.argv.includes('--force') });
  console.log(result.skipped
    ? 'Katalog už v DB je – nic se nezměnilo (pro přepsání použijte --force).'
    : `Nahráno: ${result.universities} univerzit, ${result.programs} programů.`);
}

module.exports = { seedCatalog, loadCatalogFile };
