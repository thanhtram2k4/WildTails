# Technical Requirements

## Runtime and tooling

- Node.js 24 LTS.
- pnpm 11.
- TypeScript strict mode.
- Docker Compose.
- Git + GitHub.
- Linux, macOS or Windows WSL2.

## Monorepo

Use pnpm workspace. Turborepo is optional; add it only when it genuinely helps orchestration.

```text
apps/
  web/
  api/
  worker/
packages/
  contracts/
  database/
  game-core/
  ui/
  config/
  testing/
```

## Frontend

- Next.js App Router.
- React Server Components only where appropriate.
- Client components for interactive state.
- Tailwind CSS.
- React Hook Form + schema validation.
- API client typed from contract.
- Basic accessibility.
- Reduced motion.
- Do not store sensitive tokens in localStorage.
- Do not trust visibility decisions from the client.

## Backend

- NestJS modules per domain.
- Thin controllers.
- Application service contains use cases.
- Domain service contains business rules.
- Adapter for external systems.
- DTO validation.
- OpenAPI.
- Cursor pagination.
- Standard error envelope.
- Request ID.
- Rate limiting for auth, AI job and interactions.

## Worker

- BullMQ.
- Limited retry.
- Exponential backoff.
- Idempotency.
- Dead-letter or failed-job inspection.
- No auto-publish.
- Persist state transitions.

## Database

- PostgreSQL.
- Prisma migration.
- Transaction for point/reward.
- Index for foreign key, feed, job, search.
- Unique constraint for invariants.
- RLS is defense-in-depth, not a replacement for backend policy.
- Full-text search in MVP.
- pgvector only enabled when the semantic search phase is approved.

## Real-time

- Socket.IO.
- Typed events.
- Server-authoritative state.
- Redis active snapshot.
- PostgreSQL final result.
- Reconnect snapshot.
- Event authorization.
- Rate limit and duplicate action protection.

## AI

- Provider adapter.
- Transcript adapter.
- Structured output schema.
- Prompt versioning.
- Input isolation.
- Human review.
- Token/cost/latency metrics.
- Manual transcript fallback.

## Object storage

- MinIO local.
- S3-compatible deploy.
- Signed URL.
- MIME validation.
- Size limit.
- Random object key.
- Do not serve private files from a public bucket.

## NFR targets for MVP

- API p95 under 500 ms in test environment.
- First 20 feed items under 2 seconds.
- Socket action under 300 ms on LAN/test.
- Minimum 100 WebSocket connections in load test.
- AI create-job request returns immediately.
- Worker restart does not lose valid jobs.
- Cross-account private journal access is always blocked.
