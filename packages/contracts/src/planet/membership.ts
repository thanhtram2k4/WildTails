import { z } from 'zod';
import { PlanetRoleSchema } from '../enums/planet-role.js';

export const JoinPlanetRequestSchema = z.object({
  planetId: z.string().uuid(),
});

export type JoinPlanetRequest = z.infer<typeof JoinPlanetRequestSchema>;

export const PlanetMembershipResponseSchema = z.object({
  planetId: z.string().uuid(),
  userId: z.string().uuid(),
  role: PlanetRoleSchema,
  joinedAt: z.string().datetime(),
  /**
   * Null when the user is an active member.
   * Set when the user leaves. Cleared on rejoin (D15).
   */
  leftAt: z.string().datetime().nullable(),
});

export type PlanetMembershipResponse = z.infer<typeof PlanetMembershipResponseSchema>;
