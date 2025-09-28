import { describe, it, beforeEach, expect, vi } from 'vitest';

vi.mock('../../lib/supabaseServer', () => ({
  createSupabaseServerClient: vi.fn(),
}));

import { createSupabaseServerClient } from '../../lib/supabaseServer';
import { GET, PUT } from '../../app/api/profile/settings/route';

const mockClient: any = {
  auth: {
    getSession: vi.fn(),
  },
  from: vi.fn(),
  storage: {
    from: vi.fn(),
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  (createSupabaseServerClient as unknown as vi.Mock).mockReturnValue(mockClient);
  mockClient.auth.getSession.mockResolvedValue({ data: { session: null }, error: null });
});

describe('/api/profile/settings', () => {
  it('GET returns 401 when no session is available', async () => {
    const response = await GET();
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toHaveProperty('layout', null);
  });

  it('PUT returns 401 when no session is available', async () => {
    const response = await PUT(
      new Request('http://localhost/api/profile/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layout: null, theme: null, content: null, customSections: [] }),
      })
    );

    expect(response.status).toBe(401);
  });
});
