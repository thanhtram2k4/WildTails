import { z } from 'zod';

export const CreateSharePermissionRequestSchema = z.object({
  journalId: z.string().uuid(),
  /** The user being granted read access. */
  userId: z.string().uuid(),
  /** ISO-8601 datetime. Null means the permission does not expire. */
  expiresAt: z.string().datetime().optional(),
});

export type CreateSharePermissionRequest = z.infer<typeof CreateSharePermissionRequestSchema>;

export const SharePermissionResponseSchema = z.object({
  id: z.string().uuid(),
  journalId: z.string().uuid(),
  userId: z.string().uuid(),
  /** The user who granted the permission. Must be the journal owner. */
  grantedBy: z.string().uuid(),
  expiresAt: z.string().datetime().nullable(),
  revokedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});

export type SharePermissionResponse = z.infer<typeof SharePermissionResponseSchema>;
