import { NextResponse } from 'next/server';
import { validateCsrf } from '@/lib/auth/csrf';
import { getRefreshCookie, clearRefreshCookie } from '@/lib/auth/cookies';
import { nestjsFetch } from '@/lib/auth/api-client';

/**
 * POST /api/auth/logout
 * Reads the HttpOnly refresh cookie and the client-forwarded Authorization
 * header (Bearer access token), proxies both to NestJS /auth/logout (D13),
 * then clears the refresh cookie regardless of NestJS response.
 */
export async function POST(request: Request): Promise<NextResponse> {
  if (!(await validateCsrf(request))) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'FORBIDDEN', message: 'CSRF validation failed' },
      },
      { status: 403 },
    );
  }

  const refreshToken = await getRefreshCookie();
  const authHeader = request.headers.get('authorization');

  // Even if tokens are missing, we clear the cookie and return success.
  if (!refreshToken || !authHeader) {
    await clearRefreshCookie();
    return NextResponse.json({ success: true, data: { revoked: true } });
  }

  const response = await nestjsFetch('/auth/logout', {
    method: 'POST',
    headers: { Authorization: authHeader },
    body: JSON.stringify({ refreshToken }),
  });

  // Always clear the cookie.
  await clearRefreshCookie();

  if (!response.ok) {
    // Cookie was cleared; treat as a successful client-side logout.
    return NextResponse.json({ success: true, data: { revoked: true } });
  }

  const data: unknown = await response.json();
  return NextResponse.json(data);
}
