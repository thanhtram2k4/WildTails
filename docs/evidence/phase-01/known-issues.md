# Phase 01 – Known Issues and Limitations

## Resolved During Phase 01

| Issue                                         | Root Cause                                                    | Fix Applied                                                                                                         |
| --------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| ESLint could not find `@wildtails/config`     | Missing devDependency in consuming packages                   | Added `@wildtails/config: workspace:*` to all packages                                                              |
| ESLint config `.js` failed in CJS packages    | Node.js requires `.mjs` extension for ESM in CJS packages     | Renamed to `.mjs` in contracts, testing                                                                             |
| `@eslint/js` not found from shared config     | `packages/config` didn't declare its own dependencies         | Added `@eslint/js`, `typescript-eslint`, `eslint-config-prettier`, `globals` as dependencies of `@wildtails/config` |
| `eslint-config-next` circular structure error | `FlatCompat` incompatible with Next.js 16 flat config         | Rewrote to import `eslint-config-next` directly (it exports flat config natively in v16)                            |
| Prisma `url = env("DATABASE_URL")` rejected   | Prisma 7 removed `url` from schema datasource blocks          | Removed `url` from schema.prisma; added `migrate.resolve()` to `prisma.config.ts`                                   |
| NestJS SWC build failed                       | Missing `@swc/cli` package                                    | Added `@swc/cli: ^0.8.1` to api and worker devDependencies                                                          |
| Secret scanner false positive                 | Script filename `check-secrets.mjs` matched "secret" pattern  | Excluded `.mjs`/`.js`/`.ts`/`.sh` files from credential filename detection                                          |
| `next-env.d.ts` format mismatch               | Generated file not formatted by Prettier                      | Ran `pnpm format` to fix                                                                                            |
| `apps/web` missing `no-explicit-any` rule     | ESLint config only used `eslint-config-next`, not base config | Added `@wildtails/config/eslint/base.js` spread to web ESLint config (QA finding MEDIUM-1)                          |
| Hardcoded DATABASE_URL in CI                  | `prisma generate` doesn't need DATABASE_URL with empty schema | Removed the env block from CI `prisma:generate` step (QA finding MEDIUM-2)                                          |
| `*.tsbuildinfo` not gitignored                | Incremental build files could be accidentally staged          | Added `*.tsbuildinfo` to `.gitignore` (QA finding LOW-1)                                                            |
| Vitest picking up `dist/` compiled spec files | After `nest build`, CJS spec files in dist/ were found        | Added `exclude: ['dist/**', 'node_modules/**']` to vitest configs (post-build test failure)                         |

## Cosmetic Warnings (Not Blocking)

| Warning                                    | Context                                                       | Impact                                                                           |
| ------------------------------------------ | ------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Vitest ESM-in-CJS config warning           | `vitest.config.ts` uses ESM imports in CJS package            | No functional impact; cosmetic warning                                           |
| `esbuild` option deprecation in Vitest 4.x | unplugin-swc sets `esbuild: false`; Vitest 4 uses Oxc instead | No functional impact; will need `oxc: false` in future                           |
| Node.js DEP0190 deprecation                | `spawn` with `shell: true` and args                           | No functional impact; used in verify-health.mjs for cross-platform compatibility |
| pnpm peer dependency warnings              | Some transitive peer mismatches                               | No functional impact; run `pnpm peers check` for details                         |

## Limitations

- **No runtime database connection test**: Phase 01 does not instantiate PrismaClient or test actual PostgreSQL connectivity. Database connection verification is deferred to Phase 03 when the first models are created.
- **No Tailwind custom theme**: No `tailwind.config.ts` exists. Tailwind CSS 4 uses CSS-first configuration. Custom theme will be added when UI work begins.
- **Empty scaffold packages**: `contracts`, `database`, `game-core`, `testing`, `ui` export only `{}`. Functionality will be added in later phases.
- **MinIO bucket creation**: Buckets must be created manually via the MinIO Console (http://localhost:9001) when needed. No automated bucket provisioning.
- **TypeScript 5.9.3**: Pinned below 6.x due to `typescript-eslint@8.x` requiring `<6.1.0`. This is intentional, not a limitation of the codebase.

## Deviations from Approved Plan

| Planned                               | Actual                                      | Reason                                                                      |
| ------------------------------------- | ------------------------------------------- | --------------------------------------------------------------------------- |
| `@types/react-dom: ^19.2.8`           | `@types/react-dom: ^19.2.4`                 | Version 19.2.8 does not exist on npm; 19.2.4 is the latest available        |
| Prisma schema with `url = env(...)`   | Prisma schema without `url`                 | Prisma 7.9.1 requires connection URL in prisma.config.ts, not schema.prisma |
| `@swc/cli` not in original plan       | Added to api and worker                     | Required by NestJS SWC builder for `nest build`                             |
| `@eslint/js` etc. in root only        | Moved to packages/config dependencies       | Required for proper pnpm strict dependency resolution                       |
| `@swc/cli` not in original plan       | Added to api and worker                     | Required by NestJS SWC builder for `nest build`                             |
| Vitest `exclude` not in original plan | Added `dist/**` exclusion to vitest configs | Required to prevent post-build test failures from CJS compiled specs        |
