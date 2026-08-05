'use client';

import { useState } from 'react';
import { apiPost } from '@/lib/api-helpers';
import type { ReactionType } from '@wildtails/contracts';
import type { LocalReactionState } from './types';

const REACTIONS: { type: ReactionType; label: string; symbol: string }[] = [
  { type: 'LIKE', label: 'Like', symbol: '\uD83D\uDC4D' },
  { type: 'INSIGHTFUL', label: 'Insightful', symbol: '\uD83D\uDCA1' },
  { type: 'SUPPORTIVE', label: 'Supportive', symbol: '\uD83E\uDD1D' },
  { type: 'FUNNY', label: 'Funny', symbol: '\uD83D\uDE04' },
];

interface ReactionBarProps {
  postId: string;
  initialCounts: Record<ReactionType, number>;
  initialUserReaction?: ReactionType;
}

export function ReactionBar({ postId, initialCounts, initialUserReaction }: ReactionBarProps) {
  const [state, setState] = useState<LocalReactionState>({
    counts: { ...initialCounts },
    userReaction: initialUserReaction ?? null,
  });
  const [pending, setPending] = useState(false);

  async function handleReact(type: ReactionType) {
    if (pending) return;

    // Optimistic update
    const prev = { ...state };
    setState((s) => {
      const next: LocalReactionState = {
        counts: { ...s.counts },
        userReaction: null,
      };
      if (s.userReaction === type) {
        // Toggle off
        next.counts[type] = Math.max(0, (s.counts[type] ?? 0) - 1);
        next.userReaction = null;
      } else {
        // Remove old reaction count
        if (s.userReaction) {
          next.counts[s.userReaction] = Math.max(0, (s.counts[s.userReaction] ?? 0) - 1);
        }
        // Add new reaction count
        next.counts[type] = (s.counts[type] ?? 0) + 1;
        next.userReaction = type;
      }
      return next;
    });

    setPending(true);
    try {
      await apiPost(`/posts/${postId}/reactions`, { postId, type });
    } catch {
      // Revert on failure
      setState(prev);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Post reactions">
      {REACTIONS.map(({ type, label, symbol }) => {
        const count = state.counts[type] ?? 0;
        const isActive = state.userReaction === type;
        return (
          <button
            key={type}
            type="button"
            onClick={() => void handleReact(type)}
            disabled={pending}
            aria-pressed={isActive}
            aria-label={`${label}: ${count}`}
            className={[
              'inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium',
              'border transition-colors duration-150 motion-reduce:transition-none',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488] focus-visible:ring-offset-1',
              'disabled:cursor-not-allowed disabled:opacity-60',
              isActive
                ? 'border-[#0d9488] bg-teal-50 text-[#0d9488]'
                : 'border-[#e2e8f0] bg-white text-[#64748b] hover:border-[#0d9488] hover:text-[#0d9488]',
            ].join(' ')}
          >
            <span aria-hidden="true">{symbol}</span>
            <span>{count > 0 ? count : ''}</span>
            <span className="sr-only">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
