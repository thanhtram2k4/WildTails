import { z } from 'zod';

/**
 * Every point change must use one of these sources.
 * Self-interaction and duplicate interactions do not generate points — enforced at the service layer.
 */
export const PointSourceSchema = z.enum([
  'POST_CREATE',
  'COMMENT_CREATE',
  'REACTION_GIVE',
  'GAME_WIN',
  'GAME_PARTICIPATE',
  'AI_LOG_CREATE',
  'GOAL_COMPLETE',
  'DAILY_LOGIN',
  'MODERATION_PENALTY',
]);

export type PointSource = z.infer<typeof PointSourceSchema>;

/** A single immutable point ledger entry. Points are never mutated — only offset by new entries. */
export const PointTransactionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  /** Positive for gains, negative for penalties. Integer only — no fractional points. */
  amount: z.number().int(),
  source: PointSourceSchema,
  /** UUID of the entity that triggered this transaction (post, game session, etc.). */
  referenceId: z.string().uuid().optional(),
  /** Discriminator for the reference (e.g. "POST", "GAME_SESSION"). */
  referenceType: z.string().optional(),
  description: z.string().optional(),
  createdAt: z.string().datetime(),
});

export type PointTransaction = z.infer<typeof PointTransactionSchema>;

export const PointBalanceResponseSchema = z.object({
  userId: z.string().uuid(),
  totalPoints: z.number().int(),
  /** Current leaderboard rank. Populated from periodic snapshots, may be slightly stale. */
  rank: z.number().int().positive().optional(),
});

export type PointBalanceResponse = z.infer<typeof PointBalanceResponseSchema>;
