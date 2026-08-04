# Phase 03 Token Rotation Evidence

Date: 2026-08-04
Test type: PostgreSQL-backed integration test
API: NestJS on localhost:3000
Database: local Docker PostgreSQL

## Sequential Refresh Rotation

- Register → receive refresh token
- POST /auth/refresh with valid token → 200
- New accessToken, refreshToken, expiresIn=900 returned
- Old token marked with replacedByTokenId in DB

## Concurrent Refresh (Promise.all)

Two concurrent refresh requests with the same token:

- **Result**: exactly 1 succeeded (200), exactly 1 failed (401)
- In single-process Node.js, requests serialize at the event loop level
- The second request sees replacedByTokenId already set → treated as replay
- This is security-correct: indistinguishable from token theft

## Genuine Replay Detection

1. Rotate token normally: token A → token B (success)
2. Replay token A: → **401** (replay detected, family revoked)
3. Use token B after replay: → **401** (entire family revoked)

## Transaction Persistence Verification

- After replay detection returns 401, the family revocation IS committed
- Proof: token B (the successor) is rejected with 401 after the replay
- If the revocation had rolled back, token B would still be valid
- Additional proof: a fresh login creates a new family that works normally

## Integration Test Results

```
7 tests passed:
- registration returns tokens
- rotates token successfully
- exactly one of two concurrent refreshes succeeds
- normal rotation produces a successor
- replaying the consumed token returns 401
- replay revoked the entire family — successor is now rejected
- family revocation was committed (not rolled back)
```

## Implementation Notes

- Default ReadCommitted isolation (not Serializable)
- Conditional updateMany with `replacedByTokenId: null` as concurrency guard
- Replay check: if `replacedByTokenId !== null` on initial read → REPLAY
- Race loser: if conditional update returns count=0 → LOST_RACE (no family revocation)
- Genuine replay: revokes family inside transaction, returns REPLAY outcome
- UnauthorizedException thrown OUTSIDE the transaction → revocation commits
- P2034 serialization errors caught → 401
