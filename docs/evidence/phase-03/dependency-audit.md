# Phase 03 Dependency Audit

Date: 2026-08-04

## New Dependencies

### apps/api

| Package | Version | License | Purpose |
|---------|---------|---------|---------|
| @node-rs/argon2 | ^2.0.2 | MIT | Argon2id password hashing (pre-built N-API) |
| @nestjs/jwt | ^11.0.2 | MIT | JWT sign/verify for NestJS |
| @nestjs/passport | ^11.0.5 | MIT | Passport integration |
| passport | ^0.7.0 | MIT | Auth framework |
| passport-jwt | ^4.0.1 | MIT | JWT strategy |
| zod | ^4.4.3 | MIT | Runtime validation (direct dependency) |
| @wildtails/contracts | workspace:* | Private | Zod schemas |
| @wildtails/database | workspace:* | Private | PrismaClient factory |

### apps/api (devDependencies)

| Package | Version | License | Purpose |
|---------|---------|---------|---------|
| @types/passport-jwt | ^4.0.1 | MIT | TypeScript types |
| @types/express | ^5.0.0 | MIT | TypeScript types |

### packages/database

| Package | Version | License | Purpose |
|---------|---------|---------|---------|
| @prisma/adapter-pg | ^7.9.1 | Apache-2.0 | PostgreSQL driver adapter |
| pg | ^8.22.0 | MIT | PostgreSQL driver |

### packages/database (devDependencies)

| Package | Version | License | Purpose |
|---------|---------|---------|---------|
| dotenv | ^16.6.1 | BSD-2 | Env loading for seed/migration |
| tsx | ^4.23.5 | MIT | TypeScript execution for seed |
| @types/pg | ^8.20.3 | MIT | TypeScript types |

### apps/web

| Package | Version | License | Purpose |
|---------|---------|---------|---------|
| zod | ^4.4.3 | MIT | Runtime validation (direct dependency) |
| @wildtails/contracts | workspace:* | Private | Zod schemas |

### apps/web (devDependencies)

| Package | Version | License | Purpose |
|---------|---------|---------|---------|
| @playwright/test | ^1.50.0 | Apache-2.0 | E2E testing |

## NOT Installed

| Package | Reason |
|---------|--------|
| class-validator | Zod 4 from @wildtails/contracts is the single validation source |
| class-transformer | Not needed with Zod validation pipe |
| uuid | Using node:crypto randomUUID() and randomBytes() |
| zod@3 | Prohibited — repository uses Zod 4 exclusively |

## Zod Version Check

```
$ pnpm ls zod -r --depth 0
└── zod@4.4.3  (3 packages)
```

Only Zod 4.4.3 is present across the entire workspace.
