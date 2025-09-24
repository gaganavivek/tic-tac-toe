// File: /app/api/games/route.ts
// Next.js App Router API route: GET (list games) and POST (create game)

import { NextResponse } from 'next/server';
import { pool } from '../../../lib/db';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const limit = Number(url.searchParams.get('limit') || '50');
  const offset = Number(url.searchParams.get('offset') || '0');

  try {
    const params: any[] = [];
    let sql = 'SELECT id, player_x, player_o, status, next_turn, board, updated_at FROM games';
    if (status) { params.push(status); sql += ` WHERE status = $${params.length}`; }
    sql += ' ORDER BY updated_at DESC LIMIT $' + (params.length+1) + ' OFFSET $' + (params.length+2);
    params.push(limit, offset);

    const result = await pool.query(sql, params);
    const countRes = await pool.query('SELECT COUNT(*) FROM games' + (status ? ' WHERE status = $1' : ''), status ? [status] : []);
    const total = Number(countRes.rows[0].count || 0);

    return NextResponse.json({ meta:{ limit, offset, total }, data: result.rows });
  } catch (err: any) {
    console.error('GET /api/games error', err);
    return NextResponse.json({ error: 'DB query failed' }, { status:500 });
  }
}

export async function POST(request: Request) {
  try {
    let playerX = null, playerO = null, startingPlayer = 'X';

    // Only try to parse body if content exists
    if (request.headers.get('content-length') !== '0') {
      try {
        const body = await request.json();
        playerX = body.playerX ?? null;
        playerO = body.playerO ?? null;
        startingPlayer = body.startingPlayer === 'O' ? 'O' : 'X';

        // support new fields player_x_id / player_o_id which reference users
        if (body.player_x_id) {
          try {
            const ux = await pool.query('SELECT username FROM users WHERE id = $1', [Number(body.player_x_id)]);
            if (ux.rowCount) playerX = ux.rows[0].username;
          } catch (e) { /* ignore lookup errors */ }
        }
        if (body.player_o_id) {
          try {
            const uo = await pool.query('SELECT username FROM users WHERE id = $1', [Number(body.player_o_id)]);
            if (uo.rowCount) playerO = uo.rows[0].username;
          } catch (e) { /* ignore lookup errors */ }
        }
      } catch {
        // Ignore JSON parse errors and use defaults
      }
    }

    const result = await pool.query(
      `INSERT INTO games (player_x, player_o, board, next_turn, status) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [playerX, playerO, '_________', startingPlayer, 'in_progress']
    );

    return NextResponse.json(result.rows[0], { status:201 });
  } catch (err: any) {
    console.error('POST /api/games error', err);
    return NextResponse.json({ error: 'Create failed' }, { status:500 });
  }
}
