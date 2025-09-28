import { NextResponse } from 'next/server';
import {
  ReflectionPayload,
  getSupabaseAndSession,
  mapDbReflection,
  validateReflectionPayload,
} from './utils';

export async function GET() {
  const { supabase, session } = await getSupabaseAndSession();

  if (!session) {
    return NextResponse.json({ reflections: [] }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('reflections')
    .select('id, activity_id, title, content, created_at, updated_at')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to load reflections', error);
    return NextResponse.json({ error: 'Unable to load reflections' }, { status: 500 });
  }

  return NextResponse.json({ reflections: Array.isArray(data) ? data.map(mapDbReflection) : [] });
}

export async function POST(request: Request) {
  const { supabase, session } = await getSupabaseAndSession();

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let payload: ReflectionPayload;
  try {
    payload = await request.json();
  } catch (error) {
    console.error('Invalid JSON payload for reflection', error);
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
    console.error('Failed to verify activity for reflection', activityError);
    return NextResponse.json({ error: 'Unable to verify activity.' }, { status: 500 });
  }

  if (!activity) {
    return NextResponse.json({ error: 'Activity not found.' }, { status: 404 });
  }

  const record = {
    ...validation.data,
    user_id: session.user.id,
  };

  const { data, error } = await supabase
    .from('reflections')
    .insert(record)
    .select('id, activity_id, title, content, created_at, updated_at')
    .single();

  if (error) {
    console.error('Failed to create reflection', error);
    return NextResponse.json({ error: 'Unable to create reflection' }, { status: 500 });
  }

  return NextResponse.json({ reflection: mapDbReflection(data) }, { status: 201 });
}
