import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface MigrationLogState {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: string | null;
  completed_at: string | null;
  updated_at: string | null;
  error_message: string | null;
}

interface AdminStubOptions {
  userId?: string;
  migrationLog?: MigrationLogState | null;
  legacyActivities?: any[];
  legacyCustomization?: any | null;
  currentCasSettings?: any;
}

function createAdminStub(options: AdminStubOptions = {}) {
  const userId = options.userId ?? 'user-123';
  const state = {
    migrationLog: options.migrationLog ? { ...options.migrationLog } : null,
    insertedActivities: [] as string[],
    insertedAssets: [] as string[],
    purgedLegacyActivityIds: [] as string[],
    purgedLegacyAssetIds: [] as string[],
    casSettings: options.currentCasSettings ?? null,
    casSettingsHistory: [] as any[],
  };

  const legacyActivities = options.legacyActivities ?? [];
  const legacyCustomization = options.legacyCustomization ?? null;

  const storageBucketFactory = () => ({
    upload: vi.fn().mockResolvedValue({ data: null, error: null }),
    remove: vi.fn().mockResolvedValue({ data: null, error: null }),
    createSignedUrl: vi.fn().mockResolvedValue({ data: { signedUrl: 'https://example.com/file' }, error: null }),
    createSignedUrls: vi.fn().mockResolvedValue({ data: [], error: null }),
  });

  const storageBuckets = new Map<string, ReturnType<typeof storageBucketFactory>>();

  const admin = {
    storage: {
      getBucket: vi.fn().mockResolvedValue({ data: { id: 'bucket' }, error: null }),
      from: vi.fn((bucket: string) => {
        if (!storageBuckets.has(bucket)) {
          storageBuckets.set(bucket, storageBucketFactory());
        }
        return storageBuckets.get(bucket)!;
      }),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    from: vi.fn((table: string) => {
      switch (table) {
        case 'user_migrations':
          return {
            select: () => ({
              limit: () => Promise.resolve({ data: null, error: null }),
              eq: () => ({
                eq: () => ({
                  maybeSingle: () => Promise.resolve({ data: state.migrationLog, error: null }),
                }),
              }),
            }),
            upsert: (payload: any) => {
              state.migrationLog = {
                id: state.migrationLog?.id ?? 'log-1',
                status: payload.status,
                started_at: payload.started_at ?? null,
                completed_at: payload.completed_at ?? null,
                updated_at: payload.updated_at,
                error_message: payload.error_message ?? null,
              };
              return {
                select: () => ({
                  single: () => Promise.resolve({ data: state.migrationLog, error: null }),
                }),
              };
            },
          };
        case 'users':
          return {
            select: () => ({
              limit: () => Promise.resolve({ data: null, error: null }),
              eq: () => ({
                maybeSingle: () =>
                  Promise.resolve({ data: { id: userId, cas_settings: state.casSettings }, error: null }),
                single: () =>
                  Promise.resolve({ data: { cas_settings: state.casSettings }, error: null }),
              }),
            }),
            update: (payload: any) => ({
              eq: () => {
                state.casSettingsHistory.push(payload.cas_settings ?? null);
                state.casSettings = payload.cas_settings ?? null;
                return Promise.resolve({ data: null, error: null });
              },
            }),
          };
        case 'casfolio_activities':
          return {
            select: () => ({
              limit: () => Promise.resolve({ data: null, error: null }),
              eq: () => ({
                order: () => Promise.resolve({ data: legacyActivities, error: null }),
              }),
            }),
            delete: () => ({
              in: (_column: string, ids: string[]) => {
                state.purgedLegacyActivityIds.push(...ids);
                return Promise.resolve({ data: null, error: null });
              },
            }),
          };
        case 'casfolio_activity_assets':
          return {
            select: () => ({
              limit: () => Promise.resolve({ data: null, error: null }),
            }),
            delete: () => ({
              in: (_column: string, ids: string[]) => {
                state.purgedLegacyAssetIds.push(...ids);
                return Promise.resolve({ data: null, error: null });
              },
            }),
          };
        case 'casfolio_customizations':
          return {
            select: () => ({
              limit: () => Promise.resolve({ data: null, error: null }),
              eq: () => ({
                maybeSingle: () => Promise.resolve({ data: legacyCustomization, error: null }),
              }),
            }),
          };
        case 'activities':
          return {
            select: () => ({
              limit: () => Promise.resolve({ data: null, error: null }),
            }),
            insert: (payload: any) => {
              const insertedId = `activity-${state.insertedActivities.length + 1}`;
              state.insertedActivities.push(insertedId);
              return {
                select: () => ({
                  single: () => Promise.resolve({ data: { id: insertedId }, error: null }),
                }),
              };
            },
            delete: () => ({
              in: (_column: string, ids: string[]) => {
                state.insertedActivities = state.insertedActivities.filter((id) => !ids.includes(id));
                return Promise.resolve({ data: null, error: null });
              },
            }),
          };
        case 'activity_assets':
          return {
            select: () => ({
              limit: () => Promise.resolve({ data: null, error: null }),
            }),
            insert: (_payload: any) => {
              const insertedId = `asset-${state.insertedAssets.length + 1}`;
              state.insertedAssets.push(insertedId);
              return {
                select: () => ({
                  single: () => Promise.resolve({ data: { id: insertedId }, error: null }),
                }),
              };
            },
            delete: () => ({
              in: (_column: string, ids: string[]) => {
                state.insertedAssets = state.insertedAssets.filter((id) => !ids.includes(id));
                return Promise.resolve({ data: null, error: null });
              },
            }),
          };
        default:
          return {
            select: () => ({
              limit: () => Promise.resolve({ data: null, error: null }),
            }),
          };
      }
    }),
  };

  return { admin, state };
}

describe('runLegacyMigration integration (stubbed)', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-project.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
    process.env.SUPABASE_HERO_BUCKET = 'hero-test';
    process.env.SUPABASE_ACTIVITY_BUCKET = 'activity-test';
    process.env.NEXT_PUBLIC_HERO_SIGNED_URL_TTL = '3600';
    process.env.ACTIVITY_SIGNED_URL_TTL = '3600';
    process.env.ACTIVITY_MAX_UPLOAD_BYTES = String(5 * 1024 * 1024);
    process.env.ENABLE_LEGACY_MIGRATION = '1';
    process.env.LEGACY_MIGRATION_DRY_RUN = '0';
    process.env.LEGACY_MIGRATION_PREVIEW_LIMIT = '1';
    process.env.LEGACY_MIGRATION_UPLOAD_RETRY_LIMIT = '2';
    process.env.LEGACY_MIGRATION_ASSET_CONCURRENCY = '2';
    process.env.ENABLE_USAGE_METRICS = process.env.ENABLE_USAGE_METRICS ?? '0';
    process.env.METRICS_SAMPLE_RATE = process.env.METRICS_SAMPLE_RATE ?? '1';
    process.env.METRICS_SOURCE = process.env.METRICS_SOURCE ?? 'integration-test';
  });

  afterEach(() => {
    vi.doUnmock('../../lib/supabaseAdmin');
    vi.resetModules();
  });

  it('returns alreadyMigrated when migration log shows completion', async () => {
    const { admin } = createAdminStub({
      migrationLog: {
        id: 'log-1',
        status: 'completed',
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        error_message: null,
      },
    });

    vi.doMock('../../lib/supabaseAdmin', () => ({
      getSupabaseAdminClient: () => admin,
    }));

    const { runLegacyMigration } = await import('../../lib/migrations/legacy');
    const result = await runLegacyMigration('user-123');

    expect(result.alreadyMigrated).toBe(true);
    expect(result.summary.migratedActivities).toBe(0);
    expect(result.revalidated).toEqual([]);
  });

  it('runs in dry-run mode without purging legacy records', async () => {
    process.env.LEGACY_MIGRATION_DRY_RUN = '1';
    vi.resetModules();
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-project.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role';
    process.env.SUPABASE_HERO_BUCKET = 'hero-test';
    process.env.SUPABASE_ACTIVITY_BUCKET = 'activity-test';
    process.env.NEXT_PUBLIC_HERO_SIGNED_URL_TTL = '3600';
    process.env.ACTIVITY_SIGNED_URL_TTL = '3600';
    process.env.ACTIVITY_MAX_UPLOAD_BYTES = String(5 * 1024 * 1024);
    process.env.ENABLE_LEGACY_MIGRATION = '1';
    process.env.LEGACY_MIGRATION_DRY_RUN = '1';
    process.env.LEGACY_MIGRATION_PREVIEW_LIMIT = '1';
    process.env.LEGACY_MIGRATION_UPLOAD_RETRY_LIMIT = '2';
    process.env.LEGACY_MIGRATION_ASSET_CONCURRENCY = '2';
    process.env.ENABLE_USAGE_METRICS = process.env.ENABLE_USAGE_METRICS ?? '0';
    process.env.METRICS_SAMPLE_RATE = process.env.METRICS_SAMPLE_RATE ?? '1';
    process.env.METRICS_SOURCE = 'integration-test';

    const headerPayload = Buffer.from('header').toString('base64');
    const assetPayload = Buffer.from('asset').toString('base64');

    const { admin, state } = createAdminStub({
      legacyActivities: [
        {
          id: 'legacy-1',
          student_id: 'user-123',
          title: 'Legacy Activity',
          description: 'Sample',
          category: 'creativity',
          status: 'completed',
          start_date: '2024-01-01',
          end_date: '2024-02-01',
          hours: 10,
          learning_outcomes: ['Reflective'],
          header_image_base64: headerPayload,
          header_image_mime: 'image/png',
          casfolio_activity_assets: [
            {
              id: 'legacy-asset-1',
              activity_id: 'legacy-1',
              data_base64: assetPayload,
              mime_type: 'image/png',
            },
          ],
        },
      ],
      legacyCustomization: {
        student_id: 'user-123',
        layout: { sections: [] },
        theme: { primary: '#fff' },
        content: { hero_title: 'Legacy Hero' },
      },
    });

    vi.doMock('../../lib/supabaseAdmin', () => ({
      getSupabaseAdminClient: () => admin,
    }));

    const { runLegacyMigration } = await import('../../lib/migrations/legacy');
    const result = await runLegacyMigration('user-123');

    expect(result.summary.migratedActivities).toBe(1);
    expect(result.summary.migratedAssets).toBe(1);
    expect(result.summary.purgedLegacyActivities).toBe(0);
    expect(result.dryRun).toBe(true);
    expect(state.purgedLegacyActivityIds).toHaveLength(0);
    expect(state.purgedLegacyAssetIds).toHaveLength(0);
    expect(result.revalidated).toEqual([]);
    expect(state.migrationLog?.status).toBe('failed');
    expect(state.migrationLog?.error_message).toMatch(/Dry run/);
  });
});
