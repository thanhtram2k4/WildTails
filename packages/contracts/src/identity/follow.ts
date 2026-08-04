import { z } from 'zod';

export const FollowRequestSchema = z.object({
  targetUserId: z.string().uuid(),
});

export type FollowRequest = z.infer<typeof FollowRequestSchema>;

/** Follower list item. Full list responses are paginated via CursorPaginationRequest. */
export const FollowEntrySchema = z.object({
  userId: z.string().uuid(),
  displayName: z.string(),
  avatarUrl: z.string().url().optional(),
  followedAt: z.string().datetime(),
});

export type FollowEntry = z.infer<typeof FollowEntrySchema>;
