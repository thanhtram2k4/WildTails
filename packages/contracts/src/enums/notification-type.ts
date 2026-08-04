import { z } from 'zod';

export const NotificationTypeSchema = z.enum([
  'FOLLOW',
  'COMMENT',
  'REACTION',
  'MENTION',
  'GAME_INVITE',
  'GOAL_REMINDER',
  'AI_JOB_COMPLETE',
  'MODERATION',
]);

export type NotificationType = z.infer<typeof NotificationTypeSchema>;
