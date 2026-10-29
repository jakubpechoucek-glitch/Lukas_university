-- Student, předměty, assessmenty a scénáře predikce. Viz docs/03-datovy-model.md#student-a-předměty

CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS subjects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  display_name TEXT NOT NULL,
  level TEXT NOT NULL CHECK(level IN ('HL', 'SL')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  ism_mean_2025 REAL,
  world_mean_2025 REAL
);

CREATE TABLE IF NOT EXISTS exam_components (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  weight REAL NOT NULL CHECK(weight >= 0),
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS assessments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  term TEXT NOT NULL,              -- G11-S1, G11-S2, G12-S1, G12-S2
  name TEXT NOT NULL,
  criterion TEXT,                  -- KU / TL / …
  weight REAL NOT NULL CHECK(weight >= 0),
  grade INTEGER CHECK(grade BETWEEN 1 AND 7),
  due_date TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_assessments_subject_term ON assessments(subject_id, term);

CREATE TABLE IF NOT EXISTS scenarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 0,
  core_points INTEGER CHECK(core_points BETWEEN 0 AND 3),
  tok_grade TEXT CHECK(tok_grade IN ('A', 'B', 'C', 'D', 'E')),
  ee_grade TEXT CHECK(ee_grade IN ('A', 'B', 'C', 'D', 'E')),
  sort_order INTEGER NOT NULL DEFAULT 0
);

-- Nejvýš jeden aktivní scénář na studenta.
CREATE UNIQUE INDEX IF NOT EXISTS idx_scenarios_active ON scenarios(student_id) WHERE is_active = 1;

CREATE TABLE IF NOT EXISTS scenario_grades (
  scenario_id INTEGER NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  grade INTEGER CHECK(grade BETWEEN 1 AND 7),
  PRIMARY KEY (scenario_id, subject_id)
);
