---
name: Phase 01 implementation patterns
description: Key technical patterns and fixes discovered during Phase 01 monorepo bootstrap that will affect future phases
type: feedback
---

ESLint shared config in pnpm strict mode requires the config package to declare its own dependencies (@eslint/js, typescript-eslint, etc.) — root-level hoisting is not sufficient. Every consuming package must also add @wildtails/config as a devDependency.

**Why:** pnpm strict dependency isolation prevents phantom imports. Packages cannot resolve transitive dependencies they don't declare.

**How to apply:** When adding new packages to the monorepo, always add `@wildtails/config: workspace:*` as a devDependency and use `.mjs` extension for ESLint configs in CJS packages.

---

Prisma 7 removed `url = env("DATABASE_URL")` from schema.prisma. Connection URLs must be provided via `prisma.config.ts` using `migrate.resolve()`.

**Why:** Prisma 7 breaking change. Schema datasource blocks no longer accept `url`.

**How to apply:** When working with the database package, remember the URL is in prisma.config.ts, not schema.prisma.

---

NestJS SWC builder requires @swc/cli in addition to @swc/core.

**Why:** `nest build` with SWC compiler option needs both packages.

**How to apply:** When creating new NestJS apps, include both @swc/cli and @swc/core in devDependencies.

---

Vitest configs in NestJS apps must exclude `dist/` to prevent picking up compiled CJS spec files after `nest build`.

**Why:** `nest build` compiles spec files to dist/ as CJS, and vitest finds them alongside the source specs.

**How to apply:** Always add `exclude: ['dist/**', 'node_modules/**']` to vitest config in NestJS apps.

---

eslint-config-next@16 exports flat config natively. Do not use FlatCompat — it causes circular structure errors.

**Why:** Next.js 16 adopted ESLint flat config format natively.

**How to apply:** Import directly: `import nextConfig from 'eslint-config-next'` and spread into the config array.
