# ADR-002: Auth and Session Strategy

- Status: Accepted
- Date: 2026-07-31
- Decision owners: Human
- Related phase: 03

## Context

WildTails needs authentication for all users. Sessions must work with both REST API and WebSocket connections. Security requirements include short-lived access, refresh token rotation, revocation, and replay detection.

OAuth (Google Login) is explicitly excluded from MVP and moved to P2. MVP uses email-password authentication only.

## Decision

Hybrid approach: short-lived JWT access token + DB-backed rotating refresh token.

- Short-lived JWT access token (15 min) for stateless API auth.
- DB-backed refresh token with rotation and family-based revocation.
- Replay detection: reuse of a rotated-out refresh token triggers revocation of the entire token family.
- HttpOnly secure cookie for refresh token; Authorization header for access token.
- Socket.IO authenticates via access token on connection handshake.
- No OAuth in MVP. Social login (Google) is P2 and may only be considered after P0 and P1 are stable.

## Alternatives considered

### Fully stateless JWT (access + refresh both JWT)

Pro: no DB lookup for auth. Con: cannot revoke access tokens immediately; refresh token replay harder to detect without DB.

### Fully session-based (server-side sessions in Redis)

Pro: instant revocation, simple. Con: every request hits Redis; harder to scale; Socket.IO needs session sharing.

### Third-party auth (Auth0, Clerk, Supabase Auth)

Pro: less code. Con: external dependency, cost, vendor lock-in, less control for thesis evaluation.

### OAuth in MVP

Rejected by human decision D03. Social login adds OAuth provider setup, callback handling, and account linking complexity. Deferred to P2.

## Consequences

### Positive

- Short-lived JWT minimizes window of compromise.
- DB-backed refresh enables rotation and replay detection.
- Simpler MVP scope without OAuth integration.

### Negative

- Must implement token refresh logic on client.
- Must handle refresh token in secure cookie properly.
- No social login convenience in MVP.

### Risks

- Refresh token replay if not properly rotated (mitigated by family revocation).
- CSRF on cookie-based refresh endpoint (mitigated by SameSite + CSRF token).

## Validation

- Login returns access + refresh tokens.
- Expired access token returns 401; client refreshes successfully.
- Refresh token rotation works; old token is rejected.
- Token replay triggers family revocation.
- No OAuth endpoints exist in MVP.

## Revisit trigger

- P2 activation: add OAuth (Google) when P0 and P1 are stable.
- Need to support mobile app (may need different token delivery).
