'use client';

/**
 * Typed helpers for the WildTails API.
 *
 * All requests go through apiFetch which attaches the Bearer token held
 * in a module-scoped variable (never in localStorage/cookies on the client).
 *
 * Envelope shapes match the backend ApiSuccessEnvelope / ApiErrorEnvelope.
 */

import { apiFetch } from './api';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface SuccessEnvelope<T> {
  success: true;
  data: T;
  meta?: {
    cursor: string | null;
    hasMore: boolean;
    total?: number;
  };
}

async function parseEnvelope<T>(res: Response): Promise<SuccessEnvelope<T>> {
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { message?: string; error?: string };
      if (body.message) message = body.message;
      else if (body.error) message = body.error;
    } catch {
      // Response may not be JSON.
    }
    throw new ApiError(message, res.status);
  }

  const json = (await res.json()) as SuccessEnvelope<T>;
  if (!json.success) {
    throw new ApiError('Unexpected response from server', res.status);
  }
  return json;
}

/** GET /path and unwrap envelope. */
export async function apiGet<T>(path: string): Promise<SuccessEnvelope<T>> {
  const res = await apiFetch(path, { method: 'GET' });
  return parseEnvelope<T>(res);
}

/** POST /path with JSON body. */
export async function apiPost<T>(path: string, body: unknown): Promise<SuccessEnvelope<T>> {
  const res = await apiFetch(path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return parseEnvelope<T>(res);
}

/** PATCH /path with JSON body. */
export async function apiPatch<T>(path: string, body: unknown): Promise<SuccessEnvelope<T>> {
  const res = await apiFetch(path, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
  return parseEnvelope<T>(res);
}

/** DELETE /path. */
export async function apiDelete(path: string): Promise<void> {
  const res = await apiFetch(path, { method: 'DELETE' });
  if (!res.ok) {
    let message = `Delete failed (${res.status})`;
    try {
      const body = (await res.json()) as { message?: string };
      if (body.message) message = body.message;
    } catch {
      // Response may not be JSON.
    }
    throw new ApiError(message, res.status);
  }
}

/** True when the error is a network/offline failure. */
export function isOfflineError(err: unknown): boolean {
  return err instanceof TypeError && err.message.toLowerCase().includes('failed to fetch');
}

/** True when the error is a 401 Unauthorized. */
export function isUnauthorizedError(err: unknown): boolean {
  return err instanceof ApiError && err.status === 401;
}
