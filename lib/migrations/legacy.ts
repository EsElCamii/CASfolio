import { createHash } from 'crypto';
import { serverEnv } from '../env/server';
import { getSupabaseAdminClient } from '../supabaseAdmin';

const MIGRATION_KEY = 'legacy_casfolio_v1';
const MIGRATION_LIMITS = serverEnv.legacyMigrationConfig;
const PREVIEW_LIMIT = MIGRATION_LIMITS.previewLimit;
const UPLOAD_RETRY_LIMIT = MIGRATION_LIMITS.uploadRetryLimit;
const ASSET_CONCURRENCY = MIGRATION_LIMITS.assetConcurrency;
const DRY_RUN = serverEnv.featureFlags.legacyMigrationDryRun;

export class LegacyMigrationError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'LegacyMigrationError';
    if (cause && !(this as any).cause) {
      (this as any).cause = cause;
    }
  }
}

interface LegacyActivityAssetRecord {
  id: string;
  activity_id: string;
  filename?: string | null;
  mime_type?: string | null;
  data_base64?: string | null;
  checksum?: string | null;
  size_bytes?: number | null;
}

interface LegacyActivityRecord {
  id: string;
  student_id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  hours?: number | null;
  learning_outcomes?: string[] | null;
  header_image_base64?: string | null;
  header_image_mime?: string | null;
  header_image_updated_at?: string | null;
  header_image_checksum?: string | null;
  casfolio_activity_assets?: LegacyActivityAssetRecord[];
}

interface UploadResult {
  bucket: string;
  path: string;
  checksum: string;
  size: number;
}

interface MigrationLogEntry {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  started_at: string | null;
  completed_at: string | null;
  updated_at: string | null;
  error_message: string | null;
}

interface PreflightOutcome {
  existingLog: MigrationLogEntry | null;
  alreadyMigrated: boolean;
}

interface RollbackContext {
  userId: string;
  previousCasSettings?: Record<string, unknown> | null;
}

interface MigrationSummary {
  migratedActivities: number;
  migratedAssets: number;
  purgedLegacyActivities: number;
}

export interface LegacyMigrationResult {
  status: 'completed';
  summary: MigrationSummary;
  alreadyMigrated: boolean;
  revalidated: string[];
  dryRun: boolean;
}

const REQUIRED_TABLES: Array<{ table: string; probe: string }> = [
  { table: 'casfolio_activities', probe: 'id' },
  { table: 'casfolio_activity_assets', probe: 'id' },
  { table: 'casfolio_customizations', probe: 'student_id' },
  { table: 'activities', probe: 'id' },
  { table: 'activity_assets', probe: 'id' },
  { table: 'user_migrations', probe: 'id' },
  { table: 'users', probe: 'id' },
];

async function ensureTableAccessible(entry: { table: string; probe: string }) {
  const admin = getSupabaseAdminClient();
  const { error } = await admin
    .from(entry.table)
    .select(entry.probe, { count: 'exact', head: true })
    .limit(PREVIEW_LIMIT);
  if (error) {
    throw new LegacyMigrationError(`Preflight failed: unable to access table ${entry.table}`, error);
  }
}

async function ensureStorageBuckets() {
  const admin = getSupabaseAdminClient();
  const hero = await admin.storage.getBucket(serverEnv.heroBucket);
  if (hero.error || !hero.data) {
    throw new LegacyMigrationError(`Preflight failed: hero bucket ${serverEnv.heroBucket} is unavailable`, hero.error);
  }
  const activity = await admin.storage.getBucket(serverEnv.activityAssetBucket);
  if (activity.error || !activity.data) {
    throw new LegacyMigrationError(
      `Preflight failed: activity bucket ${serverEnv.activityAssetBucket} is unavailable`,
      activity.error
    );
  }
}

