# WildTails – Entity Relationship Diagram

Status: DRAFT — Phase 02. No migration has been run.
Schema file: `packages/database/prisma/schema.prisma`

---

## Domain grouping

| Domain       | Tables                                                                            |
| ------------ | --------------------------------------------------------------------------------- |
| Identity     | users, refresh_tokens, follows, blocks                                            |
| Planet       | planets, planet_memberships, planet_rules                                         |
| Knowledge    | journals, journal_versions, journal_tags, tags, folders, share_permissions, goals |
| Social       | posts, comments, reactions, saved_posts, reports                                  |
| AI           | ai_jobs, ai_job_steps, ai_outputs                                                 |
| Game         | game_sessions, game_participants, game_questions, game_votes, game_events         |
| Gamification | point_transactions, influence_scores, daily_point_caps                            |
| Platform     | notifications, media, audit_logs                                                  |

Total tables: 31

---

## Key invariants and constraints

| Constraint                      | Table              | Rule                                                                   |
| ------------------------------- | ------------------ | ---------------------------------------------------------------------- |
| No self-follow                  | follows            | `followerId != followingId` (service layer; add DB CHECK in migration) |
| No self-block                   | blocks             | `blockerId != blockedId` (service layer)                               |
| No duplicate follow             | follows            | `UNIQUE(followerId, followingId)`                                      |
| No duplicate block              | blocks             | `UNIQUE(blockerId, blockedId)`                                         |
| Journal default PRIVATE         | journals           | `visibility DEFAULT 'PRIVATE'`                                         |
| Goal progress 0–100             | goals              | `0 <= progress <= 100` (service layer; add DB CHECK in migration)      |
| Unique planet membership        | planet_memberships | `UNIQUE(planetId, userId)`                                             |
| One reaction per user per post  | reactions          | `UNIQUE(userId, postId)`                                               |
| One save per user per post      | saved_posts        | `UNIQUE(userId, postId)`                                               |
| One vote per voter per question | game_votes         | `UNIQUE(questionId, voterId)`                                          |
| Unique participant per session  | game_participants  | `UNIQUE(sessionId, userId)`                                            |
| AI job idempotency              | ai_jobs            | `UNIQUE(idempotencyKey)`                                               |
| AI output one-to-one with job   | ai_outputs         | `UNIQUE(jobId)`                                                        |
| Draft journal from AI output    | ai_outputs         | `UNIQUE(journalId)` (nullable)                                         |
| One influence score per user    | influence_scores   | `UNIQUE(userId)`                                                       |
| Daily cap one row per user/date | daily_point_caps   | `UNIQUE(userId, date)`                                                 |
| No balance field on user        | users              | Balance computed from `SUM(point_transactions.amount)`                 |
| Refresh token family revocation | refresh_tokens     | Full family revoked on replay detection                                |
| Report polymorphic integrity    | reports            | CHECK mutual exclusivity in migration (see note below)                 |

### Note on Report polymorphic relations

`reports.targetType` determines whether `targetId` references `posts.id`, `comments.id`, or `users.id`. Prisma models the `Post` and `Comment` convenience relations but cannot enforce mutual exclusivity at the schema layer. The migration for this table must add:

```sql
-- When targetType != 'POST', targetId must not match any post.
-- Enforced via application-layer validation + audit; a DB constraint
-- is not feasible for polymorphic FKs without separate columns.
-- Migration note: add a partial index for each targetType.
CREATE INDEX idx_reports_post ON reports (target_id) WHERE target_type = 'POST';
CREATE INDEX idx_reports_comment ON reports (target_id) WHERE target_type = 'COMMENT';
CREATE INDEX idx_reports_user ON reports (target_id) WHERE target_type = 'USER';
```

---

## ERD (Mermaid erDiagram)

