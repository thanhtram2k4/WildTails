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

/**
 * Rotation concurrency grace interval in milliseconds.
 *
 * When a token has been rotated (replacedByTokenId is set), a reuse within
 * this interval is treated as a concurrent in-flight refresh that lost the
 * race (LOST_RACE → 401, no family revocation). A reuse after this interval
 * is treated as a genuine replay attack (REPLAY → family revoked, then 401).
 *
 * 10 seconds is generous for any legitimate network/processing delay while
 * being short enough that a stolen token cannot be exploited silently.
 */
export const REFRESH_ROTATION_GRACE_MS = 10_000;

/** Argon2id parameters (D02). */
export const ARGON2_OPTIONS = {
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 1,
} as const;
