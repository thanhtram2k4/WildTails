# Phase 02 – Privacy and Security Review

**Reviewer:** QA/Security Agent (independent)
**Date:** 2026-08-04
**Branch:** `phase/02-architecture-and-contracts`
**Reviewer note:** This review covers contracts and schema design only. No implementation exists yet. Every finding is a design-level risk that is easier to fix now than after code is written.

---

## 1. Review Scope

| Artifact          | Files reviewed                                                |
| ----------------- | ------------------------------------------------------------- |
| Zod contracts     | All 40 files under `packages/contracts/src/`                  |
| Prisma schema     | `packages/database/prisma/schema.prisma` (31 models)          |
| OpenAPI skeleton  | `docs/api/openapi.yaml` (62 endpoints)                        |
| ADRs              | ADR-002, ADR-003, ADR-004, ADR-005                            |
| Architecture docs | `docs/architecture/erd.md`, `docs/architecture/module-map.md` |
| Privacy doc       | `docs/04-security-and-privacy.md`                             |
| Domain rules      | `docs/03-domain-rules.md`                                     |
| CLAUDE.md         | Project-level coding and privacy rules                        |

Review checklist: contract correctness, Prisma schema invariants, privacy/security design, contract-schema alignment, and OpenAPI spot-check.

---

## 2. Findings

### F-01 — Email exposed on public user profile endpoint

**Severity:** HIGH
**Status:** RESOLVED

**Description:** `UserProfileResponse` declares `email` as a required field in both the Zod schema (`packages/contracts/src/identity/user.ts`, line 6) and the OpenAPI schema (`docs/api/openapi.yaml`, lines 221–228). The `GET /users/{id}` endpoint uses this same schema for the public profile view. The OpenAPI description explicitly states "email and private fields are omitted" but the schema contradicts this — `email` is in `required`. If implemented as-is, any authenticated user can enumerate the email addresses of all other users by iterating user IDs.

**Evidence:**

- `packages/contracts/src/identity/user.ts` lines 3–11: `email: z.string().email()` present in `UserProfileResponseSchema`.
- `docs/api/openapi.yaml` line 221: `required: [id, email, displayName, joinedAt]`.
- `docs/api/openapi.yaml` line 1345: description says "email and private fields are omitted".

**Affected files:**

- `packages/contracts/src/identity/user.ts`
- `docs/api/openapi.yaml`

**Reproduction:** Implement `GET /users/{id}` using `UserProfileResponse` as documented. Authenticated user calls `GET /users/{victimId}`. Victim's email address is returned in the response body.

**Expected behavior:** `GET /users/{id}` should return a `PublicUserProfileResponse` schema that omits `email`. Email should appear only in `GET /users/me` responses.

**Recommended fix:** Define a separate `PublicUserProfileResponseSchema` in the contracts that excludes `email` (and any other private fields). Update the OpenAPI `GET /users/{id}` path to reference this new schema. The `UserProfileResponse` (with email) should be used only for `GET /users/me`.

**Resolution:**

- Created `PublicUserProfileResponseSchema` in `packages/contracts/src/identity/user.ts` (excludes email).
- Updated `GET /users/{id}` in `docs/api/openapi.yaml` to reference `PublicUserProfileResponse`.
- `GET /users/me` retains `UserProfileResponse` (includes email).
- Added contract test: `PublicUserProfileResponseSchema` does not accept email field.
- Verified: `pnpm typecheck` passes; OpenAPI refs valid.

**Missing test:** Negative test: authenticated user B calls `GET /users/A` and confirms the response does not contain user A's email address.

---

### F-02 — Tag name global uniqueness violates stated comment

**Severity:** HIGH
**Status:** RESOLVED

**Description:** The Prisma `Tag` model has `name String @unique` (schema line 364), which enforces tag name uniqueness globally across all users. The comment on the model (line 362) states "same name may exist per owner", which is the correct business rule. The `@unique` constraint will cause a `UniqueConstraintViolation` the moment a second user creates a tag with the same name (e.g., two users both creating a tag called "learning"). This is a data integrity issue that blocks multi-user functionality and cannot be fixed without a migration.

