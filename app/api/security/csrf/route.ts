import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { CSRF_COOKIE_NAME, CSRF_TOKEN_TTL_SECONDS } from '../../../../lib/security/csrf';

const isProduction = process.env.NODE_ENV === 'production';

function generateToken() {
  return randomBytes(32).toString('base64url');
}

export async function GET() {
  const cookieStore = cookies();
  let token = cookieStore.get(CSRF_COOKIE_NAME)?.value;

  if (!token) {
    token = generateToken();
  }

  const response = NextResponse.json({ csrfToken: token, token });

  response.cookies.set({
    name: CSRF_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: 'strict',
    secure: isProduction,
    path: '/',
    maxAge: CSRF_TOKEN_TTL_SECONDS,
  });

  return response;
}
