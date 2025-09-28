import { createBrowserClient } from '@supabase/ssr';

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

export function createSupabaseBrowserClient() {
  return createBrowserClient(SUPABASE_URL_TYPED, SUPABASE_ANON_KEY_TYPED);
}
