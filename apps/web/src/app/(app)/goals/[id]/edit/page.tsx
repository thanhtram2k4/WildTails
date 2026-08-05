'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { use } from 'react';
import { GoalEditor } from '@/components/goals/goal-editor';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/loading-skeleton';
import { apiGet, isOfflineError, isUnauthorizedError } from '@/lib/api-helpers';
import type { GoalResponse } from '@wildtails/contracts';

interface EditGoalPageProps {
  params: Promise<{ id: string }>;
}

type PageState =
  | { status: 'loading' }
  | { status: 'success'; goal: GoalResponse }
  | { status: 'error'; message: string; offline: boolean; unauthorized: boolean };

export default function EditGoalPage({ params }: EditGoalPageProps) {
  const { id } = use(params);
  const [state, setState] = useState<PageState>({ status: 'loading' });
  const [retry, setRetry] = useState(0);
  const setRef = useRef(setState);

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
          <li aria-hidden="true">/</li>
          <li>
            {state.status === 'success' ? (
              <Link
                href={`/goals/${id}`}
                className="hover:underline underline-offset-2 rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0d9488]"
                style={{ color: 'var(--wt-teal)' }}
              >
                {state.goal.title.slice(0, 30)}
                {state.goal.title.length > 30 ? '...' : ''}
              </Link>
            ) : (
              <span>Goal</span>
            )}
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">Edit</li>
        </ol>
      </nav>

      <h1 className="text-2xl font-bold" style={{ color: 'var(--wt-navy)' }}>
        Edit goal
      </h1>

      {state.status === 'loading' ? (
        <div className="space-y-4" role="status" aria-label="Loading goal">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-6 w-full rounded-full" />
        </div>
      ) : state.status === 'error' ? (
        <ErrorState
          message={state.message}
          isOffline={state.offline}
          isUnauthorized={state.unauthorized}
          onRetry={() => setRetry((n) => n + 1)}
        />
      ) : (
        <GoalEditor existing={state.goal} />
      )}
    </div>
  );
}
