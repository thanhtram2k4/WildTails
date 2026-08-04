import { z } from 'zod';

export const CreateCommentRequestSchema = z.object({
  body: z.string().min(1).max(2000),
  postId: z.string().uuid(),
  /** Present for replies. Must belong to the same postId. */
  parentId: z.string().uuid().optional(),
});

export type CreateCommentRequest = z.infer<typeof CreateCommentRequestSchema>;

export const CommentResponseSchema = z.object({
  id: z.string().uuid(),
  body: z.string(),
  authorId: z.string().uuid(),
  postId: z.string().uuid(),
  parentId: z.string().uuid().optional(),
  createdAt: z.string().datetime(),
});

export type CommentResponse = z.infer<typeof CommentResponseSchema>;
