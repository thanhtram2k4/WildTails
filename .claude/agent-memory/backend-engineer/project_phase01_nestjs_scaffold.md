---
name: Phase 01 NestJS app scaffold
description: NestJS 11 apps/api and apps/worker scaffolded with vitest+SWC, health endpoints, passing unit tests. Key version fixes applied.
type: project
---

Phase 01 NestJS app scaffold completed 2026-08-01. apps/api (port 3000 via API_PORT) and apps/worker (port 3001 via WORKER_PORT) created with NestJS 11, vitest 4.x, @swc/core for fast transforms.

**Why:** Phase 01 goal is thin health endpoint scaffold only — no auth, no business logic, no domain models.

**How to apply:** Future phases add domain modules inside apps/api/src; each domain gets its own folder under src/. Do not add logic to controllers. Keep vitest+SWC as the test runner pattern.

Key fixes made during scaffold:

- pnpm 11 requires `pnpm approve-builds --all` (or `pnpm.yaml` onlyBuiltDependencies) for @swc/core, @prisma/engines, prisma, sharp, unrs-resolver.
- pnpm.yaml created at repo root with onlyBuiltDependencies list.
- `@types/react-dom@^19.2.8` in apps/web and packages/ui was invalid (latest is 19.2.4); fixed to `^19.2.4`.
- vitest.config.ts in NestJS apps generates a cosmetic warning about ESM-in-CJS; tests still pass. Suppressed with VITE_CONFIG_NATIVE_IGNORE_WARNING=true if needed.
