import { randomUUID } from 'crypto';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '../../../lib/supabaseServer';

export const runtime = 'nodejs';

const HERO_BUCKET = 'portfolio-hero';
const MAX_FILE_BYTES = 1 * 1024 * 1024; // ~1MB
const ALLOWED_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);
const HERO_SIGNED_URL_TTL = 60 * 60 * 24; // 24 hours

function inferExtension(file: File) {
  const byType = file.type.split('/')[1];
  if (byType) return byType;
  const name = file.name || '';
  const match = name.match(/\.([a-zA-Z0-9]+)$/);
  return match ? match[1] : 'png';
}

export async function POST(request: Request) {
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
    error: authError,
  } = await supabase.auth.getSession();

  if (authError) {
    console.error('Failed to read auth session', authError);
    return NextResponse.json({ error: 'Unable to validate session' }, { status: 500 });
  }

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get('file');

  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file upload.' }, { status: 400 });
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'Unsupported file type. Use PNG, JPEG, GIF, or WebP.' }, { status: 422 });
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: 'File exceeds the 1MB size limit.' }, { status: 422 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const extension = inferExtension(file).toLowerCase();
  const key = `${session.user.id}/hero-${randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase
    .storage
    .from(HERO_BUCKET)
    .upload(key, arrayBuffer, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    console.error('Failed to upload hero image', uploadError);
    return NextResponse.json({ error: 'Unable to upload hero image' }, { status: 500 });
  }

  const { data: signed, error: signedError } = await supabase
    .storage
    .from(HERO_BUCKET)
    .createSignedUrl(key, HERO_SIGNED_URL_TTL);

  if (signedError || !signed?.signedUrl) {
    console.error('Failed to create signed URL for hero image', signedError);
    return NextResponse.json({ error: 'Unable to generate image URL' }, { status: 500 });
  }

  return NextResponse.json({ path: key, url: signed.signedUrl, expiresIn: HERO_SIGNED_URL_TTL });
}
