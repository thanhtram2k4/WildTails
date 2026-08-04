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
