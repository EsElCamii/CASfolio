import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../../lib/supabaseServer';

function buildDefaults() {
  return {
    layout: null,
    theme: null,
    content: null,
    customSections: [],
  };
}

export async function GET() {
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ settings: buildDefaults() }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('users')
    .select('cas_settings')
    .eq('id', session.user.id)
    .single();

  if (error) {
    console.error('Failed to load cas_settings', error);
    return NextResponse.json({ settings: buildDefaults() }, { status: 500 });
  }

  return NextResponse.json({ settings: data?.cas_settings ?? buildDefaults() });
}

export async function PUT(request: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const payload = await request.json();
  const settings = {
    layout: payload?.layout ?? null,
    theme: payload?.theme ?? null,
    content: payload?.content ?? null,
    customSections: payload?.customSections ?? [],
  };

  const { error } = await supabase
    .from('users')
    .upsert({
      id: session.user.id,
      email: session.user.email,
      cas_settings: settings,
    });

  if (error) {
    console.error('Failed to save cas_settings', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
