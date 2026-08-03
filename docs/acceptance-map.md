# Acceptance Map

Updated: 2026-07-31

Maps user stories to acceptance criteria and required test types.

## P0 Features

### US-01: Registration and Login

| Acceptance criteria                                 | Test type             |
| --------------------------------------------------- | --------------------- |
| User can register with email and password           | E2E                   |
| Password is hashed with standard library            | Unit                  |
| Access token is short-lived JWT                     | Unit                  |
| Refresh token is stored in DB with rotation         | Integration           |
| Login returns tokens and user profile               | E2E                   |
| Invalid credentials return 401 without leaking info | Unit, E2E             |
| Rate limiting on auth endpoints                     | Integration           |
| Refresh token replay is detected and revoked        | Integration, Security |

### US-02: User Profile and Cat Avatar

| Acceptance criteria                     | Test type   |
| --------------------------------------- | ----------- |
| User can view and edit own profile      | E2E         |
| User cannot edit another user's profile | Security    |
| Cat avatar selection and display works  | E2E         |
| Profile data follows privacy rules      | Integration |

### US-03: Eight Default Planets

| Acceptance criteria                             | Test type             |
| ----------------------------------------------- | --------------------- |
| All eight planets exist after seed              | Integration           |
| User can join a planet                          | E2E                   |
| Planet membership is required for posting       | Integration, Security |
| Moderator actions are scoped to assigned planet | Security              |

### US-04: The Sun (Goal Management)

| Acceptance criteria                      | Test type         |
| ---------------------------------------- | ----------------- |
| User can create, update, delete goals    | E2E               |
| Progress is 0-100, validated server-side | Unit, Integration |
| Goals are private to owner               | Security          |
| Journal can be linked to a goal          | Integration       |
| AI cannot auto-complete a goal           | Unit              |

### US-05: Captain's Cabin (Private Journal)

| Acceptance criteria                                 | Test type         |
| --------------------------------------------------- | ----------------- |
| Journal is PRIVATE by default                       | Unit, Integration |
| Owner can CRUD journal entries                      | E2E               |
| Non-owner cannot read PRIVATE journal               | Security          |
| Folder and tag organization works                   | E2E               |
| Media upload with signed URL works                  | Integration       |
| AI summary is saved as draft version, not overwrite | Integration       |

### US-06: Journal Sharing

| Acceptance criteria                 | Test type             |
| ----------------------------------- | --------------------- |
| Owner can share with selected users | E2E                   |
| Permission has optional expiry      | Integration           |
| Revoke takes effect on next request | Integration, Security |
| Shared user can read but not edit   | Security              |
| Publishing creates/links a Post     | Integration           |

### US-07: Planet Feed

| Acceptance criteria                                  | Test type   |
| ---------------------------------------------------- | ----------- |
| Feed shows posts from joined planets                 | E2E         |
| Feed respects visibility rules                       | Security    |
| Pagination works (cursor-based)                      | Integration |
| Comment, reaction, save work                         | E2E         |
| Report flow works                                    | E2E         |
| Feed ranking considers freshness, quality, diversity | Integration |
| Same-author consecutive limit applies                | Unit        |

### US-08: AI Auto-Log

| Acceptance criteria                                         | Test type         |
| ----------------------------------------------------------- | ----------------- |
| User can create AI job from transcript (paste or URL)       | E2E               |
| Job follows state machine (QUEUED through COMPLETED/FAILED) | Unit, Integration |
| LLM returns structured output validated by schema           | Unit, Integration |
| Output is draft; user must review before publish            | E2E               |
| Only job owner can view job status and output               | Security          |
| Prompt version, model, latency, tokens are recorded         | Integration       |
| Idempotency key prevents duplicate processing               | Integration       |
| Retry with exponential backoff works                        | Integration       |
| Transcript content cannot alter system prompt               | Security          |
| Failed job has useful error code                            | Unit              |

### US-09: Basic Moderation

| Acceptance criteria                                  | Test type   |
| ---------------------------------------------------- | ----------- |
| Reported content is flagged for moderator review     | E2E         |
| Moderator can hide/remove content in assigned planet | E2E         |
| Moderator cannot act on other planets                | Security    |
| Admin actions are audited                            | Integration |

## P1 Features

### US-10: Point Transaction Ledger

| Acceptance criteria                                | Test type      |
| -------------------------------------------------- | -------------- |
| Every point change creates a transaction record    | Integration    |
| Transaction has source and reference               | Unit           |
| Self-interaction does not create points            | Unit, Security |
| Duplicate interaction does not create extra points | Unit, Security |
| Daily cap is enforced                              | Integration    |
| No client endpoint to set total score              | Security       |

### US-11: Influence Score and Leaderboard

| Acceptance criteria                          | Test type   |
| -------------------------------------------- | ----------- |
| Influence score calculated from transactions | Unit        |
| Leaderboard uses periodic snapshot           | Integration |
| Report penalty reduces ranking               | Unit        |

### US-12: Space Dice Mini-Game

| Acceptance criteria                          | Test type      |
| -------------------------------------------- | -------------- |
| 4-6 players can join a game room             | E2E            |
| Server generates dice result                 | Unit, Security |
| Server selects question                      | Unit           |
| One valid action per turn                    | Unit, Security |
| Timeout handled by server                    | Integration    |
| Reconnect returns snapshot, not replay       | Integration    |
| Duplicate action after reconnect is rejected | Security       |
| Reward only after final result persisted     | Integration    |
| Game state machine is explicit and tested    | Unit           |

### US-13: Audit Log

| Acceptance criteria                                                  | Test type   |
| -------------------------------------------------------------------- | ----------- |
| Security-relevant actions are logged                                 | Integration |
| Logs do not contain sensitive data (tokens, passwords, journal body) | Security    |
| Audit records are immutable                                          | Integration |

## Cross-cutting

### Privacy Tests (all phases)

| Acceptance criteria                                | Test type   |
| -------------------------------------------------- | ----------- |
| Cross-account private journal access always denied | Security    |
| Search does not leak private content               | Security    |
| AI job of another user is not accessible           | Security    |
| Media signed URLs expire                           | Integration |
| Cache keys include user/policy context             | Integration |

### NFR Tests (Phase 10)

| Acceptance criteria                 | Test type   |
| ----------------------------------- | ----------- |
| API p95 < 500ms                     | Load        |
| Feed first 20 items < 2s            | Load        |
| Socket action < 300ms in LAN        | Load        |
| 100+ WebSocket connections          | Load        |
| Worker restart preserves valid jobs | Integration |
