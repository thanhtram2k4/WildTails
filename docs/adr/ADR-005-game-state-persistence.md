# ADR-005: Game State Persistence

- Status: Accepted
- Date: 2026-08-04
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

---

## Phase 02 Concrete Decisions

### Game phase state machine

Defined in `packages/contracts/src/enums/game-phase.ts` as `GamePhaseSchema` and mirrored as `GamePhase` in the Prisma schema. The state machine is implemented as pure TypeScript in `packages/game-core` with no framework dependencies.

```
WAITING
  │  (all players ready)
  ▼
STARTING
  │  (server sets up round)
  ▼
ROLLING
  │  (current-turn player's ROLL_DICE event received and validated)
  ▼
QUESTION
  │  (server selects question; current-turn player submits ANSWER)
  ▼
VOTING
  │  (all other players submit VOTE; or timeout fires)
  ▼
RESULT
  │  (server tallies votes, awards round points, advances turn)
  ▼
  ├── (more rounds remain) → ROLLING
  └── (all rounds complete) → FINISHED ─── terminal
```

Invalid transitions (e.g., ROLL_DICE in QUESTION phase) must be rejected with a `GAME_ERROR` event and the error code `INVALID_PHASE`. The state machine must never enter an undefined state.

### Redis snapshot format

The authoritative active game state is a JSON object stored at key `game:space-dice:{roomId}` with a TTL of 2 hours (refreshed on each state update). The shape is defined in `packages/contracts/src/game/space-dice.ts` as `SpaceDiceGameStateSchema`:

| Field         | Type                               | Notes                                                       |
| ------------- | ---------------------------------- | ----------------------------------------------------------- |
| `roomId`      | UUID string                        | Matches the `GameSession.roomId` in PostgreSQL.             |
| `phase`       | `GamePhase`                        | Current phase of the state machine.                         |
| `players`     | `SpaceDicePlayer[]`                | Includes `isConnected` and `isReady` flags.                 |
| `currentTurn` | UUID string or null                | `null` during WAITING / STARTING / FINISHED.                |
| `round`       | int >= 0                           | Current round number (0-indexed during WAITING).            |
| `maxRounds`   | int > 0                            | Total rounds for this session.                              |
| `diceResult`  | int 1–6 (optional)                 | Present only during ROLLING and QUESTION phases.            |
| `question`    | `{ id, text, options }` (optional) | Set by the server. Never derived from client input.         |
| `votes`       | `Record<userId, optionIndex>`      | Populated in VOTING phase.                                  |
| `scores`      | `Record<userId, int>`              | Cumulative scores. Updated at the end of each RESULT phase. |
| `startedAt`   | ISO datetime or null               | Set when phase transitions to STARTING.                     |
| `updatedAt`   | ISO datetime                       | Updated on every state write.                               |

The client must never write to or derive any field from this schema. The server is the sole writer of the Redis snapshot.

### PostgreSQL final state models

All game domain models are in `packages/database/prisma/schema.prisma`:

| Model             | Table               | Purpose                                                              |
| ----------------- | ------------------- | -------------------------------------------------------------------- |
| `GameSession`     | `game_sessions`     | Durable record of the session. `finishedAt` is the point-award gate. |
| `GameParticipant` | `game_participants` | One row per player per session. Stores final `score`.                |
| `GameQuestion`    | `game_questions`    | Questions used in each round. Linked to votes.                       |
| `GameVote`        | `game_votes`        | One vote per voter per question (unique constraint).                 |
| `GameEvent`       | `game_events`       | Immutable event log. Payload is typed at the application layer.      |

`GameSession.finishedAt` is the authoritative signal that the game is complete and rewards can be awarded. Points must not be written to `PointTransaction` until this field is set and committed in PostgreSQL.

### Socket.IO event contracts

All event names and payload schemas are defined in `packages/contracts/src/game/space-dice.ts`.

**Client-to-server events** (`SpaceDiceClientEvent`). The server validates schema, room membership, phase, and turn before processing:

| Event       | Payload schema          | Validation rules                                           |
| ----------- | ----------------------- | ---------------------------------------------------------- |
| `READY`     | `ReadyPayloadSchema`    | Player must be in WAITING phase. Idempotent.               |
| `ROLL_DICE` | `RollDicePayloadSchema` | Must be the current-turn player. Phase must be ROLLING.    |
| `ANSWER`    | `AnswerPayloadSchema`   | Must be the current-turn player. Phase must be QUESTION.   |
| `VOTE`      | `VotePayloadSchema`     | Must not be the current-turn player. Phase must be VOTING. |

