# ADR-006: Deployment Target

- Status: Accepted
- Date: 2026-07-31
- Decision owners: Human
- Related phase: 11

## Context

WildTails is a thesis project. Deployment needs are primarily for demonstration and evaluation, not production scale. The system requires PostgreSQL, Redis, MinIO, and three Node.js processes (web, api, worker).

## Decision

Docker Compose for local development and thesis demonstration.

- `docker-compose.yml` with all services.
- `docker-compose.override.yml` for development (hot reload, volumes).
- Environment-specific `.env` files (not committed).
- Staging deployment documentation may be prepared in Phase 11, but no actual deployment without human approval.

Explicitly prohibited without human approval:
- Production deployment.
- VPS purchase or paid cloud resource creation.
- DNS changes.
- Billing account setup.

## Alternatives considered

### Local only (no Docker)

Pro: simplest. Con: "works on my machine" problems; harder for evaluators to reproduce.

### Cloud PaaS (Railway, Render, Fly.io)

Pro: easy deployment. Con: cost, complexity, may not be needed for thesis.

### Kubernetes

Pro: production-grade. Con: massive overkill for thesis MVP.

## Consequences

### Positive

- Reproducible environment for thesis evaluation.
- Single command to start all services.
- Same compose file works on any machine with Docker.
- Zero hosting cost during development.

### Negative

- Evaluator needs Docker installed.
- Resource usage on local machine.

### Risks

- Docker performance on Windows without WSL2 (mitigated by documenting WSL2 requirement).

## Validation

- `docker compose up` starts all services.
- API responds to health check.
- Web app loads in browser.
- All integration tests pass against Docker services.

## Revisit trigger

- Need for live demo accessible over internet (requires human approval for hosting).
- Evaluator cannot run Docker locally.
