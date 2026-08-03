---
name: Phase 01 QA Review Findings
description: Results of the independent QA/security review of Phase 01 (Repository Bootstrap) — key findings, pass/fail verdicts, and open items for future phases
type: project
---

Phase 01 QA review completed on 2026-08-01.

Overall: 9/11 areas PASS. 2 areas have findings requiring attention before Phase 01 is considered fully closed.

**Why:** This review was conducted before the Phase 01 commit is created. Findings must be resolved or accepted by the human reviewer before commit.

**How to apply:** In future phases, use these findings as baseline known-accepted risks vs. new regressions.

## Key findings

MEDIUM - apps/web ESLint config does NOT enforce `@typescript-eslint/no-explicit-any`. It uses `eslint-config-next` directly, which does not include that rule. The base.js rule is only applied to api, worker, and packages. This gap will matter once real TypeScript code is added to apps/web.

MEDIUM - CI pipeline hardcodes `DATABASE_URL: postgresql://wildtails:wildtails_local_dev@localhost:5432/wildtails` in plain text in ci.yml for the `prisma:generate` step. No database service container is configured in CI, so this URL is only used by Prisma generator (not a live connection), but the hardcoded credentials still represent a maintenance and audit risk.

LOW - CI uses unpinned action versions: `actions/checkout@v4`, `actions/setup-node@v4`, `actions/cache@v4`, `pnpm/action-setup@v4`. These are major-version tags, not commit SHAs — supply chain risk.

LOW - `.gitignore` does not exclude `*.tsbuildinfo` files. They are currently untracked but not explicitly ignored; incremental TypeScript builds generate these files and they could be accidentally staged in the future.

LOW - `sharp` listed in `pnpm-workspace.yaml allowBuilds` but no package in the monorepo depends on `sharp` in Phase 01. This is a forward-looking allowance for Next.js image optimization but should be documented.

LOW - `verify-health.mjs` uses `shell: true` when spawning `pnpm dev`, noted as a cosmetic/known issue in known-issues.md (Node.js DEP0190). Acceptable for a dev script but should not propagate to production tooling.

INFO - `validate-claude-pack.sh` is not invoked in the CI pipeline. It is a manual tool only.

INFO - Phase 01 files are all untracked at review time (not yet committed). The commit has not been created yet.

## Confirmed PASS items

- .env properly gitignored; only .env.example untracked (not committed)
- No real secrets in any source file
- Health endpoints return only static literals — no env vars, no internals, no stack traces
- Docker images fully pinned (postgres:17.10-alpine, redis:8.0.6-alpine, minio/minio:RELEASE.2025-09-07T16-13-09Z)
- Docker uses named volumes; no unnecessary extra ports
- schema.prisma contains ONLY generator + datasource — no models, enums, or migrations
- No PrismaClient instantiation anywhere in source
- tsconfig strict mode enabled across all packages via shared base
- ESLint no-explicit-any enforced in api, worker, and all packages
- dist/, .next/ properly gitignored and contain zero tracked files
- No Phase 02+ code (auth, users, journals, planets) found anywhere
- Dependency set is appropriate for Phase 01 scope
- CI runs --frozen-lockfile
