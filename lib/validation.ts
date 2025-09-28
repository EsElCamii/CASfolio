export function isValidHttpsUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.trim() === '') {
    return false;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:';
  } catch (error) {
    return false;
  }
}

export function ensureArrayOfStrings(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item !== '');
}

export function toOptionalString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

export function enforceHttpsUrls(values: string[], fieldName: string) {
  for (const url of values) {
    if (!isValidHttpsUrl(url)) {
      throw new Error(`${fieldName} must use HTTPS URLs.`);
    }
  }
}

const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function toIsoDate(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!ISO_DATE_REGEX.test(trimmed)) {
    return null;
  }
  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return trimmed;
}

export function requireNonEmptyString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string.`);
  }
  const trimmed = value.trim();
  if (trimmed === '') {
    throw new Error(`${fieldName} cannot be empty.`);
  }
  return trimmed;
}
