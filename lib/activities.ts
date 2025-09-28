import { ensureArrayOfStrings, enforceHttpsUrls, isValidHttpsUrl, requireNonEmptyString, toIsoDate, toOptionalString } from './validation';

const ALLOWED_STATUSES = new Set(['draft', 'pending', 'completed']);

export interface ActivityPayload {
  id?: unknown;
  title?: unknown;
  description?: unknown;
  category?: unknown;
  status?: unknown;
  startDate?: unknown;
  endDate?: unknown;
  start_date?: unknown;
  end_date?: unknown;
  hours?: unknown;
  headerImageUrl?: unknown;
  header_image_url?: unknown;
  galleryImageUrls?: unknown;
  gallery_image_urls?: unknown;
  learningOutcomes?: unknown;
  learning_outcomes?: unknown;
  evidenceUrls?: unknown;
  evidence_urls?: unknown;
  impacts?: unknown;
}

export interface ActivityRecord {
  id?: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
  hours: number | null;
  header_image_url: string;
  gallery_image_urls: string[];
  learning_outcomes: string[];
  evidence_urls: string[];
  impacts: string[];
}

export interface ActivityResponse {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  status: string;
  startDate: string | null;
  endDate: string | null;
  hours: number | null;
  headerImageUrl: string;
  galleryImageUrls: string[];
  learningOutcomes: string[];
  evidenceUrls: string[];
  impacts: string[];
  createdAt?: string;
  updatedAt?: string;
}

export function sanitizeActivityPayload(payload: ActivityPayload, userId: string, existingId?: string): ActivityRecord {
  const title = requireNonEmptyString(payload.title, 'title');
  const description = toOptionalString(payload.description) ?? null;
  const category = toOptionalString(payload.category) ?? null;
  const rawStatus = toOptionalString(payload.status) ?? 'draft';

  if (!ALLOWED_STATUSES.has(rawStatus)) {
    throw new Error(`status must be one of: ${Array.from(ALLOWED_STATUSES).join(', ')}`);
  }

  const rawStart = toIsoDate(payload.startDate ?? payload.start_date);
  const rawEnd = toIsoDate(payload.endDate ?? payload.end_date);

  if (rawStart && rawEnd) {
    const start = new Date(rawStart);
    const end = new Date(rawEnd);
    if (start > end) {
      throw new Error('endDate cannot be before startDate.');
    }
  }

  let hours: number | null = null;
  if (payload.hours !== undefined && payload.hours !== null && payload.hours !== '') {
    const numeric = typeof payload.hours === 'number' ? payload.hours : Number(payload.hours);
    if (!Number.isFinite(numeric) || numeric < 0) {
      throw new Error('hours must be a non-negative number.');
    }
    hours = Number(numeric);
  }

  const headerImageUrl = toOptionalString(payload.headerImageUrl) || toOptionalString(payload.header_image_url);

  if (!headerImageUrl || !isValidHttpsUrl(headerImageUrl)) {
    throw new Error('headerImageUrl must be a valid HTTPS URL.');
  }

  const galleryImageUrls = ensureArrayOfStrings(payload.galleryImageUrls ?? payload.gallery_image_urls);
  const evidenceUrls = ensureArrayOfStrings(payload.evidenceUrls ?? payload.evidence_urls);
  const learningOutcomes = ensureArrayOfStrings(payload.learningOutcomes ?? payload.learning_outcomes);
  const impacts = ensureArrayOfStrings(payload.impacts);

  enforceHttpsUrls(galleryImageUrls, 'galleryImageUrls');
  enforceHttpsUrls(evidenceUrls, 'evidenceUrls');

  const record: ActivityRecord = {
    user_id: userId,
    title,
    description,
    category,
    status: rawStatus,
    start_date: rawStart,
    end_date: rawEnd,
    hours,
    header_image_url: headerImageUrl,
    gallery_image_urls: galleryImageUrls,
    learning_outcomes: learningOutcomes,
    evidence_urls: evidenceUrls,
    impacts,
  };

  if (existingId) {
    record.id = existingId;
  }

  return record;
}

export function mapActivityRow(row: any): ActivityResponse {
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    category: row.category ?? null,
    status: row.status,
    startDate: row.start_date ?? null,
    endDate: row.end_date ?? null,
    hours: row.hours === null || row.hours === undefined ? null : Number(row.hours),
    headerImageUrl: row.header_image_url,
    galleryImageUrls: Array.isArray(row.gallery_image_urls) ? row.gallery_image_urls : [],
    learningOutcomes: Array.isArray(row.learning_outcomes) ? row.learning_outcomes : [],
    evidenceUrls: Array.isArray(row.evidence_urls) ? row.evidence_urls : [],
    impacts: Array.isArray(row.impacts) ? row.impacts : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
