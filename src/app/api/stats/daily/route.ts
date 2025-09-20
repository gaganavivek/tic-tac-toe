import { NextResponse } from 'next/server';
import { pool } from '../../../../lib/db';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  try {
    // Build date range filter
    const dateFilter = [];
    const params = [];
    if (from) {
      params.push(from);
      dateFilter.push(`date >= $${params.length}`);
    }
    if (to) {
      params.push(to);
      dateFilter.push(`date <= $${params.length}`);
    }
    const whereClause = dateFilter.length ? `WHERE ${dateFilter.join(' AND ')}` : '';

    // First, check if we have any game results at all
    const checkQuery = 'SELECT COUNT(*) FROM game_results';
    const countResult = await pool.query(checkQuery);
    console.log('Total game results:', countResult.rows[0].count);

    const query = `
      SELECT 
        date,
        COUNT(*) as total_games,
        COUNT(CASE WHEN winner = 'X' THEN 1 END) as x_wins,
        COUNT(CASE WHEN winner = 'O' THEN 1 END) as o_wins,
        COUNT(CASE WHEN is_draw = true THEN 1 END) as draws,
        AVG(moves_count)::numeric(10,2) as avg_moves
      FROM game_results
      ${whereClause}
      GROUP BY date
      ORDER BY date DESC
    `;

    console.log('Executing stats query:', query);
    const result = await pool.query(query, params);
    console.log('Stats query result:', result.rows);
    
    return NextResponse.json({ data: result.rows });
  } catch (err: any) {
    console.error('GET /api/stats/daily error:', err);
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}