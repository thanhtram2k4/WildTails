import { z } from 'zod';

/** Ordered states of the AI Auto-Log pipeline. Terminal states: COMPLETED, FAILED, CANCELLED. */
export const AiJobStateSchema = z.enum([
  'QUEUED',
  'FETCHING_SOURCE',
  'PREPROCESSING',
  'SUMMARIZING',
  'CLASSIFYING',
  'SAVING',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
]);

export type AiJobState = z.infer<typeof AiJobStateSchema>;
