import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../../lib/supabaseServer';

const HERO_BUCKET = 'portfolio-hero';
const HERO_SIGNED_URL_TTL = 60 * 60 * 24; // 24 hours

interface CustomSectionRow {
  section_key: string;
  title: string | null;
  body: Record<string, any> | null;
  position: number | null;
  visible: boolean | null;
}

function buildDefaults() {
  return {
    layout: null as Record<string, any> | null,
    theme: null as Record<string, any> | null,
    content: null as Record<string, any> | null,
    customSections: [] as Array<Record<string, any>>,
  };
}

function safeTrim(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function sanitizeHeroContent(content: Record<string, any> | null) {
  if (!content || typeof content !== 'object') {
    return null;
  }

  const clone = JSON.parse(JSON.stringify(content));

  const heroUrl = safeTrim(clone.heroImageUrl || clone.hero_image_url);
  if (heroUrl.startsWith('data:')) {
    delete clone.heroImageUrl;
    delete clone.hero_image_url;
  }

  if (clone.heroImagePath && typeof clone.heroImagePath !== 'string') {
    delete clone.heroImagePath;
  }
  if (clone.hero_image_path && typeof clone.hero_image_path !== 'string') {
    delete clone.hero_image_path;
  }

  return clone;
}

function sanitizeLayout(layout: any) {
  if (!layout || typeof layout !== 'object') return null;
  const order = Array.isArray(layout.order)
    ? layout.order.filter((id: unknown) => typeof id === 'string' && id.trim() !== '')
    : [];
  const visibility: Record<string, boolean> = {};
  if (layout.visibility && typeof layout.visibility === 'object') {
    Object.entries(layout.visibility).forEach(([id, value]) => {
      if (typeof id === 'string') {
        visibility[id] = value !== false;
      }
    });
  }
  return { order, visibility };
}

function sanitizeTheme(theme: any) {
  if (!theme || typeof theme !== 'object') return null;
  const clone: Record<string, any> = {};
  Object.entries(theme).forEach(([key, value]) => {
    if (['string', 'number', 'boolean'].includes(typeof value)) {
      clone[key] = value;
    }
  });
  return clone;
}

function normalizeSectionKey(rawId: string, fallbackIndex: number) {
  const base = rawId
    .toLowerCase()
    .replace(/[^a-z0-9\-]+/g, '-');
  const normalized = base.replace(/-+/g, '-').replace(/^-|-$/g, '');
  if (normalized) return normalized;
  return `custom-section-${fallbackIndex}`;
}

function sanitizeCustomSections(sections: any[]) {
  if (!Array.isArray(sections)) return [];
  return sections
    .map((section, index) => {
      if (!section || typeof section !== 'object') return null;
      const rawId = safeTrim(section.id || section.section_key || section.key || `custom-${index}`);
      const id = rawId ? normalizeSectionKey(rawId, index) : normalizeSectionKey(`custom-${index}`, index);
      const name = safeTrim(section.name || section.title) || 'Custom Section';
      const content = safeTrim(section.content || section.body || '');
      const visible = section.visible !== false;
      const position = typeof section.position === 'number' ? section.position : index;
      return {
        id,
        section_key: id,
        title: name,
        body: { content },
        visible,
        position,
      };
    })
    .filter(Boolean) as Array<{
      id: string;
      section_key: string;
      title: string;
      body: { content: string };
      visible: boolean;
      position: number;
    }>;
}

function mapDbSection(row: CustomSectionRow) {
  return {
    id: row.section_key,
    name: safeTrim(row.title ?? row.section_key),
    content: safeTrim(row.body && typeof row.body === 'object' ? row.body.content : ''),
    visible: row.visible !== false,
    position: typeof row.position === 'number' ? row.position : 0,
  };
}

async function withSignedHeroUrl(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  originalContent: Record<string, any> | null,
) {
  if (!originalContent) return null;
  const content = { ...originalContent };
  const heroPath = safeTrim(content.heroImagePath || content.hero_image_path);
  if (!heroPath) {
    return content;
  }

  const { data, error } = await supabase
    .storage
    .from(HERO_BUCKET)
    .createSignedUrl(heroPath, HERO_SIGNED_URL_TTL);

  if (!error && data?.signedUrl) {
    content.heroImageUrl = data.signedUrl;
    content.heroImagePath = heroPath;
    content.hero_image_url = data.signedUrl;
    content.hero_image_path = heroPath;
  } else if (error) {
    console.warn('Failed to generate hero image signed URL', error);
  }

  return content;
}

async function getSessionOrUnauthorized() {
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    console.error('Failed to read auth session', error);
    return { supabase, session: null } as const;
  }

  if (!session) {
    return { supabase, session: null } as const;
  }

  return { supabase, session } as const;
}

