import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(request: Request, context: any) {
  const p = context?.params;
  const params = p && typeof p.then === 'function' ? await p : p;
  const gameId = Number(params?.id);
  if (!gameId || Number.isNaN(gameId)) return NextResponse.json({ error: 'Invalid game id' }, { status: 400 });
  try {
    const client = await pool.connect();
    try {
      const movesRes = await client.query('SELECT id, player, position, created_at FROM moves WHERE game_id = $1 ORDER BY id ASC', [gameId]);
      return NextResponse.json(movesRes.rows);
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error('GET /api/games/:id/moves error', err);
    return NextResponse.json({ error: 'Failed to fetch moves' }, { status: 500 });
  }
}
