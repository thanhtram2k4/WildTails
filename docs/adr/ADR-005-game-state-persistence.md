# ADR-005: Game State Persistence

- Status: Accepted
- Date: 2026-07-31
- Decision owners: Human
- Related phase: 08

## Context

Space Dice (confirmed as MVP mini-game per D01) is a server-authoritative real-time mini-game for 4-6 players. Game state must survive player disconnections and server must be the source of truth for dice results, questions, turns, and scoring. Rewards (points) must only be granted after final results are persisted.

## Decision

Dual persistence: Redis for active game state, PostgreSQL for final results.

- **Active game**: Redis hash/JSON with TTL. Updated on every state transition.
- **State machine**: pure TypeScript in `packages/game-core`, no framework dependencies.
- **Reconnect**: client receives full snapshot from Redis, not event replay.
- **Final result**: written to PostgreSQL in a transaction that also creates point transactions.
- **Cleanup**: Redis key deleted after final result persisted.

## Alternatives considered

### PostgreSQL only

Pro: single source of truth. Con: too slow for real-time state updates; write pressure on every action.

### Redis only

Pro: fast. Con: data loss risk on Redis restart; no durable record for rewards and thesis evaluation.

### Event sourcing

Pro: full audit trail, replay. Con: complex for MVP; replay logic error-prone; snapshot still needed for reconnect.

## Consequences

### Positive

- Fast reads/writes for active game.
- Durable record for rewards, leaderboard, and thesis evidence.
- Clean separation: game-core is pure logic, persistence is adapter.

### Negative

- Must handle Redis-to-PostgreSQL transition atomically.
- Redis state and PostgreSQL must not diverge for completed games.

### Risks

- Server crash between Redis update and PostgreSQL write (mitigated by game-core state machine marking game as FINALIZING before persist attempt; worker can recover).

## Validation

- Game completes and final result appears in PostgreSQL.
- Point transactions match game outcome.
- Player reconnects mid-game and receives correct snapshot.
- Duplicate action after reconnect is rejected.
- Redis key is cleaned up after persistence.

## Revisit trigger

- Need for game replay/spectating (would need event log).
- Multiple game types with very different state shapes.
