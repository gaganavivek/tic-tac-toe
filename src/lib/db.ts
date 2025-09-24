import { Pool } from 'pg';

interface MockQuery {
  text: string;
  params?: any[];
}

// Minimal in-memory mock DB for demo when DATABASE_URL is not set.
function createInMemoryPool() {
  let gameId = 1;
  let moveId = 1;
  let resultId = 1;
  let userId = 1;
  const games: any[] = [];
  const moves: any[] = [];
  const gameResults: any[] = [];
  const users: any[] = [];

  function now() { 
    return new Date().toISOString(); 
  }

  async function mockQuery(text: any, params: any[] = []) {
    // Accept pool.query(text) or pool.query({ text, values })
    if (typeof text === 'object' && text !== null) {
      params = text.values ?? text.params ?? params;
      text = text.text ?? text.query ?? String(text);
    }
    console.log('Executing query:', { text, params });

    // handle transaction control
    if (/^(BEGIN|COMMIT|ROLLBACK)/i.test(text)) {
      return { rows: [], rowCount: 0 };
    }

    // Generic COUNT(*) handler for game_results and moves
    if (/COUNT\(\*\)/i.test(text) && /game_results/i.test(text)) {
      const count = gameResults.length;
      console.log('Mock COUNT(*) FROM game_results =>', count);
      return { rows: [{ count }], rowCount: 1 };
    }

    // CREATE new game
    if (/INSERT INTO games/i.test(text)) {
      const [player_x, player_o, board, next_turn, status] = params;
      const game = { 
        id: gameId++, 
        created_at: now(), 
        updated_at: now(), 
        player_x: player_x ?? null, 
        player_o: player_o ?? null, 
        board: board || '_________',
        next_turn: next_turn || 'X',
        status: status || 'in_progress',
        winner: null
      };
      games.push(game);
      console.log('Created game:', game);
      return { rows: [game], rowCount: 1 };
    }

    // CREATE move
    if (/INSERT INTO moves/i.test(text)) {
      const [game_id, player, position] = params;
      const move = { 
        id: moveId++, 
        game_id, 
        player, 
        position, 
        created_at: now() 
      };
      moves.push(move);
      console.log('Created move:', move);
      return { rows: [move], rowCount: 1 };
    }

    // CREATE user
    if (/INSERT INTO users/i.test(text)) {
      const [username, display_name] = params;
      const user = {
        id: userId++,
        username: username ?? null,
        display_name: display_name ?? null,
        created_at: now()
      };
      users.push(user);
      console.log('Created user:', user);
      return { rows: [user], rowCount: 1 };
    }

    // CREATE game result
    if (/INSERT INTO game_results/i.test(text)) {
      const [game_id, winner, player_x, player_o, moves_count, is_draw] = params;
      const result = {
        id: resultId++,
        game_id,
        winner,
        player_x,
        player_o,
        moves_count: Number(moves_count),
        is_draw: Boolean(is_draw),
        finished_at: now(),
        date: new Date().toISOString().split('T')[0]
      };
      gameResults.push(result);
      console.log('Created game result:', result);
      return { rows: [result], rowCount: 1 };
    }

    // COUNT total game_results (robust matcher)
    if (/COUNT\(\*\)/i.test(text) && /game_results/i.test(text)) {
      const count = gameResults.length;
      console.log('Mock COUNT(*) FROM game_results =>', count);
      // Postgres returns counts as strings sometimes; keep number for convenience
      return { rows: [{ count }], rowCount: 1 };
    }

    // READ game
    if (/SELECT.*FROM games WHERE id = \$1/i.test(text)) {
      const id = params[0];
      const game = games.find(g => g.id === id);
      return { rows: game ? [game] : [], rowCount: game ? 1 : 0 };
    }

    // READ moves for game
    if (/SELECT.*FROM moves WHERE game_id = \$1/i.test(text)) {
      const gameId = params[0];
      const gameMoves = moves.filter(m => m.game_id === gameId);
      return { rows: gameMoves, rowCount: gameMoves.length };
    }

    // READ user by id or select username
    if (/SELECT .* FROM users WHERE id = \$1/i.test(text) || /SELECT username FROM users WHERE id = \$1/i.test(text)) {
      const id = params[0];
      const user = users.find(u => u.id === id);
      if (!user) return { rows: [], rowCount: 0 };
      // Try to mimic selective column projection
      if (/SELECT username FROM users/i.test(text)) {
        return { rows: [{ username: user.username }], rowCount: 1 };
      }
      return { rows: [user], rowCount: 1 };
    }

    // READ all users
    if (/SELECT \* FROM users/i.test(text)) {
      return { rows: users, rowCount: users.length };
    }

    // COUNT moves
    if (/SELECT COUNT\(\*\) FROM moves/i.test(text)) {
      const gameId = params[0];
      const count = moves.filter(m => m.game_id === gameId).length;
      return { rows: [{ count }], rowCount: 1 };
    }

    // UPDATE game
    if (/UPDATE games SET/i.test(text) && /WHERE id = \$\d+$/i.test(text)) {
      const id = params[params.length - 1];
      const game = games.find(g => g.id === id);
      if (game) {
        if (/board = \$1/.test(text)) {
          const [board, next_turn, status, winner] = params;
          game.board = board;
          game.next_turn = next_turn;
          game.status = status;
          game.winner = winner;
          game.updated_at = now();
        }
        console.log('Updated game:', game);
      }
      return { rows: game ? [game] : [], rowCount: game ? 1 : 0 };
    }

    // READ game stats
    if (/SELECT.*FROM game_results/i.test(text) && /GROUP BY date/i.test(text)) {
      console.log('Getting stats from', gameResults.length, 'results');
      const results = new Map();
      
      for (const result of gameResults) {
        const date = result.date;
        const stats = results.get(date) || {
          date,
          total_games: 0,
          x_wins: 0,
          o_wins: 0,
          draws: 0,
          total_moves: 0
        };
        
        stats.total_games++;
        if (result.winner === 'X') stats.x_wins++;
        else if (result.winner === 'O') stats.o_wins++;
        else if (result.is_draw) stats.draws++;
        stats.total_moves += result.moves_count;
        
        results.set(date, stats);
      }

      const rows = Array.from(results.values()).map(stat => ({
        date: stat.date,
        total_games: Number(stat.total_games),
        x_wins: Number(stat.x_wins),
        o_wins: Number(stat.o_wins),
        draws: Number(stat.draws),
        avg_moves: Number((stat.total_moves / stat.total_games).toFixed(2))
      })).sort((a, b) => b.date.localeCompare(a.date));

      console.log('Computed stats:', rows);
      return { rows, rowCount: rows.length };
    }

    // COUNT total game_results
    if (/SELECT COUNT\(\*\) FROM game_results/i.test(text)) {
      const count = gameResults.length;
      return { rows: [{ count }], rowCount: 1 };
    }

    // SELECT * FROM game_results [WHERE ...]
    if (/SELECT \*/i.test(text) && /FROM game_results/i.test(text)) {
      // very small parser for WHERE date >= $1 AND date <= $2
      const paramsMap: any = {};
      // naive: if params provided and look like dates, filter by them
      if (params && params.length === 2) {
        const [from, to] = params;
        const rows = gameResults.filter(r => r.date >= from && r.date <= to);
        return { rows, rowCount: rows.length };
      }
      return { rows: gameResults, rowCount: gameResults.length };
    }

    console.warn('Unhandled query:', text);
    return { rows: [], rowCount: 0 };
  }

  return {
    query: mockQuery,
    connect: () => Promise.resolve({ 
      query: mockQuery, 
      release: () => {} 
    })
  };
}

declare global {
  var __pgPool: any;
}

let pool: any;
if (process.env.DATABASE_URL) {
  pool = global.__pgPool ?? new Pool({ connectionString: process.env.DATABASE_URL });
  if (!global.__pgPool) global.__pgPool = pool;
} else {
  console.warn('DATABASE_URL not set — using in-memory demo DB');
  pool = global.__pgPool ?? createInMemoryPool();
  if (!global.__pgPool) global.__pgPool = pool;
}

export { pool };