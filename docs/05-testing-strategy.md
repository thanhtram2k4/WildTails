# Testing Strategy

## Test pyramid

### Unit

- permission evaluator;
- influence calculation;
- feed score;
- AI job transition;
- game state transition;
- reward rules;
- schema parser.

### Integration

- NestJS + PostgreSQL;
- Redis + BullMQ;
- object storage signed URL;
- transcript adapter mock;
- LLM adapter mock;
- Socket.IO gateway;
- transaction ledger.

### E2E

- register/login;
- create PRIVATE journal;
- cross-user denial;
- grant/revoke share;
- Auto-Log to draft;
- edit and publish;
- interact and gain points;
- join game;
- disconnect/reconnect;
- moderator report flow.

### Security negative tests

- IDOR.
- Role bypass.
- Token replay.
- Malicious upload.
- Duplicate vote.
- Client-supplied score.
- Query private content through search.
- Read AI job of another user.

### Load

- feed pagination.
- 100 socket connections.
- burst AI job creation.
- leaderboard query.
- search query.

## Test data

- Do not use real user data.
- Deterministic seed.
- Factory for user, planet, journal, post, game.
- Test accounts have explicit roles.
- External adapters have mocks and recorded safe fixtures.

## Evidence

Each phase stores:

```text
docs/evidence/phase-XX/
  commands.md
  test-results.md
  screenshots/
  metrics/
  known-issues.md
```
