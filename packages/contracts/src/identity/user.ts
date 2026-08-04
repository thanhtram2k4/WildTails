import { z } from 'zod';

/** Full profile for the authenticated user (GET /users/me). Includes email. */
export const UserProfileResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string(),
  avatarUrl: z.string().url().optional(),
  bio: z.string().max(500).optional(),
  joinedAt: z.string().datetime(),
});

export type UserProfileResponse = z.infer<typeof UserProfileResponseSchema>;

/** Public profile for other users (GET /users/:id). Email is omitted. */
export const PublicUserProfileResponseSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string(),
  avatarUrl: z.string().url().optional(),
  bio: z.string().max(500).optional(),
  joinedAt: z.string().datetime(),
});

export type PublicUserProfileResponse = z.infer<typeof PublicUserProfileResponseSchema>;

export const UpdateUserProfileRequestSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  bio: z.string().max(500).optional(),
  /** Signed URL pointing to an already-uploaded avatar in object storage. */
  avatarUrl: z.string().url().optional(),
});

export type UpdateUserProfileRequest = z.infer<typeof UpdateUserProfileRequestSchema>;
