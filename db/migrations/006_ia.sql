-- Internal Assessment: výzkumná otázka a historie AI kontrol práce (jeden záznam na předmět).
CREATE TABLE IF NOT EXISTS ia_projects (
  subject_id INTEGER PRIMARY KEY REFERENCES subjects(id) ON DELETE CASCADE,
  research_question TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ia_reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK(kind IN ('rq', 'report')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'done', 'error')),
  source TEXT,                 -- paste | pdf | docx | gdoc (jen u kind = report)
  criteria TEXT,               -- JSON pole id kritérií
  word_count INTEGER,
  input_text TEXT,             -- vložený/extrahovaný text (u PDF jen text pro počítadlo slov)
  result_json TEXT,
  error TEXT,
  model TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_ia_reviews_subject ON ia_reviews(subject_id, created_at DESC);
