import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function POST(request: Request, context: any) {
  const p = context?.params;
  const params = p && typeof p.then === 'function' ? await p : p;
  const gameId = Number(params?.id);
  if (!gameId || Number.isNaN(gameId)) return NextResponse.json({ error: 'Invalid game id' }, { status: 400 });
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM moves WHERE game_id = $1', [gameId]);
      await client.query("UPDATE games SET board = '_________', next_turn = 'X', status = 'in_progress', winner = NULL, updated_at = now() WHERE id = $1", [gameId]);
      const res = await client.query('SELECT * FROM games WHERE id = $1', [gameId]);
      await client.query('COMMIT');
      return NextResponse.json(res.rows[0]);
    } finally { client.release(); }
  } catch (err: any) {
    console.error('POST /api/games/:id/reset error', err);
    return NextResponse.json({ error: 'Reset failed' }, { status: 500 });
  }
}
