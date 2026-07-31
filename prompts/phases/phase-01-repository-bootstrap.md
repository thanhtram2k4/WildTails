# Phase 01 – Repository Bootstrap

## Goal

Tạo monorepo chạy được và quality baseline.

## Prompt

1. Tạo pnpm workspace.
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
3. Cấu hình strict TypeScript.
4. Cấu hình lint/format.
5. Tạo Docker Compose cho PostgreSQL, Redis và MinIO.
6. Tạo `.env.example`, không tạo secret thật.
7. Tạo health endpoint.
8. Tạo root scripts: dev, lint, typecheck, test, build.
9. Tạo CI baseline.
10. Viết setup guide.
11. Chạy quality gate.

## Acceptance

- Fresh clone có hướng dẫn rõ.
- `pnpm install`, lint, typecheck, test và build chạy.
- Docker Compose config hợp lệ.
- Web/API/worker có health proof.
- Không commit secret.
