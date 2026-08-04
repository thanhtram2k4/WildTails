import { z } from 'zod';

/**
 * Machine-readable codes sent to the client.
 * Stack traces and internal structure must never appear in the message field.
 */
export const ApiErrorCodeSchema = z.enum([
  'VALIDATION_ERROR',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
  'SERVICE_UNAVAILABLE',
]);

export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;

export const ApiErrorDetailSchema = z.object({
  code: ApiErrorCodeSchema,
  message: z.string(),
  /** Structured validation details — safe to expose, must not include stack traces. */
  details: z.unknown().optional(),
  requestId: z.string().optional(),
});

export type ApiErrorDetail = z.infer<typeof ApiErrorDetailSchema>;

export const ApiErrorEnvelopeSchema = z.object({
  success: z.literal(false),
  error: ApiErrorDetailSchema,
});

export type ApiErrorEnvelope = z.infer<typeof ApiErrorEnvelopeSchema>;
