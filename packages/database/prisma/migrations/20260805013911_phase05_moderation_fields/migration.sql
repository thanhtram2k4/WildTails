-- DropIndex
DROP INDEX "comments_postId_idx";

-- DropIndex
DROP INDEX "posts_planetId_createdAt_idx";

-- AlterTable
ALTER TABLE "comments" ADD COLUMN     "moderatedAt" TIMESTAMP(3),
ADD COLUMN     "moderatedById" TEXT;

-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "moderatedAt" TIMESTAMP(3),
ADD COLUMN     "moderatedById" TEXT;

-- AlterTable
ALTER TABLE "reports" ADD COLUMN     "planetId" TEXT;

-- CreateIndex
CREATE INDEX "comments_postId_deletedAt_moderatedAt_createdAt_idx" ON "comments"("postId", "deletedAt", "moderatedAt", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "posts_planetId_deletedAt_moderatedAt_createdAt_id_idx" ON "posts"("planetId", "deletedAt", "moderatedAt", "createdAt" DESC, "id" DESC);

-- CreateIndex
CREATE INDEX "reports_planetId_status_createdAt_id_idx" ON "reports"("planetId", "status", "createdAt" DESC, "id" DESC);

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_moderatedById_fkey" FOREIGN KEY ("moderatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_moderatedById_fkey" FOREIGN KEY ("moderatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_planetId_fkey" FOREIGN KEY ("planetId") REFERENCES "planets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Partial unique index: prevent a user from filing duplicate PENDING reports
-- for the same target. Once a report is REVIEWED/DISMISSED/ACTIONED the
-- constraint no longer applies, allowing a fresh report if the behaviour recurs.
-- (D20) — cannot be expressed in Prisma schema; managed here manually.
CREATE UNIQUE INDEX "reports_pending_unique"
  ON "reports" ("reporterId", "targetType", "targetId")
  WHERE "status" = 'PENDING';
