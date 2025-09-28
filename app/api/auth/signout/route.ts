import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL) {
  throw new Error('Missing env var: NEXT_PUBLIC_SUPABASE_URL');
}

if (!SUPABASE_ANON_KEY) {
  throw new Error('Missing env var: NEXT_PUBLIC_SUPABASE_ANON_KEY');
}

const SUPABASE_URL_TYPED: string = SUPABASE_URL;
const SUPABASE_ANON_KEY_TYPED: string = SUPABASE_ANON_KEY;

export async function POST() {
  const cookieStore = cookies();
  const response = NextResponse.json({ signedOut: true });

  const supabase = createServerClient(SUPABASE_URL_TYPED, SUPABASE_ANON_KEY_TYPED, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: any) {
        response.cookies.set({ name, value: '', ...options, maxAge: 0 });
      },
    },
  });

  await supabase.auth.signOut();

  return response;
}
