import { z } from 'zod';

export const PaginationMetaSchema = z.object({
  /** Opaque cursor for the next page. Null when no further pages exist. */
  cursor: z.string().nullable(),
  hasMore: z.boolean(),
  /** Total item count — only included when the caller requests it explicitly. */
  total: z.number().int().nonnegative().optional(),
});

export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;

/**
 * Returns a typed success envelope schema for a given data schema.
 *
 * Usage:
 *   const MyResponseSchema = ApiSuccessEnvelopeSchema(MyDataSchema);
 *   type MyResponse = z.infer<typeof MyResponseSchema>;
 */
export function ApiSuccessEnvelopeSchema<T extends z.ZodTypeAny>(dataSchema: T) {
  return z.object({
    success: z.literal(true),
    data: dataSchema,
    meta: PaginationMetaSchema.optional(),
  });
}

/** Untyped variant for runtime parsing when the data shape is not known ahead of time. */
export const GenericApiSuccessEnvelopeSchema = ApiSuccessEnvelopeSchema(z.unknown());

export type GenericApiSuccessEnvelope = z.infer<typeof GenericApiSuccessEnvelopeSchema>;