**Evidence:**

- `packages/database/prisma/schema.prisma` lines 362–374: comment says "same name may exist per owner" but `name String @unique` is global.

**Affected files:**

- `packages/database/prisma/schema.prisma`

**Reproduction:** User A creates tag "learning". User B creates tag "learning". The second creation fails at the database layer with a unique constraint violation.

**Expected behavior:** Tag name should be unique per owner, not globally. The constraint should be `@@unique([ownerId, name])`.

**Recommended fix:** Replace `name String @unique` with `name String` and add `@@unique([ownerId, name])` to the model. This accurately reflects the stated business invariant.

**Resolution:**

- Removed `@unique` from `Tag.name` in `packages/database/prisma/schema.prisma`.
- Added `@@unique([ownerId, name])` to the `Tag` model.
- Updated model comment to "Tags are scoped per user".
- Verified: `npx prisma validate` passes.

**Missing test:** Integration test: two different users both create tags with the same name and both succeed.

---

### F-03 — CreateAiJobRequest allows empty request body (no source validation)

**Severity:** HIGH
**Status:** RESOLVED

**Description:** `CreateAiJobRequestSchema` in `packages/contracts/src/ai/ai-job.ts` declares all three fields as optional: `sourceUrl`, `manualTranscript`, and `promptVersion`. There is no `.refine()` or `.superRefine()` validator ensuring that at least one of `sourceUrl` or `manualTranscript` is provided, and no constraint preventing both from being set simultaneously. The OpenAPI description says "One of sourceUrl or manualTranscript must be provided" but this is a comment only — not enforced at the contract layer. A request with neither field will reach the worker and likely cause a crash or an unhelpful `FAILED` state rather than a clear `VALIDATION_ERROR`.

The mutually exclusive concern is also unaddressed: if a user provides both, the worker must choose one arbitrarily, creating nondeterministic behavior that could affect idempotency key derivation (which branches on `sourceUrl ?? SHA-256(manualTranscript)`).

**Evidence:**

- `packages/contracts/src/ai/ai-job.ts` lines 4–14: all three fields are `.optional()` with no refinement.
- `docs/api/openapi.yaml` line 854: description says "One of sourceUrl or manualTranscript must be provided" but no `oneOf` or constraint is present in the schema.

**Affected files:**

- `packages/contracts/src/ai/ai-job.ts`
- `docs/api/openapi.yaml`

**Reproduction:** POST to `/ai/jobs` with body `{}`. No validation error is raised by the Zod schema; request proceeds to the worker.

**Expected behavior:** Schema-layer rejection with `VALIDATION_ERROR` when neither `sourceUrl` nor `manualTranscript` is present.

**Recommended fix:** Add a `.refine()` to `CreateAiJobRequestSchema`:

```typescript
.refine(
  (data) => Boolean(data.sourceUrl) !== Boolean(data.manualTranscript),
  { message: 'Exactly one of sourceUrl or manualTranscript must be provided' }
)
```

Also add a `discriminator` or `oneOf` in the OpenAPI schema to formally encode the mutual exclusion.

**Resolution:**

- Added `.refine()` to `CreateAiJobRequestSchema` in `packages/contracts/src/ai/ai-job.ts` enforcing exactly one of `sourceUrl` or `manualTranscript`.
- Updated OpenAPI `CreateAiJobRequest` to use `oneOf` with two variants enforcing mutual exclusivity.
- Added contract tests: empty body rejected, both fields rejected, each alone accepted.
- Verified: `pnpm typecheck` passes.

**Missing test:** Unit test: `CreateAiJobRequestSchema.parse({})` throws a validation error. Unit test: `CreateAiJobRequestSchema.parse({ sourceUrl: '...', manualTranscript: '...' })` throws a validation error.

