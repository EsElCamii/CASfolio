import { beforeEach, describe, expect, it } from 'vitest';

const baseEnv = { ...process.env };

describe('serverEnv configuration', () => {
  beforeEach(() => {
    vi.resetModules();
    for (const key of Object.keys(process.env)) {
      if (!(key in baseEnv)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, baseEnv);
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-project.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
    process.env.SUPABASE_HERO_BUCKET = 'hero-test';
    process.env.SUPABASE_ACTIVITY_BUCKET = 'activity-test';
    process.env.NEXT_PUBLIC_HERO_SIGNED_URL_TTL = '3600';
    process.env.ACTIVITY_SIGNED_URL_TTL = '3600';
    process.env.ACTIVITY_MAX_UPLOAD_BYTES = String(5 * 1024 * 1024);
    process.env.ENABLE_LEGACY_MIGRATION = '1';
    process.env.LEGACY_MIGRATION_PREVIEW_LIMIT = '2';
    process.env.LEGACY_MIGRATION_UPLOAD_RETRY_LIMIT = '4';
    process.env.LEGACY_MIGRATION_ASSET_CONCURRENCY = '5';
    process.env.LEGACY_MIGRATION_DRY_RUN = '1';
    process.env.ENABLE_USAGE_METRICS = '1';
    process.env.METRICS_SAMPLE_RATE = '10';
    process.env.METRICS_SOURCE = 'unit-test';
  });

  it('parses numeric bounds and feature flags', async () => {
    const { serverEnv } = await import('../../lib/env/server');
    expect(serverEnv.featureFlags.legacyMigration).toBe(true);
    expect(serverEnv.featureFlags.legacyMigrationDryRun).toBe(true);
    expect(serverEnv.legacyMigrationConfig.previewLimit).toBe(2);
    expect(serverEnv.legacyMigrationConfig.uploadRetryLimit).toBe(4);
    expect(serverEnv.legacyMigrationConfig.assetConcurrency).toBe(5);
    expect(serverEnv.metrics.enabled).toBe(true);
    expect(serverEnv.metrics.sampleRate).toBe(10);
    expect(serverEnv.metrics.source).toBe('unit-test');
    expect(serverEnv.supabaseServiceRoleKey).toBe('service-role');
  });

  it('throws on invalid boolean environment values', async () => {
    process.env.ENABLE_USAGE_METRICS = 'sometimes';
    await expect(import('../../lib/env/server')).rejects.toThrow('must be a boolean');
  });
});
