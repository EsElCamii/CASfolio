import { randomBytes } from 'crypto';
import { cookies } from 'next/headers';
import { CSRF_COOKIE_NAME, CSRF_TOKEN_TTL_SECONDS } from './csrf';

const isProduction = process.env.NODE_ENV === 'production';

export function generateCsrfToken(): string {
  return randomBytes(32).toString('base64url');
}

export function setCsrfCookie(value: string): void {
  cookies().set({
    name: CSRF_COOKIE_NAME,
    value,
    httpOnly: true,
    sameSite: 'strict',
    secure: isProduction,
    path: '/',
    maxAge: CSRF_TOKEN_TTL_SECONDS,
  });
}

export function rotateCsrfCookie(): void {
  setCsrfCookie(generateCsrfToken());
}

export function ensureCsrfCookie(): string {
  const store = cookies();
  const existing = store.get(CSRF_COOKIE_NAME)?.value;
  if (existing) {
    return existing;
  }

  const token = generateCsrfToken();
  setCsrfCookie(token);
  return token;
}

