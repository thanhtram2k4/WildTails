'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { use } from 'react';
import { JournalEditor } from '@/components/cabin/journal-editor';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/loading-skeleton';
import { apiGet, isOfflineError, isUnauthorizedError } from '@/lib/api-helpers';
import type { JournalResponse } from '@wildtails/contracts';

interface EditJournalPageProps {
  params: Promise<{ id: string }>;
}

type PageState =
  | { status: 'loading' }
  | { status: 'success'; journal: JournalResponse }
  | { status: 'error'; message: string; offline: boolean; unauthorized: boolean };

export default function EditJournalPage({ params }: EditJournalPageProps) {
  const { id } = use(params);
  const [state, setState] = useState<PageState>({ status: 'loading' });
  const [retry, setRetry] = useState(0);
  const setRef = useRef(setState);

  useEffect(() => {
    let cancelled = false;
    setRef.current({ status: 'loading' });

    apiGet<JournalResponse>(`/journals/${id}`).then(
      (env) => {
        if (cancelled) return;
        setRef.current({ status: 'success', journal: env.data });
      },
      (err: unknown) => {
        if (cancelled) return;
        setRef.current({
          status: 'error',
          message: err instanceof Error ? err.message : 'Failed to load journal.',
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
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="text-sm" style={{ color: 'var(--wt-text-muted)' }}>
        <ol className="flex items-center gap-1">
          <li>
            <Link
              href="/cabin"
              className="hover:underline underline-offset-2 rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0d9488]"
              style={{ color: 'var(--wt-teal)' }}
            >
              Cabin
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              href="/cabin/journals"
              className="hover:underline underline-offset-2 rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0d9488]"
              style={{ color: 'var(--wt-teal)' }}
            >
              Journals
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            {state.status === 'success' ? (
              <Link
                href={`/cabin/journals/${id}`}
                className="hover:underline underline-offset-2 rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0d9488]"
                style={{ color: 'var(--wt-teal)' }}
              >
                {state.journal.title.slice(0, 30)}
                {state.journal.title.length > 30 ? '...' : ''}
              </Link>
            ) : (
              <span>Journal</span>
            )}
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">Edit</li>
        </ol>
      </nav>

      <h1 className="text-2xl font-bold" style={{ color: 'var(--wt-navy)' }}>
        Edit journal
      </h1>

      {state.status === 'loading' ? (
        <div className="space-y-4" role="status" aria-label="Loading journal">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-10 rounded-lg" />
            <Skeleton className="h-10 rounded-lg" />
          </div>
        </div>
      ) : state.status === 'error' ? (
        <ErrorState
          message={state.message}
          isOffline={state.offline}
          isUnauthorized={state.unauthorized}
          onRetry={() => setRetry((n) => n + 1)}
        />
      ) : (
        <JournalEditor existing={state.journal} />
      )}
    </div>
  );
}
