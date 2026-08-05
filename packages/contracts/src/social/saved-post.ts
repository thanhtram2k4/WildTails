import { z } from 'zod';
import { PostResponseSchema } from './post.js';

/** Gap-fill: Zod schema for the frozen OpenAPI SavedPostEntry. */
export const SavedPostEntrySchema = z.object({
  postId: z.string().uuid(),
  savedAt: z.string().datetime(),
  post: PostResponseSchema.optional(),
});

export type SavedPostEntry = z.infer<typeof SavedPostEntrySchema>;
