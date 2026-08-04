# Phase 03 — Identity and Default Planets: Final Report

Date: 2026-08-04
Branch: phase/03-identity-and-planets
Status: READY_FOR_REVIEW

## Scope Delivered

1. Register / Login / Logout / Refresh per ADR-002
2. Argon2id password hashing (memoryCost=65536, timeCost=3, parallelism=1)
3. JWT guards: global default-deny JwtAuthGuard + mandatory RolesGuard
4. Atomic refresh token rotation with replacedAt grace interval (10s)
5. Replay detection: family revocation committed before 401 response
6. Token security: SHA-256 hashes only, node:crypto randomBytes
7. Zod 4 validation pipe (no class-validator), ApiErrorEnvelope errors
8. User profile: GET/PATCH /users/me (with email), GET /users/:id (no email)
9. Layered avatar config: base/fur/eyes/outfit/accessory/background (typed enums)
10. 8 default planets seeded idempotently
11. Planet membership: join/leave/rejoin per D15
12. Next.js auth proxy: /api/auth/* routes with HttpOnly refresh cookie
13. CSRF double-submit cookie with constant-time comparison
14. Onboarding UI with D09 visual direction (light, navy/teal/yellow)
15. Prisma 7 config with schema/migrations/seed/datasource
16. Two migrations: phase03_init (31 tables) + add_replaced_at (1 column)
17. Framework-independent database package (no @nestjs imports)

## Test Summary

| Category                                  | Count  | Status       |
| ----------------------------------------- | ------ | ------------ |
| Contract tests                            | 13     | PASS         |
| Worker tests                              | 1      | PASS         |
| API unit tests                            | 47     | PASS         |
| API integration tests (PostgreSQL-backed) | 12     | PASS         |
| Playwright mock E2E tests                 | 11     | PASS         |
| Playwright live onboarding E2E            | 7      | PASS         |
| Playwright screenshot capture             | 4      | PASS         |
| **Total**                                 | **95** | **ALL PASS** |

## Runtime Health

| Service | URL                          | Status                                         |
| ------- | ---------------------------- | ---------------------------------------------- |
| Web     | http://localhost:3100/health | `{"status":"ok","service":"wildtails-web"}`    |
| API     | http://localhost:3000/health | `{"status":"ok","service":"wildtails-api"}`    |
| Worker  | http://localhost:3001/health | `{"status":"ok","service":"wildtails-worker"}` |

## Refresh Token Race Fix

**Root cause**: Request B reading the token after A committed rotation saw
`replacedByTokenId != null` and triggered false-replay family revocation.

**Solution**: Added `replacedAt DateTime?` column and a 10-second grace interval
(`REFRESH_ROTATION_GRACE_MS`). Reuse within the grace window = LOST_RACE (no
revocation). Reuse after = genuine REPLAY (family revoked, committed).

**Migration**: `20260804154302_add_replaced_at` — `ALTER TABLE "refresh_tokens" ADD COLUMN "replacedAt" TIMESTAMP(3)`

## D09 Visual Direction Applied

- Light page background (#f8fafc)
- Navy (#1e3a5f) for text and headings
- Teal (#0d9488) for links and accents
- Yellow/amber (#f59e0b) for primary buttons
- White cards with light borders
- Cat silhouette SVG in auth header
- prefers-reduced-motion respected globally
- Accessible contrast ratios maintained

## Screenshot Evidence

All screenshots from real running application (no mocks):

- register-page.png — D09 light theme, cat logo, yellow button, teal links
- login-page.png — D09 light theme, form with navy labels
- dashboard.png — Avatar preview, planet section, quick actions
- profile-setup.png, avatar-builder.png, planet-selection.png — from mock spec

## Known Limitations

- Next.js dev indicator (N circle) visible in dev screenshots only
- Avatar assets are placeholder SVGs — requires human visual approval
- Planet descriptions are temporary product copy
- Secret scan: test fixtures trigger false positives (all reviewed)
- Onboarding multi-step wizard screenshots captured via mocks (profile/avatar/planet steps)

## Items Requiring Human Visual Approval

1. D09 light theme with navy/teal/yellow palette (screenshots available)
2. Cat silhouette SVG identity element
3. Avatar builder layer options and preview
4. Planet selection UI
5. Dashboard layout
