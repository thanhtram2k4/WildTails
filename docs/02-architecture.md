# Architecture

## Architecture style

Modular Monolith + Background Worker + Real-time Gateway.

## Containers

```text
Browser
  ↓ HTTPS/WSS
Next.js Web
  ↓ REST/Socket.IO
NestJS API
  ├─ PostgreSQL
  ├─ Redis
  ├─ MinIO/S3
  └─ BullMQ jobs
        ↓
      Worker
        ├─ Transcript Adapter
        ├─ LLM Adapter
        ├─ Email Adapter
        └─ PostgreSQL/Storage
```

## Domain ownership

| Domain | Owns |
|---|---|
| Identity | User, profile, session, avatar, follow/block |
| Planet | Planet, membership, role, rule, invitation |
| Knowledge | Journal, folder, version, share permission, goal, tag |
| Social | Post, comment, reaction, save, report |
| AI | Job, job step, source, chunk, summary, prompt version |
| Game | Session, participant, event, question, vote |
| Gamification | Point transaction, influence event, leaderboard |
| Platform | Notification, media, audit, search, system config |

## Dependency rule

- Domain không import trực tiếp infrastructure chi tiết của domain khác.
- Cross-domain call đi qua public application service hoặc event.
- Không tạo event-driven architecture phức tạp cho mọi thay đổi.
- Dùng synchronous call khi cần transaction nhất quán.
- Dùng queue khi task dài hoặc retryable.

## Proposed package boundaries

- `packages/contracts`: API và socket schemas.
- `packages/database`: Prisma client và repository infrastructure.
- `packages/game-core`: pure state machine, không phụ thuộc NestJS/Phaser.
- `packages/ui`: reusable UI.
- `packages/testing`: fixtures, factories, test helpers.

## Required ADRs

- ADR-001 monorepo and package manager.
- ADR-002 auth/session strategy.
- ADR-003 permission model.
- ADR-004 AI provider abstraction.
- ADR-005 game state persistence.
- ADR-006 deployment target.
- ADR-007 transcript strategy.
