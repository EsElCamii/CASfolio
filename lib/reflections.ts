import { requireNonEmptyString, toOptionalString } from './validation';

export interface ReflectionPayload {
  id?: unknown;
  activityId?: unknown;
  activity_id?: unknown;
  title?: unknown;
  content?: unknown;
}

export interface ReflectionRecord {
  id?: string;
  user_id: string;
  activity_id: string;
  title: string;
  content: string | null;
}

export interface ReflectionResponse {
  id: string;
  activityId: string;
  title: string;
  content: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export function sanitizeReflectionPayload(payload: ReflectionPayload, userId: string, existingId?: string): ReflectionRecord {
  const title = requireNonEmptyString(payload.title, 'title');
  const content = toOptionalString(payload.content);
  const activityId =
    toOptionalString(payload.activityId) ||
    toOptionalString(payload.activity_id);

  if (!activityId) {
    throw new Error('activityId is required.');
  }

  const record: ReflectionRecord = {
    user_id: userId,
    activity_id: activityId,
    title,
    content,
  };

  if (existingId) {
    record.id = existingId;
  }

  return record;
}

export function mapReflectionRow(row: any): ReflectionResponse {
  return {
    id: row.id,
    activityId: row.activity_id,
    title: row.title,
    content: row.content ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
