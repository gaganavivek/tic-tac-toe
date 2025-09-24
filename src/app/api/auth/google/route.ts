import { NextResponse } from 'next/server';

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID ?? '';
  const redirectUri = `${process.env.BASE_URL ?? 'http://localhost:3000'}/api/auth/callback`;
  const scope = encodeURIComponent('openid profile email');
  const state = 'state-' + Math.random().toString(36).slice(2);
  const url = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${state}&access_type=online&prompt=select_account`;

  const res = NextResponse.redirect(url);
  // store state in a short-lived cookie so we can verify it on callback
  res.cookies.set('oauth_state', state, { path: '/', maxAge: 300 });
  return res;
}
