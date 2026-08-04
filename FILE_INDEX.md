# File Index

## Claude Code Configuration

- `.claude/agents/ai-pipeline-engineer.md`
- `.claude/agents/backend-engineer.md`
- `.claude/agents/database-security-engineer.md`
- `.claude/agents/devops-observability-engineer.md`
- `.claude/agents/frontend-engineer.md`
- `.claude/agents/qa-security-reviewer.md`
- `.claude/agents/realtime-game-engineer.md`
- `.claude/agents/solution-architect.md`
- `.claude/agents/wildtails-lead.md`
- `.claude/settings.json`
- `.claude/settings.local.example.json`
- `.claude/skills/ai-autolog-pipeline/SKILL.md`
- `.claude/skills/database-migration-safety/SKILL.md`
- `.claude/skills/privacy-first-api/SKILL.md`
- `.claude/skills/quality-gate/SKILL.md`
- `.claude/skills/realtime-game-state/SKILL.md`
- `.claude/skills/run-phase/SKILL.md`
- `.claude/skills/thesis-evidence-capture/SKILL.md`
- `.claude/skills/vertical-slice/SKILL.md`
- `.claude/skills/wildtails-architecture/SKILL.md`
- `.claude/skills/wildtails-frontend/SKILL.md`

## Project Root

- `.env.example`
- `.gitignore`
- `.npmrc`
- `.prettierrc`
- `.prettierignore`
- `CLAUDE.local.example.md`
- `CLAUDE.md`
- `FILE_INDEX.md`
- `package.json`
- `pnpm-lock.yaml`
- `pnpm-workspace.yaml`
- `PROJECT_STATUS.md`
- `README.md`
- `SOURCES.md`
- `tsconfig.json`

## CI

- `.github/workflows/ci.yml`

## Apps

- `apps/api/eslint.config.mjs`
- `apps/api/nest-cli.json`
- `apps/api/package.json`
- `apps/api/src/app.module.ts`
- `apps/api/src/health/health.controller.spec.ts`
- `apps/api/src/health/health.controller.ts`
- `apps/api/src/main.ts`
- `apps/api/tsconfig.build.json`
- `apps/api/tsconfig.json`
- `apps/api/vitest.config.ts`
- `apps/web/eslint.config.mjs`
- `apps/web/next.config.ts`
- `apps/web/package.json`
- `apps/web/postcss.config.mjs`
- `apps/web/src/app/globals.css`
- `apps/web/src/app/health/route.ts`
- `apps/web/src/app/layout.tsx`
- `apps/web/src/app/page.tsx`
- `apps/web/tsconfig.json`
- `apps/worker/eslint.config.mjs`
- `apps/worker/nest-cli.json`
- `apps/worker/package.json`
- `apps/worker/src/app.module.ts`
- `apps/worker/src/health/health.controller.spec.ts`
- `apps/worker/src/health/health.controller.ts`
- `apps/worker/src/main.ts`
- `apps/worker/tsconfig.build.json`
- `apps/worker/tsconfig.json`
- `apps/worker/vitest.config.ts`

## Packages