---

### F-04 — SharePermissionResponse omits revokedAt; revoke endpoint returns opaque boolean

**Severity:** MEDIUM
**Status:** RESOLVED

**Description:** `SharePermissionResponseSchema` (`packages/contracts/src/knowledge/share-permission.ts`) does not include a `revokedAt` field. ADR-003 states that "The revoke operation sets `revokedAt` to the current timestamp. There is no hard-delete of share permission rows; the audit trail must be preserved." Without `revokedAt` in the response, the journal owner has no way to see whether a permission was previously granted and then revoked (versus never granted). This also prevents the UI from distinguishing active from revoked permissions in the list returned by `GET /journals/{id}/shares`.

The revoke endpoint (`DELETE /journals/{id}/share/{permissionId}`) returns only `{ revoked: boolean }`, which loses the revocation timestamp needed for audit display.

**Evidence:**

- `packages/contracts/src/knowledge/share-permission.ts` lines 13–23: `revokedAt` absent from `SharePermissionResponseSchema`.
- `docs/api/openapi.yaml` lines 646–669: `SharePermissionResponse` schema also omits `revokedAt`.
- ADR-003 Phase 02 section: "`revokedAt`: Set on explicit revocation. Non-null = denied regardless of expiry."

**Affected files:**

- `packages/contracts/src/knowledge/share-permission.ts`
- `docs/api/openapi.yaml`

**Expected behavior:** `SharePermissionResponse` should include `revokedAt: z.string().datetime().nullable()`. The list endpoint should filter by `revokedAt IS NULL` by default and optionally include revoked ones.

**Recommended fix:** Add `revokedAt: z.string().datetime().nullable()` to `SharePermissionResponseSchema`. Update the OpenAPI schema accordingly. Ensure the `listSharePermissions` endpoint documents whether it returns only active (non-revoked) permissions by default.

**Missing test:** After revoking a share permission, `GET /journals/{id}/shares` should not include the revoked permission in the default (active-only) view.

---

### F-05 — AiJobResponse exposes sourceUrl to any consumer of the schema

**Severity:** MEDIUM
**Status:** OPEN

**Description:** `AiJobResponseSchema` (`packages/contracts/src/ai/ai-job.ts`, line 37) includes `sourceUrl` as a top-level optional field. ADR-004 states that "AiJobResponse.summary and AiJobResponse.tags fields must be omitted if the requesting principal is not the job owner." The same concern applies to `sourceUrl`, which may be a private or sensitive URL (e.g., a personally identifiable YouTube video link). The schema contract does not express that these fields are owner-only, increasing the risk that an implementation developer may return them to non-owners.

The contract comment says "Only the job owner may receive this" but there is no structural enforcement — no separate "public AiJobSummary" vs "owner AiJobDetail" schema split.

**Evidence:**

- `packages/contracts/src/ai/ai-job.ts` lines 33–50: single `AiJobResponseSchema` used for both owner and non-owner contexts.
- ADR-004: "Do not return summary or tags to non-owners."

**Affected files:**

- `packages/contracts/src/ai/ai-job.ts`

**Expected behavior:** There should be no code path that returns AI job details to a non-owner. The contract design should make this obvious — either by having a single response schema and documenting all fields as owner-only (acceptable), or by separating into `AiJobOwnerResponseSchema` and `AiJobPublicSchema`.

**Recommended fix:** Since AI jobs have no public-facing view (only the owner can call the endpoint), the current design is acceptable if the service layer enforces owner-only access. However, the comment on line 30 should be changed from "Only the job owner may receive this" to a stronger enforcement note in the service layer. The risk is LOW if access control is correctly implemented, but the schema design does not prevent an accidental admin-view leak. Consider adding an explicit note in the ADR that no admin endpoint should expose individual AI job content.

**Missing test:** Negative authorization test: user B calls `GET /ai/jobs/{jobId}` where the job belongs to user A, and receives 403.

