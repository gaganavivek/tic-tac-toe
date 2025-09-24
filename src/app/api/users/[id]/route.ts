import { NextResponse } from 'next/server';
import { pool } from '../../../../lib/db';

export async function GET(request: Request, context: any) {
  const p = context?.params;
  const params = p && typeof p.then === 'function' ? await p : p;
  const id = Number(params?.id);
  if (!id || Number.isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  try {
    const res = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
    if (res.rowCount === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(res.rows[0]);
  } catch (err: any) {
    console.error('GET /api/users/:id error', err);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: any) {
  const p = context?.params;
  const params = p && typeof p.then === 'function' ? await p : p;
  const id = Number(params?.id);
  if (!id || Number.isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  try {
    const body = await request.json();
    const display_name = body.displayName ?? body.display_name ?? null;
    const res = await pool.query('UPDATE users SET display_name = $1 WHERE id = $2 RETURNING *', [display_name, id]);
    if (res.rowCount === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(res.rows[0]);
  } catch (err: any) {
    console.error('PATCH /api/users/:id error', err);
    return NextResponse.json({ error: 'DB error' }, { status: 500 });
  }
}
