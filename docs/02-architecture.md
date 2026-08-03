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

| Domain       | Owns                                                  |
| ------------ | ----------------------------------------------------- |
| Identity     | User, profile, session, avatar, follow/block          |
| Planet       | Planet, membership, role, rule, invitation            |
| Knowledge    | Journal, folder, version, share permission, goal, tag |
| Social       | Post, comment, reaction, save, report                 |
| AI           | Job, job step, source, chunk, summary, prompt version |
| Game         | Session, participant, event, question, vote           |
| Gamification | Point transaction, influence event, leaderboard       |
| Platform     | Notification, media, audit, search, system config     |

## Dependency rule

- A domain does not directly import the infrastructure details of another domain.
- Cross-domain calls go through a public application service or event.
- Do not build a complex event-driven architecture for every change.
- Use synchronous calls when a consistent transaction is required.
- Use a queue when the task is long-running or retryable.

## Proposed package boundaries

- `packages/contracts`: API and socket schemas.
- `packages/database`: Prisma client and repository infrastructure.
- `packages/game-core`: pure state machine, no dependency on NestJS or Phaser.
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
