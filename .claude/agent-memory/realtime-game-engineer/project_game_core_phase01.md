---
name: game-core Phase 01 scaffold
description: What was created for game-core in Phase 01 and what is deferred to Phase 08
type: project
---

`packages/game-core` was bootstrapped in Phase 01 as an empty typed scaffold only.

Files created:

- `package.json` — name `@wildtails/game-core`, no `"type": "module"`, scripts: typecheck + lint only (no test script)
- `tsconfig.json` — extends `../config/typescript/base.json`, outDir `./dist`, rootDir `./src`
- `src/index.ts` — single `export {}` with comment that Space Dice state machine comes in Phase 08
- `eslint.config.mjs` — `.mjs` extension because the package lacks `"type": "module"`

**Why:** Phase 01 is repository bootstrap only. No game logic, no state machines, no vitest config are allowed at this stage.

**How to apply:** When adding Space Dice state machine, reward logic, or Socket.IO event schemas, target Phase 08 and populate `src/` under `game-core`. All pure deterministic game rules (roll resolution, phase transitions, scoring) belong here; side-effecting server code (Redis, PostgreSQL, Socket.IO) belongs in `apps/api`.
