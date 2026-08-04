---
name: Phase 02 Prisma schema draft
description: Complete Prisma schema draft written and validated for Phase 02; 31 tables across 8 domains; key schema decisions recorded
type: project
---

Complete Prisma schema draft written to `packages/database/prisma/schema.prisma` and ERD to `docs/architecture/erd.md`. Both `prisma validate` and `prisma generate` pass with Prisma 7.9.1.

**Why:** Phase 02 requires domain models defined before API contracts and NestJS modules can be built. This is a DRAFT — no migration has run.

**How to apply:** When implementing services in Phase 03+, reference the schema for FK directions, enum values, and which fields carry privacy obligations. Before generating a migration, apply the database-migration-safety skill.

Key decisions recorded:

- Prisma 7 requires DATABASE_URL in `prisma.config.ts`, NOT in `schema.prisma` (url field removed from datasource block)
- `Tag.name` is globally unique (S02) — may need scoping in P2
- `Report.targetId` is polymorphic; partial indexes per targetType must be added in the migration (S03)
- `AuditLog` has no FK enforcement on targetId — records must survive target deletion (S04)
- No balance column on User; balance computed from SUM of point_transactions (S09)
- Soft delete (deletedAt) only on: users, journals, posts, comments
- `DailyPointCap.date` uses `@db.Date` to avoid timezone drift (S06)
- `Media.sizeBytes` uses BigInt (S07)
- Self-follow / self-block constraints are service-layer only; add CHECK in the migration
- Goal progress 0–100 constraint is service-layer only; add CHECK in the migration
