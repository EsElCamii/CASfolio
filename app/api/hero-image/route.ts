import { NextRequest } from 'next/server';
import { createHash } from 'crypto';
import { createSupabaseServerClient } from '../../../lib/supabaseServer';
import { getSupabaseAdminClient } from '../../../lib/supabaseAdmin';
import { serverEnv } from '../../../lib/env/server';
import { jsonError, jsonOk, jsonNoContent, serverError, unauthorized } from '../../../lib/api/responses';
import type { HeroImageDescriptor, CustomizeContent } from '../../../lib/api/types';
import { validateImageFile } from '../../../lib/api/validation';

export const runtime = 'nodejs';

async function loadUserState(userId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('users')
    .select('cas_settings, hero_image_path, hero_image_checksum, hero_image_updated_at')
    .eq('id', userId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

function buildHeroDescriptorFromStorage(
  signedUrl: string,
  path: string,
  checksum: string | null,
  updatedAt: string
): HeroImageDescriptor {
  return {
    url: signedUrl,
    path,
    checksum,
    updatedAt,
    source: 'storage',
  };
}

function buildExternalHeroDescriptor(url: string): HeroImageDescriptor {
  return {
    url,
    path: null,
    checksum: null,
    updatedAt: new Date().toISOString(),
    source: url.startsWith('data:image') ? 'legacy' : 'external',
  };
}

async function signHeroPath(path: string) {
  const admin = getSupabaseAdminClient();
  return admin.storage.from(serverEnv.heroBucket).createSignedUrl(path, serverEnv.heroSignedUrlTTL, {
    download: false,
  });
}

function mutateCasSettingsContent(
  casSettings: any,
  mutator: (content: CustomizeContent) => CustomizeContent
): any {
  const base = casSettings && typeof casSettings === 'object' ? { ...casSettings } : {};
  const content = base.content && typeof base.content === 'object' ? { ...(base.content as CustomizeContent) } : {};
  base.content = mutator(content);
  return base;
}

function sanitizeExternalUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    return parsed.toString();
  } catch (_error) {
    return null;
  }
}

export async function GET() {
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return unauthorized();
  }

  try {
    const data = await loadUserState(session.user.id);
    if (!data) {
      return jsonOk({ hero: { url: null, path: null, checksum: null, updatedAt: null, source: null } });
    }

    if (data.hero_image_path) {
      const { data: signed, error } = await signHeroPath(data.hero_image_path);
      if (error) {
        console.error('Failed to sign hero path', error);
      } else if (signed?.signedUrl) {
        const descriptor = buildHeroDescriptorFromStorage(
          signed.signedUrl,
          data.hero_image_path,
          data.hero_image_checksum ?? null,
          data.hero_image_updated_at ?? new Date().toISOString()
        );
        return jsonOk({ hero: descriptor });
      }
    }

    const fallbackUrl = data?.cas_settings?.content?.hero_image_url ?? null;
    if (fallbackUrl) {
      return jsonOk({ hero: buildExternalHeroDescriptor(fallbackUrl) });
    }

    return jsonOk({ hero: { url: null, path: null, checksum: null, updatedAt: null, source: null } });
  } catch (error: any) {
    console.error('Unable to load hero image', error);
    return serverError('Unable to load hero image metadata', error.message);
  }
}

