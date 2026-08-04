# Phase 03 Auth Flow Evidence

Date: 2026-08-04
Tested against: local PostgreSQL (Docker), NestJS API on port 3000

## Register (POST /auth/register)

Request: `{ email: "test3@wildtails.dev", password: "password123", displayName: "Test Cat 3" }`

Response: **201**

- success: true
- data.accessToken: present (JWT)
- data.refreshToken: present (base64url)
- data.expiresIn: 900 (15 minutes)

## Duplicate Register

Request: same email as above

Response: **409** — CONFLICT, "Email is already registered"

## Login (POST /auth/login)

Request: `{ email: "test3@wildtails.dev", password: "password123" }`

Response: **200**

- success: true
- data.accessToken: present
- data.expiresIn: 900

## Wrong Password

Request: `{ email: "test3@wildtails.dev", password: "wrongpassword" }`

Response: **401** — UNAUTHORIZED, "Invalid credentials"

- Same error message for wrong password and non-existent email (prevents enumeration)

## Unauthenticated Access

Request: `GET /planets` (no Authorization header)

Response: **401** — UNAUTHORIZED

## Authenticated Access

Request: `GET /planets` with `Authorization: Bearer <token>`

Response: **200** — 8 planets returned (Art, Finance, Health, Learning, Pets, Sports, Travel, Work)

## Token Security

- Refresh token stored in DB as SHA-256 hash only
- Raw refresh token returned only in server-to-server response
- Password stored as argon2id hash (memoryCost=65536, timeCost=3, parallelism=1)
- JWT payload: userId, email, displayName, role
- No passwordHash in any API response
- No /api prefix on NestJS routes
