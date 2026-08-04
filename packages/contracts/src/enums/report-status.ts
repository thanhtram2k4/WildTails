import { z } from 'zod';

export const ReportStatusSchema = z.enum(['PENDING', 'REVIEWED', 'DISMISSED', 'ACTIONED']);

export type ReportStatus = z.infer<typeof ReportStatusSchema>;
