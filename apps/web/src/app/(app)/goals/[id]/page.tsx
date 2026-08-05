'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/loading-skeleton';
import { ProgressBar } from '@/components/cabin/shared';
import { apiGet, apiDelete, isOfflineError, isUnauthorizedError } from '@/lib/api-helpers';
import type { GoalResponse } from '@wildtails/contracts';

interface GoalDetailPageProps {
  params: Promise<{ id: string }>;
}

type PageState =
  | { status: 'loading' }
  | { status: 'success'; goal: GoalResponse }
  | { status: 'error'; message: string; offline: boolean; unauthorized: boolean };

export default function GoalDetailPage({ params }: GoalDetailPageProps) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();

  const [state, setState] = useState<PageState>({ status: 'loading' });
  const [retry, setRetry] = useState(0);
  const setRef = useRef(setState);

  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRef.current({ status: 'loading' });

    apiGet<GoalResponse>(`/goals/${id}`).then(
      (env) => {
        if (cancelled) return;
        setRef.current({ status: 'success', goal: env.data });
      },
      (err: unknown) => {
        if (cancelled) return;
        setRef.current({
          status: 'error',
          message: err instanceof Error ? err.message : 'Failed to load goal.',
          offline: isOfflineError(err),
          unauthorized: isUnauthorizedError(err),
        });
      },
    );

    return () => {
      cancelled = true;
    };
  }, [id, retry]);

  async function handleDelete() {
    if (!confirm('Delete this goal? This cannot be undone.')) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await apiDelete(`/goals/${id}`);
      router.replace('/goals');
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete goal.');
      setDeleting(false);
    }
  }

  const goal = state.status === 'success' ? state.goal : null;
  const isOwner = goal && user && goal.ownerId === user.userId;
  const deadlineStr = goal?.deadline ? new Date(goal.deadline).toLocaleDateString() : null;
  const isOverdue =
    goal?.deadline !== undefined &&
    goal.deadline !== null &&
    goal.progress < 100 &&
    new Date(goal.deadline) < new Date();

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="text-sm" style={{ color: 'var(--wt-text-muted)' }}>
        <ol className="flex items-center gap-1">
          <li>
            <Link
              href="/goals"
              className="hover:underline underline-offset-2 rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0d9488]"
              style={{ color: 'var(--wt-teal)' }}
            >
              Goals
            </Link>
          </li>
          {goal ? (
            <>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="truncate max-w-[200px]">
                {goal.title}
              </li>
            </>
          ) : null}
        </ol>
      </nav>

      {state.status === 'loading' ? (
        <div className="space-y-4" role="status" aria-label="Loading goal">
          <Skeleton className="h-8 w-3/4 rounded" />
          <Skeleton className="h-4 w-full rounded-full" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ) : state.status === 'error' ? (
        <ErrorState
          message={state.message}
          isOffline={state.offline}
          isUnauthorized={state.unauthorized}
          onRetry={() => setRetry((n) => n + 1)}
        />
      ) : goal ? (
        <>
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <h1 className="text-2xl font-bold" style={{ color: 'var(--wt-navy)' }}>
              {goal.title}
            </h1>
            {isOwner ? (
              <div className="flex gap-2 shrink-0">
                <Link href={`/goals/${id}/edit`}>
                  <Button size="sm" variant="secondary">
                    Edit
                  </Button>
                </Link>
                <Button
                  size="sm"
                  variant="danger"
                  isLoading={deleting}
                  onClick={() => void handleDelete()}
                >
                  Delete
                </Button>
              </div>
            ) : null}
          </div>

          {deleteError ? (
            <p className="text-sm text-red-600" role="alert">
              {deleteError}
            </p>
          ) : null}

          {/* Progress */}
          <div
            className="rounded-xl border p-6"
            style={{ backgroundColor: 'var(--wt-card)', borderColor: 'var(--wt-border)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold" style={{ color: 'var(--wt-navy)' }}>
                Progress
              </span>
              <span className="text-2xl font-bold" style={{ color: 'var(--wt-teal)' }}>
                {goal.progress}%
              </span>
            </div>
            <ProgressBar progress={goal.progress} />

            {goal.progress === 100 ? (
              <p className="mt-3 text-sm font-semibold" style={{ color: 'var(--wt-teal)' }}>
                Goal complete!
              </p>
            ) : null}
          </div>

          {/* Meta */}
          <div
            className="rounded-xl border p-4 grid grid-cols-2 gap-4"
            style={{ backgroundColor: 'var(--wt-card)', borderColor: 'var(--wt-border)' }}
          >
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-wide mb-1"
                style={{ color: 'var(--wt-text-muted)' }}
              >
                Deadline
              </p>
              {deadlineStr ? (
                <p
                  className="text-sm font-medium"
                  style={{ color: isOverdue ? '#ef4444' : 'var(--wt-navy)' }}
                >
                  {isOverdue ? 'Overdue: ' : ''}
                  {deadlineStr}
                </p>
              ) : (
                <p className="text-sm" style={{ color: 'var(--wt-text-muted)' }}>
                  No deadline
                </p>
              )}
            </div>
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-wide mb-1"
                style={{ color: 'var(--wt-text-muted)' }}
              >
                Linked journals
              </p>
              <p className="text-sm font-medium" style={{ color: 'var(--wt-navy)' }}>
                {goal.linkedJournalCount}
              </p>
            </div>
            <div>
              <p
                className="text-xs font-semibold uppercase tracking-wide mb-1"
                style={{ color: 'var(--wt-text-muted)' }}
              >
                Created
              </p>
              <p className="text-sm" style={{ color: 'var(--wt-text-muted)' }}>
                {new Date(goal.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Description */}
          {goal.description ? (
            <div
              className="rounded-xl border p-4"
              style={{ backgroundColor: 'var(--wt-card)', borderColor: 'var(--wt-border)' }}
            >
              <p
                className="text-xs font-semibold uppercase tracking-wide mb-2"
                style={{ color: 'var(--wt-text-muted)' }}
              >
                Description
              </p>
              <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--wt-text)' }}>
                {goal.description}
              </p>
            </div>
          ) : null}

          {/* Link to journals */}
          {goal.linkedJournalCount > 0 ? (
            <Link
              href={`/cabin/journals?goalId=${id}`}
              className="text-sm underline underline-offset-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488]"
              style={{ color: 'var(--wt-teal)' }}
            >
              View linked journals
            </Link>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
