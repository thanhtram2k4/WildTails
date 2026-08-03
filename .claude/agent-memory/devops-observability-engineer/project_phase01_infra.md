---
name: Phase 01 Infrastructure Bootstrap
description: What was created in Phase 01 for local dev infra — Docker Compose, CI, scripts, setup guide
type: project
---

Phase 01 infrastructure bootstrap completed 2026-08-01 on branch phase/01-repository-bootstrap.

Files created:

- `infra/docker/docker-compose.yml` — postgres:17.10-alpine, redis:8.0.6-alpine, minio:RELEASE.2025-09-07T16-13-09Z, all with healthchecks
- `.github/workflows/ci.yml` — 14-step CI: install, lint, format, typecheck, test, prisma validate/generate, build, secret scan
- `docs/SETUP.md` — developer runbook with exact commands and port table
- `scripts/verify-health.mjs` — cross-platform app health poller (Windows taskkill, POSIX SIGTERM)
- `scripts/check-secrets.mjs` — regex-based secret scanner; blocks CI on real secrets or untracked .env files

**Why:** Phase 01 goal is reproducible local and staging environments with secrets outside git and health checks on all services.

**How to apply:** When adding new services, add them to docker-compose.yml with pinned image tags and a healthcheck. When adding CI steps, keep the 14-step order. The secret scanner placeholder list is in check-secrets.mjs PLACEHOLDER_PATTERNS — update it when adding new dev-only default values.

Open items deferred: MinIO bucket provisioning, staging compose, entropy-based secret scan, Prometheus/Grafana stack.
