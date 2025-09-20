-- Create game_results table
CREATE TABLE IF NOT EXISTS game_results (
  id SERIAL PRIMARY KEY,
  game_id INTEGER NOT NULL REFERENCES games(id),
  winner CHAR(1) CHECK (winner IN ('X', 'O') OR winner IS NULL),
  player_x VARCHAR(255),
  player_o VARCHAR(255),
  finished_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  moves_count INTEGER NOT NULL,
  is_draw BOOLEAN NOT NULL DEFAULT false,
  UNIQUE(game_id)
);

-- Create index for date-based queries
CREATE INDEX game_results_date_idx ON game_results(date);