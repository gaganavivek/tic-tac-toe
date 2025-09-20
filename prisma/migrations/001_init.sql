-- Initial schema for tic-tac-toe
CREATE TABLE IF NOT EXISTS games (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  player_x TEXT,
  player_o TEXT,
  status TEXT DEFAULT 'in_progress' NOT NULL,
  board CHAR(9) NOT NULL,
  next_turn CHAR(1) NOT NULL DEFAULT 'X',
  winner TEXT
);

CREATE TABLE IF NOT EXISTS moves (
  id SERIAL PRIMARY KEY,
  game_id INTEGER REFERENCES games(id) ON DELETE CASCADE,
  player CHAR(1) NOT NULL,
  position INTEGER NOT NULL CHECK (position BETWEEN 0 AND 8),
  created_at TIMESTAMP DEFAULT now()
);
