// Při startu serveru doplní účty a základní data, pokud v DB chybí.
// Osobní údaje (e-maily) jsou jen v proměnných prostředí, ne v repozitáři.
const bcrypt = require('bcryptjs');
const { getDb } = require('./db');

const FIELDS = [
  { name: 'Sport Science', ranking_label: 'Ranking 2027 UK Sport Science' },
  { name: 'Sport Management', ranking_label: 'Ranking 2027 UK Business Management' },
  { name: 'Physiotherapy', ranking_label: 'Ranking 2027 UK Physiotherapy' },
  { name: 'Business Management', ranking_label: 'Ranking 2027 UK Business Management' },
];

// Předměty IB a veřejné průměry 2025 (ISM mean, World mean). Známky se sem nedávají.
const SUBJECTS = [
  { code: 'SEHS', display_name: 'Sports Science', level: 'HL', ism: 5.62, world: 4.76 },
  { code: 'BIO', display_name: 'Biology', level: 'HL', ism: 4.71, world: 4.45 },
  { code: 'BM', display_name: 'Business and Management', level: 'HL', ism: 5.33, world: 4.93 },
  { code: 'ENG_A', display_name: 'English', level: 'SL', ism: 5.28, world: 4.94 },
  { code: 'SPA_B', display_name: 'Spanish', level: 'SL', ism: 5.27, world: 4.93 },
  { code: 'MATH_AA', display_name: 'Math', level: 'SL', ism: 5.73, world: 4.89 },
];

const SCENARIOS = ['kašle na to', 'průměr', 'dře/maká', 'zázrak', 'moje predikce'];

/**
 * BOOTSTRAP_USERS="Jméno|email|role;Jméno|email|role" (role: parent | student)
 * Nové účty dostanou heslo INITIAL_PASSWORD a musí ho při prvním přihlášení změnit.
 */
function parseBootstrapUsers(value) {
  if (!value) return [];
  return value.split(';').map((s) => s.trim()).filter(Boolean).map((entry) => {
    const [name, email, role = 'parent'] = entry.split('|').map((p) => p.trim());
    if (!name || !email || !['parent', 'student'].includes(role)) {
      throw new Error(`Neplatná položka BOOTSTRAP_USERS: "${entry}"`);
    }
    return { name, email, role };
  });
}

function ensureUsers(db = getDb()) {
  const users = parseBootstrapUsers(process.env.BOOTSTRAP_USERS);
  if (!users.length) return;
  const password = process.env.INITIAL_PASSWORD;
  if (!password) {
    console.warn('  ! BOOTSTRAP_USERS je nastaveno, ale chybí INITIAL_PASSWORD – účty se nevytvoří');
    return;
  }
  const rounds = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);
  const exists = db.prepare('SELECT 1 FROM users WHERE email = ?');
  const insert = db.prepare(
    'INSERT INTO users (name, email, password_hash, role, is_first_login) VALUES (?, ?, ?, ?, 1)'
  );
  for (const u of users) {
    if (exists.get(u.email)) continue;
    insert.run(u.name, u.email, bcrypt.hashSync(password, rounds), u.role);
    console.log(`  ✓ Účet vytvořen: ${u.name} (${u.role})`);
  }
}

function ensureBaseData(db = getDb()) {
  db.transaction(() => {
    if (!db.prepare('SELECT COUNT(*) AS n FROM fields').get().n) {
      const ins = db.prepare('INSERT INTO fields (name, ranking_label, sort_order) VALUES (?, ?, ?)');
      FIELDS.forEach((f, i) => ins.run(f.name, f.ranking_label, i));
    }

    if (db.prepare('SELECT COUNT(*) AS n FROM students').get().n) return;
    const studentId = db.prepare('INSERT INTO students (name) VALUES (?)').run('Lukas').lastInsertRowid;

    const insSubject = db.prepare(`
      INSERT INTO subjects (student_id, code, display_name, level, sort_order, ism_mean_2025, world_mean_2025)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    SUBJECTS.forEach((s, i) => insSubject.run(studentId, s.code, s.display_name, s.level, i, s.ism, s.world));

    const insScenario = db.prepare(
      'INSERT INTO scenarios (student_id, name, is_active, sort_order) VALUES (?, ?, ?, ?)'
    );
    SCENARIOS.forEach((name, i) => insScenario.run(studentId, name, name === 'moje predikce' ? 1 : 0, i));
  })();
}

function bootstrap() {
  const db = getDb();
  ensureBaseData(db);
  ensureUsers(db);
}

module.exports = { bootstrap, ensureUsers, ensureBaseData, parseBootstrapUsers };
