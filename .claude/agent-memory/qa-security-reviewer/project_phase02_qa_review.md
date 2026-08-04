---
name: Phase 02 QA Review Findings
description: Results of the independent QA/security review of Phase 02 (Architecture and Contracts) — findings table, privacy impact, and overall verdict
type: project
---

Phase 02 QA review completed on 2026-08-04.

Overall verdict: PASS_WITH_NOTES

3 HIGH findings must be resolved before Phase 03 implementation begins. 4 MEDIUM findings should be tracked in migration plan. 5 LOW/INFO findings are accepted as known issues.

**Why:** Review covers 40 Zod contract files, the 31-model Prisma schema, the 62-endpoint OpenAPI skeleton, and 4 ADRs. No implementation code exists yet — all findings are design-level.

**How to apply:** In Phase 03 (implementation), use these findings as acceptance blockers (HIGH) or implementation-time reminders (MEDIUM/LOW).

## Blocked — must fix before Phase 03 starts

**F-01 HIGH — Email exposure on public user profile**

- `UserProfileResponseSchema` includes `email` as required.
- `GET /users/{id}` uses this same schema, enabling email enumeration by any authenticated user.
- Fix: create a separate `PublicUserProfileResponseSchema` without `email`. Use it for `GET /users/{id}`. Keep `UserProfileResponse` (with email) for `GET /users/me` only.
- Files: `packages/contracts/src/identity/user.ts`, `docs/api/openapi.yaml`

**F-02 HIGH — Tag name uniqueness is global, not per-owner**

- `Tag.name String @unique` enforces global uniqueness.
- Comment says "same name may exist per owner" — the constraint contradicts the business rule.
- Fix: remove `@unique` from `name`, add `@@unique([ownerId, name])`.
- Files: `packages/database/prisma/schema.prisma`

**F-03 HIGH — CreateAiJobRequest allows empty body (no source enforcement)**

- All three fields are `.optional()` with no `.refine()` ensuring at least one source is present.
- Fix: add `.refine((d) => Boolean(d.sourceUrl) !== Boolean(d.manualTranscript), ...)`.
- Files: `packages/contracts/src/ai/ai-job.ts`, `docs/api/openapi.yaml`

## Track in migration plan (MEDIUM)

**F-04 MEDIUM — SharePermissionResponse omits revokedAt**

- After revoking a share, list endpoint cannot show revoked status.
- Fix: add `revokedAt: z.string().datetime().nullable()` to `SharePermissionResponseSchema`.

**F-05 MEDIUM — AiJobResponse sourceUrl exposed in single owner-only schema**

- No structural split between owner-view and non-existent public view.
- Low risk if service layer is correct, but no contract guard against admin-view leak.

**F-06 MEDIUM — avatarUrl in UpdateUserProfileRequest accepts arbitrary external URLs**

- Zod only validates URL format, not that it belongs to the platform's object storage.
- Fix: consider replacing with `mediaId: z.string().uuid()` resolved server-side, or document mandatory service-layer origin check.

**F-07 MEDIUM — PlanetMembership re-join blocked by @@unique constraint**

- A user who leaves and tries to rejoin will hit a unique constraint error.
- Fix: implement re-join as a service-layer upsert setting `leftAt = null`; document in API description.

## Known accepted gaps (LOW/INFO)

**F-08 LOW — JournalVersion.body required in Zod but nullable in Prisma**

- Fix: `body: z.string().nullable()` in `JournalVersionSchema`.

**F-09 LOW — AuditLog userId FK missing explicit onDelete: SetNull**

- Intent documented in ERD but not expressed in schema.

**F-10 LOW — Notification.type is String instead of Prisma enum**

- Fix: add `NotificationType` Prisma enum; change field type.

**F-11 LOW — GameEvent.type is String (no Prisma enum)**

- Acceptable if service layer always uses typed enum values.

**F-12 LOW — PlanetRule missing @@unique([planetId, key])**

- Fix: add compound unique constraint.

**F-13 LOW — No Zod contract for NotificationResponse**

- Fix: create `packages/contracts/src/platform/notification.ts`.

**F-14 INFO — LeaderboardEntry uses totalPoints but domain uses InfluenceScore**

- Clarify whether leaderboard sorts by raw points or composite Influence Score.

**F-15 INFO — Report polymorphic FK has no CHECK constraint**

- Migration-time partial indexes noted in ERD; add service-layer validation.

## Confirmed PASS items (Phase 02)

- Journal visibility defaults to PRIVATE in both schema and Zod
- Refresh token stores tokenHash (SHA-256), never raw token
- No balance field on User; PointTransaction is the ledger
- Media model stores no public URL; signed URL issued at service layer with expiresAt
- AiOutput.journalId is nullable; AI output is never auto-published
- GameSession.finishedAt is the point-award gate; client cannot set game results
- SharePermission has both expiresAt and revokedAt for full lifecycle
- AiJob has ownerId; all endpoints are owner-only
- Authorization evaluation order defined in ADR-003 (ownership → share → planet → public → deny)
- Game state snapshot (SpaceDiceGameState) has no client-writable fields
- AuditLog has no onDelete: Cascade (no cascading delete)
- All Zod schemas use concrete types; no `any` usage found in contract files
- Root contracts/src/index.ts re-exports all subdirectories
- All enum values match between Prisma and Zod (except Notification.type gap — F-10)
- OpenAPI global security requires bearerAuth; public endpoints explicitly set security: []
- All list endpoints use cursor-based pagination
- Barrel exports in each domain's index.ts are complete
