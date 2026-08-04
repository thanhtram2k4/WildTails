import { z } from 'zod';

export const ReportTargetTypeSchema = z.enum(['POST', 'COMMENT', 'USER']);

export type ReportTargetType = z.infer<typeof ReportTargetTypeSchema>;

export const CreateReportRequestSchema = z.object({
  targetType: ReportTargetTypeSchema,
  targetId: z.string().uuid(),
  reason: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
});

export type CreateReportRequest = z.infer<typeof CreateReportRequestSchema>;
