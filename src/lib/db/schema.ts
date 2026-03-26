// ============================================
// SQLite Schema — better-sqlite3
// ============================================

export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS games (
  game_id       TEXT PRIMARY KEY,
  date          TEXT NOT NULL,
  time          TEXT NOT NULL,
  home_team     TEXT NOT NULL,
  away_team     TEXT NOT NULL,
  stadium       TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'scheduled',
  season_type   TEXT NOT NULL DEFAULT 'regular',
  home_score    INTEGER,
  away_score    INTEGER,
  broadcast     TEXT,
  scoreboard_json TEXT,
  boxscore_json   TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_games_date ON games(date);
CREATE INDEX IF NOT EXISTS idx_games_home ON games(home_team);
CREATE INDEX IF NOT EXISTS idx_games_away ON games(away_team);
CREATE INDEX IF NOT EXISTS idx_games_status ON games(status);
CREATE INDEX IF NOT EXISTS idx_games_date_status ON games(date, status);

CREATE TABLE IF NOT EXISTS sync_logs (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  sync_type     TEXT NOT NULL,
  started_at    TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at   TEXT,
  games_updated INTEGER DEFAULT 0,
  errors_json   TEXT DEFAULT '[]',
  status        TEXT NOT NULL DEFAULT 'running'
);
`;

export const Q = {
  GAMES_BY_DATE: `
    SELECT * FROM games WHERE date = ? ORDER BY time ASC
  `,
  GAMES_BY_RANGE: `
    SELECT * FROM games WHERE date BETWEEN ? AND ? ORDER BY date, time ASC
  `,
  GAMES_BY_TEAM: `
    SELECT * FROM games
    WHERE (home_team = ? OR away_team = ?) AND date BETWEEN ? AND ?
    ORDER BY date, time ASC
  `,
  GAME_BY_ID: `
    SELECT * FROM games WHERE game_id = ?
  `,
  UPSERT_GAME: `
    INSERT INTO games (
      game_id, date, time, home_team, away_team,
      stadium, status, season_type,
      home_score, away_score, broadcast,
      scoreboard_json, boxscore_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(game_id) DO UPDATE SET
      status = excluded.status,
      home_score = COALESCE(excluded.home_score, home_score),
      away_score = COALESCE(excluded.away_score, away_score),
      broadcast = COALESCE(excluded.broadcast, broadcast),
      scoreboard_json = COALESCE(excluded.scoreboard_json, scoreboard_json),
      boxscore_json = COALESCE(excluded.boxscore_json, boxscore_json),
      updated_at = datetime('now')
  `,
  GAMES_MISSING_SCORE: `
    SELECT game_id, date FROM games
    WHERE status = 'final' AND scoreboard_json IS NULL
    ORDER BY date DESC LIMIT ?
  `,
  UPDATE_SCOREBOARD: `
    UPDATE games
    SET scoreboard_json = ?, updated_at = datetime('now')
    WHERE game_id = ?
  `,
  UPDATE_BOXSCORE: `
    UPDATE games
    SET boxscore_json = ?, updated_at = datetime('now')
    WHERE game_id = ?
  `,
  GAMES_NEEDING_SCORES: `
    SELECT * FROM games
    WHERE date = ?
      AND status IN ('final', 'in_progress')
      AND scoreboard_json IS NULL
    ORDER BY time ASC
  `,
  GAMES_NEEDING_BOXSCORES: `
    SELECT * FROM games
    WHERE date = ?
      AND status = 'final'
      AND boxscore_json IS NULL
    ORDER BY time ASC
  `,
  INSERT_SYNC_LOG: `
    INSERT INTO sync_logs (sync_type, started_at, status)
    VALUES (?, datetime('now'), 'running')
  `,
  UPDATE_SYNC_LOG: `
    UPDATE sync_logs
    SET finished_at   = datetime('now'),
        games_updated = ?,
        errors_json   = ?,
        status        = ?
    WHERE id = ?
  `,
} as const;
