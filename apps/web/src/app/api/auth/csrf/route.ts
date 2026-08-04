import { NextResponse } from 'next/server';
import { issueCsrfToken } from '@/lib/auth/csrf';

/**
 * GET /api/auth/csrf
 * Issues a CSRF token, writes it to an httpOnly:false cookie, and returns it
 * in the response body so the client can attach it to subsequent mutating
 * requests as the x-csrf-token header.
 */
export async function GET(): Promise<NextResponse> {
  const csrfToken = await issueCsrfToken();
  return NextResponse.json({ csrfToken });
}
