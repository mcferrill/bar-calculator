CREATE TABLE IF NOT EXISTS sessions (
	id TEXT PRIMARY KEY NOT NULL,
	date TEXT NOT NULL,
	unit TEXT NOT NULL DEFAULT 'lb' CHECK (unit IN ('lb', 'kg')),
	bodyweight REAL,
	notes TEXT,
	lifts TEXT NOT NULL,
	created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_date ON sessions (date DESC);
