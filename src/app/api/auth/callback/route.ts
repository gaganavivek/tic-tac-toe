import { NextResponse } from 'next/server';
import { pool } from '../../../../lib/db';

/**
 * Exchange authorization code for tokens.
 */
async function exchangeCode(code: string, redirectUri: string) {
  const params = new URLSearchParams();
  params.append('code', code);
  params.append('client_id', process.env.GOOGLE_CLIENT_ID ?? '');
  params.append('client_secret', process.env.GOOGLE_CLIENT_SECRET ?? '');
  params.append('redirect_uri', redirectUri);
  params.append('grant_type', 'authorization_code');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  });
  return res.json();
}

/**
 * Get Google profile using access_token
 */
async function getGoogleProfile(access_token: string) {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${access_token}` }
  });
  return res.json();
}

/**
 * Callback handler
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    if (!code) {
      return NextResponse.redirect(process.env.BASE_URL ?? '/?auth_error=missing_code');
    }

    // verify state using cookie header (simple state check)
    const state = url.searchParams.get('state');
    const cookieHeader = (request.headers as any).get('cookie') as string | null;
    let expected: string | null = null;
    if (cookieHeader) {
      const match = cookieHeader.split(';').map(s => s.trim()).find(s => s.startsWith('oauth_state='));
      if (match) expected = decodeURIComponent(match.split('=')[1]);
    }
    if (!state || !expected || state !== expected) {
      return NextResponse.redirect(process.env.BASE_URL ?? '/?auth_error=invalid_state');
    }

    const redirectUri = `${process.env.BASE_URL ?? 'http://localhost:3000'}/api/auth/callback`;
    const tokenResp: any = await exchangeCode(code, redirectUri);
    if (!tokenResp?.access_token) {
      return NextResponse.json({ error: 'Token exchange failed' }, { status: 400 });
    }

    const profile: any = await getGoogleProfile(tokenResp.access_token);
    const email = profile.email;
    const name = profile.name ?? profile.email?.split('@')[0];
    const providerId = profile.id; // google user id

    if (!email) {
      return NextResponse.json({ error: 'Failed to fetch profile email' }, { status: 400 });
    }

    // Try to find by provider_id first (if you stored it), then by email
    let user = null;
    if (providerId) {
      const byProvider = await pool.query('SELECT * FROM users WHERE provider = $1 AND provider_id = $2', ['google', providerId]);
      if (byProvider.rowCount > 0) user = byProvider.rows[0];
    }
    if (!user) {
      const byEmail = await pool.query('SELECT * FROM users WHERE email = $1 OR username = $1', [email]);
      if (byEmail.rowCount > 0) user = byEmail.rows[0];
    }

    // If user exists -> sign in
    if (user) {
      const res = NextResponse.redirect(process.env.BASE_URL ?? '/');
      // httpOnly cookie for security
      res.cookies.set('currentUserId', String(user.id), { httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 30 });
      // clear oauth_state cookie
      res.cookies.set('oauth_state', '', { path: '/', maxAge: 0 });
      return res;
    }

    // No user found -> set a short-lived readable cookie with oauth info so frontend can prefill/register
    const pending = {
      provider: 'google',
      providerId,
      email,
      name
    };
    const encoded = Buffer.from(JSON.stringify(pending)).toString('base64');

    const registerUrl = new URL('/register', request.url);
    if (email) registerUrl.searchParams.set('email', email);
    if (name) registerUrl.searchParams.set('name', name);

    const res = NextResponse.redirect(registerUrl);
    // readable cookie (not httpOnly) so client-side register page can read and include provider info
    res.cookies.set('oauth_pending', encoded, { path: '/', maxAge: 60 * 5 }); // 5 minutes
    // clear oauth_state cookie
    res.cookies.set('oauth_state', '', { path: '/', maxAge: 0 });
    return res;
  } catch (err: any) {
    console.error('OAuth callback error', err);
    return NextResponse.redirect(process.env.BASE_URL ?? '/?auth_error=server_error');
  }
}