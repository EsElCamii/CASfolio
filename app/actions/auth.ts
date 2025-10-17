'use server';

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { SignInWithPasswordCredentials, Session } from '@supabase/supabase-js';
import { randomBytes, timingSafeEqual } from 'crypto';
import { serverEnv } from '../../lib/env/server';

const CSRF_COOKIE_NAME = 'casfolio.csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_TOKEN_TTL_SECONDS = 60 * 60; // 1 hour

const isProduction = process.env.NODE_ENV === 'production';

function sanitizeString(value: unknown, { maxLength = 1024, lowercase = false } = {}) {
  if (typeof value !== 'string') {
    return '';
  }
  let sanitized = value.replace(/[\u0000-\u001F\u007F]/g, '').trim();
  if (lowercase) {
    sanitized = sanitized.toLowerCase();
  }
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength);
  }
  return sanitized;
}

function sanitizeEmail(value: unknown) {
  const email = sanitizeString(value, { maxLength: 320, lowercase: true });
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email) ? email : '';
}

function sanitizePassword(value: unknown) {
  return sanitizeString(value, { maxLength: 512 });
}

function sanitizeToken(value: unknown) {
  return sanitizeString(value, { maxLength: 128 });
}

function generateCsrfToken() {
  return randomBytes(32).toString('base64url');
}

function setCsrfCookie(value: string) {
  const cookieStore = cookies();
  cookieStore.set({
    name: CSRF_COOKIE_NAME,
    value,
    httpOnly: true,
    sameSite: 'strict',
    secure: isProduction,
    path: '/',
    maxAge: CSRF_TOKEN_TTL_SECONDS,
  });
}

function createSupabaseServerActionClient() {
  const cookieStore = cookies();

  return createServerClient(serverEnv.supabaseUrl, serverEnv.supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: any) {
        cookieStore.set({ name, value: '', ...options, maxAge: 0 });
      },
    },
  });
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
  } catch (error) {
    console.error('CSRF comparison failed', error);
    return false;
  }
}

function ensureValidCsrfToken(incomingToken: string) {
  const cookieToken = cookies().get(CSRF_COOKIE_NAME)?.value ?? '';

  if (!cookieToken || !incomingToken || !tokensMatch(cookieToken, incomingToken)) {
    throw new Error('Invalid CSRF token');
  }
}

function rotateCsrfToken() {
  setCsrfCookie(generateCsrfToken());
}

export type SignInActionResult =
  | { success: true; session: Session | null }
  | { success: false; error: string };

export async function signInWithPasswordAction(payload: {
  email: unknown;
  password: unknown;
  csrfToken: unknown;
}): Promise<SignInActionResult> {
  const email = sanitizeEmail(payload.email);
  const password = sanitizePassword(payload.password);
  const csrfToken = sanitizeToken(payload.csrfToken);

  if (!email || !password) {
    return { success: false, error: 'Email and password are required.' };
  }

  try {
    ensureValidCsrfToken(csrfToken);
  } catch (error) {
    console.error(error);
    return { success: false, error: 'Security validation failed.' };
  }

  const supabase = createSupabaseServerActionClient();

  const credentials: SignInWithPasswordCredentials = { email, password };

  const { data, error } = await supabase.auth.signInWithPassword(credentials);

  if (error) {
    return { success: false, error: error.message };
  }

  rotateCsrfToken();

  return { success: true, session: data.session ?? null };
}

export type SignOutActionResult = { success: true } | { success: false; error: string };

export async function signOutAction(payload: { csrfToken: unknown }): Promise<SignOutActionResult> {
  const csrfToken = sanitizeToken(payload.csrfToken);

  try {
    ensureValidCsrfToken(csrfToken);
  } catch (error) {
    console.error(error);
    return { success: false, error: 'Security validation failed.' };
  }

  const supabase = createSupabaseServerActionClient();

  const { error } = await supabase.auth.signOut();

  if (error) {
    return { success: false, error: error.message };
  }

  rotateCsrfToken();

  return { success: true };
}

export function ensureCsrfCookie() {
  const cookieStore = cookies();
  const existingToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;

  if (!existingToken) {
    rotateCsrfToken();
  }

  return cookieStore.get(CSRF_COOKIE_NAME)?.value ?? '';
}

export const csrfConfig = {
  cookieName: CSRF_COOKIE_NAME,
  headerName: CSRF_HEADER_NAME,
};