async function preflight(userId: string): Promise<PreflightOutcome> {
  if (!serverEnv.featureFlags.legacyMigration) {
    throw new LegacyMigrationError('Legacy migration feature flag disabled');
  }

  await Promise.all(REQUIRED_TABLES.map((entry) => ensureTableAccessible(entry)));
  await ensureStorageBuckets();

  const admin = getSupabaseAdminClient();
  const migrationResult = await admin
    .from('user_migrations')
    .select('id, status, started_at, completed_at, updated_at, error_message')
    .eq('user_id', userId)
    .eq('migration_key', MIGRATION_KEY)
    .maybeSingle();

  if (migrationResult.error) {
    throw new LegacyMigrationError('Failed to read migration log entry', migrationResult.error);
  }

  const migrationLog = (migrationResult.data as unknown as MigrationLogEntry | null) ?? null;

  const { data: userRecord, error: userError } = await admin.from('users').select('id').eq('id', userId).maybeSingle();

  if (userError && userError.code !== 'PGRST116') {
    throw new LegacyMigrationError('Failed to load user profile during migration preflight', userError);
  }

  if (!userRecord) {
    throw new LegacyMigrationError('Cannot run migration: user profile record is missing');
  }

  if (migrationLog && migrationLog.status === 'running') {
    throw new LegacyMigrationError('Legacy migration already in progress');
  }

  return {
    existingLog: migrationLog,
    alreadyMigrated: Boolean(migrationLog && migrationLog.status === 'completed'),
  };
}

function decodeBase64Asset(base64?: string | null) {
  if (!base64) {
    return null;
  }
  try {
    const buffer = Buffer.from(base64, 'base64');
    if (!buffer.length) {
      return null;
    }
    const checksum = createHash('sha256').update(buffer).digest('hex');
    return { buffer, checksum };
  } catch (error) {
    throw new LegacyMigrationError('Failed to decode Base64 asset payload', error);
  }
}

async function uploadWithRetry(
  bucket: string,
  path: string,
  buffer: Buffer,
  contentType: string | undefined | null,
  attempt = 1
): Promise<UploadResult> {
  const admin = getSupabaseAdminClient();
  const { error } = await admin.storage.from(bucket).upload(path, buffer, {
    cacheControl: '3600',
    contentType: contentType ?? 'application/octet-stream',
    upsert: true,
  });

  if (error) {
    if (attempt >= UPLOAD_RETRY_LIMIT) {
      throw new LegacyMigrationError(`Upload to bucket ${bucket} failed after ${UPLOAD_RETRY_LIMIT} attempts`, error);
    }
    return uploadWithRetry(bucket, path, buffer, contentType, attempt + 1);
  }

  const checksum = createHash('sha256').update(buffer).digest('hex');
  return { bucket, path, checksum, size: buffer.length };
}

async function updateMigrationLog(
  userId: string,
  status: 'running' | 'completed' | 'failed',
  errorMessage?: string | null,
  existing?: MigrationLogEntry | null
): Promise<MigrationLogEntry> {
  const admin = getSupabaseAdminClient();
  const now = new Date().toISOString();
  const payload: any = {
    user_id: userId,
    migration_key: MIGRATION_KEY,
    status,
    updated_at: now,
  };
  if (status === 'running') {
    payload.started_at = existing?.started_at ?? now;
    payload.error_message = null;
    payload.completed_at = null;
  }
  if (status === 'completed') {
    if (existing?.started_at) {
      payload.started_at = existing.started_at;
    }
    payload.completed_at = now;
    payload.error_message = null;
  }
  if (status === 'failed') {
    payload.error_message = errorMessage ?? 'Unknown migration failure';
    payload.completed_at = null;
    if (existing?.started_at) {
      payload.started_at = existing.started_at;
    }
  }

  const { data, error } = await admin
    .from('user_migrations')
    .upsert(payload, { onConflict: 'user_id,migration_key' })
    .select('id, status, started_at, completed_at, updated_at, error_message')
    .single();

  if (error) {
    throw new LegacyMigrationError('Failed to persist migration log state', error);
  }

  return (data as unknown as MigrationLogEntry) ?? {
    id: '',
    status,
    started_at: payload.started_at ?? null,
    completed_at: payload.completed_at ?? null,
    updated_at: now,
    error_message: payload.error_message ?? null,
  };
}

