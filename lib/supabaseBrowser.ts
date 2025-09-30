import { createBrowserClient } from '@supabase/ssr';
import { publicEnv } from './env/public';

export function createSupabaseBrowserClient() {
  return createBrowserClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey);
}
