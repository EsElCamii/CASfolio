import { NextResponse } from 'next/server';
import type { ApiErrorShape } from './types';

export function jsonOk<T>(data: T, init: ResponseInit = {}) {
  return NextResponse.json(data, { status: 200, ...init });
}

export function jsonCreated<T>(data: T, init: ResponseInit = {}) {
  return NextResponse.json(data, { status: 201, ...init });
}

export function jsonNoContent(init: ResponseInit = {}) {
  return new NextResponse(null, { status: 204, ...init });
}

export function jsonError(error: ApiErrorShape, status = 400, init: ResponseInit = {}) {
  return NextResponse.json(error, { status, ...init });
}

export const forbidden = (message = 'Forbidden') => jsonError({ error: message }, 403);
export const unauthorized = (message = 'Not authenticated') => jsonError({ error: message }, 401);
export const notFound = (message = 'Not found') => jsonError({ error: message }, 404);

export function serverError(message = 'Unexpected server error', details?: string) {
  return jsonError({ error: message, details }, 500);
}