async function fetchLegacyActivities(userId: string): Promise<LegacyActivityRecord[]> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from('casfolio_activities')
    .select(
      [
        'id',
        'student_id',
        'title',
        'description',
        'category',
        'status',
        'start_date',
        'end_date',
        'hours',
        'learning_outcomes',
        'header_image_base64',
        'header_image_mime',
        'header_image_updated_at',
        'header_image_checksum',
        'casfolio_activity_assets(id, activity_id, filename, mime_type, data_base64, checksum, size_bytes)',
      ].join(',')
    )
    .eq('student_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    throw new LegacyMigrationError('Failed to load legacy activities', error);
  }

  return (data ?? []) as LegacyActivityRecord[];
}

interface LegacyCustomizationRecord {
  student_id: string;
  layout?: Record<string, unknown> | null;
  theme?: Record<string, unknown> | null;
  content?: Record<string, unknown> | null;
  custom_sections?: unknown;
}

async function fetchLegacyCustomization(userId: string): Promise<LegacyCustomizationRecord | null> {
  const admin = getSupabaseAdminClient();
  const { data, error } = await admin
    .from('casfolio_customizations')
    .select('student_id, layout, theme, content, custom_sections')
    .eq('student_id', userId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    throw new LegacyMigrationError('Failed to load legacy customization', error);
  }

  return (data as unknown as LegacyCustomizationRecord) ?? null;
}

function buildHeroPath(userId: string, activityId: string) {
  return `legacy/${userId}/${activityId}/header.jpg`;
}

function buildAssetPath(userId: string, activityId: string, assetId: string, ext = 'bin') {
  return `legacy/${userId}/${activityId}/assets/${assetId}.${ext}`;
}

async function migrateActivity(
  userId: string,
  activity: LegacyActivityRecord,
  insertedActivities: string[],
  insertedAssets: string[],
  uploadedFiles: UploadResult[],
  summary: MigrationSummary
) {
  const admin = getSupabaseAdminClient();
  let headerUpload: UploadResult | null = null;

  const decodedHeader = decodeBase64Asset(activity.header_image_base64);
  if (decodedHeader) {
    headerUpload = await uploadWithRetry(
      serverEnv.heroBucket,
      buildHeroPath(userId, activity.id),
      decodedHeader.buffer,
      activity.header_image_mime ?? 'image/jpeg'
    );
    uploadedFiles.push(headerUpload);
  }

  const payload: Record<string, any> = {
    student_id: userId,
    title: activity.title,
    description: activity.description ?? null,
    category: activity.category ?? 'creativity',
    status: activity.status ?? 'draft',
    start_date: activity.start_date ?? null,
    end_date: activity.end_date ?? null,
    hours: activity.hours ?? 0,
    learning_outcomes: activity.learning_outcomes ?? [],
    header_image_path: headerUpload?.path ?? null,
    header_image_checksum: headerUpload?.checksum ?? activity.header_image_checksum ?? null,
    header_image_updated_at: activity.header_image_updated_at ?? (headerUpload ? new Date().toISOString() : null),
  };

  const { data: createdActivity, error: insertError } = await admin
    .from('activities')
    .insert(payload as any)
    .select('id')
    .single();

  if (insertError) {
    throw new LegacyMigrationError(`Failed to create migrated activity ${activity.id}`, insertError);
  }

  const createdActivityId = (createdActivity as any)?.id as string;
  insertedActivities.push(createdActivityId);
  summary.migratedActivities += 1;

  const assets = activity.casfolio_activity_assets ?? [];
  const tasks: Promise<void>[] = [];
  const executing = new Set<Promise<void>>();

  for (const asset of assets) {
    const task = (async () => {
      const decoded = decodeBase64Asset(asset.data_base64 ?? undefined);
      if (!decoded) {
        return;
      }
      const extension = (asset.filename?.split('.').pop() ?? '').trim();
      const path = buildAssetPath(userId, activity.id, asset.id, extension || 'bin');
      const upload = await uploadWithRetry(
        serverEnv.activityAssetBucket,
        path,
        decoded.buffer,
        asset.mime_type ?? 'application/octet-stream'
      );
      uploadedFiles.push(upload);
      const { data: createdAsset, error: assetInsertError } = await admin
        .from('activity_assets')
        .insert({
          activity_id: createdActivityId,
          storage_path: upload.path,
          mime_type: asset.mime_type ?? 'application/octet-stream',
          checksum: upload.checksum,
          size_bytes: upload.size,
        } as any)
        .select('id')
        .single();
      if (assetInsertError) {
        throw new LegacyMigrationError(`Failed to create asset ${asset.id} for activity ${activity.id}`, assetInsertError);
      }
      const createdAssetId = (createdAsset as any)?.id as string;
      insertedAssets.push(createdAssetId);
      summary.migratedAssets += 1;
    })();

    tasks.push(task);
    executing.add(task);
    const limitReached = executing.size >= ASSET_CONCURRENCY;
    if (limitReached) {
      await Promise.race(executing);
    }
    task.finally(() => executing.delete(task));
  }

  await Promise.all(tasks);
}

