import { z } from 'zod';

/** Cursor-based pagination request parameters. */
export const CursorPaginationRequestSchema = z.object({
  /** Opaque cursor returned from the previous page response. Omit for the first page. */
  cursor: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(20),
});

export type CursorPaginationRequest = z.infer<typeof CursorPaginationRequestSchema>;
