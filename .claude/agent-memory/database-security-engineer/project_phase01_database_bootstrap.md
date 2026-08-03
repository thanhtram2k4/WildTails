---
name: Phase 01 database package bootstrap
description: Records what was created in the packages/database scaffold and key decisions made
type: project
---

Phase 01 created the `@wildtails/database` package skeleton at `packages/database/`.

**Why:** This phase establishes only the Prisma datasource and generator configuration. No models, enums, migrations, or PrismaClient instantiation are included — these are deferred to later phases per scope constraints.

**Key decisions:**

- `prisma.config.ts` uses `__dirname` (not `import.meta.dirname`) because `package.json` lacks `"type": "module"`, making the compiled output CJS. `import.meta` is invalid in CJS context.
- `eslint.config.mjs` uses `.mjs` extension so Node treats it as ESM (required by ESLint 9 flat config) without adding `"type": "module"` to the package.
- `schema.prisma` contains only generator + datasource; `DATABASE_URL` is read via `env()`, never hard-coded.
- `src/index.ts` exports only an empty object — no runtime database access surface exists yet.

**How to apply:** In Phase 02 and beyond, add Prisma models incrementally via migrations. Every new model must go through `prisma migrate dev`, reviewed for lock risk, backfill need, and rollback strategy before merging.
