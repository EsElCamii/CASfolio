import { beforeAll, describe, expect, it } from 'vitest';

let assertCategory: (value: unknown) => string;
let assertStatus: (value: unknown) => string;
let normalizeLearningOutcomes: (value: unknown) => string[];
let normalizeHoursValue: (value: unknown) => number;

beforeAll(async () => {
  const module = await import('../../lib/api/activities');
  assertCategory = module.assertCategory;
  assertStatus = module.assertStatus;
  normalizeLearningOutcomes = module.normalizeLearningOutcomes;
  normalizeHoursValue = module.normalizeHoursValue;
});

describe('activity validation helpers', () => {
  it('accepts supported categories', () => {
    expect(assertCategory('creativity')).toBe('creativity');
    expect(assertCategory('activity')).toBe('activity');
    expect(assertCategory('service')).toBe('service');
  });

  it('rejects unsupported categories', () => {
    expect(() => assertCategory('music')).toThrow(/Unsupported activity category/);
  });

  it('accepts supported statuses', () => {
    expect(assertStatus('draft')).toBe('draft');
    expect(assertStatus('pending')).toBe('pending');
    expect(assertStatus('completed')).toBe('completed');
  });

  it('rejects unsupported statuses', () => {
    expect(() => assertStatus('archived')).toThrow(/Unsupported activity status/);
  });

  it('normalizes arrays, strings, and filters blanks', () => {
    expect(normalizeLearningOutcomes([' One ', ''])).toEqual(['One']);
    expect(normalizeLearningOutcomes('One, Two')).toEqual(['One', 'Two']);
    expect(normalizeLearningOutcomes(null)).toEqual([]);
  });

  it('caps learning outcomes at 24 entries', () => {
    const inputs = Array.from({ length: 40 }, (_, index) => `Outcome ${index}`);
    const result = normalizeLearningOutcomes(inputs);
    expect(result.length).toBe(24);
    expect(result[0]).toBe('Outcome 0');
  });

  it('normalizes hours from strings and clamps/rounds sensibly', () => {
    expect(normalizeHoursValue('10.75')).toBe(10.75);
    expect(normalizeHoursValue('10,73')).toBe(10.73);
    expect(normalizeHoursValue(-2)).toBe(0);
    expect(normalizeHoursValue('not-a-number')).toBe(0);
  });
});
