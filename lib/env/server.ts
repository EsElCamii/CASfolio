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

const parseNumberWithinBounds = (
  value: string | undefined,
  key: string,
  defaultValue: number,
  { min = 1, max = Number.MAX_SAFE_INTEGER }: { min?: number; max?: number }
): number => {
  const parsed = parseNumber(value, key, defaultValue);
  if (parsed < min || parsed > max) {
    throw new Error(`Environment value ${key} must be between ${min} and ${max}`);
  }
  return parsed;
};

const parseBoolean = (value: string | undefined, key: string, defaultValue = false): boolean => {
  if (value === undefined) {
    return defaultValue;
  }
  const normalized = value.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  throw new Error(`Environment value ${key} must be a boolean`);
};

const legacyMigrationEnabled = parseBoolean(process.env.ENABLE_LEGACY_MIGRATION, 'ENABLE_LEGACY_MIGRATION', false);
const legacyMigrationDryRun = parseBoolean(process.env.LEGACY_MIGRATION_DRY_RUN, 'LEGACY_MIGRATION_DRY_RUN', false);

const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? null;

if (legacyMigrationEnabled && !supabaseServiceRoleKey) {
  missing('SUPABASE_SERVICE_ROLE_KEY');
}

const metricsEnabled = parseBoolean(process.env.ENABLE_USAGE_METRICS, 'ENABLE_USAGE_METRICS', false);
const metricsSampleRate = parseNumberWithinBounds(
  process.env.METRICS_SAMPLE_RATE,
  'METRICS_SAMPLE_RATE',
  1,
  { min: 1, max: 100 }
);

export const serverEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? missing('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? missing('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  supabaseServiceRoleKey,
  heroBucket: process.env.SUPABASE_HERO_BUCKET ?? 'portfolio-hero',
  activityAssetBucket: process.env.SUPABASE_ACTIVITY_BUCKET ?? 'activity-assets',
  heroSignedUrlTTL: parseNumber(process.env.NEXT_PUBLIC_HERO_SIGNED_URL_TTL, 'NEXT_PUBLIC_HERO_SIGNED_URL_TTL', 3600),
  activitySignedUrlTTL: parseNumber(process.env.ACTIVITY_SIGNED_URL_TTL, 'ACTIVITY_SIGNED_URL_TTL', 3600),
  maxUploadBytes: parseNumber(
    process.env.ACTIVITY_MAX_UPLOAD_BYTES,
    'ACTIVITY_MAX_UPLOAD_BYTES',
    5 * 1024 * 1024
  ),
  legacyMigrationConfig: {
    previewLimit: parseNumberWithinBounds(
      process.env.LEGACY_MIGRATION_PREVIEW_LIMIT,
      'LEGACY_MIGRATION_PREVIEW_LIMIT',
      1,
      { min: 1, max: 25 }
    ),
    uploadRetryLimit: parseNumberWithinBounds(
      process.env.LEGACY_MIGRATION_UPLOAD_RETRY_LIMIT,
      'LEGACY_MIGRATION_UPLOAD_RETRY_LIMIT',
      3,
      { min: 1, max: 10 }
    ),
    assetConcurrency: parseNumberWithinBounds(
      process.env.LEGACY_MIGRATION_ASSET_CONCURRENCY,
      'LEGACY_MIGRATION_ASSET_CONCURRENCY',
      3,
      { min: 1, max: 10 }
    ),
  },
  featureFlags: {
    legacyMigration: legacyMigrationEnabled,
    legacyMigrationDryRun,
  },
  metrics: {
    enabled: metricsEnabled,
    sampleRate: metricsSampleRate,
    source: process.env.METRICS_SOURCE ?? 'casfolio-web',
    endpoint: process.env.METRICS_WEBHOOK_URL ?? null,
  },
};

export type ServerEnv = typeof serverEnv;

export function requireServiceRoleKey() {
  if (!serverEnv.supabaseServiceRoleKey) {
    throw new Error('Missing required server env var: SUPABASE_SERVICE_ROLE_KEY');
  }
  return serverEnv.supabaseServiceRoleKey;
}
