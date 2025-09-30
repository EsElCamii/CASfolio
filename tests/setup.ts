import { afterEach, beforeAll } from 'vitest';

beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://test-project.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'anon-key';
  process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'service-role-key';
  process.env.SUPABASE_HERO_BUCKET = process.env.SUPABASE_HERO_BUCKET ?? 'hero-test';
  process.env.SUPABASE_ACTIVITY_BUCKET = process.env.SUPABASE_ACTIVITY_BUCKET ?? 'activity-test';
  process.env.NEXT_PUBLIC_HERO_SIGNED_URL_TTL = process.env.NEXT_PUBLIC_HERO_SIGNED_URL_TTL ?? '3600';
  process.env.NEXT_PUBLIC_ACTIVITY_SIGNED_URL_TTL = process.env.NEXT_PUBLIC_ACTIVITY_SIGNED_URL_TTL ?? '3600';
  process.env.ACTIVITY_SIGNED_URL_TTL = process.env.ACTIVITY_SIGNED_URL_TTL ?? '3600';
  process.env.ACTIVITY_MAX_UPLOAD_BYTES = process.env.ACTIVITY_MAX_UPLOAD_BYTES ?? String(5 * 1024 * 1024);
  process.env.ENABLE_LEGACY_MIGRATION = process.env.ENABLE_LEGACY_MIGRATION ?? '1';
  process.env.LEGACY_MIGRATION_PREVIEW_LIMIT = process.env.LEGACY_MIGRATION_PREVIEW_LIMIT ?? '1';
  process.env.LEGACY_MIGRATION_UPLOAD_RETRY_LIMIT = process.env.LEGACY_MIGRATION_UPLOAD_RETRY_LIMIT ?? '3';
  process.env.LEGACY_MIGRATION_ASSET_CONCURRENCY = process.env.LEGACY_MIGRATION_ASSET_CONCURRENCY ?? '2';
  process.env.LEGACY_MIGRATION_DRY_RUN = process.env.LEGACY_MIGRATION_DRY_RUN ?? '0';
  process.env.ENABLE_USAGE_METRICS = process.env.ENABLE_USAGE_METRICS ?? '0';
  process.env.METRICS_SAMPLE_RATE = process.env.METRICS_SAMPLE_RATE ?? '1';
  process.env.METRICS_SOURCE = process.env.METRICS_SOURCE ?? 'vitest';
});

afterEach(() => {
  vi.restoreAllMocks();
});
