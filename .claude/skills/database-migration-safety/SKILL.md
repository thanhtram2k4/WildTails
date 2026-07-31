---
name: database-migration-safety
description: Reviews WildTails Prisma/PostgreSQL schema changes for data loss, locks, backfills, constraints, indexes, rollback strategy, privacy impact, and production approval requirements.
user-invocable: true
---

Before accepting a migration:

1. Describe schema delta.
2. Identify destructive or incompatible changes.
3. Identify table size and lock risk assumptions.
4. Plan nullable-first or expand/contract sequence when needed.
5. Define backfill.
6. Add required constraints and indexes.
7. Validate local fresh database.
8. Validate upgrade from previous schema.
9. Define forward recovery.
10. Flag production execution as manual.
11. Save migration evidence.