**Server-to-client events** (`SpaceDiceServerEvent`):

| Event              | Payload schema                 | When sent                                                                                               |
| ------------------ | ------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `GAME_STATE`       | `GameStatePayloadSchema`       | On reconnect: full snapshot. Also on demand.                                                            |
| `PHASE_CHANGE`     | `PhaseChangePayloadSchema`     | Every phase transition.                                                                                 |
| `DICE_RESULT`      | `DiceResultPayloadSchema`      | After server generates dice result (ROLLING phase).                                                     |
| `QUESTION`         | `QuestionPayloadSchema`        | When question is selected (QUESTION phase). Includes deadline.                                          |
| `VOTE_RESULT`      | `VoteResultPayloadSchema`      | End of VOTING phase. Includes round points awarded.                                                     |
| `GAME_END`         | `GameEndPayloadSchema`         | When FINISHED. Points only after PostgreSQL commit.                                                     |
| `PLAYER_JOIN`      | `PlayerJoinPayloadSchema`      | When a new player joins the room.                                                                       |
| `PLAYER_LEAVE`     | `PlayerLeavePayloadSchema`     | When a player disconnects (not mid-game removal).                                                       |
| `PLAYER_RECONNECT` | `PlayerReconnectPayloadSchema` | When a disconnected player reconnects. Includes snapshot.                                               |
| `ERROR`            | `GameErrorPayloadSchema`       | Invalid action or unexpected server error. `{ code, message }`. Internal detail omitted from `message`. |

### Reconnect behavior

When a player's Socket.IO connection drops and they reconnect:

1. The gateway verifies the access token on the new handshake.
2. The gateway fetches the full `SpaceDiceGameState` snapshot from Redis using `game:space-dice:{roomId}`.
3. If the snapshot exists and the player is in `players[]`, the server emits `PLAYER_RECONNECT` to the rejoining socket with the full `state` snapshot.
4. The server broadcasts `PLAYER_RECONNECT` (with `userId` but without the full state) to all other players in the room.
5. The player's `isConnected` flag is set to `true` in the Redis snapshot.
6. There is no event replay. The client reconstructs its local view entirely from the snapshot.

If the Redis key has expired (TTL exceeded), the session is considered abandoned. The server must transition the `GameSession.phase` to `FINISHED` in PostgreSQL if not already done.

### Point award gate

Points are awarded in a single PostgreSQL transaction that must:

1. Set `GameSession.finishedAt` to the current timestamp.
2. Update `GameParticipant.score` for each player.
3. Insert one `PointTransaction` row per player (source: `GAME_WIN` for the winner; `GAME_PARTICIPATE` for others).
4. If the transaction fails, roll back all rows. Do not emit `GAME_END` until the transaction commits.

The `GameEndPayload.pointsAwarded` map must be populated from the committed `PointTransaction` rows, not from an in-memory calculation. The client must not derive reward values.

After the PostgreSQL transaction commits, the Redis key `game:space-dice:{roomId}` is deleted. If deletion fails, it will expire via TTL; the system must tolerate a stale Redis key without treating it as an active game.

### Server-authoritative random generation

Dice results are generated on the server using `crypto.randomInt(1, 7)` (Node.js built-in). The result is written to `SpaceDiceGameState.diceResult` in Redis and sent to all players via `DICE_RESULT`. Client-provided dice values must be rejected.

Questions are selected by the server from a seeded question pool. The selection algorithm must not be influenced by client input.

### Failure modes and recovery

| Failure scenario                                        | Recovery strategy                                                                                                             |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Server crash after Redis write, before PostgreSQL write | Worker detects `phase = RESULT` or incomplete `finishedAt` on startup; replays finalization.                                  |
| Redis unavailable during active game                    | Gateway returns `GAME_ERROR` with code `STATE_UNAVAILABLE`. Game paused.                                                      |
| PostgreSQL write fails during finalization              | Retry with exponential backoff (max 3 attempts). If exhausted, set `GameSession` to an error state via a compensating update. |
| Player never reconnects after disconnect                | Timeout (configurable, recommended 5 minutes). Server advances turn or ends game if quorum lost.                              |
| Duplicate client event after reconnect                  | Events validated against current phase and turn. Idempotent where possible (READY); rejected otherwise.                       |
