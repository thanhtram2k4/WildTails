import { cookies } from 'next/headers';
import { REFRESH_COOKIE_NAME, REFRESH_COOKIE_OPTIONS } from './constants';

/** Writes the HttpOnly refresh token cookie. Server-side only. */
export async function setRefreshCookie(refreshToken: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(REFRESH_COOKIE_NAME, refreshToken, REFRESH_COOKIE_OPTIONS);
}

/** Reads the HttpOnly refresh token cookie. Server-side only. */
export async function getRefreshCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(REFRESH_COOKIE_NAME)?.value;
}

/** Clears the HttpOnly refresh token cookie. Server-side only. */
export async function clearRefreshCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(REFRESH_COOKIE_NAME);
}