---

### F-06 — UpdateUserProfileRequest allows client to set avatarUrl to arbitrary URLs

**Severity:** MEDIUM
**Status:** OPEN

**Description:** `UpdateUserProfileRequestSchema` (`packages/contracts/src/identity/user.ts`, line 16) accepts `avatarUrl: z.string().url().optional()`. The OpenAPI description says "Signed URL pointing to an already-uploaded avatar in object storage." This means the client is expected to first upload via `/media/upload`, receive a signed URL, then set that URL as their `avatarUrl`. However, the Zod schema only validates that the value is a URL — it does not validate that the URL belongs to the platform's object storage (i.e., same bucket/domain prefix). A user could set their avatarUrl to any arbitrary external URL (e.g., tracking pixel, content from a third-party host). This is a content-security concern and may also allow profile picture hotlinking from untrusted sources.

**Evidence:**

- `packages/contracts/src/identity/user.ts` lines 14–21: `avatarUrl: z.string().url().optional()` with no domain/prefix restriction.
- `docs/api/openapi.yaml` line 254: description says "Signed URL pointing to an already-uploaded avatar in object storage" but the schema allows any URL.

**Affected files:**

- `packages/contracts/src/identity/user.ts`
- `docs/api/openapi.yaml`

**Expected behavior:** The service layer should validate that `avatarUrl` references a `Media` record owned by the requesting user. The schema contract should document this service-layer requirement explicitly.

**Recommended fix:** Replace the `avatarUrl` field in `UpdateUserProfileRequest` with a `mediaId: z.string().uuid().optional()` that references a `Media` record. The service resolves the objectKey and generates the signed URL server-side. This also removes the signed URL from the persistent profile field (signed URLs expire, making the stored URL stale after expiry). Alternatively, add a comment to the schema that service-layer validation of the URL's origin is mandatory.

**Missing test:** Test that a user cannot set `avatarUrl` to an external domain URL. Test that `avatarUrl` in the stored profile is not an expired signed URL.

---

### F-07 — PlanetMembership allows re-joining without clearing leftAt (soft-delete gap)

**Severity:** MEDIUM
**Status:** RESOLVED

**Description:** The `PlanetMembership` model uses `@@unique([planetId, userId])`, which is correct for preventing duplicate memberships. However, `leftAt` is used as a soft-delete indicator (null = active, non-null = left). When a user leaves and then rejoins a planet, the existing membership row has `leftAt` set, but `@@unique([planetId, userId])` means a new row cannot be inserted — any re-join attempt will hit a unique constraint violation. The schema does not provide a mechanism for re-joining (e.g., setting `leftAt` back to null on the existing row), and the contracts do not address this lifecycle.

The `JoinPlanetRequestSchema` and `joinPlanet` endpoint do not acknowledge this re-join scenario. The OpenAPI `/planets/{id}/join` returns 409 on conflict, which would incorrectly be returned for a re-join attempt.

**Evidence:**

- `packages/database/prisma/schema.prisma` lines 275–290: `@@unique([planetId, userId])` with `leftAt DateTime?` for soft delete.
- `packages/contracts/src/planet/membership.ts`: no re-join logic or lifecycle states.
- `docs/api/openapi.yaml` line 1569: `joinPlanet` returns 409 on conflict only.

**Affected files:**

- `packages/database/prisma/schema.prisma`
- `packages/contracts/src/planet/membership.ts`
- `docs/api/openapi.yaml`

**Expected behavior:** Re-joining a planet after leaving should be supported. The service should update `leftAt = null` on the existing membership row rather than inserting a new one.

**Recommended fix:** Document in `PlanetMembershipResponse` that re-join reactivates the existing row. Add a contract note or a `rejoinedAt` field if the timestamp of re-joining is needed. Ensure the `joinPlanet` endpoint description clarifies that 409 is only returned when the user is already an active member (leftAt IS NULL), not when there is a historical row with leftAt set.

