CREATE TABLE IF NOT EXISTS game_saves (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    TEXT    NOT NULL,
  game_slug  TEXT    NOT NULL,
  save_data  TEXT    NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(user_id, game_slug)
);
