import { z } from 'zod';

export const PlanetRoleSchema = z.enum(['OWNER', 'ADMIN', 'MODERATOR', 'MEMBER']);

export type PlanetRole = z.infer<typeof PlanetRoleSchema>;
