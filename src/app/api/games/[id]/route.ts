import { NextResponse } from 'next/server';
import { pool } from '../../../../lib/db';
import { reconstructBoardFromMoves, calculateWinner } from '../../../../utils/ttt';

export async function GET(request: Request, context: any) {
  const p = context?.params;
  const params = p && typeof p.then === 'function' ? await p : p;
  const gameId = Number(params?.id);
  if (!gameId || Number.isNaN(gameId)) return NextResponse.json({ error: 'Invalid game id' }, { status: 400 });

  try {
    const client = await pool.connect();
    try {
      const gameRes = await client.query('SELECT * FROM games WHERE id = $1', [gameId]);
      if (gameRes.rowCount === 0) return NextResponse.json({ error: 'Game not found' }, { status: 404 });

      const game = gameRes.rows[0];
      const movesRes = await client.query('SELECT id, player, position, created_at FROM moves WHERE game_id = $1 ORDER BY id ASC', [gameId]);

      // If board invalid, reconstruct
      if (!game.board || game.board.length !== 9) {
        game.board = await reconstructBoardFromMoves(client, gameId);
      }

      game.moves = movesRes.rows;
      return NextResponse.json(game);
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error('GET /api/games/:id error', err);
    return NextResponse.json({ error: 'Failed to fetch game' }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: any) {
  const p = context?.params;
  const params = p && typeof p.then === 'function' ? await p : p;
  const gameId = Number(params?.id);
  if (!gameId || Number.isNaN(gameId)) return NextResponse.json({ error: 'Invalid game id' }, { status: 400 });

  let body: any;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { playerX, playerO } = body || {};
  if (playerX === undefined && playerO === undefined) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });

  try {
    const client = await pool.connect();
    try {
      const gameRes = await client.query('SELECT * FROM games WHERE id = $1', [gameId]);
      if (gameRes.rowCount === 0) return NextResponse.json({ error: 'Game not found' }, { status: 404 });

      const updates: string[] = [];
      const paramsArr: any[] = [];
      let idx = 1;
      if (playerX !== undefined) { updates.push(`player_x = $${idx++}`); paramsArr.push(playerX); }
      if (playerO !== undefined) { updates.push(`player_o = $${idx++}`); paramsArr.push(playerO); }
      paramsArr.push(gameId);

      await client.query(`UPDATE games SET ${updates.join(',')}, updated_at = now() WHERE id = $${idx}`, paramsArr);

      const updatedRes = await client.query('SELECT * FROM games WHERE id = $1', [gameId]);
      const updated = updatedRes.rows[0];
      return NextResponse.json(updated);
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error('PATCH /api/games/:id error', err);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: any) {
  const p = context?.params;
  const params = p && typeof p.then === 'function' ? await p : p;
  const gameId = Number(params?.id);
  if (!gameId || Number.isNaN(gameId)) return NextResponse.json({ error: 'Invalid game id' }, { status: 400 });

  try {
    const client = await pool.connect();
    try {
      const res = await client.query('DELETE FROM games WHERE id = $1 RETURNING id', [gameId]);
      if (res.rowCount === 0) return NextResponse.json({ error: 'Game not found' }, { status: 404 });
      return NextResponse.json({ success: true });
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error('DELETE /api/games/:id error', err);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}
