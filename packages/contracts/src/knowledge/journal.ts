import { z } from 'zod';
import { VisibilitySchema } from '../enums/visibility.js';

/** Maximum journal body length in characters. */
export const JOURNAL_BODY_MAX_LENGTH = 50_000;

/** Maximum number of tags that can be assigned to a single journal. */
export const JOURNAL_MAX_TAGS = 20;

export const CreateJournalRequestSchema = z.object({
  title: z.string().min(1).max(255),
  /** Journal body. May be null for a title-only stub. */
  body: z.string().max(JOURNAL_BODY_MAX_LENGTH).optional(),
  planetId: z.string().uuid().optional(),
  /** Defaults to PRIVATE at the service layer if omitted. */
  visibility: VisibilitySchema.default('PRIVATE'),
  tagIds: z.array(z.string().uuid()).max(JOURNAL_MAX_TAGS).optional(),
  folderId: z.string().uuid().optional(),
  goalId: z.string().uuid().optional(),
});

export type CreateJournalRequest = z.infer<typeof CreateJournalRequestSchema>;

export const UpdateJournalRequestSchema = CreateJournalRequestSchema.partial();

export type UpdateJournalRequest = z.infer<typeof UpdateJournalRequestSchema>;

export const JournalTagSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
});

export type JournalTag = z.infer<typeof JournalTagSchema>;

export const JournalVersionSchema = z.object({
  id: z.string().uuid(),
  body: z.string().optional(),
  createdAt: z.string().datetime(),
});

export type JournalVersion = z.infer<typeof JournalVersionSchema>;

export const JournalResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  /**
   * Body is omitted when the caller does not have read permission.
   * Always check visibility + share permission before returning body.
   */
  body: z.string().optional(),
  ownerId: z.string().uuid(),
  planetId: z.string().uuid().optional(),
  visibility: VisibilitySchema,
  tags: z.array(JournalTagSchema),
  folder: z.object({ id: z.string().uuid(), name: z.string() }).optional(),
  goal: z.object({ id: z.string().uuid(), title: z.string() }).optional(),
  /** AI-generated summary draft. Not published automatically. */
  aiSummary: z.string().optional(),
  /** Previous body versions, newest first. */
  versions: z.array(JournalVersionSchema).optional(),
  /** Active share permissions for SELECTED_USERS journals. */
  sharePermissions: z
    .array(
      z.object({
        userId: z.string().uuid(),
        expiresAt: z.string().datetime().nullable(),
      }),
    )
    .optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type JournalResponse = z.infer<typeof JournalResponseSchema>;
