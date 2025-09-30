const SIGNATURES: Record<string, number[]> = {
  'image/png': [0x89, 0x50, 0x4e, 0x47],
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/gif': [0x47, 0x49, 0x46, 0x38],
  'image/webp': [0x52, 0x49, 0x46, 0x46],
};

const ALLOWED_MIME_TYPES = new Set(Object.keys(SIGNATURES));

export interface ImageValidationOptions {
  maxBytes: number;
  allowedMimeTypes?: Set<string>;
}

export interface ImageValidationResult {
  ok: boolean;
  inferredMime?: string;
  error?: string;
}

export function sniffMimeType(buffer: ArrayBuffer): string | null {
  const bytes = new Uint8Array(buffer).subarray(0, 12);

  // PNG
  if (bytes.length >= 4 && SIGNATURES['image/png'].every((b, idx) => bytes[idx] === b)) {
    return 'image/png';
  }

  // JPEG
  if (bytes.length >= 3 && SIGNATURES['image/jpeg'].every((b, idx) => bytes[idx] === b)) {
    return 'image/jpeg';
  }

  // GIF
  if (bytes.length >= 4 && SIGNATURES['image/gif'].every((b, idx) => bytes[idx] === b)) {
    return 'image/gif';
  }

  // WEBP (RIFF + WEBP)
  if (
    bytes.length >= 12 &&
    SIGNATURES['image/webp'].every((b, idx) => bytes[idx] === b) &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return 'image/webp';
  }

  return null;
}

export async function validateImageFile(file: File | Blob, options: ImageValidationOptions): Promise<ImageValidationResult> {
  const allowed = options.allowedMimeTypes ?? ALLOWED_MIME_TYPES;
  if (file.size > options.maxBytes) {
    return { ok: false, error: `File exceeds maximum size of ${options.maxBytes} bytes` };
  }

  const buffer = await file.arrayBuffer();
  const inferred = sniffMimeType(buffer);
  if (!inferred || !allowed.has(inferred)) {
    return { ok: false, error: 'Unsupported image type. Allowed formats: PNG, JPEG, GIF, WEBP' };
  }

  return { ok: true, inferredMime: inferred };
}

export function safeNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function sanitizeString(value: unknown, maxLength = 2048): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}
