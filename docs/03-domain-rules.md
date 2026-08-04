# Domain Rules

## Journal

- Default PRIVATE.
- Owner always has access.
- SELECTED_USERS requires a permission record.
- Permission can expire.
- Revoke takes effect on the next request.
- Publish creates or links a Post; it does not silently make a private journal public without an explicit action.
- AI summary is a version/draft; it does not silently overwrite user content.

## Goal

- Progress from 0 to 100.
- Deadline may be null.
- Journals/action items may be linked to a goal.
- Do not automatically mark a goal completed solely because AI suggests it.

## Planet

- Default planets are owned by the system.
- New members may post if the planet rule allows it.
- A moderator may only act on the planet they are assigned to.
- Admin actions must be audited.
- Rejoin after leave (D15): reactivate the existing membership row. Set leftAt to null, reset role to MEMBER (unless admin assigns another), set joinedAt to now. Do not create a duplicate row. Record leave and rejoin events in AuditLog.

## Feed

- Not ranked by likes alone.
- Baseline factors:
  - relevance;
  - content quality;
  - freshness;
  - relationship;
  - diversity;
  - moderation penalty.
- Limit consecutive posts from the same author.
- Valid reports lower rank.
- Rule-based before ML.

## Points

- No "set total score" endpoint for the client.
- Every change is a transaction.
- Every transaction must have a source/reference.
- Self-interaction does not generate influence.
- Duplicate interaction does not generate additional points.
- Daily cap is configurable.
- Leaderboard uses periodic snapshots.

## AI Auto-Log

- Only the job owner can view the job status and output.
- Source URL must be validated.
- Transcript may be entered manually.
- Output must be parsed and validated before saving.
- No automatic publishing.
- User edits create a version.
- Failure must have a useful error code.

## Space Dice

- 4–6 players.
- Server generates the dice result.
- Server selects the question.
- Only one valid action per turn.
- Timeout is handled by the server.
- Reconnect does not allow re-submitting a completed action.
- Reward is only granted after the game final result is persisted.