```mermaid
erDiagram

  %% =========================================================
  %% IDENTITY DOMAIN
  %% =========================================================

  users {
    uuid id PK
    string email UK
    string passwordHash
    string displayName
    string bio
    string avatarUrl
    enum role "USER | ADMIN"
    boolean isActive
    datetime emailVerifiedAt
    datetime createdAt
    datetime updatedAt
    datetime deletedAt
  }

  refresh_tokens {
    uuid id PK
    uuid userId FK
    string tokenHash UK
    uuid family
    datetime expiresAt
    datetime revokedAt
    uuid replacedByTokenId
    datetime createdAt
  }

  follows {
    uuid id PK
    uuid followerId FK
    uuid followingId FK
    datetime createdAt
  }

  blocks {
    uuid id PK
    uuid blockerId FK
    uuid blockedId FK
    datetime createdAt
  }

  users ||--o{ refresh_tokens : "owns"
  users ||--o{ follows : "follows (as follower)"
  users ||--o{ follows : "followed by (as following)"
  users ||--o{ blocks : "blocks (as blocker)"
  users ||--o{ blocks : "blocked by (as blocked)"

  %% =========================================================
  %% PLANET DOMAIN
  %% =========================================================

  planets {
    uuid id PK
    string name
    string slug UK
    string description
    string iconUrl
    boolean isDefault
    datetime createdAt
    datetime updatedAt
  }

  planet_memberships {
    uuid id PK
    uuid planetId FK
    uuid userId FK
    enum role "OWNER | ADMIN | MODERATOR | MEMBER"
    datetime joinedAt
    datetime leftAt
  }

  planet_rules {
    uuid id PK
    uuid planetId FK
    string key
    string value
    uuid updatedById FK
    datetime updatedAt
  }

  planets ||--o{ planet_memberships : "has members"
  users ||--o{ planet_memberships : "joins"
  planets ||--o{ planet_rules : "has rules"
  users ||--o{ planet_rules : "updates"

  %% =========================================================
  %% KNOWLEDGE DOMAIN
  %% =========================================================

  journals {
    uuid id PK
    string title
    string body
    uuid ownerId FK
    uuid planetId FK
    uuid folderId FK
    enum visibility "PRIVATE | SELECTED_USERS | PLANET_MEMBERS | PUBLIC"
    uuid goalId FK
    datetime createdAt
    datetime updatedAt
    datetime deletedAt
  }

  journal_versions {
    uuid id PK
    uuid journalId FK
    string title
    string body
    uuid editedById FK
    datetime createdAt
  }

  tags {
    uuid id PK
    string name UK
    uuid ownerId FK
    datetime createdAt
  }

  journal_tags {
    uuid journalId PK-FK
    uuid tagId PK-FK
  }

  folders {
    uuid id PK
    string name
    uuid ownerId FK
    uuid parentId FK
    uuid planetId FK
    datetime createdAt
    datetime updatedAt
  }

  share_permissions {
    uuid id PK
    uuid journalId FK
    uuid grantedToUserId FK
    uuid grantedByUserId FK
    datetime expiresAt
    datetime revokedAt
    datetime createdAt
  }

  goals {
    uuid id PK
    string title
    string description
    uuid ownerId FK
    int progress "0-100"
    datetime deadline
    uuid planetId FK
    datetime createdAt
    datetime updatedAt
  }

  users ||--o{ journals : "owns"
  planets ||--o{ journals : "contains"
  folders ||--o{ journals : "organizes"
  goals ||--o{ journals : "linked to"
  journals ||--o{ journal_versions : "versioned by"
  users ||--o{ journal_versions : "edits"
  users ||--o{ tags : "owns"
  journals ||--o{ journal_tags : "tagged with"
  tags ||--o{ journal_tags : "applied to"
  users ||--o{ folders : "owns"
  folders ||--o| folders : "nested under (parent)"
  planets ||--o{ folders : "scoped to"
  journals ||--o{ share_permissions : "shared via"
  users ||--o{ share_permissions : "receives"
  users ||--o{ share_permissions : "grants"
  users ||--o{ goals : "owns"
  planets ||--o{ goals : "linked to"

  %% =========================================================
  %% SOCIAL DOMAIN
  %% =========================================================

  posts {
    uuid id PK
    string body
    uuid authorId FK
    uuid planetId FK
    enum type "ORIGINAL | JOURNAL_SHARE | GOAL_UPDATE"
    uuid journalId FK
    uuid goalId FK
    datetime createdAt
    datetime updatedAt
    datetime deletedAt
  }

  comments {
    uuid id PK
    string body
    uuid authorId FK
    uuid postId FK
    uuid parentId FK
    datetime createdAt
    datetime updatedAt
    datetime deletedAt
  }

  reactions {
    uuid id PK
    uuid userId FK
    uuid postId FK
    enum type "LIKE | INSIGHTFUL | SUPPORTIVE | FUNNY"
    datetime createdAt
  }

  saved_posts {
    uuid id PK
    uuid userId FK
    uuid postId FK
    datetime createdAt
  }

  reports {
    uuid id PK
    uuid reporterId FK
    enum targetType "POST | COMMENT | USER"
    string targetId "polymorphic"
    string reason
    string description
    enum status "PENDING | REVIEWED | DISMISSED | ACTIONED"
    uuid reviewedById FK
    datetime reviewedAt
    datetime createdAt
  }

  users ||--o{ posts : "authors"
  planets ||--o{ posts : "hosts"
  journals ||--o{ posts : "shared as"
  goals ||--o{ posts : "updated via"
  posts ||--o{ comments : "has"
  users ||--o{ comments : "writes"
  comments ||--o| comments : "reply to (parent)"
  users ||--o{ reactions : "gives"
  posts ||--o{ reactions : "receives"
  users ||--o{ saved_posts : "saves"
  posts ||--o{ saved_posts : "saved by"
  users ||--o{ reports : "files"
  users ||--o{ reports : "reviews"

  %% =========================================================
  %% AI DOMAIN
  %% =========================================================

  ai_jobs {
    uuid id PK
    uuid ownerId FK
    enum state "QUEUED | FETCHING_SOURCE | PREPROCESSING | SUMMARIZING | CLASSIFYING | SAVING | COMPLETED | FAILED | CANCELLED"
    string sourceUrl
    string manualTranscript
    string promptVersion
    string idempotencyKey UK
    string modelName
    int tokenUsage
    int latencyMs
    string errorCode
    string errorMessage
    datetime createdAt
    datetime updatedAt
    datetime completedAt
  }

  ai_job_steps {
    uuid id PK
    uuid jobId FK
    enum state
    datetime startedAt
    datetime completedAt
    string errorMessage
  }

  ai_outputs {
    uuid id PK
    uuid jobId UK-FK
    string title
    string summary
    json keyPoints
    json tags
    string category
    json actionItems
    uuid journalId UK-FK
    datetime createdAt
  }

  users ||--o{ ai_jobs : "owns"
  ai_jobs ||--o{ ai_job_steps : "has steps"
  ai_jobs ||--o| ai_outputs : "produces (draft)"
  journals ||--o| ai_outputs : "created from draft"

  %% =========================================================
  %% GAME DOMAIN
  %% =========================================================

  game_sessions {
    uuid id PK
    string roomId UK
    enum phase "WAITING | STARTING | ROLLING | QUESTION | VOTING | RESULT | FINISHED"
    int currentRound
    int maxRounds
    string currentTurn
    datetime startedAt
    datetime finishedAt
    datetime createdAt
    datetime updatedAt
  }

  game_participants {
    uuid id PK
    uuid sessionId FK
    uuid userId FK
    int score
    boolean isConnected
    datetime joinedAt
  }

  game_questions {
    uuid id PK
    uuid sessionId FK
    int round
    string questionText
    datetime createdAt
  }

  game_votes {
    uuid id PK
    uuid questionId FK
    uuid voterId FK
    uuid targetUserId FK
    datetime createdAt
  }

  game_events {
    uuid id PK
    uuid sessionId FK
    uuid userId FK
    string type
    json payload
    datetime createdAt
  }

  game_sessions ||--o{ game_participants : "has players"
  users ||--o{ game_participants : "participates"
  game_sessions ||--o{ game_questions : "generates"
  game_questions ||--o{ game_votes : "receives"
  users ||--o{ game_votes : "casts (as voter)"
  users ||--o{ game_votes : "targeted by"
  game_sessions ||--o{ game_events : "logs"
  users ||--o{ game_events : "triggers"

  %% =========================================================
  %% GAMIFICATION DOMAIN
  %% =========================================================

  point_transactions {
    uuid id PK
    uuid userId FK
    int amount "positive or negative"
    enum source "POST_CREATE | COMMENT_CREATE | REACTION_GIVE | GAME_WIN | GAME_PARTICIPATE | AI_LOG_CREATE | GOAL_COMPLETE | DAILY_LOGIN | MODERATION_PENALTY"
    string referenceId "polymorphic"
    string referenceType
    string description
    datetime createdAt
  }

  influence_scores {
    uuid id PK
    uuid userId UK-FK
    float score
    float contentScore
    float engagementScore
    float consistencyScore
    float gameScore
    float penaltyScore
    datetime calculatedAt
    datetime createdAt
    datetime updatedAt
  }

  daily_point_caps {
    uuid id PK
    uuid userId FK
    date date
    int totalEarned
    datetime createdAt
  }

  users ||--o{ point_transactions : "earns/loses"
  users ||--o| influence_scores : "has snapshot"
  users ||--o{ daily_point_caps : "capped daily"

  %% =========================================================
  %% PLATFORM DOMAIN
  %% =========================================================

  notifications {
    uuid id PK
    uuid userId FK
    string type
    string title
    string body
    string referenceId "polymorphic"
    string referenceType
    boolean isRead
    datetime createdAt
  }

  media {
    uuid id PK
    uuid ownerId FK
    string bucket
    string objectKey
    string mimeType
    bigint sizeBytes
    string originalFilename
    datetime createdAt
  }

  audit_logs {
    uuid id PK
    uuid userId FK
    string action
    string targetType
    string targetId "polymorphic"
    json metadata
    string ipAddress
    datetime createdAt
  }

  users ||--o{ notifications : "receives"
  users ||--o{ media : "uploads"
  users ||--o{ audit_logs : "actor in"
```

