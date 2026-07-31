# ADR-003: Permission Model

- Status: Accepted
- Date: 2026-07-31
- Decision owners: Human
- Related phase: 03

## Context

WildTails has multiple permission domains: journal visibility (PRIVATE/PLANET/PUBLIC/SELECTED_USERS), planet membership and roles (member/moderator/admin), goal ownership, AI job ownership, and game participation. We need a consistent model that enforces default-deny and is testable.

## Decision

Role-based access at platform level + resource-based ownership checks + explicit sharing permissions.

- **Platform roles**: USER, MODERATOR, ADMIN.
- **Planet roles**: MEMBER, MODERATOR, OWNER (per planet).
- **Resource ownership**: every journal, goal, AI job, and media has an `ownerId`.
- **Journal visibility**: enum (PRIVATE, SELECTED_USERS, PLANET, PUBLIC) with a `JournalPermission` table for SELECTED_USERS.
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
