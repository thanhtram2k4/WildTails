import { NextResponse } from 'next/server';
import { validateCsrf } from '@/lib/auth/csrf';
import { getRefreshCookie, setRefreshCookie, clearRefreshCookie } from '@/lib/auth/cookies';
import { nestjsFetch } from '@/lib/auth/api-client';

/**
 * POST /api/auth/refresh
 * Reads the HttpOnly refresh cookie, exchanges it at NestJS for a new token
 * pair, rotates the cookie, and returns the new access token to the browser.
 * On NestJS failure the refresh cookie is cleared to force re-login.
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
  if (!refreshToken) {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'No refresh token' },
      },
      { status: 401 },
    );
  }

  const response = await nestjsFetch('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });

  const data: unknown = await response.json();

  if (!response.ok) {
    // Clear the invalid cookie so subsequent requests fail fast.
    await clearRefreshCookie();
    return NextResponse.json(data, { status: response.status });
  }

  const responseData = data as {
    success: boolean;
    data: { refreshToken: string; [key: string]: unknown };
  };
  const { refreshToken: newRefreshToken, ...browserData } = responseData.data;
  await setRefreshCookie(newRefreshToken);

  return NextResponse.json({ success: true, data: browserData });
}
