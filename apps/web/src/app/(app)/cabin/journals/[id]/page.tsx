'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import { useAuth } from '@/lib/auth/auth-context';
import { MarkdownRenderer } from '@/components/markdown-renderer';
import { SharingPanel } from '@/components/cabin/sharing-panel';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/loading-skeleton';
import { VisibilityBadge } from '@/components/cabin/shared';
import { apiGet, apiDelete, isOfflineError, isUnauthorizedError } from '@/lib/api-helpers';
import type { JournalResponse, JournalVersion } from '@wildtails/contracts';

interface JournalDetailPageProps {
  params: Promise<{ id: string }>;
}

type PageState =
  | { status: 'loading' }
  | { status: 'success'; journal: JournalResponse }
  | { status: 'error'; message: string; offline: boolean; unauthorized: boolean };

export default function JournalDetailPage({ params }: JournalDetailPageProps) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();

  const [state, setState] = useState<PageState>({ status: 'loading' });
  const [retry, setRetry] = useState(0);
  const setRef = useRef(setState);

  const [versions, setVersions] = useState<JournalVersion[] | null>(null);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [versionsLoading, setVersionsLoading] = useState(false);

  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRef.current({ status: 'loading' });

    apiGet<JournalResponse>(`/knowledge/journals/${id}`).then(
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

  async function handleVersionToggle() {
    if (versionsOpen) {
      setVersionsOpen(false);
      return;
    }
    setVersionsOpen(true);
    if (versions !== null) return;
    setVersionsLoading(true);
    try {
      const env = await apiGet<JournalVersion[]>(`/knowledge/journals/${id}/versions`);
      setVersions(Array.isArray(env.data) ? env.data : []);
    } catch {
      setVersions([]);
    } finally {
      setVersionsLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this journal entry? This cannot be undone.')) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await apiDelete(`/knowledge/journals/${id}`);
      router.replace('/cabin/journals');
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete journal.');
      setDeleting(false);
    }
  }

  const journal = state.status === 'success' ? state.journal : null;
  const isOwner = journal && user && journal.ownerId === user.userId;

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
          {journal ? (
            <>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="truncate max-w-[200px]">
                {journal.title}
              </li>
            </>
          ) : null}
        </ol>
      </nav>

      {state.status === 'loading' ? (
        <div className="space-y-4" role="status" aria-label="Loading journal">
          <Skeleton className="h-8 w-3/4 rounded" />
          <Skeleton className="h-4 w-1/2 rounded" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      ) : state.status === 'error' ? (
        <ErrorState
          message={state.message}
          isOffline={state.offline}
          isUnauthorized={state.unauthorized}
          onRetry={() => setRetry((n) => n + 1)}
        />
      ) : journal ? (
        <>
          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold" style={{ color: 'var(--wt-navy)' }}>
                {journal.title}
              </h1>
              <div className="mt-2 flex flex-wrap gap-2 items-center">
                <VisibilityBadge visibility={journal.visibility} />
                {journal.folder ? (
                  <span
                    className="text-xs rounded-full px-2 py-0.5 border"
                    style={{ borderColor: 'var(--wt-border)', color: 'var(--wt-text-muted)' }}
                  >
                    {journal.folder.name}
                  </span>
                ) : null}
                {journal.goal ? (
                  <Link
                    href={`/goals/${journal.goal.id}`}
                    className="text-xs rounded-full px-2 py-0.5 hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0d9488]"
                    style={{ backgroundColor: '#fef9c3', color: '#92400e' }}
                  >
                    Goal: {journal.goal.title}
                  </Link>
                ) : null}
                <time
                  className="text-xs"
                  style={{ color: 'var(--wt-text-muted)' }}
                  dateTime={journal.updatedAt}
                >
                  Updated {new Date(journal.updatedAt).toLocaleDateString()}
                </time>
              </div>
              {journal.tags.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {journal.tags.map((tag) => (
                    <span
                      key={tag.id}
                      className="text-xs rounded-full px-2 py-0.5"
                      style={{ backgroundColor: '#f0fdfa', color: 'var(--wt-teal)' }}
                    >
                      #{tag.name}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            {/* Owner actions */}
            {isOwner ? (
              <div className="flex gap-2 shrink-0">
                <Link href={`/cabin/journals/${id}/edit`}>
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

          {/* AI Summary (draft) */}
          {journal.aiSummary ? (
            <div
              className="rounded-xl border-l-4 p-4 text-sm"
              style={{ borderLeftColor: 'var(--wt-yellow)', backgroundColor: '#fffbeb' }}
            >
              <p
                className="font-semibold text-xs uppercase tracking-wide mb-1"
                style={{ color: '#92400e' }}
              >
                AI Summary (draft — not published)
              </p>
              <p style={{ color: '#78350f' }}>{journal.aiSummary}</p>
            </div>
          ) : null}

          {/* Body */}
          <article
            className="rounded-xl border p-6"
            style={{ backgroundColor: 'var(--wt-card)', borderColor: 'var(--wt-border)' }}
          >
            {journal.body ? (
              <MarkdownRenderer content={journal.body} />
            ) : (
              <p className="text-sm italic" style={{ color: 'var(--wt-text-muted)' }}>
                This journal has no body content.
              </p>
            )}
          </article>

          {/* Version history */}
          <div>
            <button
              type="button"
              onClick={() => void handleVersionToggle()}
              className={[
                'text-sm underline underline-offset-2 rounded',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488]',
              ].join(' ')}
              style={{ color: 'var(--wt-teal)' }}
              aria-expanded={versionsOpen}
            >
              {versionsOpen ? 'Hide' : 'Show'} version history
            </button>

            {versionsOpen ? (
              <div className="mt-3">
                {versionsLoading ? (
                  <Skeleton className="h-24 w-full rounded-xl" />
                ) : versions && versions.length === 0 ? (
                  <p className="text-sm" style={{ color: 'var(--wt-text-muted)' }}>
                    No previous versions.
                  </p>
                ) : versions ? (
                  <ol className="space-y-2" aria-label="Version history">
                    {versions.map((v, idx) => (
                      <li
                        key={v.id}
                        className="rounded-lg border p-3 text-sm"
                        style={{ borderColor: 'var(--wt-border)' }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold" style={{ color: 'var(--wt-navy)' }}>
                            Version {versions.length - idx}
                          </span>
                          <time
                            className="text-xs"
                            style={{ color: 'var(--wt-text-muted)' }}
                            dateTime={v.createdAt}
                          >
                            {new Date(v.createdAt).toLocaleString()}
                          </time>
                        </div>
                        {v.body ? (
                          <p
                            className="text-xs line-clamp-2"
                            style={{ color: 'var(--wt-text-muted)' }}
                          >
                            {v.body.slice(0, 200)}
                            {v.body.length > 200 ? '...' : ''}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ol>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* Sharing panel — only visible when visibility is SELECTED_USERS and user is owner */}
          {isOwner && journal.visibility === 'SELECTED_USERS' ? (
            <SharingPanel journalId={journal.id} />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
