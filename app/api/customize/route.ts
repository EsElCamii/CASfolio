import { NextRequest } from 'next/server';
import { createSupabaseServerClient } from '../../../lib/supabaseServer';
import { getSupabaseAdminClient } from '../../../lib/supabaseAdmin';
import { serverEnv } from '../../../lib/env/server';
import { jsonOk, jsonError, serverError, unauthorized } from '../../../lib/api/responses';
import type { CustomizeSettings, CustomizeContent, HeroImageDescriptor } from '../../../lib/api/types';

function buildDefaults(): CustomizeSettings {
  return {
    layout: null,
    theme: null,
    content: null,
    customSections: [],
  };
}

function sanitizeContentPayload(input: unknown, existingHero: HeroImageDescriptor): CustomizeContent | null {
  if (!input || typeof input !== 'object') return null;
  const entries = Object.entries(input as Record<string, unknown>).filter(([key]) => !key.startsWith('__'));
  const next: Record<string, unknown> = {};
  for (const [key, value] of entries) {
    if (key.startsWith('hero_image_')) continue; // Reserved for server-managed values
    next[key] = value;
  }
  if (!Object.keys(next).length) {
    return {
      hero_image_url: existingHero.url,
      hero_image_path: existingHero.path,
      hero_image_checksum: existingHero.checksum,
      hero_image_updated_at: existingHero.updatedAt,
    };
  }
  return {
    ...(next as CustomizeContent),
    hero_image_url: existingHero.url,
    hero_image_path: existingHero.path,
    hero_image_checksum: existingHero.checksum,
    hero_image_updated_at: existingHero.updatedAt,
  };
}

function sanitizeSettingsPayload(payload: unknown, hero: HeroImageDescriptor): CustomizeSettings {
  if (!payload || typeof payload !== 'object') {
    return {
      layout: null,
      theme: null,
      content: sanitizeContentPayload(null, hero),
      customSections: [],
    };
  }

  const shape = payload as Record<string, unknown>;
  const layout = typeof shape.layout === 'object' ? (shape.layout as CustomizeSettings['layout']) : null;
  const theme = typeof shape.theme === 'object' ? (shape.theme as CustomizeSettings['theme']) : null;
  const customSections = Array.isArray(shape.customSections)
    ? (shape.customSections.filter((section) => section && typeof section === 'object') as CustomizeSettings['customSections'])
    : [];

  return {
    layout,
    theme,
    content: sanitizeContentPayload(shape.content, hero),
    customSections,
  };
}

function mergeHeroIntoContent(content: CustomizeContent | null, hero: HeroImageDescriptor): CustomizeContent | null {
  if (!content && !hero.url && !hero.path) return content;
  const base = content ? { ...content } : {};
  base.hero_image_url = hero.url;
  base.hero_image_path = hero.path;
  base.hero_image_checksum = hero.checksum;
  base.hero_image_updated_at = hero.updatedAt;
  return base;
}

async function resolveHeroDescriptor(
  heroPath: string | null | undefined,
  storedUrl: string | null | undefined,
  checksum: string | null | undefined,
  updatedAt: string | null | undefined
): Promise<HeroImageDescriptor> {
  if (heroPath) {
    try {
      const admin = getSupabaseAdminClient();
      const { data, error } = await admin.storage
        .from(serverEnv.heroBucket)
        .createSignedUrl(heroPath, serverEnv.heroSignedUrlTTL, { download: false });
      if (error) {
        console.warn('Failed to sign hero image URL', error);
      } else if (data?.signedUrl) {
        return {
          url: data.signedUrl,
          path: heroPath,
          checksum: checksum ?? null,
          updatedAt: updatedAt ?? new Date().toISOString(),
          source: 'storage',
        };
      }
    } catch (error) {
      console.error('Unable to generate hero image signed URL', error);
    }
  }

  if (storedUrl) {
    const source = storedUrl.startsWith('data:image') ? 'legacy' : 'external';
    return {
      url: storedUrl,
      path: heroPath ?? null,
      checksum: checksum ?? null,
      updatedAt: updatedAt ?? null,
      source,
    };
  }

  return {
    url: null,
    path: heroPath ?? null,
    checksum: checksum ?? null,
    updatedAt: updatedAt ?? null,
    source: null,
  };
}

function normalizeSettings(raw: any, hero: HeroImageDescriptor): CustomizeSettings {
  if (!raw || typeof raw !== 'object') {
    return {
      layout: null,
      theme: null,
      content: mergeHeroIntoContent(null, hero),
      customSections: [],
    };
  }

  const content = mergeHeroIntoContent(raw.content ?? null, hero);
  const layout = raw.layout && typeof raw.layout === 'object' ? (raw.layout as CustomizeSettings['layout']) : null;
  const theme = raw.theme && typeof raw.theme === 'object' ? (raw.theme as CustomizeSettings['theme']) : null;
  const customSections = Array.isArray(raw.customSections)
    ? (raw.customSections.filter((section: any) => section && typeof section === 'object') as CustomizeSettings['customSections'])
    : [];

  return { layout, theme, content, customSections };
}

export async function GET() {
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return unauthorized();
  }

  const { data, error } = await supabase
    .from('users')
    .select('cas_settings, hero_image_path, hero_image_checksum, hero_image_updated_at')
    .eq('id', session.user.id)
    .single();

  if (error) {
    console.error('Failed to load cas_settings', error);
    return serverError('Failed to load customization settings', error.message);
  }

  const hero = await resolveHeroDescriptor(
    data?.hero_image_path ?? null,
    data?.cas_settings?.content?.hero_image_url ?? null,
    data?.hero_image_checksum ?? null,
    data?.hero_image_updated_at ?? null
  );

  const settings = normalizeSettings(data?.cas_settings, hero);

  return jsonOk({ settings, hero });
}

export async function PUT(request: NextRequest) {
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return unauthorized();
  }

  const current = await supabase
    .from('users')
    .select('cas_settings, hero_image_path, hero_image_checksum, hero_image_updated_at')
    .eq('id', session.user.id)
    .single();

  if (current.error) {
    console.error('Failed to load current customization settings', current.error);
    return serverError('Unable to load existing customization state', current.error.message);
  }

  const hero = await resolveHeroDescriptor(
    current.data?.hero_image_path ?? null,
    current.data?.cas_settings?.content?.hero_image_url ?? null,
    current.data?.hero_image_checksum ?? null,
    current.data?.hero_image_updated_at ?? null
  );

  let payload: unknown;
  try {
    payload = await request.json();
  } catch (error) {
    return jsonError({ error: 'Invalid JSON payload' }, 400);
  }

  const settingsToPersist = sanitizeSettingsPayload(payload, hero);

  const { error } = await supabase
    .from('users')
    .upsert({
      id: session.user.id,
      email: session.user.email,
      cas_settings: settingsToPersist,
    });

  if (error) {
    console.error('Failed to save cas_settings', error);
    return serverError('Failed to persist customization settings', error.message);
  }

  const settings = normalizeSettings(settingsToPersist, hero);
  return jsonOk({ settings, hero, revalidated: ['customize'] });
}
