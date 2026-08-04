import { NextResponse } from 'next/server';
import { validateCsrf } from '@/lib/auth/csrf';
import { setRefreshCookie } from '@/lib/auth/cookies';
import { nestjsFetch } from '@/lib/auth/api-client';
import { LoginRequestSchema } from '@wildtails/contracts';

/**
 * POST /api/auth/login
 * Proxies the login request to NestJS, extracts the refresh token into
 * an HttpOnly cookie, and returns only the access token to the browser.
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON body' },
      },
      { status: 400 },
    );
  }

  const parsed = LoginRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parsed.error.flatten(),
        },
      },
      { status: 400 },
    );
  }

  const response = await nestjsFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify(parsed.data),
  });

  const data: unknown = await response.json();

  if (!response.ok) {
    return NextResponse.json(data, { status: response.status });
  }

  // Extract refresh token and hide it in an HttpOnly cookie.
  const responseData = data as {
    success: boolean;
    data: { refreshToken: string; [key: string]: unknown };
  };
  const { refreshToken, ...browserData } = responseData.data;
  await setRefreshCookie(refreshToken);

  return NextResponse.json({ success: true, data: browserData });
}
