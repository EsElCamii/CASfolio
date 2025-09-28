import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/supabaseServer', () => ({
  createSupabaseServerClient: vi.fn(),
}));

import { createSupabaseServerClient } from '../../lib/supabaseServer';
import { GET as GET_REFLECTIONS, POST } from '../../app/api/reflections/route';
import { GET as GET_REFLECTION } from '../../app/api/reflections/[id]/route';

const mockClient: any = {
  auth: {
    getSession: vi.fn(),
  },
  from: vi.fn(),
};

const VALID_ACTIVITY_ID = '11111111-2222-3333-4444-555555555555';
const MISSING_ACTIVITY_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';

function createActivityQuery(result: { data: any; error: any }) {
  const single = vi.fn().mockResolvedValue(result);
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const eq = vi.fn(() => ({ eq, single, maybeSingle }));
  const select = vi.fn(() => ({ eq, single, maybeSingle }));
  return { select, single, maybeSingle };
}

const insert = vi.fn();
const select = vi.fn();
const single = vi.fn();

function buildRequest(body: unknown) {
  return new Request('http://localhost/api/reflections', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  (createSupabaseServerClient as unknown as vi.Mock).mockReturnValue(mockClient);
  mockClient.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'user-123' } } } });

  const activityQuery = createActivityQuery({ data: { id: VALID_ACTIVITY_ID }, error: null });

  single.mockResolvedValue({
    data: {
      id: 'reflection-1',
      activity_id: VALID_ACTIVITY_ID,
      title: 'Reflection',
      content: 'Content',
      created_at: '2024-01-01T00:00:00.000Z',
      updated_at: '2024-01-01T00:00:00.000Z',
    },
    error: null,
  });

  select.mockReturnValue({ single });
  insert.mockReturnValue({ select });

  mockClient.from.mockImplementation((table: string) => {
    if (table === 'activities') {
      return { select: activityQuery.select };
    }
    if (table === 'reflections') {
      return { insert };
    }
    throw new Error(`Unexpected table ${table}`);
  });
});

describe('POST /api/reflections', () => {
  it('returns 401 when session is missing', async () => {
    mockClient.auth.getSession.mockResolvedValue({ data: { session: null } });

    const response = await POST(buildRequest({}));

    expect(response.status).toBe(401);
  });

  it('validates that the activity exists for the current user', async () => {
    const activityQuery = createActivityQuery({ data: null, error: { message: 'not found' } });
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'activities') {
        return { select: activityQuery.select };
      }
      if (table === 'reflections') {
        return { insert };
      }
      throw new Error(`Unexpected table ${table}`);
    });

    const response = await POST(
      buildRequest({
        activityId: MISSING_ACTIVITY_ID,
        title: 'Title',
        content: 'Content',
      })
    );

    expect(response.status).toBe(404);
  });

  it('creates a reflection when payload is valid', async () => {
    const response = await POST(
      buildRequest({
        activityId: VALID_ACTIVITY_ID,
        title: 'Reflection',
        content: 'Content',
      })
    );

    expect(response.status).toBe(201);
    const payload = await response.json();
    expect(payload.reflection).toMatchObject({ title: 'Reflection', activityId: VALID_ACTIVITY_ID });
    expect(insert).toHaveBeenCalled();
  });
});

describe('GET /api/reflections', () => {
  it('returns 401 when unauthenticated', async () => {
    mockClient.auth.getSession.mockResolvedValue({ data: { session: null } });

    const response = await GET_REFLECTIONS();

    expect(response.status).toBe(401);
  });

  it('returns a list of reflections for an authenticated user', async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'reflection-1',
          activity_id: VALID_ACTIVITY_ID,
          title: 'Reflection',
          content: 'Content',
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
      ],
      error: null,
    });
    const eq = vi.fn(() => ({ order }));
    const selectReflections = vi.fn(() => ({ eq }));
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'reflections') {
        return { select: selectReflections };
      }
      if (table === 'activities') {
        return createActivityQuery({ data: { id: VALID_ACTIVITY_ID }, error: null });
      }
      throw new Error(`Unexpected table ${table}`);
    });

    const response = await GET_REFLECTIONS();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(body.reflections)).toBe(true);
    expect(body.reflections[0]).toMatchObject({ id: 'reflection-1', activityId: VALID_ACTIVITY_ID });
  });
});

describe('GET /api/reflections/:id', () => {
  it('returns 401 when unauthenticated', async () => {
    mockClient.auth.getSession.mockResolvedValue({ data: { session: null } });

    const response = await GET_REFLECTION(new Request('http://localhost/api/reflections/reflection-1'), { params: { id: 'reflection-1' } });

    expect(response.status).toBe(401);
  });

  it('returns a reflection when found', async () => {
    const maybeSingleReflection = vi.fn().mockResolvedValue({
      data: {
        id: 'reflection-1',
        activity_id: VALID_ACTIVITY_ID,
        title: 'Reflection',
        content: 'Content',
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      },
      error: null,
      status: 200,
    });
    const eqReflectionById = vi.fn(() => ({ maybeSingle: maybeSingleReflection }));
    const eqReflectionByUser = vi.fn(() => ({ eq: eqReflectionById }));
    const selectReflection = vi.fn(() => ({ eq: eqReflectionByUser }));

    mockClient.from.mockImplementation((table: string) => {
      if (table === 'reflections') {
        return { select: selectReflection };
      }
      if (table === 'activities') {
        return createActivityQuery({ data: { id: VALID_ACTIVITY_ID }, error: null });
      }
      throw new Error(`Unexpected table ${table}`);
    });

    const response = await GET_REFLECTION(new Request('http://localhost/api/reflections/reflection-1'), { params: { id: 'reflection-1' } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.reflection).toMatchObject({ id: 'reflection-1', activityId: VALID_ACTIVITY_ID });
  });
});
