# ADR-002: Auth and Session Strategy

- Status: Accepted
- Date: 2026-08-04
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

---

## Phase 02 Concrete Decisions

### JWT payload fields

The authenticated principal extracted from a validated JWT is defined in `packages/contracts/src/auth/principal.ts` as `PrincipalSchema`:

| Field         | Type            | Notes                                         |
| ------------- | --------------- | --------------------------------------------- |
| `userId`      | UUID string     | Subject claim. Used for all ownership checks. |
| `email`       | email string    | Display and identity purposes only.           |
| `displayName` | string          | Display only.                                 |
| `role`        | `USER \| ADMIN` | Platform-level role. Not logged.              |

The `Principal` type is never constructed client-side. NestJS request pipelines extract it exclusively from a verified JWT. Do not include `passwordHash`, raw tokens, or private fields in the payload.

### Token lifetimes

- Access token: 15 minutes (`expiresIn: 900`). Short-lived to minimize the window of compromise.
- Refresh token: longer-lived (recommended 7 days for MVP). Exact TTL set via environment variable `REFRESH_TOKEN_TTL_DAYS`.

### Refresh token database model

The `RefreshToken` Prisma model in `packages/database/prisma/schema.prisma` (`refresh_tokens` table) enforces the following invariants:

| Column              | Purpose                                                                 |
| ------------------- | ----------------------------------------------------------------------- |
| `tokenHash`         | SHA-256 of the raw token. The raw value is never stored.                |
| `family`            | UUID grouping all tokens in one rotation chain.                         |
| `expiresAt`         | Hard expiry; token is rejected after this timestamp.                    |
| `revokedAt`         | Set on deliberate revocation or replay detection. Non-null = rejected.  |
| `replacedByTokenId` | Points to the successor token after rotation. Enables replay detection. |

Replay detection rule: if a token with a non-null `replacedByTokenId` is presented, the entire family (all rows sharing the same `family` value) must have `revokedAt` set immediately.

Indexes on `tokenHash`, `family`, and `userId` are required for lookup performance.

### Auth contracts in `@wildtails/contracts`

All auth request/response shapes are defined in `packages/contracts/src/auth/tokens.ts`:

| Contract          | Description                                                         |
| ----------------- | ------------------------------------------------------------------- |
| `LoginRequest`    | `{ email, password }`. Password field must never be logged.         |
| `LoginResponse`   | `{ accessToken, refreshToken, expiresIn }`. `expiresIn` is seconds. |
| `RefreshRequest`  | `{ refreshToken }`. Token field must never be logged.               |
| `RegisterRequest` | `{ email, password, displayName }`. Password must never be logged.  |

`LoginResponse` returns both tokens on first login and on each successful rotation. The client stores the refresh token in an HttpOnly cookie and the access token in memory only (never `localStorage`).

### Authorization flow for REST endpoints

```
Request
  → NestJS JwtAuthGuard (validates signature + expiry)
  → Principal extracted into request context
  → Service method checks:
      1. Does principal.userId === resource.ownerId? (owner access)
      2. If not owner: is there an active, non-expired, non-revoked SharePermission?
      3. Does resource visibility allow the principal's context?
  → Return data or throw ForbiddenException
```

### Socket.IO authentication

The access token is passed as `auth.token` in the Socket.IO handshake. The NestJS gateway validates it on the `handleConnection` hook before allowing any event. Expired tokens must close the socket with a `401` disconnect reason; the client must refresh and reconnect.
