# Phase 01 – Repository Bootstrap

## Goal

Create a working monorepo and quality baseline.

## Prompt

1. Create pnpm workspace.
2. Scaffold:
   - apps/web;
   - apps/api;
   - apps/worker;
   - packages/contracts;
   - packages/database;
   - packages/game-core;
   - packages/ui;
   - packages/config;
   - packages/testing.
3. Configure strict TypeScript.
4. Configure lint/format.
5. Create Docker Compose for PostgreSQL, Redis and MinIO.
6. Create `.env.example`; do not create real secrets.
7. Create a health endpoint.
8. Create root scripts: dev, lint, typecheck, test, build.
9. Create CI baseline.
10. Write a setup guide.
11. Run quality gate.

## Acceptance

- A fresh clone has clear instructions.
- `pnpm install`, lint, typecheck, test and build all run.
- Docker Compose config is valid.
- Web/API/worker have health proof.
- No secrets committed.
