import { z } from 'zod';
import { PostTypeSchema } from '../enums/post-type.js';
import { ReactionTypeSchema } from './reaction.js';

export const CreatePostRequestSchema = z.object({
  body: z.string().min(1).max(5000),
  planetId: z.string().uuid(),
  type: PostTypeSchema,
  /** Required when type is JOURNAL_SHARE. */
  journalId: z.string().uuid().optional(),
  /** Required when type is GOAL_UPDATE. */
  goalId: z.string().uuid().optional(),
});

export type CreatePostRequest = z.infer<typeof CreatePostRequestSchema>;

export const PostResponseSchema = z.object({
  id: z.string().uuid(),
  body: z.string(),
  authorId: z.string().uuid(),
  planetId: z.string().uuid(),
  type: PostTypeSchema,
  journalId: z.string().uuid().optional(),
  goalId: z.string().uuid().optional(),
  reactionCounts: z.record(ReactionTypeSchema, z.number().int().nonnegative()),
  commentCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type PostResponse = z.infer<typeof PostResponseSchema>;
