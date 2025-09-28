import { NextResponse } from 'next/server';
import {
  ActivityPayload,
  getSupabaseAndSession,
  mapDbActivity,
  validateActivityPayload,
} from '../utils';

type RouteContext = { params: { id: string } };

export async function GET(_request: Request, { params }: RouteContext) {
  const { supabase, session } = await getSupabaseAndSession();

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = params;

  const { data, error, status } = await supabase
    .from('activities')
    .select('id, title, description, category, start_date, end_date, hours, status, header_image_url, learning_outcomes, gallery_image_urls, evidence_urls, created_at, updated_at')
    .eq('user_id', session.user.id)
    .eq('id', id)
    .maybeSingle();

  if (error && status !== 406) {
    console.error('Failed to load activity', error);
    return NextResponse.json({ error: 'Unable to load activity' }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ activity: mapDbActivity(data) });
}

export async function PUT(request: Request, { params }: RouteContext) {
  const { supabase, session } = await getSupabaseAndSession();

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let payload: ActivityPayload;
  try {
    payload = await request.json();
  } catch (error) {
    console.error('Invalid JSON payload for activity update', error);
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const validation = validateActivityPayload(payload);
  if ('error' in validation) {
    return NextResponse.json({ error: validation.error }, { status: 422 });
  }

  const { id } = params;

  const { data, error, status } = await supabase
    .from('activities')
    .update(validation.data)
    .eq('user_id', session.user.id)
    .eq('id', id)
    .select('id, title, description, category, start_date, end_date, hours, status, header_image_url, learning_outcomes, gallery_image_urls, evidence_urls, created_at, updated_at')
    .maybeSingle();

  if (error && status !== 406) {
    console.error('Failed to update activity', error);
    return NextResponse.json({ error: 'Unable to update activity' }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ activity: mapDbActivity(data) });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { supabase, session } = await getSupabaseAndSession();

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { id } = params;

  const { data, error, status } = await supabase
    .from('activities')
    .delete()
    .eq('user_id', session.user.id)
    .eq('id', id)
    .select('id')
    .maybeSingle();

  if (error && status !== 406) {
    console.error('Failed to delete activity', error);
    return NextResponse.json({ error: 'Unable to delete activity' }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(null, { status: 204 });
}
