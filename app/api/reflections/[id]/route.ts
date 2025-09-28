import { NextResponse } from 'next/server';
import { mapDbReflection, validateReflectionPayload, ReflectionPayload, getSupabaseAndSession } from '../utils';

type RouteContext = { params: { id: string } };

export async function GET(_request: Request, { params }: RouteContext) {
  const { supabase, session } = await getSupabaseAndSession();

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = params;

  const { data, error, status } = await supabase
    .from('reflections')
    .select('id, activity_id, title, content, created_at, updated_at')
    .eq('user_id', session.user.id)
    .eq('id', id)
    .maybeSingle();

  if (error && status !== 406) {
    console.error('Failed to load reflection', error);
    return NextResponse.json({ error: 'Unable to load reflection' }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ reflection: mapDbReflection(data) });
}

export async function PUT(request: Request, { params }: RouteContext) {
  const { supabase, session } = await getSupabaseAndSession();

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let payload: ReflectionPayload;
  try {
    payload = await request.json();
  } catch (error) {
    console.error('Invalid JSON payload for reflection update', error);
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const validation = validateReflectionPayload(payload);
  if ('error' in validation) {
    return NextResponse.json({ error: validation.error }, { status: 422 });
  }

  const { data: activity, error: activityError, status: activityStatus } = await supabase
    .from('activities')
    .select('id')
    .eq('user_id', session.user.id)
    .eq('id', validation.data.activity_id)
    .maybeSingle();

  if (activityError && activityStatus !== 406) {
    console.error('Failed to verify activity for reflection update', activityError);
    return NextResponse.json({ error: 'Unable to verify activity.' }, { status: 500 });
  }

  if (!activity) {
    return NextResponse.json({ error: 'Activity not found.' }, { status: 404 });
  }

  const { id } = params;

  const { data, error, status } = await supabase
    .from('reflections')
    .update(validation.data)
    .eq('user_id', session.user.id)
    .eq('id', id)
    .select('id, activity_id, title, content, created_at, updated_at')
    .maybeSingle();

  if (error && status !== 406) {
    console.error('Failed to update reflection', error);
    return NextResponse.json({ error: 'Unable to update reflection' }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ reflection: mapDbReflection(data) });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { supabase, session } = await getSupabaseAndSession();

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = params;

  const { data, error, status } = await supabase
    .from('reflections')
    .delete()
    .eq('user_id', session.user.id)
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error && status !== 406) {
    console.error('Failed to delete reflection', error);
    return NextResponse.json({ error: 'Unable to delete reflection' }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(null, { status: 204 });
}