export async function GET() {
  const { supabase, session } = await getSessionOrUnauthorized();

  if (!session) {
    return NextResponse.json(buildDefaults(), { status: 401 });
  }

  const userId = session.user.id;

  const [{ data: settings, error: settingsError }, { data: sections, error: sectionsError }] = await Promise.all([
    supabase
      .from('portfolio_settings')
      .select('layout, theme, content')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('portfolio_custom_sections')
      .select('section_key, title, body, position, visible')
      .eq('user_id', userId)
      .order('position', { ascending: true }),
  ]);

  if (settingsError) {
    console.error('Failed to load portfolio settings', settingsError);
    return NextResponse.json(buildDefaults(), { status: 500 });
  }

  if (sectionsError) {
    console.error('Failed to load custom sections', sectionsError);
    return NextResponse.json(buildDefaults(), { status: 500 });
  }

  const defaults = buildDefaults();
  const contentWithSignedUrl = await withSignedHeroUrl(supabase, (settings?.content as Record<string, any> | null) ?? null);

  return NextResponse.json({
    layout: (settings?.layout as Record<string, any> | null) ?? defaults.layout,
    theme: (settings?.theme as Record<string, any> | null) ?? defaults.theme,
    content: contentWithSignedUrl ?? defaults.content,
    customSections: Array.isArray(sections) ? sections.map(mapDbSection) : defaults.customSections,
  });
}

export async function PUT(request: Request) {
  const { supabase, session } = await getSessionOrUnauthorized();

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const userId = session.user.id;

  let payload: any;
  try {
    payload = await request.json();
  } catch (error) {
    console.error('Invalid JSON payload for settings', error);
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const layout = sanitizeLayout(payload?.layout);
  const theme = sanitizeTheme(payload?.theme);
  const content = sanitizeHeroContent(payload?.content ?? null);
  const customSections = sanitizeCustomSections(payload?.customSections ?? []);

  const { error: settingsError } = await supabase
    .from('portfolio_settings')
    .upsert({
      user_id: userId,
      layout,
      theme,
      content,
    });

  if (settingsError) {
    console.error('Failed to save portfolio settings', settingsError);
    return NextResponse.json({ error: 'Unable to save settings' }, { status: 500 });
  }

  const existingKeys = new Set<string>();
  if (customSections.length > 0) {
    const payloadKeys = customSections.map(section => section.section_key);
    const { data: existing, error: existingError } = await supabase
      .from('portfolio_custom_sections')
      .select('section_key')
      .eq('user_id', userId);

    if (existingError) {
      console.error('Failed to load existing custom sections', existingError);
      return NextResponse.json({ error: 'Unable to save custom sections' }, { status: 500 });
    }

    existing?.forEach(row => {
      if (row?.section_key) {
        existingKeys.add(row.section_key);
      }
    });

    const toDelete = Array.from(existingKeys).filter(key => !payloadKeys.includes(key));
    if (toDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('portfolio_custom_sections')
        .delete()
        .eq('user_id', userId)
        .in('section_key', toDelete);

      if (deleteError) {
        console.error('Failed to prune custom sections', deleteError);
        return NextResponse.json({ error: 'Unable to save custom sections' }, { status: 500 });
      }
    }

    const rows = customSections.map(section => ({
      user_id: userId,
      section_key: section.section_key,
      title: section.title,
      body: section.body,
      visible: section.visible,
      position: section.position,
    }));

    const { error: upsertError } = await supabase
      .from('portfolio_custom_sections')
      .upsert(rows, { onConflict: 'user_id,section_key' });

    if (upsertError) {
      console.error('Failed to upsert custom sections', upsertError);
      return NextResponse.json({ error: 'Unable to save custom sections' }, { status: 500 });
    }
  } else {
    const { error: deleteAllError } = await supabase
      .from('portfolio_custom_sections')
      .delete()
      .eq('user_id', userId);

    if (deleteAllError) {
      console.error('Failed to clear custom sections', deleteAllError);
      return NextResponse.json({ error: 'Unable to save custom sections' }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
