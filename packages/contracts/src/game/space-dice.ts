import { z } from 'zod';
import { GamePhaseSchema } from '../enums/game-phase.js';

// ---------------------------------------------------------------------------
// Sub-schemas
// ---------------------------------------------------------------------------

export const SpaceDicePlayerSchema = z.object({
  userId: z.string().uuid(),
  displayName: z.string(),
  score: z.number().int().nonnegative(),
  isConnected: z.boolean(),
  isReady: z.boolean(),
});

export type SpaceDicePlayer = z.infer<typeof SpaceDicePlayerSchema>;

/**
 * The authoritative game state snapshot stored in Redis and returned on reconnect.
 * The client must never derive or override any field in this schema.
 */
export const SpaceDiceGameStateSchema = z.object({
  roomId: z.string().uuid(),
  phase: GamePhaseSchema,
  players: z.array(SpaceDicePlayerSchema),
  /** userId of the player whose turn it is. Null during WAITING/STARTING/FINISHED. */
  currentTurn: z.string().uuid().nullable(),
  round: z.number().int().nonnegative(),
  maxRounds: z.number().int().positive(),
  /** Server-generated dice result for the current roll. Present only in ROLLING/QUESTION. */
  diceResult: z.number().int().min(1).max(6).optional(),
  /** Question selected by the server for the current round. */
  question: z
    .object({
      id: z.string().uuid(),
      text: z.string(),
      options: z.array(z.string()),
    })
    .optional(),
  /** Map of userId -> chosen option index. Populated in VOTING phase. */
  votes: z.record(z.string().uuid(), z.number().int().nonnegative()),
  /** Map of userId -> cumulative score. */
  scores: z.record(z.string().uuid(), z.number().int().nonnegative()),
  startedAt: z.string().datetime().nullable(),
  updatedAt: z.string().datetime(),
});

export type SpaceDiceGameState = z.infer<typeof SpaceDiceGameStateSchema>;

// ---------------------------------------------------------------------------
// Client-to-server event names
// ---------------------------------------------------------------------------

/** Events that the client may emit. The server validates schema, membership, phase, and turn. */
export const SpaceDiceClientEventSchema = z.enum(['READY', 'ROLL_DICE', 'ANSWER', 'VOTE']);

export type SpaceDiceClientEvent = z.infer<typeof SpaceDiceClientEventSchema>;

// ---------------------------------------------------------------------------
// Server-to-client event names
// ---------------------------------------------------------------------------

export const SpaceDiceServerEventSchema = z.enum([
  'GAME_STATE',
  'PHASE_CHANGE',
  'DICE_RESULT',
  'QUESTION',
  'VOTE_RESULT',
  'GAME_END',
  'PLAYER_JOIN',
  'PLAYER_LEAVE',
  'PLAYER_RECONNECT',
  'ERROR',
]);

export type SpaceDiceServerEvent = z.infer<typeof SpaceDiceServerEventSchema>;

// ---------------------------------------------------------------------------
// Client event payload schemas
// ---------------------------------------------------------------------------

/** READY: player signals readiness before the game starts. No payload fields required. */
export const ReadyPayloadSchema = z.object({
  roomId: z.string().uuid(),
});

export type ReadyPayload = z.infer<typeof ReadyPayloadSchema>;

/** ROLL_DICE: current-turn player requests a dice roll. Server validates it is their turn. */
export const RollDicePayloadSchema = z.object({
  roomId: z.string().uuid(),
});

export type RollDicePayload = z.infer<typeof RollDicePayloadSchema>;

/** ANSWER: current-turn player selects their answer option index. */
export const AnswerPayloadSchema = z.object({
  roomId: z.string().uuid(),
  optionIndex: z.number().int().nonnegative(),
});

export type AnswerPayload = z.infer<typeof AnswerPayloadSchema>;

/** VOTE: all players vote on the current-turn player's answer. */
export const VotePayloadSchema = z.object({
  roomId: z.string().uuid(),
  optionIndex: z.number().int().nonnegative(),
});

export type VotePayload = z.infer<typeof VotePayloadSchema>;

// ---------------------------------------------------------------------------
// Server event payload schemas
// ---------------------------------------------------------------------------

export const GameStatePayloadSchema = z.object({
  state: SpaceDiceGameStateSchema,
});

export type GameStatePayload = z.infer<typeof GameStatePayloadSchema>;

export const PhaseChangePayloadSchema = z.object({
  roomId: z.string().uuid(),
  phase: GamePhaseSchema,
  updatedAt: z.string().datetime(),
});

export type PhaseChangePayload = z.infer<typeof PhaseChangePayloadSchema>;

export const DiceResultPayloadSchema = z.object({
  roomId: z.string().uuid(),
  rolledBy: z.string().uuid(),
  result: z.number().int().min(1).max(6),
});

export type DiceResultPayload = z.infer<typeof DiceResultPayloadSchema>;

export const QuestionPayloadSchema = z.object({
  roomId: z.string().uuid(),
  question: z.object({
    id: z.string().uuid(),
    text: z.string(),
    options: z.array(z.string()),
  }),
  /** Server-set deadline for answering. Client uses this for display only. */
  deadline: z.string().datetime(),
});

export type QuestionPayload = z.infer<typeof QuestionPayloadSchema>;

export const VoteResultPayloadSchema = z.object({
  roomId: z.string().uuid(),
  votes: z.record(z.string().uuid(), z.number().int().nonnegative()),
  /** Map of userId -> points awarded this round. */
  pointsAwarded: z.record(z.string().uuid(), z.number().int()),
  updatedScores: z.record(z.string().uuid(), z.number().int().nonnegative()),
});

export type VoteResultPayload = z.infer<typeof VoteResultPayloadSchema>;

export const GameEndPayloadSchema = z.object({
  roomId: z.string().uuid(),
  finalScores: z.record(z.string().uuid(), z.number().int().nonnegative()),
  winnerId: z.string().uuid().nullable(),
  /** Points are only awarded after the final result is persisted in PostgreSQL. */
  pointsAwarded: z.record(z.string().uuid(), z.number().int()),
});

export type GameEndPayload = z.infer<typeof GameEndPayloadSchema>;

export const PlayerJoinPayloadSchema = z.object({
  roomId: z.string().uuid(),
  player: SpaceDicePlayerSchema,
});

export type PlayerJoinPayload = z.infer<typeof PlayerJoinPayloadSchema>;

export const PlayerLeavePayloadSchema = z.object({
  roomId: z.string().uuid(),
  userId: z.string().uuid(),
});

export type PlayerLeavePayload = z.infer<typeof PlayerLeavePayloadSchema>;

export const PlayerReconnectPayloadSchema = z.object({
  roomId: z.string().uuid(),
  userId: z.string().uuid(),
  /** Full state snapshot sent on reconnect — not an event replay. */
  state: SpaceDiceGameStateSchema,
});

export type PlayerReconnectPayload = z.infer<typeof PlayerReconnectPayloadSchema>;

export const GameErrorPayloadSchema = z.object({
  code: z.string(),
  message: z.string(),
});

export type GameErrorPayload = z.infer<typeof GameErrorPayloadSchema>;
