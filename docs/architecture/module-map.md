# WildTails NestJS Module Map

Source of truth: `docs/02-architecture.md` domain ownership table.
Last updated: 2026-08-04

---

## Module inventory

| Module               | Domain       | Database tables owned                                                                      | Key services                                                               |
| -------------------- | ------------ | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| `IdentityModule`     | Identity     | `User`, `Session`, `Avatar`, `Follow`, `Block`                                             | `AuthService`, `UserService`, `SessionService`, `FollowService`            |
| `PlanetModule`       | Planet       | `Planet`, `PlanetMembership`, `PlanetRule`, `PlanetInvitation`                             | `PlanetService`, `MembershipService`                                       |
| `KnowledgeModule`    | Knowledge    | `Journal`, `JournalVersion`, `Folder`, `Tag`, `SharePermission`, `Goal`, `GoalJournalLink` | `JournalService`, `FolderService`, `GoalService`, `SharePermissionService` |
| `SocialModule`       | Social       | `Post`, `Comment`, `Reaction`, `Save`, `Report`                                            | `PostService`, `CommentService`, `ReactionService`, `ReportService`        |
| `AiModule`           | AI           | `AiJob`, `AiJobStep`, `AiSource`, `AiChunk`, `AiSummary`, `PromptVersion`                  | `AiJobService`, `AiJobQueueProducer`                                       |
| `GameModule`         | Game         | `GameSession`, `GameParticipant`, `GameEvent`, `Question`, `Vote`                          | `GameSessionService`, `SpaceDiceGateway`, `GameStateStore`                 |
| `GamificationModule` | Gamification | `PointTransaction`, `InfluenceEvent`, `LeaderboardSnapshot`                                | `PointService`, `InfluenceScoreService`, `LeaderboardService`              |
| `PlatformModule`     | Platform     | `Notification`, `Media`, `AuditLog`, `SystemConfig`                                        | `NotificationService`, `MediaService`, `AuditService`                      |

---

## Dependency rules

The table below documents which modules may call which. Calls not listed here are forbidden.
Cross-domain calls use the target module's **public application service only** — never its repository or internal service.
Use synchronous calls when a consistent transaction is required. Use a queue (BullMQ) when the task is long-running or retryable.

```
IdentityModule
  (no upstream domain dependencies)

PlanetModule
  -> IdentityModule   (resolve user for membership checks)

KnowledgeModule
  -> IdentityModule   (ownership, share permission target lookup)
  -> PlanetModule     (verify planet membership before linking journal/goal to planet)

SocialModule
  -> IdentityModule   (author lookup)
  -> PlanetModule     (post must be in a planet the author belongs to)
  -> KnowledgeModule  (journal share posts, goal update posts — read-only reference)

AiModule
  -> KnowledgeModule  (save AI summary draft as a JournalVersion — write via KnowledgeModule service)
  -> PlatformModule   (emit AI_JOB_COMPLETE notification)

GameModule
  -> IdentityModule   (player identity)
  -> GamificationModule (award points after final result is persisted — write via PointService)
  -> PlatformModule   (emit GAME_INVITE notification)

GamificationModule
  -> IdentityModule   (resolve user for leaderboard)
  (no write dependency on other domains)

PlatformModule
  -> IdentityModule   (notification recipient lookup)
  (no write dependency on other domains)
```

### Dependency diagram (simplified)

```
IdentityModule
       ^
       |
PlanetModule <-------- KnowledgeModule <---+
       ^                    ^              |
       |                    |              |
SocialModule         AiModule        GameModule
       |                    |              |
       v                    v              v
PlatformModule <--------------------------+
       ^
       |
GamificationModule <-- GameModule
```

---

## Cross-cutting rules

- No circular imports between modules.
- A module accesses only the tables it owns. It reads foreign data through the owning module's service.
- `PlatformModule` is downstream-only for notifications and audit — it must not initiate business actions.
- `GamificationModule` does not own reward business logic; it owns only the ledger and score computation.
- `GameModule` does not own point transactions; it delegates to `GamificationModule.PointService` after persisting the game result.

---

## Worker process module map

The worker (`apps/worker`) runs these NestJS modules in isolation:

| Worker module              | Depends on (API modules)     | Purpose                         |
| -------------------------- | ---------------------------- | ------------------------------- |
| `AiWorkerModule`           | `AiModule` (shared DB)       | Executes AI job pipeline steps  |
| `NotificationWorkerModule` | `PlatformModule` (shared DB) | Delivers deferred notifications |

The worker does not own authorization logic. Authorization is enforced in `apps/api` before jobs are enqueued.

---

## State machines cross-reference

| State machine      | Module            | States                                                                                                         |
| ------------------ | ----------------- | -------------------------------------------------------------------------------------------------------------- |
| AI Job             | `AiModule`        | QUEUED → FETCHING_SOURCE → PREPROCESSING → SUMMARIZING → CLASSIFYING → SAVING → COMPLETED / FAILED / CANCELLED |
| Game Session       | `GameModule`      | WAITING → STARTING → ROLLING → QUESTION → VOTING → RESULT → (repeat) → FINISHED                                |
| Journal visibility | `KnowledgeModule` | PRIVATE / PUBLIC / SELECTED_USERS / PLANET_MEMBERS (not a progression — user-controlled)                       |
| Report             | `SocialModule`    | PENDING → REVIEWED → DISMISSED / ACTIONED                                                                      |

---

## Transaction boundaries

| Operation                   | Owner module                    | Boundary notes                                                                                                        |
| --------------------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Create journal              | KnowledgeModule                 | Single transaction: insert Journal + Tags + SharePermissions                                                          |
| Create post (JOURNAL_SHARE) | SocialModule                    | Verify journal visibility in same request; separate transaction                                                       |
| Award points after game     | GameModule → GamificationModule | Game result must be persisted first; point award is a separate transaction. Points not awarded if game persist fails. |
| AI job save                 | AiModule                        | SAVING step: validate LLM output, write JournalVersion, set state COMPLETED — single transaction                      |
| Revoke share permission     | KnowledgeModule                 | Takes effect on next request; no cache invalidation required at contract level                                        |

---

## Privacy boundaries

| Domain             | Private data                       | Access rule                                           |
| ------------------ | ---------------------------------- | ----------------------------------------------------- |
| KnowledgeModule    | Journal body, versions, share list | Owner only, unless visibility + valid SharePermission |
| AiModule           | Job output, source URL, transcript | Owner only                                            |
| IdentityModule     | Email, session tokens              | Never returned in list responses                      |
| SocialModule       | Report description                 | Moderator/Admin only                                  |
| GamificationModule | Point transaction details          | Owner only for details; totals may be public          |
