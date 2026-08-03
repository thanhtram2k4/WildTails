---
name: pnpm 11 build script approval
description: pnpm 11 blocks postinstall scripts by default; must approve @swc/core and Prisma engines at install time
type: feedback
---

After pnpm install in this workspace, run `pnpm approve-builds --all` to unblock @swc/core, @prisma/engines, prisma, sharp, and unrs-resolver postinstall scripts.

**Why:** pnpm 11 introduced default-deny for build scripts. Without approval, @swc/core fails to download its native binary and vitest transforms break at runtime.

**How to apply:** Any time a fresh install is done or a new package with a postinstall script is added, check for `[ERR_PNPM_IGNORED_BUILDS]` in the output and run `pnpm approve-builds --all` from the repo root. The `pnpm.yaml` file at the root lists the approved packages persistently.
