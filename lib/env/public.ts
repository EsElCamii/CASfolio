const missing = (key: string): never => {
  throw new Error(`Missing required public env var: ${key}`);
};

const parseNumber = (value: string | undefined, key: string, defaultValue?: number): number => {
  if (!value) {
    if (typeof defaultValue === 'number') return defaultValue;
    missing(key);
  }
  const parsed = Number.parseInt(value as string, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Environment value ${key} must be a positive integer`);
  }
  return parsed;
};

export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? missing('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? missing('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  heroSignedUrlTTL: parseNumber(process.env.NEXT_PUBLIC_HERO_SIGNED_URL_TTL, 'NEXT_PUBLIC_HERO_SIGNED_URL_TTL', 3600),
};

export type PublicEnv = typeof publicEnv;
