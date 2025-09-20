import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // naive matchmaker: find a game with an open player_o
      const res = await client.query("SELECT * FROM games WHERE player_o IS NULL AND status = 'in_progress' LIMIT 1");
      if (res && res.rowCount && res.rowCount > 0) {
        const game = res.rows[0];
        await client.query('COMMIT');
        return NextResponse.json(game);
      }
      // create new game
      const insert = await client.query('INSERT INTO games (player_x, player_o, board, next_turn, status) VALUES ($1,$2,$3,$4,$5) RETURNING *', [null, null, '_________', 'X', 'in_progress']);
      await client.query('COMMIT');
      return NextResponse.json(insert.rows[0]);
    } finally { client.release(); }
  } catch (err: any) {
    console.error('POST /api/games/matchmake error', err);
    return NextResponse.json({ error: 'Matchmaking failed' }, { status: 500 });
  }
}