export async function POST(request: NextRequest) {
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return unauthorized();
  }

  const formData = await request.formData();
  const file = formData.get('file');
  if (!(file instanceof File)) {
    return jsonError({ error: 'Expected multipart/form-data with image file field "file"' }, 400);
  }

  const validation = await validateImageFile(file, {
    maxBytes: serverEnv.maxUploadBytes,
  });

  if (!validation.ok || !validation.inferredMime) {
    return jsonError({ error: validation.error ?? 'Unsupported image upload' }, 415);
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const checksum = createHash('sha256').update(buffer).digest('hex');
  const extension = validation.inferredMime.split('/')[1];
  const now = new Date().toISOString();
  const path = `${session.user.id}/hero/${checksum}-${Date.now()}.${extension}`;

  const admin = getSupabaseAdminClient();

  let currentState: Awaited<ReturnType<typeof loadUserState>>;
  try {
    currentState = await loadUserState(session.user.id);
  } catch (error) {
    console.error('Unable to load current hero image state', error);
    return serverError('Unable to load current hero state', (error as any).message);
  }

  const { error: uploadError } = await admin.storage.from(serverEnv.heroBucket).upload(path, buffer, {
    contentType: validation.inferredMime,
    upsert: true,
  });

  if (uploadError) {
    console.error('Failed to upload hero image', uploadError);
    return serverError('Failed to upload hero image', uploadError.message);
  }

  const { data: signed, error: signError } = await signHeroPath(path);
  if (signError || !signed?.signedUrl) {
    console.error('Failed to sign hero image', signError);
    return serverError('Failed to generate access link for hero image', signError?.message ?? 'Unknown error');
  }

  const descriptor = buildHeroDescriptorFromStorage(signed.signedUrl, path, checksum, now);

  const updatedSettings = mutateCasSettingsContent(currentState?.cas_settings, (content) => {
    delete content.hero_image_url; // Clear stale signed URLs
    return {
      ...content,
      hero_image_path: path,
      hero_image_checksum: checksum,
      hero_image_updated_at: now,
    };
  });

  const { error: updateError } = await supabase
    .from('users')
    .upsert({
      id: session.user.id,
      email: session.user.email,
      cas_settings: updatedSettings,
      hero_image_path: path,
      hero_image_checksum: checksum,
      hero_image_updated_at: now,
    });

  if (updateError) {
    console.error('Failed to persist hero metadata', updateError);
    return serverError('Failed to persist hero metadata', updateError.message);
  }

  if (currentState?.hero_image_path && currentState.hero_image_path !== path) {
    await admin.storage.from(serverEnv.heroBucket).remove([currentState.hero_image_path]);
  }

  return jsonOk({ hero: descriptor, revalidated: ['customize'] });
}

export async function PATCH(request: NextRequest) {
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return unauthorized();
  }

  let payload: { url?: string | null };
  try {
    payload = await request.json();
  } catch (_error) {
    return jsonError({ error: 'Invalid JSON payload' }, 400);
  }

  const url = payload?.url ? sanitizeExternalUrl(payload.url) : null;
  if (payload?.url && !url) {
    return jsonError({ error: 'Invalid hero image URL. Only absolute http(s) URLs are allowed.' }, 400);
  }

  let currentState: Awaited<ReturnType<typeof loadUserState>>;
  try {
    currentState = await loadUserState(session.user.id);
  } catch (error) {
    console.error('Unable to load current hero state', error);
    return serverError('Unable to load current hero state', (error as any).message);
  }

  const admin = getSupabaseAdminClient();
  if (currentState?.hero_image_path) {
    await admin.storage.from(serverEnv.heroBucket).remove([currentState.hero_image_path]);
  }

  const updatedAt = new Date().toISOString();
  const descriptor = url ? buildExternalHeroDescriptor(url) : { url: null, path: null, checksum: null, updatedAt: null, source: null };

  const updatedSettings = mutateCasSettingsContent(currentState?.cas_settings, (content) => {
    const next = { ...content };
    if (url) {
      next.hero_image_url = url;
    } else {
      delete next.hero_image_url;
    }
    delete next.hero_image_path;
    delete next.hero_image_checksum;
    delete next.hero_image_updated_at;
    return next;
  });

  const { error } = await supabase
    .from('users')
    .upsert({
      id: session.user.id,
      email: session.user.email,
      cas_settings: updatedSettings,
      hero_image_path: null,
      hero_image_checksum: null,
      hero_image_updated_at: url ? updatedAt : null,
    });

  if (error) {
    console.error('Failed to persist external hero', error);
    return serverError('Failed to persist external hero', error.message);
  }

  return jsonOk({ hero: descriptor, revalidated: ['customize'] });
}

export async function DELETE() {
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return unauthorized();
  }

  let currentState: Awaited<ReturnType<typeof loadUserState>>;
  try {
    currentState = await loadUserState(session.user.id);
  } catch (error) {
    console.error('Unable to load current hero state', error);
    return serverError('Unable to load current hero state', (error as any).message);
  }

  const admin = getSupabaseAdminClient();
  if (currentState?.hero_image_path) {
    await admin.storage.from(serverEnv.heroBucket).remove([currentState.hero_image_path]);
  }

  const updatedSettings = mutateCasSettingsContent(currentState?.cas_settings, (content) => {
    delete content.hero_image_url;
    delete content.hero_image_path;
    delete content.hero_image_checksum;
    delete content.hero_image_updated_at;
    return { ...content };
  });

  const { error } = await supabase
    .from('users')
    .upsert({
      id: session.user.id,
      email: session.user.email,
      cas_settings: updatedSettings,
      hero_image_path: null,
      hero_image_checksum: null,
      hero_image_updated_at: null,
    });

  if (error) {
    console.error('Failed to clear hero image', error);
    return serverError('Failed to clear hero image', error.message);
  }

  return jsonNoContent();
}
