-- Zdroj známek scénáře: 'manual' = zadané ručně, 'averages' = živě z vážených průměrů assessmentů.
ALTER TABLE scenarios ADD COLUMN source TEXT NOT NULL DEFAULT 'manual' CHECK(source IN ('manual', 'averages'));