**Resolution (D15):**

- Added `leftAt` field to `PlanetMembershipResponseSchema` in `packages/contracts/src/planet/membership.ts`.
- Updated Prisma schema comments documenting rejoin behavior.
- Updated OpenAPI `POST /planets/{id}/join` description with rejoin semantics.
- Added rejoin rule to `docs/03-domain-rules.md`.
- Added rejoin section to ADR-003.
- Recorded as decision D15 in `docs/decisions-register.md`.
- Added contract test for rejoin lifecycle.

**Missing test:** Integration test: user joins planet, leaves, rejoins; membership is correctly reactivated and count is correct.

---

### F-08 — JournalVersion body is required in the Zod schema but nullable in Prisma

**Severity:** LOW
**Status:** RESOLVED

**Description:** `JournalVersionSchema` in `packages/contracts/src/knowledge/journal.ts` (line 31) defines `body: z.string()` as required (non-optional). However, the Prisma `JournalVersion` model (schema line 353) declares `body String?` (nullable). If a journal was created without a body (title-only stub, which is explicitly supported per `Journal.body String?`), the corresponding `JournalVersion.body` will be `null`, but the Zod schema will fail parsing with a type error. This is a latent runtime bug at the boundary where the Prisma response is mapped to the contract response.

**Evidence:**

- `packages/contracts/src/knowledge/journal.ts` line 31: `body: z.string()` (required).
- `packages/database/prisma/schema.prisma` line 353: `body String?` (nullable).

**Affected files:**

- `packages/contracts/src/knowledge/journal.ts`

**Expected behavior:** `JournalVersionSchema.body` should be `z.string().nullable()` or `z.string().optional()` to match the Prisma model.

**Recommended fix:** Change line 31 in `journal.ts` to `body: z.string().nullable()`.

**Missing test:** Unit test: parsing a `JournalVersion` with `null` body through `JournalVersionSchema.parse(...)` does not throw.

---

### F-09 — AuditLog has no cascade-delete protection; userId FK allows silent nullification

**Severity:** LOW
**Status:** RESOLVED

**Description:** The `AuditLog` model (schema lines 835–850) defines `userId String?` with `User? @relation(fields: [userId], references: [id])`. There is no `onDelete` clause on the relation, which in Prisma defaults to `RESTRICT` when the FK is nullable. However, because `User` has `deletedAt` for soft-delete, no actual row deletion is expected in the user lifecycle. The concern is: if a hard-delete path is ever added for the 30-day retention window (D10 mentions purge), the absence of an explicit `onDelete` policy on `AuditLog.userId` is a documentation gap. The ERD notes that "AuditLog has no cascading deletes" but the schema does not explicitly model this as `onDelete: SetNull`. This could be confusing for implementers.

A second concern: `AuditLog.metadata Json?` has no schema type guidance. The comment says "Sensitive fields must be omitted" but there is no contract schema for what metadata is allowed, making it difficult to audit or test.

**Evidence:**

- `packages/database/prisma/schema.prisma` lines 835–850: no `onDelete` on the `userId` FK.
- `docs/evidence/phase-01/known-issues.md` or ERD.md: "AuditLog has no cascading deletes" noted as intention but not enforced.
- No `AuditLogMetadataSchema` contract defined in `packages/contracts/src/`.

**Affected files:**

- `packages/database/prisma/schema.prisma`

**Recommended fix:** Add `onDelete: SetNull` explicitly to the `AuditLog.user` relation to make the intent clear. Create a minimal `AuditLogMetadataSchema` or document the allowed/forbidden metadata fields to guide implementation.

**Missing test:** Integration test: when a user's account is purged (hard-deleted), audit log entries for that user have `userId = null` (preserved, not deleted).

---

### F-10 — Notification model uses `type String` instead of `NotificationType` enum

**Severity:** LOW
**Status:** OPEN

