-- Placeholder schema for barcalc D1.
-- Replace/extend before using DB in app code.
CREATE TABLE IF NOT EXISTS meta (
	key TEXT PRIMARY KEY NOT NULL,
	value TEXT NOT NULL
);

INSERT OR IGNORE INTO meta (key, value) VALUES ('schema_version', '1');
