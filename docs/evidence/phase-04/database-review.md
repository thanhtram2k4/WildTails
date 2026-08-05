# Phase 04 Database Review

## Migration: `20260804170823_phase04_indexes`

### SQL Statements

```sql
-- Journal filtered list performance
CREATE INDEX "journals_ownerId_folderId_idx" ON "journals"("ownerId", "folderId");

-- Journal list with soft-delete exclusion and sort
CREATE INDEX "journals_ownerId_deletedAt_updatedAt_idx" ON "journals"("ownerId", "deletedAt", "updatedAt" DESC);

-- Enforce at most one active share per journal+user pair
CREATE UNIQUE INDEX "share_permissions_active_unique"
  ON "share_permissions"("journalId", "grantedToUserId")
  WHERE "revokedAt" IS NULL;
```

### Assessment

- **Additive only**: No column changes, no data modification, no table drops.
- **Index-only**: All three statements create indexes. Safe to apply without data loss.
- **Partial unique index**: PostgreSQL-specific. Ensures database-level enforcement of one active share per user+journal. Re-grant after revoke is allowed because revoked rows have `revokedAt IS NOT NULL`.
- **Rollback**: Indexes can be dropped without data loss.

### Applied

Migration applied successfully to local Docker PostgreSQL.
