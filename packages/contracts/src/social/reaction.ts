import { z } from 'zod';

export const ReactionTypeSchema = z.enum(['LIKE', 'INSIGHTFUL', 'SUPPORTIVE', 'FUNNY']);

export type ReactionType = z.infer<typeof ReactionTypeSchema>;

/** Toggles the caller's reaction on a post. Sending the same type again removes it. */
export const ToggleReactionRequestSchema = z.object({
  postId: z.string().uuid(),
  type: ReactionTypeSchema,
});

export type ToggleReactionRequest = z.infer<typeof ToggleReactionRequestSchema>;

export const ReactionResponseSchema = z.object({
  postId: z.string().uuid(),
  counts: z.record(ReactionTypeSchema, z.number().int().nonnegative()),
  /** The caller's current reaction. Absent if the caller has no reaction. */
  userReaction: ReactionTypeSchema.optional(),
});

export type ReactionResponse = z.infer<typeof ReactionResponseSchema>;
