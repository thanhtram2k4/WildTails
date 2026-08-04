import { z } from 'zod';

/**
 * The structured output schema the LLM must return.
 * Any LLM response must be parsed and validated against this schema before being saved.
 * Validation failure must set the AI job to FAILED with an appropriate error code.
 * Do not assert AI output as absolute truth — always retain the source reference.
 */
export const AiStructuredOutputSchema = z.object({
  title: z.string().min(1).max(255),
  summary: z.string().min(1),
  keyPoints: z.array(z.string()).min(1).max(20),
  tags: z.array(z.string()).min(1).max(10),
  category: z.string().optional(),
  actionItems: z.array(z.string()).max(20).optional(),
});

export type AiStructuredOutput = z.infer<typeof AiStructuredOutputSchema>;
