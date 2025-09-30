import { getSupabaseAdminClient } from '../supabaseAdmin';
import { serverEnv } from '../env/server';
import type { ActivityDTO, ActivityAssetDTO, ActivityCategory, ActivityStatus } from './types';

const CATEGORY_VALUES: ActivityCategory[] = ['creativity', 'activity', 'service'];
const STATUS_VALUES: ActivityStatus[] = ['draft', 'pending', 'completed'];

export function assertCategory(value: unknown): ActivityCategory {
  if (typeof value !== 'string') {
    throw new Error('Invalid activity category');
  }
  if (!CATEGORY_VALUES.includes(value as ActivityCategory)) {
    throw new Error(`Unsupported activity category: ${value}`);
  }
  return value as ActivityCategory;
}

export function assertStatus(value: unknown): ActivityStatus {
  if (typeof value !== 'string') {
    throw new Error('Invalid activity status');
  }
  if (!STATUS_VALUES.includes(value as ActivityStatus)) {
    throw new Error(`Unsupported activity status: ${value}`);
  }
  return value as ActivityStatus;
}

export function normalizeLearningOutcomes(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
      .filter(Boolean)
      .slice(0, 24);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean)
      .slice(0, 24);
  }
  return [];
}

export interface ActivityRow {
  id: string;
  student_id: string;
  title: string;
  description: string | null;
  category: ActivityCategory;
  status: ActivityStatus;
  start_date: string | null;
  end_date: string | null;
  hours: number | null;
  learning_outcomes: string[] | null;
  header_image_path: string | null;
  header_image_checksum: string | null;
  header_image_updated_at: string | null;
  created_at: string;
  updated_at: string;
  activity_assets?: Array<{
    id: string;
    activity_id: string;
    storage_path: string;
    mime_type: string;
    checksum: string | null;
    size_bytes: number | null;
    created_at: string;
  }>;
}

export async function signStoragePaths(paths: string[]): Promise<Map<string, string>> {
  const unique = Array.from(new Set(paths.filter(Boolean)));
  if (unique.length === 0) {
    return new Map();
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.storage
    .from(serverEnv.activityAssetBucket)
    .createSignedUrls(unique, serverEnv.activitySignedUrlTTL);

  if (error) {
    throw error;
  }

  const map = new Map<string, string>();
  for (const entry of data ?? []) {
    if (entry.signedUrl && entry.path) {
      map.set(entry.path, entry.signedUrl);
    }
  }
  return map;
}

export async function signHeroPaths(paths: string[]): Promise<Map<string, string>> {
  const unique = Array.from(new Set(paths.filter(Boolean)));
  if (unique.length === 0) {
    return new Map();
  }

  const admin = getSupabaseAdminClient();
  const { data, error } = await admin.storage
    .from(serverEnv.heroBucket)
    .createSignedUrls(unique, serverEnv.heroSignedUrlTTL);

  if (error) {
    throw error;
  }

  const map = new Map<string, string>();
  for (const entry of data ?? []) {
    if (entry.signedUrl && entry.path) {
      map.set(entry.path, entry.signedUrl);
    }
  }
  return map;
}

export function mapAsset(
  row: NonNullable<ActivityRow['activity_assets']>[number],
  signedUrls: Map<string, string>
): ActivityAssetDTO {
  return {
    id: row.id,
    activityId: row.activity_id,
    path: row.storage_path,
    mimeType: row.mime_type,
    checksum: row.checksum,
    size: row.size_bytes,
    createdAt: row.created_at,
    url: signedUrls.get(row.storage_path) ?? '',
    signedUrlExpiresAt: null,
  };
}

export function mapActivityRow(
  row: ActivityRow,
  headerSignedUrls: Map<string, string>,
  assetSignedUrls: Map<string, string>
): ActivityDTO {
  const assets = (row.activity_assets ?? []).map((asset) => mapAsset(asset, assetSignedUrls));
  return {
    id: row.id,
    studentId: row.student_id,
    title: row.title,
    description: row.description,
    category: row.category,
    status: row.status,
    startDate: row.start_date,
    endDate: row.end_date,
    hours: row.hours ?? 0,
    learningOutcomes: row.learning_outcomes ?? [],
    headerImagePath: row.header_image_path,
    headerImageChecksum: row.header_image_checksum,
    headerImageUrl: row.header_image_path ? headerSignedUrls.get(row.header_image_path) ?? null : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    assets,
  };
}

export async function fetchActivityById(
  supabase: any,
  id: string,
  userId: string
): Promise<ActivityDTO | null> {
  const { data, error } = await supabase
    .from('activities')
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
        'header_image_path',
        'header_image_checksum',
        'header_image_updated_at',
        'created_at',
        'updated_at',
        'activity_assets(id, activity_id, storage_path, mime_type, checksum, size_bytes, created_at)',
      ].join(',')
    )
    .eq('id', id)
    .eq('student_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null;
    }
    throw error;
  }

  const headerSigned = await signStoragePaths(data.header_image_path ? [data.header_image_path] : []);
  const assetPaths = data.activity_assets?.map((asset) => asset.storage_path).filter(Boolean) as string[];
  const assetSigned = await signStoragePaths(assetPaths ?? []);

  return mapActivityRow(data, headerSigned, assetSigned);
}
