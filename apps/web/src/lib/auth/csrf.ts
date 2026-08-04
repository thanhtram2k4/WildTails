import { randomBytes, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { ALLOWED_ORIGINS, CSRF_COOKIE_NAME, CSRF_COOKIE_OPTIONS, CSRF_HEADER } from './constants';

/** Generates a cryptographically random CSRF token. */
export function generateCsrfToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Validates the CSRF state for a state-mutating request.
 * Returns false if the Origin is not in ALLOWED_ORIGINS, the cookie is
 * missing, the header is missing, or the two tokens do not match.
 */
export async function validateCsrf(request: Request): Promise<boolean> {
  // 1. Validate Origin header — cheap first check.
  const origin = request.headers.get('origin');
  if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
    return false;
  }

  // 2. Retrieve token from the CSRF cookie.
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_COOKIE_NAME)?.value;
  if (!cookieToken) return false;

  // 3. Retrieve token from the CSRF header.
  const headerToken = request.headers.get(CSRF_HEADER);
  if (!headerToken) return false;

  // 4. Constant-time comparison to prevent timing attacks.
  try {
    const a = Buffer.from(cookieToken);
    const b = Buffer.from(headerToken);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Issues a fresh CSRF token and writes it to the CSRF cookie.
 * Call this from the GET /api/auth/csrf route only.
 */
export async function issueCsrfToken(): Promise<string> {
  const token = generateCsrfToken();
  const cookieStore = await cookies();
  cookieStore.set(CSRF_COOKIE_NAME, token, CSRF_COOKIE_OPTIONS);
  return token;
}
