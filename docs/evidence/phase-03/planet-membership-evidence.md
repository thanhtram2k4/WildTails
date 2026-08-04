# Phase 03 Planet Membership Evidence

Date: 2026-08-04

## Join Planet (POST /planets/:id/join)

Response: **201**
- role: MEMBER
- leftAt: null

## Leave Planet (POST /planets/:id/leave)

Response: **201**
- left: true

## Rejoin (D15 Compliance)

Response: **201**
- role: MEMBER (reset from any previous role)
- leftAt: null (cleared)
- joinedAt: updated to current time
- No duplicate row created (unique constraint enforced)

## My Planets (GET /users/me/planets)

After rejoin: 1 active membership returned
- Only active memberships (leftAt IS NULL) are included

## Authorization

- All planet endpoints require JWT (401 without)
- Client cannot set role (always MEMBER on join/rejoin)
- Default planets cannot be deleted or modified by users (no PUT/DELETE endpoints)
