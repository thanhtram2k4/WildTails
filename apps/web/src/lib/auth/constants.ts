/**
 * Auth constants — server-only.
 * Never import this file in client components.
 * NESTJS_API_URL must not be exposed to the browser.
 */

const isProduction = process.env['NODE_ENV'] === 'production';

/** Base URL of the NestJS API — server-only, never NEXT_PUBLIC_. */
export const NESTJS_API_URL = process.env['NESTJS_API_URL'] ?? 'http://localhost:3000';

/** Origins permitted to make state-mutating requests. */
export const ALLOWED_ORIGINS = (process.env['ALLOWED_ORIGINS'] ?? 'http://localhost:3100').split(
  ',',
);

export const REFRESH_COOKIE_NAME = isProduction
  ? '__Secure-wildtails_refresh'
  : 'wildtails_refresh';

export const CSRF_COOKIE_NAME = isProduction ? '__Host-wildtails_csrf' : 'wildtails_csrf';

/** Header name the client must echo back with the CSRF token. */
export const CSRF_HEADER = 'x-csrf-token';

/** 7 days in seconds. */
export const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60;

export const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax' as const,
  /** Scoped to only the proxy auth routes. */
  path: '/api/auth',
  maxAge: REFRESH_COOKIE_MAX_AGE,
};

export const CSRF_COOKIE_OPTIONS = {
  httpOnly: false,
  secure: isProduction,
  sameSite: 'lax' as const,
  path: '/',
};
