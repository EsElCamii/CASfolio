import { describe, it, beforeEach, expect, vi } from 'vitest';
vi.mock('../../lib/supabaseServer', () => ({
  createSupabaseServerClient: vi.fn(),
}));

import { createSupabaseServerClient } from '../../lib/supabaseServer';
import { GET as GET_ACTIVITIES, POST } from '../../app/api/activities/route';
import { GET as GET_ACTIVITY } from '../../app/api/activities/[id]/route';

const mockClient: any = {
  auth: {
    getSession: vi.fn(),
  },
  from: vi.fn(),
};

const insert = vi.fn();
const select = vi.fn();
const single = vi.fn();

function buildRequest(body: unknown) {
  return new Request('http://localhost/api/activities', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  (createSupabaseServerClient as unknown as vi.Mock).mockReturnValue(mockClient);
  mockClient.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'user-123' } } } });
  mockClient.from.mockImplementation(() => ({ insert }));
  insert.mockReturnValue({ select });
  select.mockReturnValue({ single });
});

describe('POST /api/activities', () => {
  it('returns 401 when there is no active session', async () => {
    mockClient.auth.getSession.mockResolvedValue({ data: { session: null } });

    const response = await POST(buildRequest({}));

    expect(response.status).toBe(401);
  });

  it('validates headerImageUrl', async () => {
    const response = await POST(
      buildRequest({
        title: 'Test activity',
        category: 'creativity',
        description: 'Sample',
        startDate: '2024-01-01',
        hours: 5,
        status: 'draft',
        headerImageUrl: 'http://insecure.example.com/image.png',
        learningOutcomes: [],
      })
    );

    const data = await response.json();

    expect(response.status).toBe(422);
    expect(data.error).toMatch(/https/i);
    expect(insert).not.toHaveBeenCalled();
  });

  it('inserts a valid activity and returns the mapped payload', async () => {
    single.mockResolvedValue({
      data: {
        id: 'activity-1',
        title: 'Valid Activity',
        description: 'Sample',
        category: 'creativity',
        start_date: '2024-01-01',
        end_date: null,
        hours: 10,
        status: 'draft',
        header_image_url: 'https://example.com/header.png',
        gallery_image_urls: [],
        learning_outcomes: [],
        evidence_urls: [],
        impacts: [],
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      },
      error: null,
    });

    const response = await POST(
      buildRequest({
        title: 'Valid Activity',
        category: 'creativity',
        description: 'Sample',
        startDate: '2024-01-01',
        hours: 10,
        status: 'draft',
        headerImageUrl: 'https://example.com/header.png',
        learningOutcomes: ['Leadership'],
      })
    );

    expect(response.status).toBe(201);
    const payload = await response.json();
    expect(payload.activity).toMatchObject({
      id: 'activity-1',
      header_image_url: 'https://example.com/header.png',
      headerImageUrl: 'https://example.com/header.png',
      status: 'draft',
    });
    expect(insert).toHaveBeenCalled();
  });
});

describe('GET /api/activities', () => {
  it('returns 401 when unauthenticated', async () => {
    mockClient.auth.getSession.mockResolvedValue({ data: { session: null } });

    const response = await GET_ACTIVITIES();

    expect(response.status).toBe(401);
  });

  it('returns mapped activities for an authenticated user', async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'activity-1',
          title: 'Valid Activity',
          description: null,
          category: 'creativity',
          start_date: '2024-01-01',
          end_date: null,
          hours: 10,
          status: 'pending',
          header_image_url: 'https://example.com/image.png',
          learning_outcomes: [],
          gallery_image_urls: [],
          evidence_urls: [],
          created_at: '2024-01-01T00:00:00.000Z',
          updated_at: '2024-01-01T00:00:00.000Z',
        },
      ],
      error: null,
    });
    const eq = vi.fn(() => ({ order }));
    const selectActivities = vi.fn(() => ({ eq }));
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'activities') {
        return { select: selectActivities };
      }
      throw new Error(`Unexpected table ${table}`);
    });

    const response = await GET_ACTIVITIES();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(Array.isArray(body.activities)).toBe(true);
    expect(body.activities[0]).toMatchObject({
      id: 'activity-1',
      header_image_url: 'https://example.com/image.png',
      headerImageUrl: 'https://example.com/image.png',
    });
  });
});

describe('GET /api/activities/:id', () => {
  it('returns 401 when unauthenticated', async () => {
    mockClient.auth.getSession.mockResolvedValue({ data: { session: null } });

    const response = await GET_ACTIVITY(new Request('http://localhost/api/activities/activity-1'), { params: { id: 'activity-1' } });

    expect(response.status).toBe(401);
  });

  it('returns an activity when found', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        id: 'activity-1',
        title: 'Valid Activity',
        description: 'Sample',
        category: 'creativity',
        start_date: '2024-01-01',
        end_date: null,
        hours: 10,
        status: 'pending',
        header_image_url: 'https://example.com/image.png',
        learning_outcomes: [],
        gallery_image_urls: [],
        evidence_urls: [],
        created_at: '2024-01-01T00:00:00.000Z',
        updated_at: '2024-01-01T00:00:00.000Z',
      },
      error: null,
      status: 200,
    });
    const eqById = vi.fn(() => ({ maybeSingle }));
    const eqByUser = vi.fn(() => ({ eq: eqById }));
    const selectActivity = vi.fn(() => ({ eq: eqByUser }));
    mockClient.from.mockImplementation((table: string) => {
      if (table === 'activities') {
        return { select: selectActivity };
      }
      throw new Error(`Unexpected table ${table}`);
    });

    const response = await GET_ACTIVITY(new Request('http://localhost/api/activities/activity-1'), { params: { id: 'activity-1' } });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.activity).toMatchObject({
      id: 'activity-1',
      header_image_url: 'https://example.com/image.png',
      headerImageUrl: 'https://example.com/image.png',
    });
  });
});
