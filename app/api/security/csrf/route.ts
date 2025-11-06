import { NextResponse } from 'next/server';
import { ensureCsrfCookie } from '../../../../lib/security/csrfServer';
import { CSRF_COOKIE_NAME, CSRF_TOKEN_TTL_SECONDS } from '../../../../lib/security/csrf';

export const runtime = 'nodejs';

export async function GET() {
  const csrfToken = ensureCsrfCookie();
  const response = NextResponse.json({ csrfToken });
  response.cookies.set({
    name: CSRF_COOKIE_NAME,
    value: csrfToken,
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: CSRF_TOKEN_TTL_SECONDS,
  });
  response.headers.set('cache-control', 'no-store');
  response.headers.set('vary', 'cookie');
  return response;
}
