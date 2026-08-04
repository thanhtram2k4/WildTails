import { z } from 'zod';

/** Phases of a Space Dice game session. Terminal state: FINISHED. */
export const GamePhaseSchema = z.enum([
  'WAITING',
  'STARTING',
  'ROLLING',
  'QUESTION',
  'VOTING',
  'RESULT',
  'FINISHED',
]);

export type GamePhase = z.infer<typeof GamePhaseSchema>;
