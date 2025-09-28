import { createSupabaseServerClient } from '../../../lib/supabaseServer';

export const HTTPS_URL_REGEX = /^https:\/\//i;
export const ALLOWED_CATEGORIES = new Set(['creativity', 'activity', 'service']);

const STATUS_WRITE_MAP: Record<string, string> = {
  ongoing: 'pending',
};
const STATUS_READ_MAP: Record<string, string> = {
  pending: 'ongoing',
};

export interface ActivityPayload {
  title?: unknown;
  description?: unknown;
  category?: unknown;
  startDate?: unknown;
  endDate?: unknown;
  hours?: unknown;
  status?: unknown;
  header_image_url?: unknown;
  headerImageUrl?: unknown;
  learningOutcomes?: unknown;
  learning_outcomes?: unknown;
  galleryImageUrls?: unknown;
  gallery_image_urls?: unknown;
  evidenceUrls?: unknown;
  evidence_urls?: unknown;
}

export function safeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function toNumber(value: unknown) {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : NaN;
  }
  return NaN;
}

export function normalizeStatusForWrite(status: string) {
  if (!status) return 'pending';
  const lower = status.toLowerCase();
  return STATUS_WRITE_MAP[lower] || lower;
}

export function normalizeStatusForRead(status: string | null) {
  if (!status) return 'pending';
  const lower = status.toLowerCase();
  return STATUS_READ_MAP[lower] || lower;
}

function validateIsoDate(value: string) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return value.length === 10 || value.includes('T');
}

export function validateActivityPayload(payload: ActivityPayload) {
  const title = safeString(payload.title);
  if (!title) {
    return { error: 'Title is required.' } as const;
  }
  if (title.length > 255) {
    return { error: 'Title must be 255 characters or fewer.' } as const;
  }

  const category = safeString(payload.category).toLowerCase();
  if (!ALLOWED_CATEGORIES.has(category)) {
    return { error: 'Category must be creativity, activity, or service.' } as const;
  }

  const headerImageUrl = safeString(
    payload.header_image_url ?? payload.headerImageUrl
  );
  if (!headerImageUrl) {
    return { error: 'header_image_url is required.' } as const;
  }
  if (!HTTPS_URL_REGEX.test(headerImageUrl)) {
    return { error: 'header_image_url must start with https://.' } as const;
  }
  if (headerImageUrl.length > 2048) {
    return { error: 'header_image_url must be 2048 characters or fewer.' } as const;
  }

  const startDate = safeString(payload.startDate);
  if (!startDate || !validateIsoDate(startDate)) {
    return { error: 'startDate must be a valid ISO date (YYYY-MM-DD).' } as const;
  }
  const endDateRaw = safeString(payload.endDate);
  if (endDateRaw && !validateIsoDate(endDateRaw)) {
    return { error: 'endDate must be a valid ISO date when provided.' } as const;
  }

  const hours = toNumber(payload.hours);
  if (Number.isNaN(hours) || hours < 0) {
    return { error: 'hours must be a positive number.' } as const;
  }

  const statusRaw = safeString(payload.status) || 'pending';
  const status = normalizeStatusForWrite(statusRaw);

  const learningOutcomesSource = Array.isArray(payload.learningOutcomes)
    ? payload.learningOutcomes
    : Array.isArray(payload.learning_outcomes)
      ? payload.learning_outcomes
      : [];
  const learningOutcomesRaw = learningOutcomesSource;
  const learningOutcomes = learningOutcomesRaw
    .map(item => safeString(item))
    .filter(item => item !== '')
    .slice(0, 25);

  const galleryImageUrlsSource = Array.isArray(payload.galleryImageUrls)
    ? payload.galleryImageUrls
    : Array.isArray(payload.gallery_image_urls)
      ? payload.gallery_image_urls
      : [];
  const galleryImageUrlsRaw = galleryImageUrlsSource;
  const galleryImageUrls = galleryImageUrlsRaw
    .map(item => safeString(item))
    .filter(item => item !== '' && HTTPS_URL_REGEX.test(item))
    .slice(0, 25);

  const evidenceUrlsSource = Array.isArray(payload.evidenceUrls)
    ? payload.evidenceUrls
    : Array.isArray(payload.evidence_urls)
      ? payload.evidence_urls
      : [];
  const evidenceUrlsRaw = evidenceUrlsSource;
  const evidenceUrls = evidenceUrlsRaw
    .map(item => safeString(item))
    .filter(item => item !== '' && HTTPS_URL_REGEX.test(item))
    .slice(0, 25);

  return {
    data: {
      title,
      description: safeString(payload.description),
      category,
      start_date: startDate,
      end_date: endDateRaw || null,
      hours,
      status,
      header_image_url: headerImageUrl,
      learning_outcomes: learningOutcomes,
      gallery_image_urls: galleryImageUrls.length ? galleryImageUrls : null,
      evidence_urls: evidenceUrls.length ? evidenceUrls : null,
    },
  } as const;
}

export function mapDbActivity(row: any) {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? '',
    category: row.category ?? 'creativity',
    startDate: row.start_date ?? null,
    endDate: row.end_date ?? null,
    hours: typeof row.hours === 'number' ? row.hours : Number(row.hours) || 0,
    status: normalizeStatusForRead(row.status ?? null),
    header_image_url: row.header_image_url,
    headerImageUrl: row.header_image_url,
    learningOutcomes: Array.isArray(row.learning_outcomes) ? row.learning_outcomes : [],
    galleryImageUrls: Array.isArray(row.gallery_image_urls) ? row.gallery_image_urls : [],
    evidenceUrls: Array.isArray(row.evidence_urls) ? row.evidence_urls : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getSupabaseAndSession() {
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    console.error('Failed to read auth session', error);
  }

  return { supabase, session } as const;
}
