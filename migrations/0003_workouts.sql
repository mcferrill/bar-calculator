ALTER TABLE sessions ADD COLUMN status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('active', 'completed'));
ALTER TABLE sessions ADD COLUMN revision INTEGER NOT NULL DEFAULT 0;
CREATE INDEX idx_sessions_status ON sessions (status, date DESC);
