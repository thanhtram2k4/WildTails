# Phase 03 Token Rotation Evidence

Date: 2026-08-04
Test type: PostgreSQL-backed integration test (auth.integration.spec.ts)
API: NestJS on localhost:3000
Database: local Docker PostgreSQL

## Root Cause: False-Replay Race

**Problem**: When request B reads the token after request A has committed rotation,
B sees `replacedByTokenId != null` and revokes the entire family, including A's
valid successor token.

**Solution**: `replacedAt` timestamp grace interval (REFRESH_ROTATION_GRACE_MS = 10 seconds).

When a token has `replacedByTokenId` set:

- If `replacedAt` is within the 10-second grace interval → LOST_RACE (no revocation)
- If `replacedAt` is beyond the 10-second interval → genuine REPLAY (family revoked)

**Schema change**: Added `replacedAt DateTime?` to `RefreshToken` model.
Migration: `20260804154302_add_replaced_at` — single `ALTER TABLE ADD COLUMN`.

## Concurrent Refresh Integration Test Results

### Test: exactly one of two concurrent refreshes succeeds

- Two `Promise.all` requests with the same token
- Result: exactly 1 returned 200, exactly 1 returned 401
- **PASS**

### Test: DB — exactly one successor row created

```sql
SELECT id FROM refresh_tokens
WHERE family = $1
  AND "replacedByTokenId" IS NULL
  AND "revokedAt" IS NULL;
-- Result: 1 row
```

- **PASS**

### Test: DB — concurrent loser did NOT revoke any token

```sql
SELECT id FROM refresh_tokens
WHERE family = $1
  AND "revokedAt" IS NOT NULL;
-- Result: 0 rows
```

- **PASS**

### Test: winner's successor token is valid

- Refreshed with the successor token → 200
- **PASS**

## Genuine Replay Detection (After Grace Interval)

### Test: normal rotation produces a successor

- Refresh with token → 200, new successor issued
- **PASS**

### Test: wait beyond grace interval

- Waited 11 seconds (grace = 10 seconds)
- **PASS**

### Test: replaying consumed token returns 401

- Replay of already-rotated token after 11s → 401
- **PASS**

### Test: DB — entire family is revoked

```sql
SELECT id, "revokedAt" FROM refresh_tokens WHERE family = $1;
-- All rows have revokedAt IS NOT NULL
```

- **PASS**

### Test: successor rejected after family revocation

- Refresh with successor → 401
- **PASS**

### Test: family revocation was committed

- Fresh login creates new family → 200
- Refresh on new family → 200
- Proves old family revocation persisted (not rolled back)
- **PASS**

## Implementation Summary

- Default `ReadCommitted` isolation (not Serializable)
- Conditional `updateMany WHERE replacedByTokenId IS NULL AND revokedAt IS NULL` as concurrency guard
- Winner sets `replacedByTokenId` and `replacedAt = now()`
- Loser within grace interval (replacedAt within 10s) → LOST_RACE (401, no revocation)
- Replay beyond grace interval → REPLAY (family revoked inside transaction, 401 outside)
- `UnauthorizedException` thrown OUTSIDE the transaction → revocation commits first
- 12 PostgreSQL-backed integration tests, all PASS