- `packages/config/eslint/base.js`
- `packages/config/package.json`
- `packages/config/tsconfig.json`
- `packages/config/typescript/base.json`
- `packages/config/typescript/nestjs.json`
- `packages/config/typescript/nextjs.json`
- `packages/contracts/eslint.config.mjs`
- `packages/contracts/package.json`
- `packages/contracts/vitest.config.ts`
- `packages/contracts/src/index.ts`
- `packages/contracts/src/contracts.spec.ts`
- `packages/contracts/src/enums/*.ts` (7 enum files + barrel)
- `packages/contracts/src/api/*.ts` (error-envelope, success-envelope, pagination + barrel)
- `packages/contracts/src/auth/*.ts` (principal, tokens + barrel)
- `packages/contracts/src/ai/*.ts` (ai-job, ai-output + barrel)
- `packages/contracts/src/game/*.ts` (space-dice + barrel)
- `packages/contracts/src/gamification/*.ts` (point-transaction, influence-score + barrel)
- `packages/contracts/src/identity/*.ts` (user, follow + barrel)
- `packages/contracts/src/knowledge/*.ts` (journal, folder, goal, share-permission + barrel)
- `packages/contracts/src/planet/*.ts` (planet, membership + barrel)
- `packages/contracts/src/social/*.ts` (post, comment, reaction, report + barrel)
- `packages/contracts/tsconfig.json`
- `packages/database/eslint.config.mjs`
- `packages/database/package.json`
- `packages/database/prisma.config.ts`
- `packages/database/prisma/schema.prisma`
- `packages/database/src/index.ts`
- `packages/database/tsconfig.json`
- `packages/game-core/eslint.config.mjs`
- `packages/game-core/package.json`
- `packages/game-core/src/index.ts`
- `packages/game-core/tsconfig.json`
- `packages/testing/eslint.config.mjs`
- `packages/testing/package.json`
- `packages/testing/src/index.ts`
- `packages/testing/tsconfig.json`
- `packages/ui/eslint.config.mjs`
- `packages/ui/package.json`
- `packages/ui/src/index.ts`
- `packages/ui/tsconfig.json`

## Infrastructure

- `infra/docker/docker-compose.yml`

## Scripts

- `scripts/check-secrets.mjs`
- `scripts/validate-claude-pack.sh`
- `scripts/verify-health.mjs`

## Documentation

- `docs/00-project-brief.md`
- `docs/01-technical-requirements.md`
- `docs/02-architecture.md`
- `docs/03-domain-rules.md`
- `docs/04-security-and-privacy.md`
- `docs/05-testing-strategy.md`
- `docs/06-manual-work.md`
- `docs/07-definition-of-done.md`
- `docs/08-agent-workflow.md`
- `docs/09-plugin-installation.md`
- `docs/acceptance-map.md`
- `docs/assumptions-register.md`
- `docs/decisions-register.md`
- `docs/risk-register.md`
- `docs/SETUP.md`

## ADRs

- `docs/adr/ADR-000-template.md`
- `docs/adr/ADR-001-monorepo-and-package-manager.md`
- `docs/adr/ADR-002-auth-session-strategy.md`
- `docs/adr/ADR-003-permission-model.md`
- `docs/adr/ADR-004-ai-provider-abstraction.md`
- `docs/adr/ADR-005-game-state-persistence.md`
- `docs/adr/ADR-006-deployment-target.md`
- `docs/adr/ADR-007-transcript-strategy.md`

## Architecture (Phase 02)

- `docs/architecture/module-map.md`
- `docs/architecture/erd.md`
- `docs/api/openapi.yaml`

## Evidence

- `docs/evidence/phase-00/phase-00-report.md`
- `docs/evidence/phase-01/commands.md`
- `docs/evidence/phase-01/final-report.md`
- `docs/evidence/phase-01/known-issues.md`
- `docs/evidence/phase-01/test-results.md`
- `docs/evidence/phase-02/final-report.md`
- `docs/evidence/phase-02/privacy-review.md`

## Phase Prompts

- `prompts/phases/phase-00-project-audit-and-decisions.md`
- `prompts/phases/phase-01-repository-bootstrap.md`
- `prompts/phases/phase-02-architecture-and-contracts.md`
- `prompts/phases/phase-03-identity-and-planets.md`
- `prompts/phases/phase-04-captains-cabin-and-goals.md`
- `prompts/phases/phase-05-planet-feed-and-moderation.md`
- `prompts/phases/phase-06-ai-auto-log.md`
- `prompts/phases/phase-07-gamification.md`
- `prompts/phases/phase-08-realtime-space-dice.md`
- `prompts/phases/phase-09-security-hardening.md`
- `prompts/phases/phase-10-testing-and-evaluation.md`
- `prompts/phases/phase-11-devops-and-observability.md`
- `prompts/phases/phase-12-final-demo-and-thesis-evidence.md`
