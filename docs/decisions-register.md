# Decisions Register

Updated: 2026-07-31

## Approved decisions (human-confirmed)

| #   | Decision                      | Approved choice                                                                                                                                                                                                | ADR     | Date       |
| --- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ---------- |
| D01 | MVP mini-game                 | Space Dice                                                                                                                                                                                                     | ADR-005 | 2026-07-31 |
| D02 | Auth strategy                 | Short-lived JWT access token + DB-backed rotating refresh token with revocation and replay detection                                                                                                           | ADR-002 | 2026-07-31 |
| D03 | OAuth providers for MVP       | None. OAuth and Google Login moved to P2. Only email-password auth in MVP                                                                                                                                      | ADR-002 | 2026-07-31 |
| D04 | LLM provider                  | Mock adapter only through Phase 05. No paid LLM service. Real provider requires human approval before Phase 06                                                                                                 | ADR-004 | 2026-07-31 |
| D05 | LLM budget and quota          | Zero budget. Before Phase 06, must present: proposed provider, model, estimated cost, usage quota, cost-control mechanism, and fallback strategy for human approval                                            | ADR-004 | 2026-07-31 |
| D06 | Transcript acquisition        | Both YouTube URL fetch (best-effort, via adapter) and manual paste (mandatory fallback)                                                                                                                        | ADR-007 | 2026-07-31 |
| D07 | Email provider                | Mock email service or Mailpit for local dev. Real provider for staging requires human approval                                                                                                                 | -       | 2026-07-31 |
| D08 | Deployment target             | Docker Compose for local development and demonstration. Staging docs may be prepared in Phase 11. No production deployment, VPS purchase, paid cloud resources, or DNS changes                                 | ADR-006 | 2026-07-31 |
| D09 | Visual direction              | Light interface, 2D cat-pirate and space theme, navy/teal/yellow colors, moderate animation, reduced-motion support, usability and accessibility over decorative effects. Design baseline, not final asset set | -       | 2026-07-31 |
| D10 | Data retention and deletion   | Soft delete with 30-day retention before purge. Retention policy must be reviewed before any real deployment. No automatic production data deletion without human approval                                     | -       | 2026-07-31 |
| D11 | AI evaluation dataset consent | Public videos and non-sensitive data only. No private journals. Participants must be informed, consent, and have data anonymized. University/supervisor/institutional requirements take priority               | -       | 2026-07-31 |
| D12 | Project language              | English for everything: UI, docs, user stories, acceptance criteria, source code, variables, classes, API endpoints, database entities, error messages, test descriptions, technical reports                   | -       | 2026-07-31 |
| D13 | Logout request body           | POST /auth/logout requires access token auth AND a request body `{ refreshToken }`. Server revokes the presented refresh token. Replay follows ADR-002 family rules                                            | ADR-002 | 2026-08-04 |
| D14 | AI job cancel response code   | POST /ai/jobs/{id}/cancel returns 202 Accepted. Cancellation is asynchronous; job may reach CANCELLED or COMPLETED                                                                                             | ADR-004 | 2026-08-04 |
| D15 | Planet membership rejoin      | Rejoin reactivates existing row: set leftAt=null, role=MEMBER (unless admin assigns), joinedAt=now(). No duplicate row. Leave/rejoin history via AuditLog                                                      | -       | 2026-08-04 |
| D16 | DELETE /tags/{id} endpoint    | Added as a Phase 04 contract amendment. Owner-only, hard deletes the tag and cascades JournalTag associations. Journals are never deleted. Privacy-safe 404 for non-owner or missing tags. Human-approved      | -       | 2026-08-05 |
| D17 | Author diversity              | Deferred. No client-side rearrangement, server-side feed diversity, or author diversity scoring in Phase 05                                                                                                    | -       | 2026-08-05 |
| D18 | Moderator hiding              | Add moderatedAt/moderatedById to Post and Comment. Owner deletion uses deletedAt; moderator hiding uses moderatedAt/moderatedById. Feed queries require both NULL. Atomic with AuditLog                        | -       | 2026-08-05 |
| D19 | Moderator endpoints           | Phase 05 contract amendments: GET /planets/{id}/reports (moderator queue), PATCH /reports/{id} (conditional review, 409 if already processed). Human-approved                                                  | -       | 2026-08-05 |
| D20 | Duplicate report policy       | Different users may report same target. Same reporter blocked from duplicate PENDING report via partial unique index (reporterId, targetType, targetId) WHERE status=PENDING                                   | -       | 2026-08-05 |
| D21 | Reaction semantics            | One reaction per user per post (@@unique). No reaction→create, same type→remove, different type→switch. Serialized via DB transaction                                                                          | -       | 2026-08-05 |
| D22 | Block and Mute                | Both deferred. No block/mute endpoints, no Mute model, no feed filtering. Existing unused Block schema unchanged                                                                                               | -       | 2026-08-05 |
| D23 | Comment replies               | Top-level comments and one reply level only. Reply to a reply is rejected. Parent must belong to same post                                                                                                     | -       | 2026-08-05 |
| D24 | Journal publishing privacy    | Published post is independent snapshot. journalId never exposed in any API response (not even owner). Internal sourceJournalId in DB for provenance only, never serialized. Journal lifecycle independent      | -       | 2026-08-05 |
| D25 | Feed ordering                 | Chronological MVP only: ORDER BY createdAt DESC, id DESC. No feedScore. Opaque cursor with (createdAt, id)                                                                                                     | -       | 2026-08-05 |
| D26 | Saved posts                   | Implement frozen endpoints (save, unsave, list). Concurrent duplicate returns 409. Saved-post lists exclude deleted/moderated posts                                                                            | -       | 2026-08-05 |
| D27 | Author embed                  | Add author: {id, displayName, avatarUrl} to PostResponse. No email, role, avatarConfig, or private fields. Phase 05 contract amendment                                                                         | -       | 2026-08-05 |
| D28 | Self-interaction              | Users may react to/save own post. No gamification points in Phase 05                                                                                                                                           | -       | 2026-08-05 |
| D29 | Moderation restoration        | Not implemented in Phase 05. moderatedAt/moderatedById fields added for future use                                                                                                                             | -       | 2026-08-05 |
| D30 | Platform ADMIN scope          | ADMIN may access/review/hide in any planet. ADMIN without membership cannot create normal planet content                                                                                                       | -       | 2026-08-05 |
| D31 | Feed access                   | All operations require authentication. No unauthenticated public feed                                                                                                                                          | -       | 2026-08-05 |
| D32 | Self-reporting                | Rejected. Reporter cannot report own content. Privacy-safe validation error                                                                                                                                    | -       | 2026-08-05 |

