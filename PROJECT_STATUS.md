# WildTails Project Status

## Current phase

- Phase: 02
- Status: DONE
- Active branch: phase/02-architecture-and-contracts
- Last verified commit: 0e9c1a4
- Updated at: 2026-08-04

## Phase checklist

| Phase | Name                           | Status           | Human approval      |
| ----- | ------------------------------ | ---------------- | ------------------- |
| 00    | Project audit and decisions    | DONE             | Approved 2026-07-31 |
| 01    | Repository bootstrap           | DONE             | Approved 2026-08-03 |
| 02    | Architecture and contracts     | DONE             | Approved 2026-08-04 |
| 03    | Identity and planets           | NOT_STARTED      | Required            |
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
- @nestjs/config declared but unused (forward-looking, LOW)
- Notification.type and GameEvent.type are String in Prisma, not enums (LOW, deferred)
- No NotificationResponse Zod schema (deferred to Phase 05)

## Manual work queue

See `docs/06-manual-work.md`.
