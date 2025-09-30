import { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '../../../lib/supabaseServer';
import { jsonCreated, jsonError, jsonOk, serverError, unauthorized } from '../../../lib/api/responses';
import {
  assertCategory,
  assertStatus,
  normalizeLearningOutcomes,
  mapActivityRow,
  signStoragePaths,
} from '../../../lib/api/activities';
import type { ActivityRow } from '../../../lib/api/activities';
import type { ActivityMutationPayload } from '../../../lib/api/types';

export const runtime = 'nodejs';

export async function GET() {
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return unauthorized();
  }

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
    .eq('student_id', session.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to load activities', error);
    return serverError('Failed to load activities', error.message);
  }

  const rows: ActivityRow[] = Array.isArray(data) ? ((data as unknown) as ActivityRow[]) : [];

  const headerPaths = rows.map((row) => row.header_image_path).filter(Boolean) as string[];
  const assetPaths = rows
    .flatMap((row) => row.activity_assets?.map((asset) => asset.storage_path) ?? [])
    .filter(Boolean) as string[];

  let headerSignedUrls = new Map<string, string>();
  let assetSignedUrls = new Map<string, string>();

  try {
    headerSignedUrls = await signStoragePaths(headerPaths);
    assetSignedUrls = await signStoragePaths(assetPaths);
  } catch (signError: any) {
    console.error('Failed to sign activity assets', signError);
  }

  const activities = rows.map((row) => mapActivityRow(row, headerSignedUrls, assetSignedUrls));

  return jsonOk({ activities });
}

function sanitizePayload(payload: ActivityMutationPayload) {
  if (!payload.title || typeof payload.title !== 'string') {
    throw new Error('Activity title is required');
  }

  const title = payload.title.trim().slice(0, 256);
  const category = assertCategory(payload.category);
  const status = assertStatus(payload.status);
  const hours = Number.isFinite(payload.hours) ? Number(payload.hours) : 0;
  const description = payload.description ? String(payload.description).slice(0, 2000) : null;
  const startDate = payload.startDate ?? null;
  const endDate = payload.endDate ?? null;
  const learningOutcomes = normalizeLearningOutcomes(payload.learningOutcomes);

  return {
    title,
    category,
    status,
    hours,
    description,
    start_date: startDate,
    end_date: endDate,
    learning_outcomes: learningOutcomes,
  };
}

export async function POST(request: NextRequest) {
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return unauthorized();
  }

  let payload: ActivityMutationPayload;
  try {
    payload = await request.json();
  } catch (_error) {
    return jsonError({ error: 'Invalid JSON payload' }, 400);
  }

  let sanitized;
  try {
    sanitized = sanitizePayload(payload);
  } catch (validationError: any) {
    return jsonError({ error: validationError.message }, 400);
  }

  const { data, error } = await supabase
    .from('activities')
    .insert({
      ...sanitized,
      student_id: session.user.id,
    })
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
      ].join(',')
    )
    .single();

  if (error) {
    console.error('Failed to create activity', error);
    return serverError('Failed to create activity', error.message);
  }

  const created = (data as unknown) as ActivityRow;

  let activity;
  try {
    const headerSignedUrls = await signStoragePaths(created.header_image_path ? [created.header_image_path] : []);
    activity = mapActivityRow({ ...created, activity_assets: [] }, headerSignedUrls, new Map());
  } catch (signError: any) {
    console.error('Failed to sign new activity header', signError);
    activity = mapActivityRow({ ...created, activity_assets: [] }, new Map(), new Map());
  }

  return jsonCreated({ activity, revalidated: ['activities'] });
}
