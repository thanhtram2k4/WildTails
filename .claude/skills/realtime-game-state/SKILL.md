---
name: realtime-game-state
description: Designs or implements WildTails server-authoritative game state, typed Socket.IO events, Redis snapshots, reconnect, duplicate-action protection, persistence, and reward safety.
user-invocable: true
---

For the current game feature:

1. Define explicit states and allowed transitions.
2. Define typed client/server event schemas.
3. Authenticate socket and room membership.
4. Validate phase, turn and idempotency.
5. Generate randomness on server.
6. Persist active snapshot in Redis.
7. Return authoritative snapshot on reconnect.
8. Persist final result in PostgreSQL.
9. Create reward transaction only after final persistence.
10. Test out-of-turn, duplicate, timeout, disconnect and reconnect cases.
