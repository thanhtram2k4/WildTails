---
name: Phase 01 web scaffold decisions
description: Key constraints and decisions made during Phase 01 Next.js web app and UI package scaffolding
type: project
---

Phase 01 scaffolded apps/web (Next.js 16, port 3100) and packages/ui (empty component library shell).

**Why:** Phase 01 scope is strictly health route + minimal layout. No business pages, no test scripts for web or ui yet.

Key constraints applied:

- Tailwind CSS 4: @import "tailwindcss" in globals.css only; no tailwind.config.ts
- tailwindcss in devDependencies (not dependencies)
- @types/node must be ^24 (not ^26)
- TypeScript ^5.9.3
- ESLint configs use .mjs extension (packages lack "type": "module" except @wildtails/config which has it)
- @eslint/eslintrc ^3.3.1 added to apps/web devDependencies for FlatCompat usage
- apps/web eslint.config.mjs uses FlatCompat with next/core-web-vitals and next/typescript
- packages/ui eslint.config.mjs imports from @wildtails/config/eslint/base.js (no eslint dependency listed — inherits from workspace root)
- packages/ui has no test script in Phase 01

**How to apply:** When extending web or ui in future phases, do not add tailwind.config.ts, keep @types/node at ^24, and add test scripts only when tests are actually written.
