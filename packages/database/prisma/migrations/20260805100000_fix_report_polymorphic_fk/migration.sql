-- Migration: Fix polymorphic FK on reports.targetId
--
-- The original schema erroneously added two FK constraints on the same
-- polymorphic column (targetId). PostgreSQL enforces both simultaneously,
-- which makes it impossible to insert any row because a targetId that is a
-- valid post UUID cannot simultaneously be a valid comment UUID and vice versa.
--
-- Polymorphic associations (targetType + targetId) must not use database-level
-- FKs on the shared column. Referential integrity is enforced at the
-- application layer by the ReportService, which resolves the target before
-- inserting the row.
--
-- Rollback: Re-add the constraints ONLY if the polymorphic pattern is removed.

ALTER TABLE "reports" DROP CONSTRAINT IF EXISTS "report_post_fk";
ALTER TABLE "reports" DROP CONSTRAINT IF EXISTS "report_comment_fk";
