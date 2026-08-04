# Phase 03 — Identity and Default Planets: Final Report

Date: 2026-08-04
Branch: phase/03-identity-and-planets
Status: READY_FOR_REVIEW

## Scope Delivered

1. Register / Login / Logout / Refresh per ADR-002
2. Argon2id password hashing (memoryCost=65536, timeCost=3, parallelism=1)
3. JWT guards: global default-deny JwtAuthGuard + mandatory RolesGuard
4. Atomic refresh token rotation with ReadCommitted transactions
5. Replay detection: family revocation committed before 401 response
6. Token security: SHA-256 hashes only, node:crypto randomBytes
7. Zod 4 validation pipe (no class-validator), ApiErrorEnvelope errors
8. User profile: GET/PATCH /users/me (with email), GET /users/:id (no email)
9. Layered avatar config: base/fur/eyes/outfit/accessory/background (typed enums)
10. 8 default planets seeded idempotently (Learning, Sports, Finance, Work, Travel, Health, Pets, Art)
11. Planet membership: join/leave/rejoin per D15
12. Next.js auth proxy: /api/auth/* routes with HttpOnly refresh cookie
13. CSRF double-submit cookie with constant-time comparison
14. Minimal onboarding UI: register, login, avatar builder, planet selection
15. Prisma 7 config with schema/migrations/seed/datasource structure
16. First migration: 31 tables, 10 enums, all indexes and constraints
17. Framework-independent database package (no @nestjs imports)

## Test Summary

| Category                                  | Count  | Status       |
| ----------------------------------------- | ------ | ------------ |
| Contract tests                            | 13     | PASS         |
| Worker tests                              | 1      | PASS         |
| API unit tests                            | 47     | PASS         |
| API integration tests (PostgreSQL-backed) | 7      | PASS         |
| Playwright E2E tests                      | 11     | PASS         |
| Screenshot capture tests                  | 4      | PASS         |
| **Total**                                 | **83** | **ALL PASS** |

## Key Integration Test Results

- Concurrent refresh: exactly 1 of 2 requests succeeds (PASS)
- Genuine replay: consumed token → 401, family revoked (PASS)
- Family revocation committed: successor token rejected after replay (PASS)
- Transaction persistence: fresh login after revocation works (PASS)

## Enum Reconciliation

- 10 Prisma enums = 10 PostgreSQL CREATE TYPE statements
- Phase 02 "14 enums" included 4 Zod-only contract enums (not a defect)

## Known Limitations

- Next.js 16 build uses --webpack flag (Turbopack lacks .js→.ts resolution for workspace packages)
- Onboarding screenshots show loading states (Playwright mocks cannot fully replicate client auth context)
- Avatar assets are placeholder SVGs — requires human visual approval
- Planet descriptions are temporary product copy
- Secret scan flags 21 false positives (test passwords and mock tokens) — all reviewed, no real secrets
- Concurrent refresh in single-process NestJS serializes at event loop level — second request sees completed rotation and treats it as replay (security-correct behavior)

## Items Requiring Human Visual Approval

1. Register page UI (screenshot available: register-page.png)
2. Login page UI (screenshot available: login-page.png)
3. Avatar builder UI — **must be viewed with live API + web running**
4. Planet selection — **must be viewed with live API + web running**
5. Dashboard — **must be viewed with live API + web running**
6. Onboarding flow — **must be viewed end-to-end with live API + web**

## How to Run Live Visual Review

```bash
# Terminal 1: Start infrastructure
docker compose -f infra/docker/docker-compose.yml up -d postgres

# Terminal 2: Start API
DATABASE_URL="postgresql://wildtails:wildtails_local_dev@localhost:5432/wildtails" \
JWT_SECRET="wildtails-dev-secret-change-in-production" \
ALLOWED_ORIGINS="http://localhost:3100" \
pnpm --filter @wildtails/api start

# Terminal 3: Start web
pnpm --filter @wildtails/web dev

# Open http://localhost:3100/register in browser
```