**Description:** The `Notification` Prisma model (schema lines 799–812) declares `type String` as a plain string field, while the contracts define `NotificationTypeSchema` with eight valid values (`FOLLOW`, `COMMENT`, `REACTION`, `MENTION`, `GAME_INVITE`, `GOAL_REMINDER`, `AI_JOB_COMPLETE`, `MODERATION`). The Prisma schema does not use the `enum` type for `Notification.type`, meaning invalid notification types can be written to the database without error. This is a contract-schema misalignment.

**Evidence:**

- `packages/database/prisma/schema.prisma` line 804: `type String`.
- `packages/contracts/src/enums/notification-type.ts` lines 3–13: `NotificationTypeSchema` defines eight valid values.
- OpenAPI `NotificationResponse` references `$ref: '#/components/schemas/NotificationType'` correctly.

**Affected files:**

- `packages/database/prisma/schema.prisma`

**Expected behavior:** `Notification.type` should use a Prisma `enum NotificationType` mirroring the Zod enum, just as `AiJob.state`, `Journal.visibility`, and other enum fields do.

**Recommended fix:** Add a `NotificationType` Prisma enum with the same values as the Zod schema. Change `Notification.type String` to `Notification.type NotificationType`. This is a migration-scope change.

**Missing test:** Unit test confirming that a notification with an invalid `type` string is rejected at the schema/service layer.

---

### F-11 — GameEvent.type uses String instead of a typed enum

**Severity:** LOW
**Status:** OPEN

**Description:** `GameEvent.type String` (schema line 726) is a plain string. The game event types are defined in `SpaceDiceClientEventSchema` and `SpaceDiceServerEventSchema` in contracts, but there is no Prisma enum for game event types. While this gives flexibility, it means the event log can silently record invalid or misspelled event types with no database-level enforcement.

**Evidence:**

- `packages/database/prisma/schema.prisma` line 726: `type String`.
- `packages/contracts/src/game/space-dice.ts` lines 55–74: typed enums exist for client and server events.

**Affected files:**

- `packages/database/prisma/schema.prisma`

**Recommended fix:** This is lower priority than F-10 because game events are written only by the server. Document that `GameEvent.type` must always be set from `SpaceDiceClientEvent | SpaceDiceServerEvent`. The service layer must validate the type before writing the event log row.

**Missing test:** Integration test: game event log rows have valid event types matching the defined enum values.

---

### F-12 — Missing `@@unique` index on `PlanetRule` per-planet per-key

**Severity:** LOW
**Status:** RESOLVED

**Description:** `PlanetRule` (schema lines 293–305) stores key-value configuration for a planet. There is no `@@unique([planetId, key])` constraint, which means the same key can be inserted multiple times for the same planet. A seeding script or admin action that inserts a duplicate rule (e.g., setting `posting_policy` twice) would result in duplicate rows with no error, and the application would need to decide which row to use.

**Evidence:**

- `packages/database/prisma/schema.prisma` lines 293–305: only `@@index([planetId])`, no unique constraint on `(planetId, key)`.

**Affected files:**

- `packages/database/prisma/schema.prisma`

**Recommended fix:** Add `@@unique([planetId, key])` to `PlanetRule`. Use an upsert pattern in the seeder and in the admin update operation.

**Missing test:** Integration test: creating two `PlanetRule` rows with the same `(planetId, key)` pair raises a uniqueness error.

---

### F-13 — No contract defined for Notification (Zod schema missing)

**Severity:** LOW
**Status:** OPEN

**Description:** The OpenAPI specification defines a `NotificationResponse` schema and the `GET /notifications` / `PATCH /notifications/{id}/read` endpoints. However, there is no corresponding Zod schema in `packages/contracts/src/`. There is no `notification.ts` file under `packages/contracts/src/platform/` or anywhere else. The enums directory exports `NotificationTypeSchema`, but the full notification response contract is absent from the type-safe boundary.

**Evidence:**

