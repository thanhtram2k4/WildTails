'use client';

/**
 * Client-side API helpers.
 *
 * Auth routes go through the Next.js same-origin proxy (/api/auth/*).
 * All other authenticated routes go directly to NestJS at NEXT_PUBLIC_API_URL
 * with the Bearer access token. NestJS CORS allows http://localhost:3100.
 *
 * Access token is held in a module-scoped variable — NEVER in localStorage.
 */

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

let _accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  _accessToken = token;
}

export function getAccessToken(): string | null {
  return _accessToken;
}

/** Fetches a fresh CSRF token from the Next.js proxy. */
export async function fetchCsrfToken(): Promise<string> {
  const res = await fetch('/api/auth/csrf', { method: 'GET' });
  if (!res.ok) {
    throw new Error('Failed to fetch CSRF token');
  }
  const json = (await res.json()) as { csrfToken: string };
  return json.csrfToken;
}

type AuthProxyPath =
  '/api/auth/login' | '/api/auth/register' | '/api/auth/refresh' | '/api/auth/logout';

/**
 * Makes a request to a Next.js auth proxy route.
 * Automatically fetches a CSRF token and attaches it.
 */
export async function authFetch(path: AuthProxyPath, init?: RequestInit): Promise<Response> {
  const csrfToken = await fetchCsrfToken();
  return fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': csrfToken,
      ...init?.headers,
    },
  });
}

/**
 * Makes an authenticated request directly to NestJS.
 * For non-auth routes that require a Bearer token.
 */
export async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  };

  if (_accessToken) {
    headers['Authorization'] = `Bearer ${_accessToken}`;
  }

  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });
}

/** Attempts a silent token refresh via the Next.js proxy. */
export async function refreshAccessToken(): Promise<string | null> {
  try {
    const csrfToken = await fetchCsrfToken();
    const res = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': csrfToken,
      },
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      success: boolean;
      data: { accessToken: string };
    };
    if (!json.success) return null;
    setAccessToken(json.data.accessToken);
    return json.data.accessToken;
  } catch {
    return null;
  }
}
