/**
 * Auth configuration constants.
 * Sensitive values (JWT_SECRET) are read from env — never hard-coded in production.
 */

/** Fallback secret for local development only. Must be overridden in production via JWT_SECRET. */
export const JWT_SECRET_FALLBACK = 'wildtails-dev-secret-change-in-production';

/** Access token lifetime in seconds (15 minutes). */
export const ACCESS_TOKEN_EXPIRES_IN_SECONDS = 900;

/** Refresh token lifetime in days. */
export const REFRESH_TOKEN_EXPIRES_IN_DAYS = 7;

/** Argon2id parameters (D02). */
export const ARGON2_OPTIONS = {
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 1,
} as const;
