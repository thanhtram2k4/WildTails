-- CreateIndex
CREATE INDEX "journals_ownerId_folderId_idx" ON "journals"("ownerId", "folderId");

-- CreateIndex
CREATE INDEX "journals_ownerId_deletedAt_updatedAt_idx" ON "journals"("ownerId", "deletedAt", "updatedAt" DESC);

-- Partial unique index: only one active (non-revoked) share per journal+user pair.
-- Re-grant after revoke is allowed because revoked rows have revokedAt IS NOT NULL.
CREATE UNIQUE INDEX "share_permissions_active_unique"
  ON "share_permissions"("journalId", "grantedToUserId")
  WHERE "revokedAt" IS NULL;
