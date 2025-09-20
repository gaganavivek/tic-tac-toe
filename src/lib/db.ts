// File: src/lib/db.ts
import { Pool } from 'pg';

// Minimal in-memory mock DB for demo when DATABASE_URL is not set.
function createInMemoryPool() {
  let gameId = 1;
  let moveId = 1;
  const games: any[] = [];
  const moves: any[] = [];

  function now() { return new Date().toISOString(); }

  async function query(text: string, params: any[] = []) {
    const q = text.trim();

    // handle transaction control
    if (/^BEGIN/i.test(q) || /^COMMIT/i.test(q) || /^ROLLBACK/i.test(q)) {
      return { rows: [], rowCount: 0 };
    }

    if (/^SELECT COUNT\(\*\)/i.test(q)) {
      const status = params && params[0];
      const count = status ? games.filter(g => g.status === status).length : games.length;
      return { rows: [{ count }], rowCount: 1 };
    }

    if (/SELECT .* FROM moves/i.test(q) && /WHERE game_id = \$1/i.test(q)) {
      const gid = params[0];
      const rows = moves.filter(m => m.game_id === gid).map(r => ({ id: r.id, player: r.player, position: r.position, created_at: r.created_at }));
      return { rows, rowCount: rows.length };
    }

    if (/SELECT .* FROM games WHERE id = \$1/i.test(q)) {
      const gid = params[0];
      const g = games.find(x => x.id === gid);
      return { rows: g ? [g] : [], rowCount: g ? 1 : 0 };
    }

    if (/SELECT \* FROM games WHERE player_o IS NULL/i.test(q)) {
      const found = games.find(g => (g.player_o === null || g.player_o === undefined) && g.status === 'in_progress');
      return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
    }

    if (/INSERT INTO games/i.test(q)) {
      const [player_x, player_o, board, next_turn, status] = params;
      const g = { id: gameId++, created_at: now(), updated_at: now(), player_x: player_x ?? null, player_o: player_o ?? null, board, next_turn, status, winner: null };
      games.push(g);
      return { rows: [g], rowCount: 1 };
    }

    if (/INSERT INTO moves/i.test(q)) {
      const [game_id, player, position] = params;
      const m = { id: moveId++, game_id, player, position, created_at: now() };
      moves.push(m);
      return { rows: [], rowCount: 1 };
    }

    if (/DELETE FROM moves WHERE game_id = \$1/i.test(q)) {
      const gid = params[0];
      const before = moves.length;
      for (let i = moves.length - 1; i >= 0; i--) {
        if (moves[i].game_id === gid) moves.splice(i, 1);
      }
      return { rows: [], rowCount: before - moves.length };
    }

    if (/DELETE FROM moves WHERE id = \$1/i.test(q)) {
      const id = params[0];
      const idx = moves.findIndex(m => m.id === id);
      if (idx >= 0) { moves.splice(idx, 1); return { rows: [], rowCount: 1 }; }
      return { rows: [], rowCount: 0 };
    }

    if (/UPDATE games SET/i.test(q) && /WHERE id = \$/.test(q)) {
      // naive parsing: apply params by position mapping for common updates used
      // We support two main patterns used in code: update board,next_turn,status,winner WHERE id = $5
      if (/board = \$1/i.test(q)) {
        const board = params[0];
        const next_turn = params[1];
        const status = params[2];
        const winner = params[3];
        const id = params[4];
        const g = games.find(x => x.id === id);
        if (g) { g.board = board; g.next_turn = next_turn; g.status = status; g.winner = winner; g.updated_at = now(); }
        return { rows: [], rowCount: g ? 1 : 0 };
      }

      // generic partial update: assume last param is id and earlier params map to columns
      const id = params[params.length - 1];
      const g = games.find(x => x.id === id);
      if (g) {
        // apply known fields from the SET clause when possible
        if (/player_x = \$1/.test(q)) g.player_x = params[0];
        if (/player_o = \$/.test(q)) {}
        g.updated_at = now();
      }
      return { rows: [], rowCount: g ? 1 : 0 };
    }

    if (/SELECT id, player_x, player_o, status, next_turn, board, updated_at FROM games/i.test(q)) {
      // basic list with optional status filter
      const limit = params[params.length - 2];
      const offset = params[params.length - 1];
      const status = params.length > 2 ? params[0] : null;
      let list = games.slice();
      if (status) list = list.filter(g => g.status === status);
      list = list.sort((a,b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      const rows = list.slice(offset, offset + limit).map(g => ({ id: g.id, player_x: g.player_x, player_o: g.player_o, status: g.status, next_turn: g.next_turn, board: g.board, updated_at: g.updated_at }));
      return { rows, rowCount: rows.length };
    }

    if (/SELECT COUNT\(\*\) FROM games/i.test(q)) {
      const status = params && params[0];
      const count = status ? games.filter(g => g.status === status).length : games.length;
      return { rows: [{ count }], rowCount: 1 };
    }

    if (/SELECT .* FROM moves WHERE game_id = \$1 ORDER BY id ASC/i.test(q)) {
      const gid = params[0];
      const rows = moves.filter(m => m.game_id === gid).sort((a,b)=>a.id-b.id).map(r => ({ player: r.player, position: r.position }));
      return { rows, rowCount: rows.length };
    }

    if (/SELECT id FROM moves WHERE game_id = \$1 ORDER BY id DESC LIMIT 1/i.test(q)) {
      const gid = params[0];
      const mm = moves.filter(m => m.game_id === gid).sort((a,b)=>b.id-a.id);
      return { rows: mm.length ? [{ id: mm[0].id }] : [], rowCount: mm.length ? 1 : 0 };
    }

    if (/SELECT \* FROM games WHERE player_o IS NULL AND status = 'in_progress' LIMIT 1/i.test(q)) {
      const found = games.find(g => (g.player_o === null || g.player_o === undefined) && g.status === 'in_progress');
      return { rows: found ? [found] : [], rowCount: found ? 1 : 0 };
    }

    if (/DELETE FROM games WHERE id = \$1 RETURNING id/i.test(q)) {
      const id = params[0];
      const idx = games.findIndex(g => g.id === id);
      if (idx >= 0) { games.splice(idx, 1); return { rows: [{ id }], rowCount: 1 }; }
      return { rows: [], rowCount: 0 };
    }

    // fallback
    console.warn('Unrecognized mock query:', q);
    return { rows: [], rowCount: 0 };
  }

  function connect() {
    return Promise.resolve({ query, release() {} });
  }

  return { query, connect };
}

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: any | undefined;
}

let pool: any;
if (process.env.DATABASE_URL) {
  pool = globalThis.__pgPool ?? new Pool({ connectionString: process.env.DATABASE_URL });
  if (!globalThis.__pgPool) globalThis.__pgPool = pool;
} else {
  console.warn('DATABASE_URL not set — using in-memory demo DB');
  pool = globalThis.__pgPool ?? createInMemoryPool();
  if (!globalThis.__pgPool) globalThis.__pgPool = pool;
}

export { pool };
