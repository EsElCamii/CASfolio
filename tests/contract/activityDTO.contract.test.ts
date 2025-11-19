import { beforeAll, describe, expect, it } from 'vitest';
import type { ActivityRow } from '../../lib/api/activities';

let mapActivityRow: typeof import('../../lib/api/activities')['mapActivityRow'];

beforeAll(async () => {
  const module = await import('../../lib/api/activities');
  mapActivityRow = module.mapActivityRow;
});

describe('ActivityDTO contract mapping', () => {
  it('maps database rows into DTO compatible payloads', () => {
    const row: ActivityRow = {
      id: 'activity-1',
      student_id: 'user-1',
      title: 'Activity Title',
      description: 'Description',
      category: 'creativity',
      status: 'completed',
      start_date: '2024-01-01',
      end_date: '2024-02-01',
      hours: 8,
      learning_outcomes: ['Leadership'],
      header_image_path: 'path/to/header.jpg',
      header_image_checksum: 'checksum',
      header_image_updated_at: '2024-02-01T00:00:00.000Z',
      created_at: '2024-02-01T00:00:00.000Z',
      updated_at: '2024-02-01T00:00:00.000Z',
      activity_assets: [
        {
          id: 'asset-1',
          activity_id: 'activity-1',
          storage_path: 'path/to/asset.png',
          mime_type: 'image/png',
          checksum: 'checksum-asset',
          size_bytes: 2048,
          created_at: '2024-02-01T00:00:00.000Z',
        },
      ],
    };

    const headerSignedUrls = new Map([[row.header_image_path, 'https://signed.example/header.jpg']]);
    const assetSignedUrls = new Map([[row.activity_assets![0].storage_path, 'https://signed.example/asset.png']]);

    const dto = mapActivityRow(row, headerSignedUrls, assetSignedUrls);

    expect(dto).toMatchObject({
      id: row.id,
      studentId: row.student_id,
      title: row.title,
      category: row.category,
      status: row.status,
      headerImageUrl: 'https://signed.example/header.jpg',
      assets: [
        {
          id: 'asset-1',
          activityId: row.id,
          url: 'https://signed.example/asset.png',
          mimeType: 'image/png',
        },
      ],
    });
  });

  it('normalizes string hours into numeric payloads', () => {
    const row: ActivityRow = {
      id: 'activity-2',
      student_id: 'user-2',
      title: 'Service Project',
      description: null,
      category: 'service',
      status: 'ongoing',
      start_date: null,
      end_date: null,
      hours: '20.09' as any,
      learning_outcomes: [],
      header_image_path: null,
      header_image_checksum: null,
      header_image_updated_at: null,
      challenge_description: null,
      rating: null,
      difficulty: null,
      created_at: '2024-03-01T00:00:00.000Z',
      updated_at: '2024-03-02T00:00:00.000Z',
      activity_assets: [],
    };

    const dto = mapActivityRow(row, new Map(), new Map());

    expect(dto.hours).toBe(20.09);
  });
});
