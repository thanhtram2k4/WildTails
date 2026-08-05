'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth/auth-context';
import { Button } from '@/components/ui/button';
import { apiGet, isOfflineError, isUnauthorizedError } from '@/lib/api-helpers';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/loading-skeleton';
import { VisibilityBadge, ProgressBar } from '@/components/cabin/shared';
import type { JournalResponse, GoalResponse } from '@wildtails/contracts';

interface CabinSummary {
  journalCount: number;
  recentJournals: JournalResponse[];
  goalProgress: GoalResponse[];
}

type PageState =
  | { status: 'loading' }
  | { status: 'success'; data: CabinSummary }
  | { status: 'error'; message: string; offline?: boolean; unauthorized?: boolean };

function CabinIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M6 22 L24 6 L42 22"
        stroke="#1e3a5f"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M10 22 L10 42 L38 42 L38 22"
        stroke="#1e3a5f"
        strokeWidth="2"
        strokeLinecap="round"
        fill="#f0fdfa"
      />
      <rect
        x="19"
        y="28"
        width="10"
        height="14"
        rx="2"
        stroke="#0d9488"
        strokeWidth="2"
        fill="white"
      />
      <rect
        x="12"
        y="24"
        width="8"
        height="8"
        rx="1.5"
        stroke="#0d9488"
        strokeWidth="2"
        fill="white"
      />
      <circle cx="38" cy="12" r="5" fill="#f59e0b" />
      <path d="M38 8 L38 16" stroke="#1e3a5f" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M34 12 L42 12" stroke="#1e3a5f" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function CabinPage() {
  const { user } = useAuth();
  const [state, setState] = useState<PageState>({ status: 'loading' });
  const setRef = useRef(setState);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setRef.current({ status: 'loading' });

    async function load() {
      try {
        const [journalsEnv, goalsEnv] = await Promise.all([
          apiGet<JournalResponse[]>('/knowledge/journals?limit=5'),
          apiGet<GoalResponse[]>('/knowledge/goals?limit=3'),
        ]);

        const journals = Array.isArray(journalsEnv.data) ? journalsEnv.data : [];
        const goals = Array.isArray(goalsEnv.data) ? goalsEnv.data : [];

        if (!cancelled) {
          setRef.current({
            status: 'success',
            data: {
              journalCount: journalsEnv.meta?.total ?? journals.length,
              recentJournals: journals.slice(0, 5),
              goalProgress: goals,
            },
          });
        }
      } catch (err) {
        if (!cancelled) {
          setRef.current({
            status: 'error',
            message: err instanceof Error ? err.message : 'Failed to load cabin.',
            offline: isOfflineError(err),
            unauthorized: isUnauthorizedError(err),
          });
        }
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [retry]);

  return (
    <div className="flex flex-col gap-8">
      {/* Header */}
      <section
        className="flex items-center gap-5 rounded-xl border p-6"
        style={{ backgroundColor: 'var(--wt-card)', borderColor: 'var(--wt-border)' }}
      >
        <CabinIcon />
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--wt-navy)' }}>
            {user?.displayName ? `${user.displayName}'s Cabin` : "Captain's Cabin"}
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--wt-text-muted)' }}>
            Your private space for journaling, goals, and knowledge.
          </p>
        </div>
      </section>

      {state.status === 'error' ? (
        <ErrorState
          message={state.message}
          isOffline={state.offline}
          isUnauthorized={state.unauthorized}
          onRetry={() => setRetry((n) => n + 1)}
        />
      ) : (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label="Journals"
              loading={state.status === 'loading'}
              value={state.status === 'success' ? state.data.journalCount : 0}
              action="Write new"
              actionHref="/cabin/journals/new"
              icon={
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect
                    x="4"
                    y="3"
                    width="16"
                    height="18"
                    rx="2"
                    stroke="#0d9488"
                    strokeWidth="1.5"
                    fill="#f0fdfa"
                  />
                  <rect x="3" y="4" width="2" height="16" rx="1" fill="#0d9488" opacity="0.3" />
                  <line
                    x1="8"
                    y1="9"
                    x2="16"
                    y2="9"
                    stroke="#1e3a5f"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <line
                    x1="8"
                    y1="13"
                    x2="16"
                    y2="13"
                    stroke="#1e3a5f"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <line
                    x1="8"
                    y1="17"
                    x2="13"
                    y2="17"
                    stroke="#1e3a5f"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              }
            />
            <StatCard
              label="Goals"
              loading={state.status === 'loading'}
              value={state.status === 'success' ? state.data.goalProgress.length : 0}
              action="Add goal"
              actionHref="/goals/new"
              icon={
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" stroke="#0d9488" strokeWidth="1.5" fill="#f0fdfa" />
                  <circle cx="12" cy="12" r="5" stroke="#1e3a5f" strokeWidth="1.5" fill="none" />
                  <circle cx="12" cy="12" r="2" fill="#f59e0b" />
                </svg>
              }
            />
            <StatCard
              label="Quick links"
              loading={false}
              value={0}
              action="View journals"
              actionHref="/cabin/journals"
              icon={
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle cx="9" cy="8" r="3" stroke="#0d9488" strokeWidth="1.5" fill="#f0fdfa" />
                  <circle cx="16" cy="8" r="3" stroke="#0d9488" strokeWidth="1.5" fill="#f0fdfa" />
                  <path
                    d="M3 20 Q3 14 9 14"
                    stroke="#1e3a5f"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    fill="none"
                  />
                  <path
                    d="M15 14 Q21 14 21 20"
                    stroke="#1e3a5f"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    fill="none"
                  />
                </svg>
              }
            />
          </div>

          {/* Recent journals */}
          <section aria-labelledby="recent-journals-heading">
            <div className="mb-3 flex items-center justify-between">
              <h2
                id="recent-journals-heading"
                className="text-lg font-semibold"
                style={{ color: 'var(--wt-navy)' }}
              >
                Recent journals
              </h2>
              <Link
                href="/cabin/journals"
                className="text-sm hover:underline underline-offset-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488]"
                style={{ color: 'var(--wt-teal)' }}
              >
                View all
              </Link>
            </div>

            {state.status === 'loading' ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            ) : state.status === 'success' && state.data.recentJournals.length === 0 ? (
              <div
                className="flex items-center justify-between rounded-xl border border-dashed p-6"
                style={{ borderColor: 'var(--wt-border)' }}
              >
                <p className="text-sm" style={{ color: 'var(--wt-text-muted)' }}>
                  No journals yet. Start writing!
                </p>
                <Link href="/cabin/journals/new">
                  <Button size="sm">Write first entry</Button>
                </Link>
              </div>
            ) : state.status === 'success' ? (
              <ul className="space-y-2">
                {state.data.recentJournals.map((j) => (
                  <li key={j.id}>
                    <Link
                      href={`/cabin/journals/${j.id}`}
                      className="flex items-center justify-between rounded-xl border p-4 transition-colors hover:border-[#0d9488] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488] focus-visible:ring-offset-2"
                      style={{ backgroundColor: 'var(--wt-card)', borderColor: 'var(--wt-border)' }}
                    >
                      <span
                        className="font-medium text-sm truncate"
                        style={{ color: 'var(--wt-navy)' }}
                      >
                        {j.title}
                      </span>
                      <VisibilityBadge visibility={j.visibility} />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </section>

          {/* Goal progress */}
          <section aria-labelledby="goal-progress-heading">
            <div className="mb-3 flex items-center justify-between">
              <h2
                id="goal-progress-heading"
                className="text-lg font-semibold"
                style={{ color: 'var(--wt-navy)' }}
              >
                Goals
              </h2>
              <Link
                href="/goals"
                className="text-sm hover:underline underline-offset-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488]"
                style={{ color: 'var(--wt-teal)' }}
              >
                View all
              </Link>
            </div>

            {state.status === 'loading' ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            ) : state.status === 'success' && state.data.goalProgress.length === 0 ? (
              <div
                className="flex items-center justify-between rounded-xl border border-dashed p-6"
                style={{ borderColor: 'var(--wt-border)' }}
              >
                <p className="text-sm" style={{ color: 'var(--wt-text-muted)' }}>
                  No goals set yet.
                </p>
                <Link href="/goals/new">
                  <Button size="sm">Add first goal</Button>
                </Link>
              </div>
            ) : state.status === 'success' ? (
              <ul className="space-y-3">
                {state.data.goalProgress.map((g) => (
                  <li
                    key={g.id}
                    className="rounded-xl border p-4"
                    style={{ backgroundColor: 'var(--wt-card)', borderColor: 'var(--wt-border)' }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Link
                        href={`/goals/${g.id}`}
                        className="font-medium text-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488] rounded"
                        style={{ color: 'var(--wt-navy)' }}
                      >
                        {g.title}
                      </Link>
                      <span className="text-xs font-semibold" style={{ color: 'var(--wt-teal)' }}>
                        {g.progress}%
                      </span>
                    </div>
                    <ProgressBar progress={g.progress} />
                  </li>
                ))}
              </ul>
            ) : null}
          </section>
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  loading,
  value,
  action,
  actionHref,
  icon,
}: {
  label: string;
  loading: boolean;
  value: number;
  action: string;
  actionHref: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl border p-4 flex flex-col gap-3"
      style={{ backgroundColor: 'var(--wt-card)', borderColor: 'var(--wt-border)' }}
    >
      <div className="flex items-start justify-between">
        <p className="text-sm font-medium" style={{ color: 'var(--wt-text-muted)' }}>
          {label}
        </p>
        {icon}
      </div>
      {loading ? (
        <Skeleton className="h-8 w-12" />
      ) : (
        <p className="text-3xl font-bold" style={{ color: 'var(--wt-navy)' }}>
          {value}
        </p>
      )}
      <Link
        href={actionHref}
        className="text-xs hover:underline underline-offset-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488]"
        style={{ color: 'var(--wt-teal)' }}
      >
        {action}
      </Link>
    </div>
  );
}
