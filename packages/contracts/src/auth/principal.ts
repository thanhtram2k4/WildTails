import { z } from 'zod';

/**
 * The authenticated user context extracted from a validated JWT.
 * This is the canonical type passed through NestJS request pipelines.
 * Never trust a Principal constructed client-side.
 */
export const PrincipalSchema = z.object({
  userId: z.string().uuid(),
  email: z.string().email(),
  displayName: z.string(),
  role: z.enum(['USER', 'ADMIN']),
});

export type Principal = z.infer<typeof PrincipalSchema>;
