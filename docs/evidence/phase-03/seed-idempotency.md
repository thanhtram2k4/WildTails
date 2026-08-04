# Phase 03 Seed Idempotency Evidence

Date: 2026-08-04

## Run 1
```
$ npx prisma db seed
Seeding default planets...
Seed complete. Default planets: 8
```

## Run 2
```
$ npx prisma db seed
Seeding default planets...
Seed complete. Default planets: 8
```

## Database Verification (psql)
```sql
SELECT name, slug, "isDefault" FROM planets ORDER BY name;

   name   |   slug   | isDefault
----------+----------+-----------
 Art      | art      | t
 Finance  | finance  | t
 Health   | health   | t
 Learning | learning | t
 Pets     | pets     | t
 Sports   | sports   | t
 Travel   | travel   | t
 Work     | work     | t
(8 rows)
```

## Assertions
- Exactly 8 default planets exist after both runs
- All slugs match the approved list
- All have isDefault=true
- Seed script includes count assertion (throws if count !== 8)
- Descriptions are temporary product copy (documented in seed.ts)