async function rollback(
  insertedActivities: string[],
  insertedAssets: string[],
  uploadedFiles: UploadResult[],
  context: RollbackContext
) {
  const admin = getSupabaseAdminClient();

  if (insertedAssets.length > 0) {
    await admin.from('activity_assets').delete().in('id', insertedAssets);
  }

  if (insertedActivities.length > 0) {
    await admin.from('activities').delete().in('id', insertedActivities);
  }

  const heroRemovals = uploadedFiles.filter((file) => file.bucket === serverEnv.heroBucket).map((file) => file.path);
  if (heroRemovals.length > 0) {
    await admin.storage.from(serverEnv.heroBucket).remove(heroRemovals);
  }

  const assetRemovals = uploadedFiles
    .filter((file) => file.bucket === serverEnv.activityAssetBucket)
    .map((file) => file.path);
  if (assetRemovals.length > 0) {
    await admin.storage.from(serverEnv.activityAssetBucket).remove(assetRemovals);
  }

  if (context.previousCasSettings !== undefined) {
    const usersTable = admin.from('users') as any;
    await usersTable
      .update({ cas_settings: context.previousCasSettings ?? null })
      .eq('id', context.userId);
  }
}

async function triggerActivityRegeneration(userId: string) {
  const admin = getSupabaseAdminClient();
  const { error } = await admin.rpc('regenerate_user_activity_feed', { user_id: userId } as any);
  if (error) {
    throw new LegacyMigrationError('Failed to trigger activity regeneration', error);
  }
}

async function purgeLegacyData(userId: string, legacyIds: string[]) {
  const admin = getSupabaseAdminClient();
  if (legacyIds.length > 0) {
    await admin.from('casfolio_activity_assets').delete().in('activity_id', legacyIds);
    await admin.from('casfolio_activities').delete().in('id', legacyIds);
  }
  await admin.from('casfolio_customizations').delete().eq('student_id', userId);
}

