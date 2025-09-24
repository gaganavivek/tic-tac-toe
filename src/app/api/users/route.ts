// src/app/api/users/route.ts
import { NextResponse } from 'next/server';
import { pool } from '../../../lib/db';

export async function GET() {
  try {
    const res = await pool.query('SELECT * FROM users ORDER BY id ASC');
    return NextResponse.json({ data: res.rows });
  } catch (err: any) {
    console.error('GET /api/users error', err);
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
  }
}

/**
 * POST /api/users
 * Body may include:
 *  - username (optional if email provided)
 *  - displayName or display_name
 *  - email (optional)
 *  - provider (e.g. 'google') optional
 *  - providerId (provider-specific id) optional
 *
 * Behavior:
 *  - If provider+providerId or email already exists -> treat as sign-in: return user and set cookie.
 *  - Else create user and set cookie.
 *  - If username not provided, fallback to email as username. If that username collides -> return 409.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const usernameRaw = body.username ?? body.userName ?? null;
    const email = body.email ?? null;
    const display_name = body.displayName ?? body.display_name ?? null;
    const provider = body.provider ?? null;
    const providerId = body.providerId ?? body.provider_id ?? null;

    // Basic input normalization
    const username = usernameRaw ? String(usernameRaw).trim() : (email ? String(email).trim() : null);

    // If provider+providerId present, try to find by that first (OAuth flow)
    if (provider && providerId) {
      const q = await pool.query('SELECT * FROM users WHERE provider = $1 AND provider_id = $2', [provider, providerId]);
      if (q.rowCount > 0) {
        const u = q.rows[0];
        // Sign in: return user and set cookie
        const res = NextResponse.json(u);
        res.cookies.set('currentUserId', String(u.id), { httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 30 });
        // clear oauth_pending if present
        res.cookies.set('oauth_pending', '', { path: '/', maxAge: 0 });
        return res;
      }
    }

    // Next, if email present, try to find by email (user may have registered previously)
    if (email) {
      const q = await pool.query('SELECT * FROM users WHERE email = $1 OR username = $1', [email]);
      if (q.rowCount > 0) {
        const u = q.rows[0];
        const res = NextResponse.json(u);
        res.cookies.set('currentUserId', String(u.id), { httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 30 });
        res.cookies.set('oauth_pending', '', { path: '/', maxAge: 0 });
        return res;
      }
    }

    // Username required if no email fallback
    if (!username) {
      return NextResponse.json({ error: 'Username or email required' }, { status: 400 });
    }

    // Ensure username is unique
    const existing = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (existing.rowCount > 0) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
    }

    // Insert the new user (include provider info if present)
    const insertRes = await pool.query(
      `INSERT INTO users (username, display_name, email, provider, provider_id)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [username, display_name, email, provider, providerId]
    );

    const created = insertRes.rows[0];

    const res = NextResponse.json(created, { status: 201 });
    // Set a secure httpOnly cookie to mark user signed-in
    res.cookies.set('currentUserId', String(created.id), { httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 30 });
    // clear oauth_pending cookie (if present)
    res.cookies.set('oauth_pending', '', { path: '/', maxAge: 0 });

    return res;
  } catch (err: any) {
    console.error('POST /api/users error', err);
    return NextResponse.json({ error: 'Create user failed' }, { status: 500 });
  }
}