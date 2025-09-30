import { createClient } from '@supabase/supabase-js';
import { serverEnv, requireServiceRoleKey } from './env/server';

let singleton: ReturnType<typeof createClient> | null = null;

export function getSupabaseAdminClient() {
  if (singleton) return singleton;
  const serviceRoleKey = requireServiceRoleKey();
  singleton = createClient(serverEnv.supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
    },
  });
  return singleton;
}
