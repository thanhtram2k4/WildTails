import { z } from 'zod';

/** Breakdown of the composite Influence Score across contributing dimensions. */
export const InfluenceScoreBreakdownSchema = z.object({
  /** Points from published content (posts, journals shared). */
  content: z.number(),
  /** Points from community engagement (comments, reactions received). */
  engagement: z.number(),
  /** Points from sustained platform activity (streaks, daily logins). */
  consistency: z.number(),
  /** Points from mini-game participation and wins. */
  game: z.number(),
  /** Negative modifier from moderation actions. */
  penalty: z.number(),
});

export type InfluenceScoreBreakdown = z.infer<typeof InfluenceScoreBreakdownSchema>;

export const InfluenceScoreSchema = z.object({
  userId: z.string().uuid(),
  /** Composite score. Derived from breakdown; the backend is the single source of truth. */
  score: z.number(),
  /** Leaderboard position from the latest snapshot. */
  rank: z.number().int().positive(),
  breakdown: InfluenceScoreBreakdownSchema,
});

export type InfluenceScore = z.infer<typeof InfluenceScoreSchema>;
