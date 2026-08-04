# WildTails Project Status

## Current phase

- Phase: 03
- Status: READY_FOR_REVIEW
- Active branch: phase/03-identity-and-planets
- Last verified commit: 0881c68
- Updated at: 2026-08-04

## Phase checklist

| Phase | Name                           | Status           | Human approval      |
| ----- | ------------------------------ | ---------------- | ------------------- |
| 00    | Project audit and decisions    | DONE             | Approved 2026-07-31 |
| 01    | Repository bootstrap           | DONE             | Approved 2026-08-03 |
| 02    | Architecture and contracts     | DONE             | Approved 2026-08-04 |
| 03    | Identity and planets           | READY_FOR_REVIEW | Required            |
| 04    | Captain's Cabin and goals      | NOT_STARTED      | Required            |
| 05    | Planet Feed and moderation     | NOT_STARTED      | Required            |
| 06    | AI Auto-Log                    | NOT_STARTED      | Required            |
| 07    | Gamification                   | NOT_STARTED      | Required            |
| 08    | Real-time Space Dice           | NOT_STARTED      | Required            |
| 09    | Security hardening             | NOT_STARTED      | Required            |
| 10    | Testing and evaluation         | NOT_STARTED      | Required            |
| 11    | DevOps and observability       | NOT_STARTED      | Required            |
| 12    | Final demo and thesis evidence | NOT_STARTED      | Required            |

Valid statuses:

- NOT_STARTED
- PLANNING
- IN_PROGRESS
- BLOCKED
- READY_FOR_REVIEW
- APPROVED
- DONE

## Decisions pending

All Phase 00 decisions (D01-D12) have been approved. See `docs/decisions-register.md`.

Decisions requiring future human approval:

- [ ] LLM provider and model selection (before Phase 06).
- [ ] LLM budget activation (before Phase 06).
- [ ] Real email provider for staging.
- [ ] Staging/production deployment.

Phase 02 decisions resolved (D13-D15, approved 2026-08-04):

- [x] D13: `/auth/logout` requires `{ refreshToken }` body + access token auth.
- [x] D14: `/ai/jobs/{id}/cancel` returns 202 Accepted.
- [x] D15: Rejoin reactivates existing row (leftAt=null, role=MEMBER, joinedAt=now).

## Active blockers

None.

## Latest test evidence

Phase 03 – Identity and Planets (2026-08-04):

- Install: pnpm install --frozen-lockfile passes
- Lint: 9 packages pass ESLint (0 errors)
- Format: all files pass Prettier
- Typecheck: 9 packages pass tsc --noEmit (strict mode, 0 errors)
- Tests: 83 total across 11 files, all pass
  - contracts.spec: 13 tests
  - worker.spec: 1 test
  - health.controller.spec: 1 test
  - zod-validation.pipe.spec: 6 tests (Zod 4 API)
  - http-exception.filter.spec: 8 tests (ApiErrorEnvelope)
  - auth.service.spec: 11 tests (register, login, refresh rotation, logout)
  - user.service.spec: 8 tests (profile, avatar config, cross-account denial)
  - planet.service.spec: 13 tests (list, join, leave, rejoin D15, cross-user)
  - auth.integration.spec: 7 tests (PostgreSQL-backed: concurrent refresh, replay, family revocation)
  - auth.spec (Playwright): 11 E2E tests (login, register, CSRF, accessibility)
  - screenshots.spec (Playwright): 4 screenshot captures
- Prisma: schema valid, client generated (v7.9.1), migration applied
- Migration: 20260804144914_phase03_init (31 tables, 10 enums, 859 lines SQL)
- Seed: 8 default planets, idempotent (ran twice, count asserted via psql)
- Build: API (SWC 30 files), Web (webpack, 13 routes), Worker (SWC)
- OpenAPI: valid (0 errors, 5 warnings)
- Secrets: 172 files scanned, 21 false positives (test fixtures), no real secrets
- Zod: only 4.4.3 across all packages (3 workspace packages)
- Framework independence: no @nestjs imports in packages/database/src/
- NestJS routes: /auth/_, /users/_, /planets/*, /health (no /api prefix)
- Live API tested: register, login, wrong password, planets, join/leave/rejoin
- Concurrent refresh: exactly 1 of 2 requests succeeds, family revocation committed
- Replay detection: consumed token → 401, successor rejected, new login works
- Security: argon2id hashing, SHA-256 token hashes, atomic refresh rotation,
  replay detection with committed family revocation, default-deny JWT guard,
  mandatory RolesGuard, no passwords/tokens in logs
- Cookie: HttpOnly refresh cookie scoped to /api/auth, CSRF double-submit
- Playwright: v1.50.x, Chromium v1234, 15 tests (11 auth + 4 screenshot)
- Enum reconciliation: 10 Prisma = 10 PostgreSQL types (Phase 02 "14" included Zod-only)
- Visual evidence: 6 screenshots in docs/evidence/phase-03/onboarding-screenshots/
- Evidence: docs/evidence/phase-03/

Phase 02 – Architecture and Contracts (2026-08-04):

- Install: pnpm install --frozen-lockfile passes
- Lint: 9 packages pass ESLint
- Format: all files pass Prettier
- Typecheck: 9 packages pass tsc --noEmit (strict mode)
- Tests: 3 test files, 15 tests passed (13 contract + 2 app)
- Prisma: schema valid (31 tables, 14 enums), client generated (v7.9.1)
- OpenAPI: valid (0 errors, 5 warnings), @redocly/cli 1.34.3
- Build: API (SWC), Worker (SWC), Web (Turbopack) all succeed
- Secrets: 109 files scanned, clean
- QA review: PASS_WITH_NOTES (3 HIGH + 4 MEDIUM/LOW resolved, 6 accepted for later phases)
- Decisions D13-D15 recorded and applied
- Evidence: docs/evidence/phase-02/

## Known technical debt

- Vitest ESM-in-CJS config warning (cosmetic, no functional impact)
- unplugin-swc esbuild deprecation warning (needs oxc:false in future vitest)
- GitHub Actions versions not pinned to commit SHAs (supply chain risk, LOW)
- Notification.type and GameEvent.type are String in Prisma, not enums (LOW, deferred)
- No NotificationResponse Zod schema (deferred to Phase 05)
- Next.js 16 build uses --webpack flag due to Turbopack .js→.ts extension resolution (LOW)
- Planet descriptions are temporary product copy pending content approval (LOW)
- Avatar visual assets are placeholder SVG — requires human visual approval (BLOCKED on approval)
- E2E Playwright tests written but require browser install to run (LOW)
- Concurrent refresh integration test needs live DB (covered by unit test + live manual test)

## Manual work queue

See `docs/06-manual-work.md`.
