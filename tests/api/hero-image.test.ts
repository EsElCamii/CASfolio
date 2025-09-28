import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../lib/supabaseServer', () => ({
  createSupabaseServerClient: vi.fn(),
}));

import { createSupabaseServerClient } from '../../lib/supabaseServer';
import { POST } from '../../app/api/hero-image/route';

const mockClient: any = {
  auth: {
    getSession: vi.fn(),
  },
  storage: {
    from: vi.fn(),
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  (createSupabaseServerClient as unknown as vi.Mock).mockReturnValue(mockClient);
  mockClient.auth.getSession.mockResolvedValue({ data: { session: { user: { id: 'user-123' } } }, error: null });
});

describe('POST /api/hero-image', () => {
  it('requires a file to be present in the form payload', async () => {
    const formData = new FormData();
    const request = new Request('http://localhost/api/hero-image', {
      method: 'POST',
      body: formData,
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toMatch(/missing file/i);
  });
});
