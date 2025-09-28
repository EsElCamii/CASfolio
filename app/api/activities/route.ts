import { NextResponse } from 'next/server';
import {
  ActivityPayload,
  getSupabaseAndSession,
  mapDbActivity,
  validateActivityPayload,
} from './utils';

export async function GET() {
  const { supabase, session } = await getSupabaseAndSession();

  if (!session) {
    return NextResponse.json({ activities: [] }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('activities')
    .select('id, title, description, category, start_date, end_date, hours, status, header_image_url, learning_outcomes, gallery_image_urls, evidence_urls, created_at, updated_at')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to load activities', error);
    return NextResponse.json({ error: 'Unable to load activities' }, { status: 500 });
  }

  return NextResponse.json({ activities: Array.isArray(data) ? data.map(mapDbActivity) : [] });
}

export async function POST(request: Request) {
  const { supabase, session } = await getSupabaseAndSession();

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  let payload: ActivityPayload;
  try {
    payload = await request.json();
  } catch (error) {
    console.error('Invalid JSON payload for activity', error);
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const validation = validateActivityPayload(payload);
  if ('error' in validation) {
    return NextResponse.json({ error: validation.error }, { status: 422 });
  }

  const activityRecord = {
    ...validation.data,
    status: validation.data.status,
    user_id: session.user.id,
  };

  const { data, error } = await supabase
    .from('activities')
    .insert(activityRecord)
    .select('id, title, description, category, start_date, end_date, hours, status, header_image_url, learning_outcomes, gallery_image_urls, evidence_urls, created_at, updated_at')
    .single();

  if (error) {
    console.error('Failed to create activity', error);
    return NextResponse.json({ error: 'Unable to create activity' }, { status: 500 });
  }

  return NextResponse.json({ activity: mapDbActivity(data) }, { status: 201 });
}
