import { createClient } from '@supabase/supabase-js';
import { serverEnv, requireServiceRoleKey } from './env/server';

let singleton: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdminClient() {
  if (singleton) return singleton;
  // Admin client needs the service role key; requireServiceRoleKey throws if it's missing.
  const serviceRoleKey = requireServiceRoleKey();
  singleton = createClient(serverEnv.supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  });
  return singleton;
}
