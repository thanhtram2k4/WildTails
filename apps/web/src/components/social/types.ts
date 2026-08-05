/**
 * Local social component types that extend contract schemas with
 * client-side state needed for optimistic updates.
 *
 * The server contract types (PostResponse, CommentResponse, etc.) are
 * imported directly from @wildtails/contracts throughout the social components.
 */

import type { ReactionType } from '@wildtails/contracts';

/** Optimistic reaction state for a single post. */
export interface LocalReactionState {
  counts: Record<ReactionType, number>;
  /** The current user's active reaction, or null if none. */
  userReaction: ReactionType | null;
}
