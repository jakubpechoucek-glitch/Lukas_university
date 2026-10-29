require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { getDb } = require('./db');

function runMigrations() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  const applied = new Set(
    db.prepare('SELECT filename FROM _migrations').all().map(r => r.filename)
  );

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    db.exec(sql);
    db.prepare('INSERT OR IGNORE INTO _migrations (filename) VALUES (?)').run(file);
    console.log(`  ✓ ${file}`);
    count++;
  }

  if (count === 0) {
    console.log('  All migrations already applied.');
  } else {
    console.log(`  Applied ${count} migration(s).`);
  }
}

if (require.main === module) {
  console.log('Running migrations...');
  runMigrations();
  console.log('Done.');
}

module.exports = { runMigrations };
