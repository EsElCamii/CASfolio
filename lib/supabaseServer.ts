import { cookies } from 'next/headers';
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

export function createSupabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient(SUPABASE_URL_TYPED, SUPABASE_ANON_KEY_TYPED, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(_name: string, _value: string, _options: any) {
        // No-op on the server component layer; cookie mutations happen via client helpers
      },
      remove(_name: string, _options: any) {
        // No-op on the server component layer; cookie mutations happen via client helpers
      },
    },
  });
}
