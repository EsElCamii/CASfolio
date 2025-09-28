import { getSupabaseAndSession, safeString } from '../activities/utils';

export interface ReflectionPayload {
  activity_id?: unknown;
  activityId?: unknown;
  title?: unknown;
  content?: unknown;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function validateReflectionPayload(payload: ReflectionPayload) {
  const activityId = safeString(payload.activity_id || payload.activityId);
  if (!activityId || !UUID_REGEX.test(activityId)) {
    return { error: 'activity_id must be a valid UUID.' } as const;
  }

  const title = safeString(payload.title);
  if (!title) {
    return { error: 'Title is required.' } as const;
  }
  if (title.length > 255) {
    return { error: 'Title must be 255 characters or fewer.' } as const;
  }

  const content = safeString(payload.content);
  if (content.length > 10000) {
    return { error: 'Content must be 10,000 characters or fewer.' } as const;
  }

  return {
    data: {
      activity_id: activityId,
      title,
      content,
    },
  } as const;
}

export function mapDbReflection(row: any) {
  return {
    id: row.id,
    activityId: row.activity_id,
    title: row.title,
    content: row.content ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export { getSupabaseAndSession };
