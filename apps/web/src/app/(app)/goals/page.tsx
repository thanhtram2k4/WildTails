'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { ProgressBar } from '@/components/cabin/shared';
import { apiGet, isOfflineError, isUnauthorizedError } from '@/lib/api-helpers';
import type { GoalResponse } from '@wildtails/contracts';

type ListState =
  | { status: 'loading' }
  | { status: 'success'; goals: GoalResponse[]; cursor: string | null; hasMore: boolean }
  | { status: 'error'; message: string; offline: boolean; unauthorized: boolean };

export default function GoalsPage() {
  const [listState, setListState] = useState<ListState>({ status: 'loading' });
  const setListRef = useRef(setListState);
  const [loadingMore, setLoadingMore] = useState(false);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setListRef.current({ status: 'loading' });

    apiGet<GoalResponse[]>('/goals?limit=20').then(
      (env) => {
        if (cancelled) return;
        setListRef.current({
          status: 'success',
          goals: Array.isArray(env.data) ? env.data : [],
          cursor: env.meta?.cursor ?? null,
          hasMore: env.meta?.hasMore ?? false,
        });
      },
      (err: unknown) => {
        if (cancelled) return;
        setListRef.current({
          status: 'error',
          message: err instanceof Error ? err.message : 'Failed to load goals.',
          offline: isOfflineError(err),
          unauthorized: isUnauthorizedError(err),
        });
      },
    );

    return () => {
      cancelled = true;
    };
  }, [retry]);

  async function handleLoadMore() {
    if (listState.status !== 'success' || !listState.cursor || loadingMore) return;
    const prevCursor = listState.cursor;
    setLoadingMore(true);
    try {
      const env = await apiGet<GoalResponse[]>(`/goals?limit=20&cursor=${prevCursor}`);
      setListState((prev) => {
        if (prev.status !== 'success') return prev;
        return {
          ...prev,
          goals: [...prev.goals, ...(Array.isArray(env.data) ? env.data : [])],
          cursor: env.meta?.cursor ?? null,
          hasMore: env.meta?.hasMore ?? false,
        };
      });
    } catch {
      // Silently fail — user can retry manually.
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--wt-navy)' }}>
            The Sun — Goals
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--wt-text-muted)' }}>
            Set goals and track your progress.
          </p>
        </div>
        <Link href="/goals/new">
          <Button size="sm">New goal</Button>
        </Link>
      </div>

      {listState.status === 'loading' ? (
        <LoadingSkeleton variant="goal" count={4} />
      ) : listState.status === 'error' ? (
        <ErrorState
          message={listState.message}
          isOffline={listState.offline}
          isUnauthorized={listState.unauthorized}
          onRetry={() => setRetry((n) => n + 1)}
        />
      ) : listState.goals.length === 0 ? (
        <EmptyState
          title="No goals yet"
          description="Set your first goal and start making progress."
          variant="goal"
          action={
            <Link href="/goals/new">
              <Button size="sm">Add first goal</Button>
            </Link>
          }
        />
      ) : (
        <>
          <ul className="space-y-3" aria-label="Goals">
            {listState.goals.map((g) => (
              <li key={g.id}>
                <GoalCard goal={g} />
              </li>
            ))}
          </ul>

          {listState.hasMore ? (
            <div className="flex justify-center pt-2">
              <Button
                variant="secondary"
                size="sm"
                isLoading={loadingMore}
                onClick={() => void handleLoadMore()}
              >
                Load more
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function GoalCard({ goal }: { goal: GoalResponse }) {
  const deadlineStr = goal.deadline ? new Date(goal.deadline).toLocaleDateString() : null;

  const isOverdue =
    goal.deadline !== null && goal.progress < 100 && new Date(goal.deadline) < new Date();

  return (
    <Link
      href={`/goals/${goal.id}`}
      className={[
        'block rounded-xl border p-5 transition-colors',
        'hover:border-[#0d9488]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488] focus-visible:ring-offset-2',
      ].join(' ')}
      style={{ backgroundColor: 'var(--wt-card)', borderColor: 'var(--wt-border)' }}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h2 className="font-semibold text-sm" style={{ color: 'var(--wt-navy)' }}>
          {goal.title}
        </h2>
        <span className="text-sm font-bold shrink-0" style={{ color: 'var(--wt-teal)' }}>
          {goal.progress}%
        </span>
      </div>

      <ProgressBar progress={goal.progress} />

      <div className="mt-3 flex flex-wrap gap-3 text-xs" style={{ color: 'var(--wt-text-muted)' }}>
        {deadlineStr ? (
          <span style={isOverdue ? { color: '#ef4444' } : {}}>
            {isOverdue ? 'Overdue: ' : 'Due: '}
            {deadlineStr}
          </span>
        ) : (
          <span>No deadline</span>
        )}
        <span>
          {goal.linkedJournalCount} linked journal{goal.linkedJournalCount !== 1 ? 's' : ''}
        </span>
      </div>
    </Link>
  );
}
