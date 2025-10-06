import { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '../../../../lib/supabaseServer';
import { jsonError, jsonNoContent, jsonOk, serverError, unauthorized, notFound } from '../../../../lib/api/responses';
import {
  assertCategory,
  assertStatus,
  normalizeLearningOutcomes,
  fetchActivityById,
} from '../../../../lib/api/activities';
import type { ActivityMutationPayload } from '../../../../lib/api/types';
import { getSupabaseAdminClient } from '../../../../lib/supabaseAdmin';
import { serverEnv } from '../../../../lib/env/server';

export const runtime = 'nodejs';

function sanitizePayload(payload: ActivityMutationPayload, ownerId: string) {
  const output: any = {};

  if (payload.title !== undefined) {
    if (typeof payload.title !== 'string' || !payload.title.trim()) {
      throw new Error('Activity title must be a non-empty string');
    }
    output.title = payload.title.trim().slice(0, 256);
  }

  if (payload.category !== undefined) {
    output.category = assertCategory(payload.category);
  }

  if (payload.status !== undefined) {
    output.status = assertStatus(payload.status);
  }

  if (payload.description !== undefined) {
    output.description = payload.description ? String(payload.description).slice(0, 2000) : null;
  }

  if (payload.hours !== undefined) {
    const hours = Number(payload.hours);
    output.hours = Number.isFinite(hours) ? hours : 0;
  }

  if (payload.startDate !== undefined) {
    output.start_date = payload.startDate ?? null;
  }

  if (payload.endDate !== undefined) {
    output.end_date = payload.endDate ?? null;
  }

  if (payload.learningOutcomes !== undefined) {
    output.learning_outcomes = normalizeLearningOutcomes(payload.learningOutcomes);
  }

  if (payload.headerImagePath !== undefined) {
    if (payload.headerImagePath === null || payload.headerImagePath === '') {
      output.header_image_path = null;
    } else if (typeof payload.headerImagePath === 'string') {
      const trimmedPath = payload.headerImagePath.trim();
      if (!trimmedPath.startsWith(`${ownerId}/`)) {
        throw new Error('Invalid header image path');
      }
      output.header_image_path = trimmedPath;
    } else {
      throw new Error('Invalid header image path');
    }
  }

  if (payload.headerImageChecksum !== undefined) {
    if (payload.headerImageChecksum === null || payload.headerImageChecksum === '') {
      output.header_image_checksum = null;
    } else if (typeof payload.headerImageChecksum === 'string') {
      output.header_image_checksum = payload.headerImageChecksum.trim().slice(0, 128);
    } else {
      throw new Error('Invalid header image checksum');
    }
  }

  if (payload.headerImageUpdatedAt !== undefined) {
    if (payload.headerImageUpdatedAt === null || payload.headerImageUpdatedAt === '') {
      output.header_image_updated_at = null;
    } else if (typeof payload.headerImageUpdatedAt === 'string') {
      output.header_image_updated_at = payload.headerImageUpdatedAt;
    } else {
      throw new Error('Invalid header image timestamp');
    }
  }

  if (payload.headerImageUrl !== undefined) {
    if (payload.headerImageUrl === null || payload.headerImageUrl === '') {
      output.header_image_url = null;
    } else if (typeof payload.headerImageUrl === 'string') {
      const trimmed = payload.headerImageUrl.trim();
      let parsed: URL;
      try {
        parsed = new URL(trimmed);
      } catch (_error) {
        throw new Error('Invalid header image URL');
      }

      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Invalid header image URL protocol');
      }

      output.header_image_url = parsed.toString();
    } else {
      throw new Error('Invalid header image URL');
    }
  }

  return output;
}

export async function GET(_request: NextRequest, context: { params: { id: string } }) {
  const { id } = context.params;
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return unauthorized();
  }

  try {
    const activity = await fetchActivityById(supabase, id, session.user.id);
    if (!activity) {
      return notFound('Activity not found');
    }
    return jsonOk({ activity });
  } catch (error: any) {
    console.error('Failed to load activity', error);
    return serverError('Failed to load activity', error.message);
  }
}

export async function PATCH(request: NextRequest, context: { params: { id: string } }) {
  const { id } = context.params;
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
    sanitized = sanitizePayload(payload, session.user.id);
  } catch (validationError: any) {
    return jsonError({ error: validationError.message }, 400);
  }

  if (!Object.keys(sanitized).length) {
    return jsonError({ error: 'No valid fields to update' }, 400);
  }

  const { error } = await supabase
    .from('activities')
    .update(sanitized)
    .eq('id', id)
    .eq('student_id', session.user.id);

  if (error) {
    console.error('Failed to update activity', error);
    return serverError('Failed to update activity', error.message);
  }

  try {
    const activity = await fetchActivityById(supabase, id, session.user.id);
    if (!activity) {
      return notFound('Activity not found');
    }
    return jsonOk({ activity, revalidated: ['activities'] });
  } catch (fetchError: any) {
    console.error('Failed to reload updated activity', fetchError);
    return serverError('Failed to load updated activity', fetchError.message);
  }
}

export async function DELETE(_request: NextRequest, context: { params: { id: string } }) {
  const { id } = context.params;
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return unauthorized();
  }

  const { data, error } = await supabase
    .from('activities')
    .delete()
    .eq('id', id)
    .eq('student_id', session.user.id)
    .select('header_image_path, activity_assets(storage_path)')
    .maybeSingle();

  if (error) {
    console.error('Failed to delete activity', error);
    return serverError('Failed to delete activity', error.message);
  }

  if (!data) {
    return notFound('Activity not found');
  }

  const pathsToRemove = [data.header_image_path, ...(data.activity_assets?.map((asset) => asset.storage_path) ?? [])]
    .filter(Boolean) as string[];

  if (pathsToRemove.length > 0) {
    const admin = getSupabaseAdminClient();
    await admin.storage.from(serverEnv.activityAssetBucket).remove(pathsToRemove);
  }

  return jsonNoContent();
}
