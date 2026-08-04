# ADR-003: Permission Model

- Status: Accepted
- Date: 2026-08-04
- Decision owners: Human
- Related phase: 03

## Context

WildTails has multiple permission domains: journal visibility (PRIVATE/PLANET_MEMBERS/PUBLIC/SELECTED_USERS), planet membership and roles (member/moderator/admin/owner), goal ownership, AI job ownership, and game participation. We need a consistent model that enforces default-deny and is testable.

## Decision

Role-based access at platform level + resource-based ownership checks + explicit sharing permissions.

- **Platform roles**: USER, ADMIN.
- **Planet roles**: OWNER, ADMIN, MODERATOR, MEMBER (per planet).
- **Resource ownership**: every journal, goal, AI job, and media has an `ownerId`.
- **Journal visibility**: enum (PRIVATE, SELECTED_USERS, PLANET_MEMBERS, PUBLIC) with a `SharePermission` table for SELECTED_USERS.
- **Default**: PRIVATE, deny if no matching policy.
- **Evaluation order**: check ownership first, then explicit permission, then visibility level.

## Alternatives considered

### RBAC only

Pro: simple. Con: cannot express per-resource sharing or per-planet roles.

### ABAC (attribute-based)

Pro: very flexible. Con: complex policy engine overkill for MVP; harder to test and audit.

### ACL table for everything

Pro: uniform. Con: too many rows; query performance concerns; harder to reason about defaults.

## Consequences

### Positive

- Clear ownership check on every data access.
- Sharing is explicit and revocable.
- Easy to write negative authorization tests.

### Negative

- Must add permission checks in every service method that returns user data.
- Permission table joins may impact query performance (mitigated by indexes).

### Risks

- Forgetting a permission check on a new endpoint (mitigated by QA agent review and negative tests).

## Validation

- Owner can access own journal; non-owner cannot.
- Shared user can read; unshared user cannot.
- Expired permission denies access.
- Moderator can act only on assigned planet.
- Search results respect visibility filters.

## Revisit trigger

- Need for delegated permissions (e.g., team journals).
- Permission model becomes too complex for simple queries.

---

## Phase 02 Concrete Decisions

### Visibility enum

Defined in `packages/contracts/src/enums/visibility.ts` as `VisibilitySchema` and mirrored in the Prisma schema as `JournalVisibility`:

| Value            | Who can read                                                                |
| ---------------- | --------------------------------------------------------------------------- |
| `PRIVATE`        | Owner only. No exceptions except owner-initiated sharing.                   |
| `SELECTED_USERS` | Owner + users with a valid, non-expired, non-revoked `SharePermission` row. |
| `PLANET_MEMBERS` | Owner + any user with an active `PlanetMembership` for the linked planet.   |
| `PUBLIC`         | Every authenticated user.                                                   |

Journal default is `PRIVATE` (enforced by the Prisma `@default(PRIVATE)` on `Journal.visibility` and validated at the service layer before any write).

### Planet roles

Defined in `packages/contracts/src/enums/planet-role.ts` as `PlanetRoleSchema` and mirrored in the Prisma schema as `PlanetRole`:

| Role        | Permitted actions                                                   |
| ----------- | ------------------------------------------------------------------- |
| `OWNER`     | All admin actions + transfer ownership + delete planet (P2).        |
| `ADMIN`     | Manage members, manage moderators, manage planet rules.             |
| `MODERATOR` | Remove posts, flag content, dismiss reports on the assigned planet. |
| `MEMBER`    | Post, comment, react, join game sessions within the planet.         |

A user may hold different roles on different planets. Role is stored in `PlanetMembership.role`. Active membership requires `leftAt IS NULL`.

### Share permission model

The `SharePermission` Prisma model (`share_permissions` table) governs `SELECTED_USERS` access:

| Column            | Purpose                                                                    |
| ----------------- | -------------------------------------------------------------------------- |
| `journalId`       | The journal being shared.                                                  |
| `grantedToUserId` | The user receiving read access.                                            |
| `grantedByUserId` | Must be the journal owner (enforced at service layer).                     |
| `expiresAt`       | Optional expiry. Null = no expiry. Access denied when `now() > expiresAt`. |
| `revokedAt`       | Set on explicit revocation. Non-null = denied regardless of expiry.        |

Contracts in `packages/contracts/src/knowledge/share-permission.ts`:

- `CreateSharePermissionRequest`: `{ journalId, userId, expiresAt? }`
- `SharePermissionResponse`: `{ id, journalId, userId, grantedBy, expiresAt, createdAt }`

The revoke operation sets `revokedAt` to the current timestamp. There is no hard-delete of share permission rows; the audit trail must be preserved.

### Authorization evaluation order

Every service method that returns journal content or accepts journal writes must apply checks in this exact order:

```
1. Ownership check:     principal.userId === journal.ownerId
   → PASS: return data.

2. Share permission check (only for SELECTED_USERS visibility):
   SELECT * FROM share_permissions
   WHERE journalId = :id
     AND grantedToUserId = :principalId
     AND revokedAt IS NULL
     AND (expiresAt IS NULL OR expiresAt > now())
   → Row found: PASS.

3. Planet membership check (only for PLANET_MEMBERS visibility):
   SELECT * FROM planet_memberships
   WHERE planetId = :journal.planetId
     AND userId = :principalId
     AND leftAt IS NULL
   → Row found: PASS.

4. Public check:        journal.visibility = 'PUBLIC'
   → PASS.

5. Default deny:        throw ForbiddenException.
```

This logic must live in the `JournalService` (or a dedicated `JournalPermissionService`), never in a controller or resolver.

### Cross-access invariants

The following invariants are mandatory and must be covered by negative authorization tests on every change to journal, folder, media, search, or AI job:

| Invariant                                                            | Test type   |
| -------------------------------------------------------------------- | ----------- |
| Owner always has access, even if a revoked share exists.             | Integration |
| Expired share (`expiresAt` in the past) must deny access.            | Integration |
| Revoked share (`revokedAt` non-null) must deny access.               | Integration |
| `PLANET_MEMBERS` visibility denies access when `leftAt` is non-null. | Integration |
| `PUBLIC` journals are accessible to any authenticated user.          | Integration |
| Search results must not include `PRIVATE` journals of other users.   | Integration |
| AI job output must not be accessible to non-owners.                  | Integration |
| A moderator on Planet A cannot moderate Planet B.                    | Integration |

### Flow: controller to guard to service

```
HTTP Request
  │
  ├── JwtAuthGuard          — validates token, extracts Principal
  │                           throws 401 if token invalid or expired
  │
  ├── Optional role guard   — checks Principal.role for ADMIN-only endpoints
  │                           throws 403 if insufficient platform role
  │
  └── Service method        — applies authorization evaluation order above
                              throws 403 (ForbiddenException) on denial
                              never leaks the reason (private/not-found ambiguity)
```

The UI is never the security layer. Backend checks are unconditional and cannot be bypassed by client state.
