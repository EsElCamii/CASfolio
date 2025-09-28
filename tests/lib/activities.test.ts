import { describe, expect, it } from 'vitest';
import { sanitizeActivityPayload } from '../../lib/activities';

describe('sanitizeActivityPayload', () => {
  it('normalizes a valid payload', () => {
    const record = sanitizeActivityPayload(
      {
        title: 'Test Activity',
        category: 'creativity',
        description: 'Sample',
        startDate: '2024-01-01',
        endDate: '2024-01-02',
        hours: 5,
        status: 'pending',
        headerImageUrl: 'https://example.com/image.png',
        learningOutcomes: ['Leadership'],
      },
      'user-123'
    );

    expect(record.user_id).toBe('user-123');
    expect(record.header_image_url).toBe('https://example.com/image.png');
    expect(record.learning_outcomes).toContain('Leadership');
    expect(record.status).toBe('pending');
  });

  it('throws when headerImageUrl is not HTTPS', () => {
    expect(() =>
      sanitizeActivityPayload(
        {
          title: 'Invalid',
          category: 'activity',
          description: '',
          startDate: '2024-01-01',
          hours: 2,
          status: 'draft',
          headerImageUrl: 'http://example.com/image.png',
        },
        'user-123'
      )
    ).toThrow(/https/i);
  });
});
