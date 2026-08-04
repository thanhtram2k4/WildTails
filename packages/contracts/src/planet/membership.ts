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
});

export type PlanetMembershipResponse = z.infer<typeof PlanetMembershipResponseSchema>;
