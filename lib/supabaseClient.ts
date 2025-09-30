import { createClient } from '@supabase/supabase-js';
import { publicEnv } from './env/public';

export const supabaseClient = createClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey);