---

## Index rationale

| Index                              | Table              | Query pattern                                |
| ---------------------------------- | ------------------ | -------------------------------------------- |
| `(planetId, createdAt DESC)`       | posts              | Planet feed ordered by recency               |
| `(authorId, createdAt DESC)`       | posts              | Profile feed ordered by recency              |
| `(ownerId, createdAt DESC)`        | journals           | User journal list ordered by recency         |
| `(ownerId, visibility)`            | journals           | Privacy filter before returning journal list |
| `(ownerId, state)`                 | ai_jobs            | User's job list filtered by state            |
| `idempotencyKey`                   | ai_jobs            | Deduplication check on job creation          |
| `roomId`                           | game_sessions      | Session lookup on join                       |
| `(sessionId, userId)`              | game_participants  | Membership check on action validation        |
| `userId`                           | game_participants  | Player's active sessions                     |
| `(userId, createdAt DESC)`         | point_transactions | Balance history, ledger view                 |
| `(userId, isRead, createdAt DESC)` | notifications      | Unread notification list                     |
| `(userId, createdAt DESC)`         | audit_logs         | User activity audit trail                    |
| `(targetType, targetId)`           | audit_logs         | Audit trail for a specific resource          |
| `tokenHash`                        | refresh_tokens     | Token lookup on refresh                      |
| `family`                           | refresh_tokens     | Family revocation on replay                  |
| `(score DESC)`                     | influence_scores   | Leaderboard ordering                         |
| `(userId, date)`                   | daily_point_caps   | Daily cap check (unique)                     |
| `(targetType, targetId)`           | reports            | Moderation queue per target                  |