export async function runLegacyMigration(userId: string): Promise<LegacyMigrationResult> {
  const { existingLog, alreadyMigrated } = await preflight(userId);

  if (alreadyMigrated) {
    return {
      status: 'completed',
      summary: {
        migratedActivities: 0,
        migratedAssets: 0,
        purgedLegacyActivities: 0,
      },
      alreadyMigrated: true,
      revalidated: [],
      dryRun: DRY_RUN,
    };
  }

  const legacyActivities = await fetchLegacyActivities(userId);
  const legacyCustomization = await fetchLegacyCustomization(userId);

  const insertedActivities: string[] = [];
  const insertedAssets: string[] = [];
  const uploadedFiles: UploadResult[] = [];
  const summary: MigrationSummary = {
    migratedActivities: 0,
    migratedAssets: 0,
    purgedLegacyActivities: 0,
  };

  const rollbackContext: RollbackContext = { userId };

  if (legacyActivities.length === 0 && !legacyCustomization) {
    await updateMigrationLog(userId, 'completed', null, existingLog);
    return {
      status: 'completed',
      summary,
      alreadyMigrated: false,
      revalidated: [],
      dryRun: DRY_RUN,
    };
  }

  let migrationLog = existingLog;

  try {
    migrationLog = await updateMigrationLog(userId, 'running', null, migrationLog);

    for (const activity of legacyActivities) {
      await migrateActivity(userId, activity, insertedActivities, insertedAssets, uploadedFiles, summary);
    }

    if (legacyCustomization) {
      const normalizedSettings = {
        layout: (legacyCustomization.layout && typeof legacyCustomization.layout === 'object'
          ? legacyCustomization.layout
          : null) as Record<string, unknown> | null,
        theme: (legacyCustomization.theme && typeof legacyCustomization.theme === 'object'
          ? legacyCustomization.theme
          : null) as Record<string, unknown> | null,
        content: (legacyCustomization.content && typeof legacyCustomization.content === 'object'
          ? legacyCustomization.content
          : null) as Record<string, unknown> | null,
        customSections: Array.isArray(legacyCustomization.custom_sections)
          ? (legacyCustomization.custom_sections.filter((section) => section && typeof section === 'object') as Array<
              Record<string, unknown>
            >)
          : [],
      };

      const admin = getSupabaseAdminClient();
      const { data: currentSettingsRow, error: loadSettingsError } = await admin
        .from('users')
        .select('cas_settings')
        .eq('id', userId)
        .single();

      if (loadSettingsError) {
        throw new LegacyMigrationError('Failed to load existing customization state', loadSettingsError);
      }

      rollbackContext.previousCasSettings = (currentSettingsRow as any)?.cas_settings ?? null;

      const { error } = await (admin.from('users') as any)
        .update({ cas_settings: normalizedSettings } as any)
        .eq('id', userId);

      if (error) {
        throw new LegacyMigrationError('Failed to migrate customization settings', error);
      }
    }

    await triggerActivityRegeneration(userId);

    const legacyIds = legacyActivities.map((activity) => activity.id);
    if (DRY_RUN) {
      summary.purgedLegacyActivities = 0;
      try {
        await rollback(insertedActivities, insertedAssets, uploadedFiles, rollbackContext);
      } catch (cleanupError) {
        console.warn('Legacy migration dry run cleanup encountered an issue', cleanupError);
      }
    } else {
      await purgeLegacyData(userId, legacyIds);
      summary.purgedLegacyActivities = legacyIds.length;
    }

    const finalizeStatus: 'completed' | 'failed' = DRY_RUN ? 'failed' : 'completed';
    const finalizeMessage = DRY_RUN ? 'Dry run complete: no changes committed' : null;

    migrationLog = await updateMigrationLog(userId, finalizeStatus, finalizeMessage, migrationLog);

    const revalidatedTags = new Set<string>();
    if (!DRY_RUN && (summary.migratedActivities > 0 || summary.purgedLegacyActivities > 0)) {
      revalidatedTags.add('activities');
    }
    if (!DRY_RUN && legacyCustomization) {
      revalidatedTags.add('customize');
    }

    return {
      status: 'completed',
      summary,
      alreadyMigrated: false,
      revalidated: Array.from(revalidatedTags),
      dryRun: DRY_RUN,
    };
  } catch (error: any) {
    try {
      await rollback(insertedActivities, insertedAssets, uploadedFiles, rollbackContext);
    } catch (rollbackError) {
      console.error('Legacy migration rollback failed', rollbackError);
    }
    const message = error instanceof LegacyMigrationError ? error.message : 'Legacy migration failed';
    try {
      await updateMigrationLog(userId, 'failed', message, migrationLog);
    } catch (logError) {
      console.error('Failed to mark legacy migration as failed', logError);
    }
    throw error;
  }
}
