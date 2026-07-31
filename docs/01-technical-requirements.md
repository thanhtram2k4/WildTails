# Technical Requirements

## Runtime and tooling

- Node.js 24 LTS.
- pnpm 11.
- TypeScript strict mode.
- Docker Compose.
- Git + GitHub.
- Linux, macOS hoặc Windows WSL2.

## Monorepo

Dùng pnpm workspace. Turborepo là tùy chọn; chỉ thêm khi thực sự giúp orchestration.

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
- React Server Components chỉ dùng nơi phù hợp.
- Client component cho state tương tác.
- Tailwind CSS.
- React Hook Form + schema validation.
- API client typed từ contract.
- Accessibility cơ bản.
- Reduced motion.
- Không lưu token nhạy cảm trong localStorage.
- Không tin visibility từ client.

## Backend

- NestJS modules theo domain.
- Controller mỏng.
- Application service chứa use case.
- Domain service chứa business rules.
- Adapter cho external systems.
- DTO validation.
- OpenAPI.
- Cursor pagination.
- Standard error envelope.
- Request ID.
- Rate limiting cho auth, AI job và interaction.

## Worker

- BullMQ.
- Retry giới hạn.
- Exponential backoff.
- Idempotency.
- Dead-letter hoặc failed-job inspection.
- Không auto-publish.
- Persist state transition.

## Database

- PostgreSQL.
- Prisma migration.
- Transaction cho point/reward.
- Index cho foreign key, feed, job, search.
- Unique constraint cho invariant.
- RLS là defense-in-depth, không thay backend policy.
- Full-text search trong MVP.
- pgvector chỉ bật khi phase semantic search được duyệt.

## Real-time

- Socket.IO.
- Typed events.
- Server-authoritative state.
- Redis active snapshot.
- PostgreSQL final result.
- Reconnect snapshot.
- Event authorization.
- Rate limit và duplicate action protection.

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
- Không phục vụ private file bằng public bucket.

## NFR targets for MVP

- API p95 dưới 500 ms trong test environment.
- 20 feed items đầu dưới 2 giây.
- Socket action dưới 300 ms trong LAN/test.
- Tối thiểu 100 WebSocket connections trong load test.
- AI create-job request trả ngay.
- Worker restart không làm mất job hợp lệ.
- Cross-account private journal access luôn bị chặn.
