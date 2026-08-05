# WildTails Project Status

## Current phase

- Phase: 04
- Status: READY_FOR_REVIEW
- Active branch: phase/04-captains-cabin-and-goals
- Last verified commit: pending
- Updated at: 2026-08-05

## Phase checklist

| Phase | Name                           | Status      | Human approval      |
| ----- | ------------------------------ | ----------- | ------------------- |
| 00    | Project audit and decisions    | DONE        | Approved 2026-07-31 |
| 01    | Repository bootstrap           | DONE        | Approved 2026-08-03 |
| 02    | Architecture and contracts     | DONE        | Approved 2026-08-04 |
| 03    | Identity and planets           | DONE        | Approved 2026-08-04 |
| 04    | Captain's Cabin and goals      | READY_FOR_REVIEW | Required            |
| 05    | Planet Feed and moderation     | NOT_STARTED | Required            |
| 06    | AI Auto-Log                    | NOT_STARTED | Required            |
| 07    | Gamification                   | NOT_STARTED | Required            |
| 08    | Real-time Space Dice           | NOT_STARTED | Required            |
| 09    | Security hardening             | NOT_STARTED | Required            |
| 10    | Testing and evaluation         | NOT_STARTED | Required            |
| 11    | DevOps and observability       | NOT_STARTED | Required            |
| 12    | Final demo and thesis evidence | NOT_STARTED | Required            |

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

Phase 04 – Captain's Cabin and Goals (2026-08-05):

- Install: pnpm install --frozen-lockfile passes
- Lint: 9 packages pass ESLint (0 errors)
- Format: all files pass Prettier
- Typecheck: 9 packages pass tsc --noEmit (strict mode, 0 errors)
- Tests: 215 total across 15 files, all pass
  - contracts.spec: 23 tests (incl. tag contracts, journal limits)
  - worker.spec: 1 test
  - health.controller.spec: 1 test
  - zod-validation.pipe.spec: 6 tests
  - http-exception.filter.spec: 8 tests
  - auth.service.spec: 11 tests
  - user.service.spec: 8 tests
  - planet.service.spec: 13 tests
  - journal.service.spec: 30 tests (CRUD, versioning, visibility transitions)
  - journal-permission.service.spec: 12 tests (ADR-003 permission evaluation)
  - folder.service.spec: 16 tests (nesting depth, cycles, deletion)
  - tag.service.spec: 8 tests (normalization, uniqueness)
  - share.service.spec: 14 tests (grant, revoke, concurrency)
  - goal.service.spec: 19 tests (CRUD, progress, unlink)
  - markdown-renderer.test: 22 tests (XSS, script, event handlers, javascript: URLs)
- Integration tests: 68 total across 2 files (PostgreSQL-backed)
  - auth.integration.spec: 12 tests
  - knowledge.integration.spec: 56 tests (journal CRUD, versioning, sharing, revoke,
    concurrency, visibility transitions, tags, folders, goals, pagination, audit,
    content security, SQL injection)
- E2E tests: 17 tests (cabin-goals.spec.ts, Playwright against real stack)
- Prisma: schema valid, client generated (v7.9.1), 3 migrations applied
- Migration: phase04_indexes (2 journal indexes + 1 partial unique share index)
- Build: API (SWC 49 files), Web (webpack, 19 routes), Worker (SWC)
- OpenAPI: valid (0 errors, 5 warnings)
- Secrets: scanned, no real secrets
- Zod: only 4.4.3 across all packages
- Runtime health: Web (3100), API (3000), Worker (3001) all healthy
- Screenshots: 6 captured from running application
- Evidence: docs/evidence/phase-04/

Phase 03 – Identity and Planets (2026-08-04):

- Install: pnpm install --frozen-lockfile passes
- Lint: 9 packages pass ESLint (0 errors)
- Format: all files pass Prettier
- Typecheck: 9 packages pass tsc --noEmit (strict mode, 0 errors)
- Tests: 95 total across 12 files, all pass
  - contracts.spec: 13 tests
  - worker.spec: 1 test
  - health.controller.spec: 1 test
  - zod-validation.pipe.spec: 6 tests (Zod 4 API)
  - http-exception.filter.spec: 8 tests (ApiErrorEnvelope)
  - auth.service.spec: 11 tests (register, login, refresh rotation, logout)
  - user.service.spec: 8 tests (profile, avatar config, cross-account denial)
  - planet.service.spec: 13 tests (list, join, leave, rejoin D15, cross-user)
  - auth.integration.spec: 12 tests (DB-backed: concurrent refresh with grace interval,
    DB row verification, winner successor validity, genuine replay after 11s wait,
    DB family revocation query, committed revocation proof)
  - auth.spec (Playwright): 11 E2E tests (login, register, CSRF header, accessibility)
  - onboarding-live.spec (Playwright): 7 live E2E tests (real register, login, cookie, CSRF)
  - screenshots.spec (Playwright): 4 screenshot captures
- Prisma: schema valid, client generated (v7.9.1), 2 migrations applied
- Migrations: phase03_init (31 tables, 10 enums, 859 lines) + add_replaced_at (1 column)
- Seed: 8 default planets, idempotent (ran twice, count asserted via psql)
- Build: API (SWC 30 files), Web (webpack, 13 routes), Worker (SWC)
- OpenAPI: valid (0 errors, 5 warnings)
- Secrets: 172+ files scanned, false positives reviewed, no real secrets
- Zod: only 4.4.3 across all packages
- Framework independence: no @nestjs imports in packages/database/src/
- NestJS routes: /auth/_, /users/_, /planets/*, /health (no /api prefix)
- Concurrent refresh: 1 success + 1 failure, DB verified 0 revoked rows, winner valid
- Genuine replay after 11s grace: 401, DB verified entire family revoked
- Runtime health: Web (3100), API (3000), Worker (3001) all healthy
- D09 visual direction: light theme, navy/teal/yellow palette, cat SVG identity
- Screenshots: 6 captured from running application (D09 theme visible)
- Cookie: HttpOnly wildtails_refresh on /api/auth, CSRF double-submit verified
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
- Avatar visual assets are placeholder SVG — approved for MVP (2026-08-04)

## Manual work queue

See `docs/06-manual-work.md`.
