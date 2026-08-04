# Phase 03 Cookie and CSRF Evidence

Date: 2026-08-04

## HttpOnly Refresh Cookie

- Cookie name (local): `wildtails_refresh`
- HttpOnly: true (browser JS cannot access)
- Secure: false (local dev)
- SameSite: Lax
- Path: /api/auth
- Max-Age: 604800 (7 days)

## Cookie transport flow

1. Browser POST /api/auth/login → Next.js Route Handler
2. Next.js forwards to NestJS /auth/login → receives LoginResponse
3. Next.js sets HttpOnly cookie with refreshToken
4. Browser receives { accessToken, expiresIn } only (no refreshToken)

## CSRF Protection

- GET /api/auth/csrf issues a random token and sets `wildtails_csrf` cookie
- Client sends token in `X-CSRF-Token` header on state-changing requests
- Server validates: Origin header + cookie/header constant-time comparison

## Playwright E2E verification

- Test "login request includes x-csrf-token header": PASS
  - Verified that the login request includes `X-CSRF-Token: sentinel-token-xyz`
  - The token matches what was returned by /api/auth/csrf

## Cookie attributes (production)

- Refresh cookie name: `__Secure-wildtails_refresh` (Secure prefix)
- CSRF cookie name: `__Host-wildtails_csrf` (Host prefix, Path=/, no Domain)
- Both cookies: Secure=true in production

## Browser response verification

- The Next.js proxy strips refreshToken from the response body
- Only accessToken and expiresIn are returned to browser JavaScript
- Access token stored in React module variable (not localStorage)
