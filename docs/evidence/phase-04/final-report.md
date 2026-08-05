# Phase 04 Final Report

Phase: 04 — Captain's Cabin and Goals
Status: DONE
Branch: phase/04-captains-cabin-and-goals
Updated: 2026-08-05

## Human Visual Approval

Granted: 2026-08-05

Approved items:
- D09 light theme with navy/teal/yellow palette
- Captain's Cabin dashboard
- Journal list, editor, and detail pages
- Journal sharing interface
- The Sun goals interface
- Goal editor and progress page
- Empty states
- Original SVG/CSS assets

## Scope Delivered

### Captain's Cabin (Journal Management)

- Journal CRUD with PRIVATE default visibility
- Immutable body versioning (only on body content changes)
- Folder CRUD with 3-level nesting depth limit, cycle detection
- Tag CRUD with NFKC normalization and owner-scoped uniqueness
- Tag deletion (D16 contract amendment) with JournalTag cascade, journals preserved
- SELECTED_USERS sharing with grant, expiry, immediate revoke
- Visibility transitions safely revoke all active shares in transaction
- Partial unique index enforces one active share per user+journal at database level
- Privacy-safe 404 for all unauthorized access (ADR-003)
- Audit logging for share grant, revoke, revoke-all, journal delete

### The Sun (Goal Management)

- Goal CRUD with progress 0-100
- Journal-goal linking via goalId on Journal
- Hard delete with journal unlink in transaction
- Computed linkedJournalCount

### Frontend

- Captain's Cabin dashboard with summary stats, recent journals, goal progress
- Journal list with folder/tag/goal filters, cursor pagination
- Journal editor with live Markdown preview (react-markdown + rehype-sanitize)
- Journal detail with rendered Markdown, tag, folder, goal context, version history
- Sharing panel for SELECTED_USERS journals
- Folder navigation sidebar with create/delete
- Goals list, editor, detail with progress bars
- Empty, loading, error states with original SVG assets
- D09 visual identity (navy/teal/yellow, light theme)

### Security

- Safe Markdown rendering: no rehype-raw, rehype-sanitize blocks scripts/events/javascript: URLs
- All owner IDs from authenticated principal, never from request input
- All queries filter by ownership at database level
- Concurrent share-grant prevention via partial unique index (DB-verified)

## Contract Changes

| Change                                         | Type                         | Reference                           |
| ---------------------------------------------- | ---------------------------- | ----------------------------------- |
| `JOURNAL_BODY_MAX_LENGTH = 50_000`             | Constant + Zod constraint    | journal.ts                          |
| `JOURNAL_MAX_TAGS = 20`                        | Constant + Zod constraint    | journal.ts                          |
| `CreateTagRequestSchema` / `TagResponseSchema` | New Zod schemas              | tag.ts                              |
| `maxLength: 50000` on body fields              | OpenAPI update               | openapi.yaml                        |
| `maxItems: 20` on tagIds fields                | OpenAPI update               | openapi.yaml                        |
| `DELETE /tags/{id}`                            | **Phase 04 amendment (D16)** | openapi.yaml, decisions-register.md |

## Migration

Migration `20260804170823_phase04_indexes`:

- `CREATE INDEX journals_ownerId_folderId_idx`
- `CREATE INDEX journals_ownerId_deletedAt_updatedAt_idx`
- `CREATE UNIQUE INDEX share_permissions_active_unique` (partial, WHERE revokedAt IS NULL)

Assessment: Additive only. No column changes, no data modification, no table drops.

## Test Counts (separate)

| Category                          | Count   |
| --------------------------------- | ------- |
| Contract tests                    | 23      |
| API unit tests                    | 169     |
| Frontend tests (content security) | 22      |
| Worker tests                      | 1       |
| **Unit subtotal**                 | **215** |
| PostgreSQL integration tests      | 68      |
| Playwright E2E tests              | 37      |
| **Grand total**                   | **320** |

## Screenshot Verification

| Screenshot                   | Result | Key content visible                                                                       |
| ---------------------------- | ------ | ----------------------------------------------------------------------------------------- |
| captains-cabin-dashboard.png | PASS   | 3 journals, 2 goals, progress bars, recent list                                           |
| journal-list.png             | PASS   | Journal titles, visibility badges, folder/tag/goal filters                                |
| journal-editor.png           | PASS   | Title/body inputs, visibility/folder/tag/goal selectors                                   |
| journal-detail.png           | PASS   | Rendered Markdown (headings, lists, code, blockquote), tag, folder, goal, version history |
| journal-sharing.png          | PASS   | SELECTED_USERS badge, folder, goal, rendered Markdown                                     |
| goals-list.png               | PASS   | Goal titles with progress bars                                                            |
| goal-editor.png              | PASS   | Title/description/deadline/progress inputs                                                |
| goal-progress.png            | PASS   | 60% progress bar, deadline 1/1/2027, linked journals 1, description                       |
| empty-state.png              | PASS   | Empty journal list, SVG illustration, "Write first entry" CTA                             |

## Known Limitations

- The journal-sharing screenshot shows the SELECTED_USERS badge and full journal content but the sharing panel with the active recipient list may be below the fold depending on body length. The sharing panel functionality is verified via API-level assertions (grant, list, revoke all confirmed).
- `PATCH /tags/{id}` and `GET /folders/{id}` endpoints are not implemented (not in frozen contracts, not approved).
- No free-text journal search (deferred per instruction).
- The Next.js dev indicator ("N" badge) appears in screenshots — this is the standard Next.js development mode indicator, not a debug overlay or error.

## Human Visual Approval Status

All items approved (2026-08-05):

1. All 9 screenshots — APPROVED
2. DELETE /tags/{id} amendment (D16) — APPROVED
3. Phase 04 status — DONE
4. Branch — merged into main
