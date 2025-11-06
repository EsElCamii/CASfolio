import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { Session } from '@supabase/supabase-js';
import { serverEnv } from './lib/env/server';
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from './lib/security/csrf';
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;
const SESSION_FETCH_TIMEOUT_MS = 3_000;
const PROTECTED_PATH_PREFIXES = ['/dashboard', '/admin'];

const loginAttempts = new Map<string, { count: number; expiresAt: number }>();

const isProduction = process.env.NODE_ENV === 'production';

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() ?? 'unknown';
  }
  return request.ip ?? 'unknown';
}

function isLoginAttempt(request: NextRequest) {
  if (request.method !== 'POST') {
    return false;
  }
  const pathname = request.nextUrl.pathname;
  return pathname === '/login' || pathname.startsWith('/api/auth');
}

function isRateLimited(key: string) {
  const now = Date.now();
  const entry = loginAttempts.get(key);

  if (!entry || entry.expiresAt <= now) {
    loginAttempts.set(key, { count: 1, expiresAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  if (entry.count >= RATE_LIMIT_MAX_ATTEMPTS) {
    return true;
  }

  entry.count += 1;
  loginAttempts.set(key, entry);
  return false;
}

function tokensMatch(expected: string, provided: string) {
  if (!expected || !provided) {
    return false;
  }
  const encoder = new TextEncoder();
  const expectedBytes = encoder.encode(expected);
  const providedBytes = encoder.encode(provided);
  if (expectedBytes.length !== providedBytes.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < expectedBytes.length; i += 1) {
    result |= expectedBytes[i] ^ providedBytes[i];
  }
  return result === 0;
}

function shouldCheckCsrf(request: NextRequest) {
  const method = request.method.toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return false;
  }
  return true;
}

function hasSupabaseAuthCookies(request: NextRequest) {
  return request.cookies
    .getAll()
    .some(({ name }) => name.startsWith('sb-') && name.endsWith('-auth-token'));
}

function requiresProtectedSession(pathname: string) {
  return PROTECTED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

async function getSessionWithTimeout(client: ReturnType<typeof createSupabaseMiddlewareClient>) {
  const sessionPromise = client.auth.getSession().catch(() => ({
    data: { session: null as Session | null },
    error: null,
  }));

  const timeoutPromise = new Promise<{ data: { session: Session | null }; error: null }>((resolve) => {
    setTimeout(
      () =>
        resolve({
          data: { session: null },
          error: null,
        }),
      SESSION_FETCH_TIMEOUT_MS
    );
  });

  return Promise.race([sessionPromise, timeoutPromise]);
}

function createSupabaseMiddlewareClient(request: NextRequest, response: NextResponse) {
  return createServerClient(serverEnv.supabaseUrl, serverEnv.supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: any) {
        response.cookies.set({ name, value: '', ...options, maxAge: 0 });
      },
    },
  });
}

function getUserRole(session: Session | null) {
  if (!session) {
    return null;
  }
  const { user } = session;
  const role = (user?.app_metadata as Record<string, unknown> | undefined)?.role
    ?? (user?.user_metadata as Record<string, unknown> | undefined)?.role;
  return typeof role === 'string' ? role : null;
}

function enforceRoleAccess(pathname: string, role: string | null, request: NextRequest) {
  if (pathname.startsWith('/admin')) {
    if (role !== 'admin') {
      const redirectUrl = new URL(role === 'student' ? '/dashboard' : '/login', request.url);
      return NextResponse.redirect(redirectUrl);
    }
  }

  if (pathname.startsWith('/dashboard')) {
    if (role !== 'student') {
      const redirectUrl = new URL(role === 'admin' ? '/admin' : '/login', request.url);
      return NextResponse.redirect(redirectUrl);
    }
  }

  return null;
}

function rotateCsrfCookie(response: NextResponse) {
  const tokenBytes = globalThis.crypto.getRandomValues(new Uint8Array(32));
  let binary = '';
  for (let i = 0; i < tokenBytes.length; i += 1) {
    binary += String.fromCharCode(tokenBytes[i]);
  }
  const token = globalThis
    .btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  response.cookies.set({
    name: CSRF_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: 'strict',
    secure: isProduction,
    path: '/',
    maxAge: 60 * 60,
  });
}

export async function middleware(request: NextRequest) {
  if (isLoginAttempt(request)) {
    const key = getClientIp(request);
    if (isRateLimited(key)) {
      return NextResponse.json(
        { error: 'Too many login attempts. Please try again later.' },
        { status: 429 }
      );
    }
  }

  if (shouldCheckCsrf(request)) {
    const headerToken = request.headers.get(CSRF_HEADER_NAME) ?? '';
    const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value ?? '';
    if (!tokensMatch(cookieToken, headerToken)) {
      return NextResponse.json({ error: 'Invalid CSRF token' }, { status: 403 });
    }
  }

  const response = NextResponse.next();
  const pathname = request.nextUrl.pathname;
  const shouldFetchSession = hasSupabaseAuthCookies(request) || requiresProtectedSession(pathname);

  let session: Session | null = null;
  if (shouldFetchSession) {
    const supabase = createSupabaseMiddlewareClient(request, response);
    const { data } = await getSessionWithTimeout(supabase);
    session = data.session;
  }

  if (!session && requiresProtectedSession(pathname)) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  const roleEnforcement = enforceRoleAccess(pathname, getUserRole(session), request);
  if (roleEnforcement) {
    return roleEnforcement;
  }

  if (!request.cookies.get(CSRF_COOKIE_NAME)) {
    rotateCsrfCookie(response);
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
