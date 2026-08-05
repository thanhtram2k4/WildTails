import { z } from 'zod';

export const CreateTagRequestSchema = z.object({
  name: z.string().min(1).max(50),
});

export type CreateTagRequest = z.infer<typeof CreateTagRequestSchema>;

export const TagResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  ownerId: z.string().uuid(),
});

export type TagResponse = z.infer<typeof TagResponseSchema>;
