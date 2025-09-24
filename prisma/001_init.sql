-- prisma/migrations/001_init.sql
-- Full DDL: users, games, moves, game_results (single-file)

SET client_min_messages = WARNING;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(150) NOT NULL UNIQUE,
  display_name VARCHAR(255),
  email VARCHAR(320) UNIQUE,
  avatar_url TEXT,
  provider VARCHAR(50),      -- e.g. 'google'
  provider_id TEXT,          -- provider-specific id
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Games table
CREATE TABLE IF NOT EXISTS games (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  player_x TEXT,
  player_o TEXT,
  player_x_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  player_o_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'in_progress' NOT NULL,
  board CHAR(9) NOT NULL,
  next_turn CHAR(1) NOT NULL DEFAULT 'X',
  winner TEXT
);

-- Moves table
CREATE TABLE IF NOT EXISTS moves (
  id SERIAL PRIMARY KEY,
  game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player CHAR(1) NOT NULL CHECK (player IN ('X','O')),
  position INTEGER NOT NULL CHECK (position BETWEEN 0 AND 8),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Game results (summary/history)
CREATE TABLE IF NOT EXISTS game_results (
  id SERIAL PRIMARY KEY,
  game_id INTEGER NOT NULL UNIQUE REFERENCES games(id) ON DELETE CASCADE,
  winner TEXT,                                  -- 'X' | 'O' | 'draw'
  player_x VARCHAR(255),
  player_o VARCHAR(255),
  player_x_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  player_o_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  finished_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  date DATE NOT NULL DEFAULT (now()::date),
  moves_count INTEGER NOT NULL DEFAULT 0,
  is_draw BOOLEAN NOT NULL DEFAULT false
);

-- Indexes for queries
CREATE INDEX IF NOT EXISTS idx_game_results_date ON game_results(date);
CREATE INDEX IF NOT EXISTS idx_games_updated_at ON games(updated_at);
CREATE INDEX IF NOT EXISTS idx_moves_game_id ON moves(game_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);