import { z } from 'zod';
import { AiJobStateSchema } from '../enums/ai-job-state.js';

export const CreateAiJobRequestSchema = z
  .object({
    /** Public URL to fetch and process. Mutually exclusive with manualTranscript. */
    sourceUrl: z.string().url().optional(),
    /**
     * Manual transcript entered by the user.
     * Treated as untrusted input — must not alter system instructions (prompt injection mitigation).
     */
    manualTranscript: z.string().max(100_000).optional(),
    /** Pins this job to a specific prompt version for reproducibility. */
    promptVersion: z.string().optional(),
  })
  .refine((data) => Boolean(data.sourceUrl) !== Boolean(data.manualTranscript), {
    message: 'Exactly one of sourceUrl or manualTranscript must be provided',
  });

export type CreateAiJobRequest = z.infer<typeof CreateAiJobRequestSchema>;

/** One pipeline step record. */
export const AiJobStepResponseSchema = z.object({
  state: AiJobStateSchema,
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  /** Structured error code; absent on success. */
  error: z.string().optional(),
});

export type AiJobStepResponse = z.infer<typeof AiJobStepResponseSchema>;

/**
 * Full AI job response. Only the job owner may receive this.
 * Do not return summary or tags to non-owners.
 */
export const AiJobResponseSchema = z.object({
  id: z.string().uuid(),
  ownerId: z.string().uuid(),
  state: AiJobStateSchema,
  sourceUrl: z.string().url().optional(),
  promptVersion: z.string(),
  /** AI-generated summary draft. Not automatically published. */
  summary: z.string().optional(),
  /** AI-suggested tags. User must review before applying. */
  tags: z.array(z.string()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  /** Structured error code for FAILED state. */
  error: z.string().optional(),
});

export type AiJobResponse = z.infer<typeof AiJobResponseSchema>;
