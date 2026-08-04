import { z } from 'zod';

/**
 * The eight default planets seeded at startup.
 * These are owned by the system (no individual user owner).
 * New members may post if the planet rule allows it.
 */
export const DEFAULT_PLANET_SLUGS = [
  'learning',
  'sports',
  'finance',
  'work',
  'travel',
  'health',
  'pets',
  'art',
] as const;

export const DefaultPlanetSlugSchema = z.enum(DEFAULT_PLANET_SLUGS);

export type DefaultPlanetSlug = z.infer<typeof DefaultPlanetSlugSchema>;

export const PlanetResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  /** URL-safe slug, unique across all planets. */
  slug: z.string(),
  description: z.string().optional(),
  iconUrl: z.string().url().optional(),
  isDefault: z.boolean(),
  memberCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
});

export type PlanetResponse = z.infer<typeof PlanetResponseSchema>;