- `find packages/contracts/src -name "notification*"` returns no files.
- `docs/api/openapi.yaml` lines 1023–1047: `NotificationResponse` defined in OpenAPI only.
- `packages/contracts/src/index.ts` does not export a notification response schema.

**Affected files:**

- `packages/contracts/src/` (missing file)

**Recommended fix:** Create `packages/contracts/src/platform/notification.ts` with `NotificationResponseSchema` and export it from the package index. This ensures the NestJS service and the frontend use the same validated type.

**Missing test:** N/A (this is a design gap; a test cannot be written until the contract exists).

---

### F-14 — LeaderboardEntry exposes totalPoints but Influence Score and points are separate concepts

**Severity:** INFO
**Status:** OPEN

**Description:** The OpenAPI `LeaderboardEntry` schema (lines 968–984) includes `totalPoints: integer` as a required field, but the domain documentation defines the `InfluenceScore` as the leaderboard metric, not the raw point total. `InfluenceScore` is a composite score computed from content, engagement, consistency, game, and penalty dimensions. The `PointTransaction` ledger is the source of truth for raw points. The leaderboard entity conflating these two concepts may create confusion during implementation about which value to sort and display.

**Evidence:**

- `docs/api/openapi.yaml` lines 968–984: `LeaderboardEntry` has `totalPoints`.
- `docs/03-domain-rules.md`: "Leaderboard uses periodic snapshots" (from `InfluenceScore`, not raw sum).
- `packages/contracts/src/gamification/influence-score.ts`: `InfluenceScoreSchema` has a `score` field which is the composite value.
- `packages/database/prisma/schema.prisma` lines 759–776: `InfluenceScore` model stores the composite score.

**Affected files:**

- `docs/api/openapi.yaml`

**Recommended fix:** Clarify whether the leaderboard sorts by `InfluenceScore.score` or `SUM(point_transactions.amount)`. If the leaderboard uses Influence Score, rename `totalPoints` to `influenceScore` in `LeaderboardEntry` (or include both). If it uses raw point sum, document the distinction from the Influence Score display.

**Missing test:** Integration test confirming the leaderboard sort order matches the intended ranking metric.

---

### F-15 — Report polymorphic FK has no CHECK constraint preventing cross-type references

**Severity:** INFO
**Status:** OPEN

**Description:** The `Report` model uses a polymorphic `targetId` field where `targetType` determines whether `targetId` references `posts`, `comments`, or `users`. Prisma cannot enforce this at the schema layer, and the ERD correctly acknowledges this and recommends partial indexes per type. However, the schema does not add a PostgreSQL CHECK constraint to validate mutual exclusivity. This is noted in `erd.md` as requiring a migration-time addition, but it is not tracked as a required contract.

This is a documentation gap rather than a design error, since the ERD explicitly acknowledges it.

**Evidence:**

- `packages/database/prisma/schema.prisma` lines 542–565: polymorphic `targetId` without CHECK.
- `docs/architecture/erd.md` lines 48–60: acknowledges the gap and recommends partial indexes.

**Affected files:**

- `packages/database/prisma/schema.prisma` (migration note required)

**Recommended fix:** Track the partial-index migration SQL from `erd.md` in the migration plan. Add a service-layer validation contract (a Zod `.superRefine()` or service method) that rejects reports where `targetId` does not exist in the correct table for the given `targetType`.

**Missing test:** Integration test: creating a report with `targetType = 'POST'` and `targetId` of a valid user ID (not a post) is rejected.

---

## 3. Privacy Impact Assessment

