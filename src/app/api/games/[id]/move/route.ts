import { NextResponse } from 'next/server';
import { pool } from '../../../../../lib/db';
import { makeMove, reconstructBoardFromMoves, calculateWinner } from '../../../../../utils/ttt';

export async function PUT(request: Request, context: any) {
  const p = context?.params;
  const params = p && typeof p.then === 'function' ? await p : p;
  const gameId = Number(params?.id);
  if (!gameId || Number.isNaN(gameId)) return NextResponse.json({ error: 'Invalid game id' }, { status: 400 });

  let body: any;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { player, position } = body || {};
  if (!player || (player !== 'X' && player !== 'O')) return NextResponse.json({ error: 'Invalid player' }, { status: 400 });
  if (typeof position !== 'number') return NextResponse.json({ error: 'Invalid position' }, { status: 400 });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // lock the game row
    const gameRes = await client.query('SELECT * FROM games WHERE id = $1 FOR UPDATE', [gameId]);
    if (gameRes.rowCount === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }

    const game = gameRes.rows[0];
    if (game.status !== 'in_progress') {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Game already finished' }, { status: 409 });
    }

    // ensure it's the player's turn
    if (game.next_turn !== player) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Not your turn' }, { status: 409 });
    }

    // ensure position valid and empty
    const pos = Number(position);
    if (!Number.isInteger(pos) || pos < 0 || pos > 8) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Invalid position' }, { status: 400 });
    }

    let board = game.board;
    // If board invalid length, reconstruct from moves
    if (!board || board.length !== 9) {
      board = await reconstructBoardFromMoves(client, gameId);
    }

    if (board[pos] !== '_' && board[pos] !== '.') {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Cell already taken' }, { status: 409 });
    }

    // compute new board
    let moveResult;
    try {
      moveResult = makeMove(board, pos, player);
    } catch (err: any) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: err.message || 'Invalid move' }, { status: err.status || 400 });
    }

    // insert move
    await client.query(
      'INSERT INTO moves (game_id, player, position) VALUES ($1,$2,$3)',
      [gameId, player, pos]
    );

    // update games row
    const winner = moveResult.winner;
    const status = winner ? 'finished' : 'in_progress';
    const nextTurn = moveResult.nextTurn;

    await client.query(
      'UPDATE games SET board = $1, next_turn = $2, status = $3, winner = $4, updated_at = now() WHERE id = $5',
      [moveResult.board, nextTurn, status, winner, gameId]
    );

    // If game is finished, record the result
    if (status === 'finished') {
      console.log('Game finished, recording result:', { gameId, winner, status, moveResult });
      
      // COUNT(*) can return different shapes depending on the DB client or mock layer.
      // Be defensive: try to parse the returned count, otherwise fall back to fetching move rows.
      const countRes = (await client.query('SELECT COUNT(*) FROM moves WHERE game_id = $1', [gameId]));
      let movesCount: number | undefined = undefined;
      if (countRes && Array.isArray(countRes.rows) && countRes.rows[0]) {
        const raw = countRes.rows[0].count ?? countRes.rows[0].cnt ?? countRes.rows[0].count_total;
        if (typeof raw === 'number') movesCount = raw;
        else if (typeof raw === 'string' && raw.trim() !== '') movesCount = Number(raw);
      }
      if (typeof movesCount !== 'number' || Number.isNaN(movesCount)) {
        // fallback: query move rows and count them
        const movesResCheck = await client.query('SELECT id FROM moves WHERE game_id = $1', [gameId]);
        movesCount = Array.isArray(movesResCheck.rows) ? movesResCheck.rows.length : 0;
      }
      console.log('Moves count:', movesCount);
      
      try {
        // Check if it's a draw
        const isDraw = winner === null && !moveResult.board.includes('_') && !moveResult.board.includes('.');
        
        await client.query(
          `INSERT INTO game_results (game_id, winner, player_x, player_o, moves_count, is_draw) 
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [gameId, isDraw ? null : winner, game.player_x, game.player_o, movesCount, isDraw]
        );
        console.log('Game result recorded successfully', { isDraw, winner, movesCount });
      } catch (err) {
        console.error('Failed to record game result:', err);
      }
    }

    // fetch updated game and moves
    const updatedGameRes = await client.query('SELECT * FROM games WHERE id = $1', [gameId]);
    const movesRes = await client.query('SELECT id, player, position, created_at FROM moves WHERE game_id = $1 ORDER BY id ASC', [gameId]);

    await client.query('COMMIT');

    const updated = updatedGameRes.rows[0];
    updated.moves = movesRes.rows;
    return NextResponse.json(updated);
  } catch (err: any) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('PUT /api/games/:id/move error', err);
    return NextResponse.json({ error: 'Move failed' }, { status: 500 });
  } finally {
    client.release();
  }
}
