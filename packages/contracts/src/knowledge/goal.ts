import { z } from 'zod';

export const CreateGoalRequestSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  /** ISO-8601 datetime. Null means no deadline. */
  deadline: z.string().datetime().optional(),
  planetId: z.string().uuid().optional(),
});

export type CreateGoalRequest = z.infer<typeof CreateGoalRequestSchema>;

export const UpdateGoalRequestSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  /** 0–100. The client may update progress; the server validates the range. */
  progress: z.number().int().min(0).max(100).optional(),
  deadline: z.string().datetime().optional(),
});

export type UpdateGoalRequest = z.infer<typeof UpdateGoalRequestSchema>;

export const GoalResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  description: z.string().optional(),
  ownerId: z.string().uuid(),
  /** 0–100. Do not auto-complete a goal solely on AI suggestion. */
  progress: z.number().int().min(0).max(100),
  deadline: z.string().datetime().nullable(),
  planetId: z.string().uuid().optional(),
  linkedJournalCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type GoalResponse = z.infer<typeof GoalResponseSchema>;