| Privacy rule (CLAUDE.md)                               | Status                                                                                                                            |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Journal defaults to PRIVATE                            | PASS — `@default(PRIVATE)` in schema and `VisibilitySchema.default('PRIVATE')` in Zod                                             |
| Default deny when no policy exists                     | PASS — ADR-003 defines a five-step evaluation order ending in ForbiddenException                                                  |
| Backend always checks owner and visibility             | PASS (design intent) — service-layer authorization order defined in ADR-003                                                       |
| UI is not the security layer                           | PASS — no contract places authorization logic client-side                                                                         |
| Selected-user sharing supports revoke and expiry       | PASS — `expiresAt` and `revokedAt` present on `SharePermission` model; OPEN finding F-04 (revokedAt missing from response schema) |
| AI output is always a draft                            | PASS — `AiOutput.journalId` nullable, comment "always a draft"; no auto-publish path in contracts                                 |
| No automatic publishing                                | PASS — no contract endpoint triggers automatic publication                                                                        |
| Do not use private journals for public recommendations | PASS (design level) — no recommendation endpoint in contracts; AI output remains private to owner                                 |
| Signed URLs must have an expiry                        | PASS — `MediaUploadResponse` includes `expiresAt`; `Media` model stores no public URL                                             |
| Refresh token stores hash, not raw token               | PASS — `tokenHash` with comment "Stored as a hash (SHA-256 of the raw token). Never store the raw token."                         |
| No balance field on User                               | PASS — `User` model has no balance field; `PointTransaction` is the ledger                                                        |
| AuditLog has no cascading deletes                      | PARTIAL — intent is documented but no `onDelete: SetNull` in schema (finding F-09)                                                |
| Do not log journal body                                | PASS (design level) — `@do NOT log` comment on `Journal.body` and `JournalVersion.body`                                           |
| Transcript is untrusted input                          | PASS — ADR-004 defines prompt injection mitigation; comment in `CreateAiJobRequest` schema                                        |
| Game result requires persistence before point award    | PASS — `GameSession.finishedAt` is the point-award gate per ADR-005                                                               |

**Critical privacy risks (new findings):**

- **F-01 (HIGH):** Public profile endpoint schema includes `email` as required — enables email enumeration by any authenticated user across the entire user base.
- **F-02 (HIGH):** Tag global uniqueness violation is a data-integrity bug that would surface immediately in multi-user testing, not a privacy risk per se, but blocks core functionality.
- **F-03 (HIGH):** AI job can be submitted with no source — schema does not enforce the business rule that at least one input is required.

---

## 4. Overall Assessment

**PASS_WITH_NOTES**

The Phase 02 architecture and contracts demonstrate sound privacy-first design decisions at the structural level: journal defaults to PRIVATE, the permission evaluation order is clearly defined in ADR-003, the refresh token stores only a hash, AI output is always a draft, points are ledger-only, and signed URLs carry expiry. The real-time game contracts correctly enforce server-authoritative state with no client-writable fields.

All three HIGH-severity findings have been resolved:

1. **F-01** (email exposure on public profile) — RESOLVED. `PublicUserProfileResponseSchema` created; OpenAPI updated.
2. **F-02** (tag name global uniqueness) — RESOLVED. Changed to `@@unique([ownerId, name])`.
3. **F-03** (AI job empty-body request) — RESOLVED. `.refine()` added to Zod; `oneOf` added to OpenAPI.

Additionally resolved: F-04 (revokedAt added), F-07 (rejoin behavior documented per D15), F-08 (body optional), F-09 (onDelete: SetNull), F-12 (@@unique added).

The remaining MEDIUM and LOW findings are design-level gaps that should be addressed in the migration plan and the implementation phase, but they do not block Phase 02 sign-off if tracked as known issues.

**Cross-access test requirement (mandatory before Phase 03 implementation):**

Per CLAUDE.md, negative authorization tests are mandatory for every change touching journal, folder, media, search, and AI job. The following test cases must be included in Phase 03 acceptance criteria:

- User B cannot read User A's PRIVATE journal.
- User B cannot read User A's PRIVATE journal via a shared-with-expired-permission.
- User B cannot access User A's AI job output.
- User B cannot enumerate User A's email via `GET /users/{id}` (F-01).
- A game client cannot submit a dice result or score — server rejects any client-provided game result fields.
