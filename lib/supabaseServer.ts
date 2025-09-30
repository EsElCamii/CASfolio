import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { serverEnv } from './env/server';

export function createSupabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient(serverEnv.supabaseUrl, serverEnv.supabaseAnonKey, {
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