---

## Privacy enforcement points

The following query sites require permission checks before returning data. These are schema-level reminders — enforcement is in the service layer.

| Table             | Check required                                                                     |
| ----------------- | ---------------------------------------------------------------------------------- |
| journals          | `ownerId = actorId` OR active `share_permissions` row OR `visibility` allows actor |
| journal_versions  | Same as journals — version is as sensitive as the body                             |
| ai_jobs           | `ownerId = actorId` only                                                           |
| ai_outputs        | `job.ownerId = actorId` only                                                       |
| media             | `ownerId = actorId`; signed URL with expiry for all other reads                    |
| share_permissions | Grantor or grantee only                                                            |
| folders           | `ownerId = actorId`                                                                |

Default deny: if no matching policy is found, return 404 (not 403, to avoid confirming existence).

---

## Design decisions recorded here

| #   | Decision                                                   | Rationale                                                                                                     |
| --- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| S01 | No `passwordHash` index                                    | Email lookup identifies the user; hash is never queried directly                                              |
| S02 | `Tag.name` is globally unique                              | Simplifies tag autocomplete; can be scoped per owner in P2 if needed                                          |
| S03 | `Report` uses polymorphic `targetId`                       | Avoids three separate FK columns; partial indexes per `targetType` added in migration                         |
| S04 | `AuditLog` is append-only, no FK enforcement on `targetId` | Audit rows must survive deletion of the target; no cascade                                                    |
| S05 | `InfluenceScore` is a snapshot table                       | Leaderboard built from periodic recalc, not live aggregation                                                  |
| S06 | `DailyPointCap.date` uses `@db.Date`                       | Stores only the date, no time component; avoids timezone drift                                                |
| S07 | `Media.sizeBytes` uses `BigInt`                            | Files may exceed INT range (2 GB+)                                                                            |
| S08 | `manualTranscript` stored in `ai_jobs`                     | Treated as untrusted input; never injected into system prompt without sanitization                            |
| S09 | No balance column on `users`                               | Balance is always `SUM(point_transactions.amount WHERE userId = ?)` to maintain ledger integrity              |
| S10 | Soft delete on User, Journal, Post, Comment only           | Business reason: 30-day retention before purge (D10); not added to tables where immediate hard delete is safe |
| S11 | `prisma.config.ts` owns DATABASE_URL                       | Prisma 7 moved connection config out of schema.prisma; `url` field removed from datasource block              |
