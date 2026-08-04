import { z } from 'zod';

export const CreateFolderRequestSchema = z.object({
  name: z.string().min(1).max(100),
  parentId: z.string().uuid().optional(),
  planetId: z.string().uuid().optional(),
});

export type CreateFolderRequest = z.infer<typeof CreateFolderRequestSchema>;

export const UpdateFolderRequestSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  parentId: z.string().uuid().nullable().optional(),
});

export type UpdateFolderRequest = z.infer<typeof UpdateFolderRequestSchema>;

export const FolderResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  ownerId: z.string().uuid(),
  parentId: z.string().uuid().optional(),
  journalCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
});

export type FolderResponse = z.infer<typeof FolderResponseSchema>;
