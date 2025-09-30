const missing = (key: string): never => {
  throw new Error(`Missing required server env var: ${key}`);
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

export const serverEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? missing('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? missing('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? null,
  heroBucket: process.env.SUPABASE_HERO_BUCKET ?? 'portfolio-hero',
  activityAssetBucket: process.env.SUPABASE_ACTIVITY_BUCKET ?? 'activity-assets',
  heroSignedUrlTTL: parseNumber(process.env.NEXT_PUBLIC_HERO_SIGNED_URL_TTL, 'NEXT_PUBLIC_HERO_SIGNED_URL_TTL', 3600),
  activitySignedUrlTTL: parseNumber(process.env.ACTIVITY_SIGNED_URL_TTL, 'ACTIVITY_SIGNED_URL_TTL', 3600),
  maxUploadBytes: parseNumber(process.env.ACTIVITY_MAX_UPLOAD_BYTES, 'ACTIVITY_MAX_UPLOAD_BYTES', 5 * 1024 * 1024),
  featureFlags: {
    legacyMigration: process.env.ENABLE_LEGACY_MIGRATION === '1' || process.env.ENABLE_LEGACY_MIGRATION === 'true',
  },
};

export type ServerEnv = typeof serverEnv;

export function requireServiceRoleKey() {
  if (!serverEnv.supabaseServiceRoleKey) {
    throw new Error('Missing required server env var: SUPABASE_SERVICE_ROLE_KEY');
  }
  return serverEnv.supabaseServiceRoleKey;
}
