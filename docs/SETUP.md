# WildTails Development Setup Guide

## Prerequisites

- Node.js 24 LTS (v24.18.1 or later 24.x)
- pnpm 11.18.0
- Docker Desktop or Docker Engine with Compose
- Git

## Quick Start

### 1. Clone and install

```bash
git clone <repository-url>
cd wildtails
pnpm install
```

### 2. Create local environment file

Copy the example environment file to create your local configuration:

```bash
node -e "require('fs').copyFileSync('.env.example', '.env')"
```

The `.env` file is gitignored and must never be committed. Edit it if you need to change ports or credentials.

### 3. Start infrastructure

```bash
docker compose --env-file .env -f infra/docker/docker-compose.yml up -d --wait --wait-timeout 120
```

This starts PostgreSQL, Redis, and MinIO with health checks. The `--wait` flag ensures all services are healthy before returning.

### 4. Verify infrastructure

```bash
docker compose --env-file .env -f infra/docker/docker-compose.yml ps
```

All three services should show "healthy" status.

### 5. Run quality checks

```bash
pnpm lint
pnpm format:check
pnpm typecheck
pnpm test
pnpm build
```

### 6. Start applications

Start all applications in development mode:

```bash
pnpm dev
```

Or start individually:

```bash
# API (default port 3000)
pnpm --filter @wildtails/api dev

# Worker (default port 3001)
pnpm --filter @wildtails/worker dev

# Web (default port 3100)
pnpm --filter @wildtails/web dev
```

### 7. Verify health

Run the cross-platform health verification script:

```bash
node scripts/verify-health.mjs
```

Or check manually:

- API: http://localhost:3000/health
- Worker: http://localhost:3001/health
- Web: http://localhost:3100/health

All should return `{ "status": "ok", "service": "wildtails-<name>" }`.

### 8. Stop infrastructure

```bash
docker compose --env-file .env -f infra/docker/docker-compose.yml down
```

To also remove volumes (resets all data):

```bash
docker compose --env-file .env -f infra/docker/docker-compose.yml down -v
```

## Default Ports

| Service       | Port | Configurable via     |
| ------------- | ---- | -------------------- |
| API           | 3000 | `API_PORT`           |
| Worker        | 3001 | `WORKER_PORT`        |
| Web           | 3100 | `WEB_PORT`           |
| PostgreSQL    | 5432 | `POSTGRES_PORT`      |
| Redis         | 6379 | `REDIS_PORT`         |
| MinIO API     | 9000 | `MINIO_PORT`         |
| MinIO Console | 9001 | `MINIO_CONSOLE_PORT` |

## Troubleshooting

### Port conflicts

If a port is already in use, edit your `.env` file to change the relevant port variable.

### Docker services not starting

Ensure Docker Desktop is running. Check logs:

```bash
docker compose --env-file .env -f infra/docker/docker-compose.yml logs
```

### pnpm install fails

Ensure you are using Node.js 24 and pnpm 11.18.0:

```bash
node --version   # should be v24.x
pnpm --version   # should be 11.18.0
```
