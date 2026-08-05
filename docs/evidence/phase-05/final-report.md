# Phase 05 — Planet Feed and Moderation: Final Report

**Date:** 2026-08-05
**Branch:** phase/05-planet-feed-and-moderation
**Status:** READY_FOR_REVIEW

## Decisions Recorded

D17–D33 recorded in `docs/decisions-register.md`. All human-approved.

## Contract Amendments

| Amendment                                | Type                    | Decision                                                          |
| ---------------------------------------- | ----------------------- | ----------------------------------------------------------------- |
| `PostResponse.journalId` removed         | Privacy narrowing (D24) | journalId never exposed in any API response                       |
| `PostResponse.author` added              | Feature addition (D27)  | Minimal embed: id, displayName, avatarUrl                         |
| `ReportResponse.status` added            | Gap-fill                | Status field was in Prisma/enum but missing from OpenAPI response |
| `ReportStatus` enum added to OpenAPI     | Gap-fill                | Was in Zod/Prisma but missing from OpenAPI schemas                |
| `ReviewReportRequest` schema added       | New endpoint (D19)      | Moderator report review                                           |
| `GET /planets/{id}/reports` added        | New endpoint (D19)      | Moderator report queue                                            |
| `PATCH /reports/{id}` added              | New endpoint (D19)      | Conditional report review                                         |
| `SavedPostEntrySchema` Zod schema added  | Gap-fill                | OpenAPI had it, Zod was missing                                   |
| `ReportResponseSchema` Zod schema added  | Gap-fill                | OpenAPI had it, Zod was missing                                   |
| `PostAuthorEmbedSchema` Zod schema added | Supporting (D27)        | Typed author embed                                                |
| `CommentResponse.author` added           | Feature addition (D33)  | Minimal embed: id, displayName, avatarUrl (same as D27)           |

## Migration Summary

Single additive migration: `20260805013911_phase05_moderation_fields`

- Post: `moderatedAt`, `moderatedById` (nullable, FK SetNull)
- Comment: `moderatedAt`, `moderatedById` (nullable, FK SetNull)
- Report: `planetId` (nullable FK)
- Compound feed index replacing simple index
- Compound comment pagination index replacing simple index
- Report queue index (planetId, status, createdAt, id)
- Partial unique index for duplicate PENDING report prevention

## Publishing-Boundary Result

- JOURNAL_SHARE post creates independent snapshot in Post.body
- Post.journalId stored internally for provenance only — never serialized
- Journal visibility remains unchanged (PRIVATE)
- Deleting journal does not delete published post
- Deleting post does not affect journal
- Private tags, folders, versions, goals, permissions never copied
- All verified in integration test (8 tests) and E2E (3 tests)

## journalId Privacy Result

- `PostResponseSchema` has no `journalId` field (verified in contract test)
- PostService serializer explicitly omits journalId
- Integration test verifies for post owner, other user, and admin
- E2E test verifies for both post author and feed reader
- Never appears in any API response, frontend data attribute, or log

## Membership and Former-Member Results

- Active member can: post, comment, react, save, report
- Non-member gets privacy-safe 404
- Former member (leftAt set) cannot: view feed, post, comment, react, save, report
- Former member CAN: delete own existing post, delete own existing comment
- Platform ADMIN without membership cannot: view feed, post, comment, react, save
- Platform ADMIN CAN: access report queue, review reports, hide content

## Reaction Concurrency Result

- @@unique([userId, postId]) enforced at DB level
- Toggle semantics: create/remove/switch
- Transaction-based toggle with P2002 error handling
- Concurrent duplicate reactions: exactly one row after both requests (E2E verified)

## Saved-Post Concurrency Result

- @@unique([userId, postId]) enforced at DB level
- Duplicate save returns 409, exactly one row exists
- Verified in integration test and E2E

## Duplicate-Report Result

- Partial unique index: (reporterId, targetType, targetId) WHERE status='PENDING'
- Same reporter + same target + PENDING → 409
- After report resolved, same reporter can file new report
- Verified in integration test and E2E

## Moderator Concurrency Result

- Conditional update: WHERE id=:id AND status='PENDING'
- If 0 rows updated → 409 Conflict
- Verified in integration test (2 concurrent reviews → 1 success + 1 409)

## Owner-Delete vs Moderator-Hide Result

- Owner delete: sets `deletedAt`
- Moderator hide: sets `moderatedAt` and `moderatedById`
- Feed queries: WHERE deletedAt IS NULL AND moderatedAt IS NULL
- Different fields, different semantics
- AuditLog records moderator identity and action

## Platform-ADMIN Result

- Can access report queue for any planet (no membership required)
- Can review reports for any planet
- Can hide content in any planet
- Cannot create posts, comments, reactions without active membership
- Moderation privilege and social participation privilege are separate

## Test Counts

| Category                     | Count   |
| ---------------------------- | ------- |
| Contract tests               | 54      |
| API unit tests               | 255     |
| Web unit tests               | 55      |
| Worker tests                 | 1       |
| PostgreSQL integration tests | 137     |
| Playwright E2E tests         | 103     |
| **Total**                    | **605** |

## Screenshot Paths

- docs/evidence/phase-05/screenshots/planet-feed.png (178 KB)
- docs/evidence/phase-05/screenshots/post-composer.png (197 KB)
- docs/evidence/phase-05/screenshots/publish-from-journal.png (215 KB)
- docs/evidence/phase-05/screenshots/post-detail.png (30 KB)
- docs/evidence/phase-05/screenshots/comments.png (39 KB)
- docs/evidence/phase-05/screenshots/reactions.png (30 KB)
- docs/evidence/phase-05/screenshots/report-dialog.png (44 KB)
- docs/evidence/phase-05/screenshots/moderation-queue.png (33 KB)
- docs/evidence/phase-05/screenshots/moderation-detail.png (23 KB)
- docs/evidence/phase-05/screenshots/hidden-content-state.png (226 KB)
- docs/evidence/phase-05/screenshots/empty-feed.png (35 KB)

## Known Limitations

1. PlanetsMenu uses slug-based fallback links if real planet IDs not available.
2. Block and Mute deferred (D22).
3. Feed ranking/diversity deferred (D17, D25).
4. Moderation restoration deferred (D29).
5. No notification integration for social actions.
6. Polymorphic Report FK lacks CHECK constraint (known from F-15, deferred).

## Items Requiring Human Visual Approval

- 5 screenshots in docs/evidence/phase-05/screenshots/ need visual review
- PostResponse contract change (journalId removed, author added) — already approved via D24/D27
- New OpenAPI endpoints (GET /planets/{id}/reports, PATCH /reports/{id}) — already approved via D19
