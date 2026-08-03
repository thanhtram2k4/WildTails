# Phase 01 – Test Results

## Unit Tests

| Package              | Test Files | Tests | Status                                                         |
| -------------------- | ---------- | ----- | -------------------------------------------------------------- |
| @wildtails/api       | 1          | 1     | PASS                                                           |
| @wildtails/worker    | 1          | 1     | PASS                                                           |
| @wildtails/web       | —          | —     | No test script (health verified via scripts/verify-health.mjs) |
| @wildtails/contracts | —          | —     | No test script (empty scaffold)                                |
| @wildtails/database  | —          | —     | No test script (Prisma validate/generate only)                 |
| @wildtails/game-core | —          | —     | No test script (empty scaffold)                                |
| @wildtails/testing   | —          | —     | No test script (empty scaffold)                                |
| @wildtails/ui        | —          | —     | No test script (empty scaffold)                                |
| @wildtails/config    | —          | —     | No test script (config-only package)                           |

## Health Endpoint Verification

| Service | URL                          | HTTP Status | Response Body                                  | Result |
| ------- | ---------------------------- | ----------- | ---------------------------------------------- | ------ |
| API     | http://localhost:3000/health | 200         | `{"status":"ok","service":"wildtails-api"}`    | PASS   |
| Worker  | http://localhost:3001/health | 200         | `{"status":"ok","service":"wildtails-worker"}` | PASS   |
| Web     | http://localhost:3100/health | 200         | `{"status":"ok","service":"wildtails-web"}`    | PASS   |

## Docker Service Health

| Service    | Image                                    | Status  |
| ---------- | ---------------------------------------- | ------- |
| PostgreSQL | postgres:17.10-alpine                    | Healthy |
| Redis      | redis:8.0.6-alpine                       | Healthy |
| MinIO      | minio/minio:RELEASE.2025-09-07T16-13-09Z | Healthy |

## Quality Gate Summary

| Check                   | Result         |
| ----------------------- | -------------- |
| pnpm install            | PASS           |
| pnpm-lock.yaml exists   | PASS           |
| pnpm lint               | PASS           |
| pnpm format:check       | PASS           |
| pnpm typecheck          | PASS           |
| pnpm test               | PASS (2 tests) |
| prisma:validate         | PASS           |
| prisma:generate         | PASS           |
| pnpm build              | PASS           |
| Docker Compose config   | PASS           |
| Docker services healthy | PASS (3/3)     |
| App health checks       | PASS (3/3)     |
| Secret scan             | PASS (clean)   |
| No orphan processes     | PASS           |

## Prisma Validation

- Schema: generator + PostgreSQL datasource only
- No models, no enums, no migrations
- `prisma validate`: valid
- `prisma generate`: Prisma Client v7.9.1 generated

## Secret Scan

- Files scanned: 39
- Findings: 0
- Tracked .env files: none (only .env.example)
- Untracked secret files: none
