import { z } from 'zod';
import { ReportStatusSchema } from '../enums/report-status.js';

export const ReportTargetTypeSchema = z.enum(['POST', 'COMMENT', 'USER']);

export type ReportTargetType = z.infer<typeof ReportTargetTypeSchema>;

export const CreateReportRequestSchema = z.object({
  targetType: ReportTargetTypeSchema,
  targetId: z.string().uuid(),
  reason: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
});

export type CreateReportRequest = z.infer<typeof CreateReportRequestSchema>;

/** Gap-fill: Zod schema for the frozen OpenAPI ReportResponse. */
export const ReportResponseSchema = z.object({
  id: z.string().uuid(),
  targetType: ReportTargetTypeSchema,
  targetId: z.string().uuid(),
  reason: z.string(),
  status: ReportStatusSchema,
  createdAt: z.string().datetime(),
});

export type ReportResponse = z.infer<typeof ReportResponseSchema>;

/**
 * Phase 05 contract amendment (D19): moderator review request.
 * Conditionally processes only PENDING reports; returns 409 if already processed.
 */
export const ReviewReportRequestSchema = z.object({
  status: z.enum(['REVIEWED', 'DISMISSED', 'ACTIONED']),
  note: z.string().max(500).optional(),
});

export type ReviewReportRequest = z.infer<typeof ReviewReportRequestSchema>;
