import { NextRequest } from 'next/server';
import { createHash } from 'crypto';
import { createSupabaseServerClient } from '../../../../lib/supabaseServer';
import { getSupabaseAdminClient } from '../../../../lib/supabaseAdmin';
import { serverEnv } from '../../../../lib/env/server';
import { jsonError, jsonOk, serverError, unauthorized } from '../../../../lib/api/responses';
import { validateImageFile } from '../../../../lib/api/validation';

export const runtime = 'nodejs';

const FIVE_MB = 5 * 1024 * 1024;

async function ensureAuthentication() {
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { session: null, supabase } as const;
  }

  return { session, supabase } as const;
}

async function uploadBuffer(userId: string, buffer: Buffer, mimeType: string) {
  const normalizedMime = mimeType.split(';')[0] || 'application/octet-stream';
  if (!normalizedMime.startsWith('image/')) {
    throw new Error('Only image uploads are allowed');
  }

  if (buffer.byteLength > serverEnv.maxUploadBytes) {
    throw new Error('Image exceeds upload limit');
  }

  const checksum = createHash('sha256').update(buffer).digest('hex');
  const extension = normalizedMime.split('/')[1] ?? 'bin';
  const now = new Date().toISOString();
  const path = `${userId}/activity-headers/${checksum}-${Date.now()}.${extension}`;

  const admin = getSupabaseAdminClient();
  const { error: uploadError } = await admin.storage
    .from(serverEnv.heroBucket)
    .upload(path, buffer, {
      upsert: true,
      contentType: normalizedMime,
    });

  if (uploadError) {
    throw new Error(uploadError.message ?? 'Failed to upload image to storage');
  }

  const { data: signed, error: signError } = await admin.storage
    .from(serverEnv.heroBucket)
    .createSignedUrl(path, serverEnv.heroSignedUrlTTL, { download: false });

  if (signError || !signed?.signedUrl) {
    throw new Error(signError?.message ?? 'Failed to generate signed URL');
  }

  return {
    path,
    checksum,
    url: signed.signedUrl,
    updatedAt: now,
  };
}

async function handleFileUpload(request: NextRequest, userId: string) {
  const formData = await request.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return jsonError({ error: 'Expected multipart/form-data with an image "file" field' }, 400);
  }

  const validation = await validateImageFile(file, {
    maxBytes: Math.min(serverEnv.maxUploadBytes, FIVE_MB),
  });

  if (!validation.ok || !validation.inferredMime) {
    return jsonError({ error: validation.error ?? 'Unsupported image upload' }, 415);
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  try {
    const descriptor = await uploadBuffer(userId, buffer, validation.inferredMime);
    return jsonOk({ image: descriptor });
  } catch (error: any) {
    console.error('Failed to process header image upload', error);
    return serverError('Unable to store header image', error?.message ?? 'Upload failed');
  }
}

async function handleRemoteUrl(request: NextRequest, userId: string) {
  let payload: any;
  try {
    payload = await request.json();
  } catch (_error) {
    return jsonError({ error: 'Invalid JSON payload' }, 400);
  }

  const rawUrl = typeof payload?.url === 'string' ? payload.url.trim() : '';
  if (!rawUrl) {
    return jsonError({ error: 'Image URL is required' }, 400);
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch (_error) {
    return jsonError({ error: 'Invalid image URL' }, 400);
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    return jsonError({ error: 'Only HTTP(S) image URLs are supported' }, 400);
  }

  let response: globalThis.Response;
  try {
    response = await fetch(parsed.toString(), { redirect: 'follow' });
  } catch (error) {
    console.error('Failed to fetch remote image', error);
    return serverError('Unable to download image from URL', 'Network error while fetching image');
  }

  if (!response.ok) {
    return serverError('Unable to download image from URL', `Remote server responded with ${response.status}`);
  }

  const mimeType = response.headers.get('content-type') ?? 'application/octet-stream';
  const arrayBuffer = await response.arrayBuffer();

  if (arrayBuffer.byteLength > serverEnv.maxUploadBytes) {
    return jsonError({ error: 'Image exceeds upload limit' }, 413);
  }

  try {
    const descriptor = await uploadBuffer(userId, Buffer.from(arrayBuffer), mimeType);
    return jsonOk({ image: descriptor });
  } catch (error: any) {
    console.error('Failed to persist remote header image', error);
    return serverError('Unable to store header image', error?.message ?? 'Upload failed');
  }
}

export async function POST(request: NextRequest) {
  const { session } = await ensureAuthentication();
  if (!session) {
    return unauthorized();
  }

  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('multipart/form-data')) {
    return handleFileUpload(request, session.user.id);
  }

  if (contentType.includes('application/json')) {
    return handleRemoteUrl(request, session.user.id);
  }

  return jsonError({ error: 'Unsupported content type' }, 415);
}
