import { NESTJS_API_URL } from './constants';

/**
 * Server-side HTTP client for NestJS.
 * Only call this from Next.js API routes or Server Components.
 * Never call this from client components — NESTJS_API_URL is server-only.
 */
export async function nestjsFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = `${NESTJS_API_URL}${path}`;
  return fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
}
