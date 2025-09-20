import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { reconstructBoardFromMoves } from '@/utils/ttt';

export async function POST(request: Request, context: any) {
  const p = context?.params;
  const params = p && typeof p.then === 'function' ? await p : p;
  const gameId = Number(params?.id);
  if (!gameId || Number.isNaN(gameId)) return NextResponse.json({ error: 'Invalid game id' }, { status: 400 });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const gameRes = await client.query('SELECT * FROM games WHERE id = $1 FOR UPDATE', [gameId]);
    if (gameRes.rowCount === 0) { await client.query('ROLLBACK'); return NextResponse.json({ error: 'Game not found' }, { status: 404 }); }
    const movesRes = await client.query('SELECT id FROM moves WHERE game_id = $1 ORDER BY id DESC LIMIT 1', [gameId]);
    if (movesRes.rowCount === 0) { await client.query('ROLLBACK'); return NextResponse.json({ error: 'No moves to undo' }, { status: 400 }); }

    const lastId = movesRes.rows[0].id;
    await client.query('DELETE FROM moves WHERE id = $1', [lastId]);
    const newBoard = await reconstructBoardFromMoves(client, gameId);
    const winner = null; // recompute
    const nextTurn = null;
    await client.query('UPDATE games SET board = $1, winner = $2, next_turn = $3, status = $4, updated_at = now() WHERE id = $5', [newBoard, winner, nextTurn, 'in_progress', gameId]);
    const updatedRes = await client.query('SELECT * FROM games WHERE id = $1', [gameId]);
    await client.query('COMMIT');
    return NextResponse.json(updatedRes.rows[0]);
  } catch (err: any) {
    try { await client.query('ROLLBACK'); } catch {};
    console.error('POST /api/games/:id/undo error', err);
    return NextResponse.json({ error: 'Undo failed' }, { status: 500 });
  } finally { client.release(); }
}
