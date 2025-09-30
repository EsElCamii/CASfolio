import { createHash } from 'crypto';
import { serverEnv } from '../env/server';
import { getSupabaseAdminClient } from '../supabaseAdmin';

const MIGRATION_KEY = 'legacy_casfolio_v1';

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

const PREVIEW_LIMIT = 1;
const UPLOAD_RETRY_LIMIT = 3;
const ASSET_CONCURRENCY = 3;

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

async function preflight(userId: string) {
  if (!serverEnv.featureFlags.legacyMigration) {
    throw new LegacyMigrationError('Legacy migration feature flag disabled');
  }

  await Promise.all(REQUIRED_TABLES.map((entry) => ensureTableAccessible(entry)));
  await ensureStorageBuckets();

  const admin = getSupabaseAdminClient();
  const migrationResult = await admin
    .from('user_migrations')
    .select('id, status')
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

  if (migrationLog && migrationLog.status === 'completed') {
    throw new LegacyMigrationError('Legacy data already migrated for this user');
  }

  return migrationLog;
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
  errorMessage?: string | null
) {
  const admin = getSupabaseAdminClient();
  const payload: any = {
    user_id: userId,
    migration_key: MIGRATION_KEY,
    status,
    updated_at: new Date().toISOString(),
  };
  if (status === 'running') {
    payload.started_at = new Date().toISOString();
    payload.error_message = null;
    payload.completed_at = null;
  }
  if (status === 'completed') {
    payload.completed_at = new Date().toISOString();
    payload.error_message = null;
  }
  if (status === 'failed') {
    payload.error_message = errorMessage ?? 'Unknown migration failure';
    payload.completed_at = null;
  }

  const { error } = await admin
    .from('user_migrations')
    .upsert(payload, { onConflict: 'user_id,migration_key' });

  if (error) {
    throw new LegacyMigrationError('Failed to persist migration log state', error);
  }
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
  uploadedFiles: UploadResult[]
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
  const existing = await preflight(userId);

  await updateMigrationLog(userId, 'running');

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

  try {
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
      const usersTable = admin.from('users') as any;
      const { error } = await usersTable.update({ cas_settings: normalizedSettings }).eq('id', userId);

      if (error) {
        throw new LegacyMigrationError('Failed to migrate customization settings', error);
      }
    }

    await triggerActivityRegeneration(userId);

    const legacyIds = legacyActivities.map((activity) => activity.id);
    await purgeLegacyData(userId, legacyIds);
    summary.purgedLegacyActivities = legacyIds.length;

    await updateMigrationLog(userId, 'completed');
    return {
      status: 'completed',
      summary,
      alreadyMigrated: Boolean(existing && existing.status === 'running'),
      revalidated: ['activities', 'customize'],
    };
  } catch (error: any) {
    try {
      await rollback(insertedActivities, insertedAssets, uploadedFiles);
    } catch (rollbackError) {
      console.error('Legacy migration rollback failed', rollbackError);
    }
    const message = error instanceof LegacyMigrationError ? error.message : 'Legacy migration failed';
    await updateMigrationLog(userId, 'failed', message);
    throw error;
  }
}
