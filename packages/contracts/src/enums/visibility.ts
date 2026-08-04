import { z } from 'zod';

export const VisibilitySchema = z.enum(['PRIVATE', 'PUBLIC', 'SELECTED_USERS', 'PLANET_MEMBERS']);

export type Visibility = z.infer<typeof VisibilitySchema>;
