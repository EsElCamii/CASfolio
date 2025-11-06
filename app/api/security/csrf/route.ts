import { NextResponse } from 'next/server';
import { ensureCsrfCookie } from '../../../../../lib/security/csrfServer';

export const runtime = 'nodejs';

export async function GET() {
  const csrfToken = ensureCsrfCookie();
  const response = NextResponse.json({ csrfToken });
  response.headers.set('cache-control', 'no-store');
  response.headers.set('vary', 'cookie');
  return response;
}