## Approved decisions (from documentation)

| #   | Decision                   | Choice                                                               | Source                  |
| --- | -------------------------- | -------------------------------------------------------------------- | ----------------------- |
| D-A | Architecture style         | Modular monolith                                                     | CLAUDE.md               |
| D-B | Package manager            | pnpm 11 workspace                                                    | CLAUDE.md               |
| D-C | Frontend framework         | Next.js App Router                                                   | CLAUDE.md               |
| D-D | Backend framework          | NestJS                                                               | CLAUDE.md               |
| D-E | Database                   | PostgreSQL + Prisma                                                  | CLAUDE.md               |
| D-F | Cache/queue                | Redis + BullMQ                                                       | CLAUDE.md               |
| D-G | Real-time                  | Socket.IO                                                            | CLAUDE.md               |
| D-H | Game rendering             | Phaser                                                               | CLAUDE.md               |
| D-I | Object storage             | MinIO (local) / S3-compatible (prod)                                 | CLAUDE.md               |
| D-J | Search (MVP)               | PostgreSQL full-text search                                          | technical-requirements  |
| D-K | CSS framework              | Tailwind CSS                                                         | technical-requirements  |
| D-L | Node.js version            | 24 LTS                                                               | CLAUDE.md               |
| D-M | Default planets            | 8 fixed (Learning, Sports, Finance, Work, Travel, Health, Pets, Art) | project-brief           |
| D-N | Journal default visibility | PRIVATE                                                              | CLAUDE.md privacy rules |
| D-O | AI output status           | Always draft, never auto-publish                                     | CLAUDE.md AI rules      |
| D-P | Game authority             | Server-authoritative                                                 | CLAUDE.md game rules    |

## Decisions requiring future human approval

| Item                            | Gate                                                       | Phase           |
| ------------------------------- | ---------------------------------------------------------- | --------------- |
| Actual LLM provider and model   | Must present proposal with cost, quota, controls, fallback | Before Phase 06 |
| LLM budget activation           | Zero until approved                                        | Before Phase 06 |
| Real email provider for staging | Must propose and get approval                              | Before staging  |
| Staging/production deployment   | No deployment without approval                             | Phase 11+       |
| Secrets and billing accounts    | Human creates and manages                                  | All phases      |
| Production data deletion        | No automatic purge without approval                        | Post-MVP        |

## Timeline

The project follows a 16-week implementation plan. No specific start date, end date, submission date, or defense date is required. Calendar dates are not pending decisions and are not blockers.
