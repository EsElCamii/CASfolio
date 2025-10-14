import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { Session } from '@supabase/supabase-js';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { serverEnv } from './lib/env/server';

const CSRF_COOKIE_NAME = 'casfolio.csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;

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
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }
  try {
    return timingSafeEqual(expectedBuffer, providedBuffer);
  } catch {
    return false;
  }
}

function shouldCheckCsrf(request: NextRequest) {
  const method = request.method.toUpperCase();
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return false;
  }
  return true;
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
  const token = randomBytes(32).toString('base64url');
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
  const supabase = createSupabaseMiddlewareClient(request, response);
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const pathname = request.nextUrl.pathname;

  if (!session && (pathname.startsWith('/dashboard') || pathname.startsWith('/admin'))) {
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
