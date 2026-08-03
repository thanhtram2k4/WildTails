# WildTails – Project Instructions for Claude Code

## Mission

Build the WildTails – Catalyst Verse MVP as a gamified social journaling web platform with AI integration and real-time interaction.

Prioritize three technical pillars:

1. Captain’s Cabin privacy.
2. Asynchronous AI Auto-Log with structured output and human review.
3. Server-authoritative mini-game with reconnect.

Do not trade correctness, privacy, or testability for feature quantity.

## Product positioning

WildTails is not a traditional game. It is a gamified social journaling and knowledge-management platform.

The game is the experience layer. The core business domains are:

- identity;
- journal and knowledge management;
- social feed;
- goal management;
- AI processing;
- real-time mini-game;
- gamification;
- moderation;
- audit and observability.

## MVP priorities

### P0

- Auth and session management.
- User profile and basic cat avatar.
- Eight default planets.
- The Sun goal management.
- Captain’s Cabin.
- Journal, folder, tag and sharing permission.
- Planet Feed.
- AI Auto-Log.
- Basic moderation.

### P1

- BullMQ worker.
- Point transaction ledger.
- Influence Score and leaderboard.
- One mini-game Space Dice.
- Reconnect.
- Audit log.
- Security, AI and load evaluation.

### P2

Only execute when P0 and P1 are stable:

- Custom Planet.
- Three AI personalities.
- Semantic search.
- Spy Cat and Co-op Quest.
- Event reward integration.

## Technology constraints

- Node.js 24 LTS.
- pnpm 11 workspace.
- TypeScript strict.
- Next.js App Router.
- NestJS modular monolith.
- PostgreSQL + Prisma.
- Redis + BullMQ.
- Socket.IO.
- Phaser.
- MinIO/S3.
- LLM provider via adapter.
- Do not add FastAPI or a Python service in the MVP unless a dedicated ML model requirement exists.
- Do not switch to microservices in the MVP.

## Repository target structure

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
infra/
  docker/
  monitoring/
docs/
  adr/
  api/
  evidence/
```

Each app or package may have its own `CLAUDE.md` if local rules are needed.

## Architectural rules

- NestJS is the source of truth for business logic.
- PostgreSQL is the persistent data store.
- Redis is used only for cache, queue, lock and ephemeral state.
- The worker does not own the API's authorization logic.
- The client must not decide game result, score, reward, owner or visibility.
- Every external boundary must use an adapter interface.
- No direct circular imports between domains.
- A domain accesses only data it owns, through explicit service/port contracts.
- Every major architectural decision must have an ADR.

## Coding rules

- Do not use `any`; use a concrete type or `unknown` with a type guard.
- Every request must be validated at runtime.
- Every API response must follow the unified contract.
- Every external API response must be validated before use.
- Do not place business logic in a controller, React component or Socket.IO gateway.
- Functions with side effects must have clear, descriptive names.
- Do not create an abstraction when there is only one use case unless it enforces a clear boundary.
- Prefer small, testable, non-magical code.
- Do not copy-paste authorization logic or point calculation.
- Do not log access tokens, refresh tokens, passwords, private transcripts or journal bodies.
- Error messages sent to the client must not expose stack traces or internal structure.

## Privacy rules

- Journal defaults to `PRIVATE`.
- Default deny when no policy exists.
- The backend always checks owner and visibility.
- The UI is not the security layer.
- Selected-user sharing must support revoke and expiry.
- AI output is always a draft.
- No automatic publishing.
- Do not use private journals for public recommendations.
- Signed URLs must have an expiry.
- Delete/export must have audit and a clear policy.
- Cross-access tests are mandatory for every change touching journal, folder, media, search and AI job.

## AI rules

- AI Job state machine:
  - QUEUED
  - FETCHING_SOURCE
  - PREPROCESSING
  - SUMMARIZING
  - CLASSIFYING
  - SAVING
  - COMPLETED
  - FAILED
  - CANCELLED
- The LLM must return structured output validated against a schema.
- Record model, prompt version, latency, token usage and error code.
- Idempotency key is derived from user, source and prompt version.
- Limited retry with exponential backoff.
- Transcript is untrusted input; transcripts must not alter system instructions.
- Do not assert AI output as absolute truth.
- Always retain the source reference for cross-checking.

## Real-time game rules

- Server authoritative.
- Game state machine must be explicit.
- Events must validate schema, user, room membership, phase and turn.
- Random results are generated on the server.
- Client actions must be idempotent where required.
- Redis holds the active snapshot.
- PostgreSQL holds the final result and point transactions.
- Reconnect returns the snapshot; it does not merely replay events.
- Points are not awarded if the game result has not been persisted successfully.

## Database rules

- Every schema change must go through a Prisma migration.
- Do not manually alter the production schema.
- Migrations must review data, rollback/forward strategy and indexes.
- Every point change must create a transaction.
- Critical tables must have audit fields.
- Soft delete is used only when there is a business reason.
- Unique constraints must reflect invariants, not rely solely on application-level checks.
- List queries must be paginated.
- Queries for private content must filter by permission before returning data.

## Testing rules

Each feature must have appropriate test layers:

- unit tests for domain rules;
- integration tests for database/queue/socket adapters;
- E2E for critical user flows;
- negative authorization tests;
- failure-path tests;
- test evidence.

Do not mark a feature complete just because the build succeeds.

## Definition of done

An item is complete only when:

- acceptance criteria are met;
- lint passes;
- typecheck passes;
- unit/integration tests pass;
- appropriate E2E or manual verification passes;
- security/privacy review has no critical issues;
- migration has been verified if applicable;
- docs are updated;
- `PROJECT_STATUS.md` is updated;
- no secrets or unnecessary generated artifacts are in git;
- the user has approved all mandatory decisions.

## Agent orchestration

When running with `claude --agent wildtails-lead`:

- Lead must analyze the phase first.
- Use `solution-architect` for contracts, boundaries and ADRs.
- Use `frontend-engineer` for UI/accessibility.
- Use `backend-engineer` for NestJS domain/API.
- Use `database-security-engineer` for Prisma, queries, policy and migration.
- Use `ai-pipeline-engineer` for Auto-Log.
- Use `realtime-game-engineer` for Socket.IO/Phaser/game-core.
- Use `qa-security-reviewer` after implementation; do not use it to self-approve code the same agent wrote.
- Use `devops-observability-engineer` for Docker, CI/CD, telemetry and load harness.

Do not allow two agents to write to the same file at the same time.

## Stop conditions

Stop and ask the user when:

- a requirement conflicts with the proposal;
- a secret, billing account or external account is needed;
- a paid LLM provider/model must be chosen;
- a data change or incompatible migration is required;
- data must be deleted;
- a production deployment is required;
- the MVP scope must change;
- a privacy/security risk has no mitigation plan;
- a test fails but the root cause is unclear;
- a plugin or dependency requests suspicious permissions.

## Response format after each task

Always end with:

1. Summary.
2. Files changed.
3. Commands executed.
4. Test results.
5. Security/privacy impact.
6. Remaining risks.
7. Manual actions required.
8. Next recommended prompt.
