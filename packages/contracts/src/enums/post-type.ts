import { z } from 'zod';

export const PostTypeSchema = z.enum(['ORIGINAL', 'JOURNAL_SHARE', 'GOAL_UPDATE']);

export type PostType = z.infer<typeof PostTypeSchema>;
