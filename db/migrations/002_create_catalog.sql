-- Katalog škol a programů. Viz docs/03-datovy-model.md#katalog

CREATE TABLE IF NOT EXISTS fields (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  ranking_label TEXT,
  ranking_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS universities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  country TEXT,                    -- ISO 3166 alpha-2
  city TEXT,
  address TEXT,
  website TEXT,
  map_url TEXT,
  world_rank_text TEXT,            -- „326~350“, „?“
  world_rank_sort INTEGER,         -- odvozené číslo pro řazení
  cz_connection TEXT,
  accommodation TEXT,
  living_costs INTEGER,
  living_costs_currency TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS programs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  university_id INTEGER NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  field_id INTEGER NOT NULL REFERENCES fields(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  degree TEXT,
  duration_years REAL,
  program_url TEXT,
  field_rank INTEGER,
  masters_info TEXT,
  tuition_fee INTEGER,
  tuition_currency TEXT,
  application_system TEXT CHECK(application_system IN ('UCAS', 'Studielink', 'CAO', 'direct', 'other')),
  application_deadline TEXT,
  open_days TEXT,
  start_date TEXT,
  requirements_text TEXT,
  manual_review INTEGER NOT NULL DEFAULT 0,
  category_override TEXT CHECK(category_override IN ('Reach', 'Target', 'Likely')),
  status TEXT NOT NULL DEFAULT 'research' CHECK(status IN (
    'research', 'considering', 'applying', 'applied',
    'offer_conditional', 'offer_unconditional', 'rejected', 'accepted', 'dropped'
  )),
  priority INTEGER,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_programs_field ON programs(field_id);
CREATE INDEX IF NOT EXISTS idx_programs_university ON programs(university_id);

-- Mezi sadami jednoho programu platí NEBO, podmínky uvnitř sady platí A ZÁROVEŇ.
CREATE TABLE IF NOT EXISTS requirement_sets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  program_id INTEGER NOT NULL REFERENCES programs(id) ON DELETE CASCADE,
  label TEXT,
  kind TEXT NOT NULL DEFAULT 'typical' CHECK(kind IN ('typical', 'contextual')),
  min_total INTEGER,
  total_basis TEXT NOT NULL DEFAULT 'with_core' CHECK(total_basis IN ('with_core', 'subjects_only')),
  hl_profile TEXT,                 -- JSON pole, např. [6,6,5]
  min_hl_sum INTEGER,
  min_each_subject INTEGER,
  requires_full_diploma INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS subject_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  requirement_set_id INTEGER NOT NULL REFERENCES requirement_sets(id) ON DELETE CASCADE,
  subjects TEXT NOT NULL,          -- JSON pole kódů předmětů nebo skupin
  level TEXT NOT NULL DEFAULT 'ANY' CHECK(level IN ('HL', 'SL', 'ANY')),
  min_grade INTEGER NOT NULL CHECK(min_grade BETWEEN 1 AND 7),
  count INTEGER NOT NULL DEFAULT 1 CHECK(count >= 1),
  note TEXT
);

CREATE INDEX IF NOT EXISTS idx_requirement_sets_program ON requirement_sets(program_id);
CREATE INDEX IF NOT EXISTS idx_subject_rules_set ON subject_rules(requirement_set_id);
