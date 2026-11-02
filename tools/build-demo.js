// Vygeneruje client/src/demo/demoData.json pro ukázkový režim (/?demo).
// Katalog škol je veřejný (db/seed/catalog.json), známky a assessmenty jsou smyšlené (tools/demo-private.json).
// Spuštění: node tools/build-demo.js
const fs = require('fs');
const os = require('os');
const path = require('path');

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lukas-demo-'));
process.env.DATABASE_URL = path.join(tmp, 'demo.db');

const { runMigrations } = require('../db/migrate');
const { ensureBaseData, ensureAveragesScenario } = require('../db/bootstrap');
const { seedCatalog } = require('../db/seed-catalog');
const { importPrivate } = require('../db/import-private');
const { getDb, closeDb } = require('../db/db');

runMigrations();
const db = getDb();
ensureBaseData(db);
importPrivate(db, JSON.parse(fs.readFileSync(path.join(__dirname, 'demo-private.json'), 'utf8')));
ensureAveragesScenario(db);
seedCatalog(db);

const catalog = require('../server/services/catalog.service').getCatalog();
const student = require('../server/services/student.service').getData();
student.student = { ...student.student, name: 'Student (ukázka)' };

const out = path.join(__dirname, '..', 'client', 'src', 'demo', 'demoData.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify({ catalog, student }, null, 1) + '\n');
closeDb();
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`✓ ${path.relative(process.cwd(), out)}: ${catalog.programs.length} programů, ${student.scenarios.length} scénářů, ${student.assessments.length} assessmentů`);
