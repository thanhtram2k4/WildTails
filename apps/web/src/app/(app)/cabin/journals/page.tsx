'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { FolderNav } from '@/components/cabin/folder-nav';
import { apiGet, isOfflineError, isUnauthorizedError } from '@/lib/api-helpers';
import { VisibilityBadge } from '@/components/cabin/shared';
import type {
  JournalResponse,
  FolderResponse,
  TagResponse,
  GoalResponse,
} from '@wildtails/contracts';

interface FilterBarProps {
  folders: FolderResponse[];
  tags: TagResponse[];
  goals: GoalResponse[];
  selectedFolder: string;
  selectedTag: string;
  selectedGoal: string;
  onFolderChange: (v: string) => void;
  onTagChange: (v: string) => void;
  onGoalChange: (v: string) => void;
}

function FilterBar({
  folders,
  tags,
  goals,
  selectedFolder,
  selectedTag,
  selectedGoal,
  onFolderChange,
  onTagChange,
  onGoalChange,
}: FilterBarProps) {
  const selectClass = [
    'rounded border px-2 py-1 text-sm',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488]',
  ].join(' ');
  const selectStyle = { borderColor: 'var(--wt-border)', color: 'var(--wt-text)' };
  return (
    <div className="flex flex-wrap gap-2 items-center" aria-label="Filter journals">
      <select
        value={selectedFolder}
        onChange={(e) => onFolderChange(e.target.value)}
        className={selectClass}
        style={selectStyle}
        aria-label="Filter by folder"
      >
        <option value="">All folders</option>
        {folders.map((f) => (
          <option key={f.id} value={f.id}>
            {f.name}
          </option>
        ))}
      </select>
      <select
        value={selectedTag}
        onChange={(e) => onTagChange(e.target.value)}
        className={selectClass}
        style={selectStyle}
        aria-label="Filter by tag"
      >
        <option value="">All tags</option>
        {tags.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
      <select
        value={selectedGoal}
        onChange={(e) => onGoalChange(e.target.value)}
        className={selectClass}
        style={selectStyle}
        aria-label="Filter by goal"
      >
        <option value="">All goals</option>
        {goals.map((g) => (
          <option key={g.id} value={g.id}>
            {g.title}
          </option>
        ))}
      </select>
    </div>
  );
}

type ListState =
  | { status: 'loading' }
  | { status: 'success'; items: JournalResponse[]; cursor: string | null; hasMore: boolean }
  | { status: 'error'; message: string; offline: boolean; unauthorized: boolean };

export default function JournalsPage() {
  const [listState, setListState] = useState<ListState>({ status: 'loading' });
  const setListRef = useRef(setListState);

  const [filterFolders, setFilterFolders] = useState<FolderResponse[]>([]);
  const [filterTags, setFilterTags] = useState<TagResponse[]>([]);
  const [filterGoals, setFilterGoals] = useState<GoalResponse[]>([]);

  const [selectedFolder, setSelectedFolder] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [selectedGoal, setSelectedGoal] = useState('');
  const [navFolder, setNavFolder] = useState<string | undefined>(undefined);

  const [loadingMore, setLoadingMore] = useState(false);
  const [retry, setRetry] = useState(0);

  // Load filter options once
  useEffect(() => {
    async function loadFilters() {
      try {
        const [foldersEnv, tagsEnv, goalsEnv] = await Promise.all([
          apiGet<FolderResponse[]>('/knowledge/folders'),
          apiGet<TagResponse[]>('/knowledge/tags'),
          apiGet<GoalResponse[]>('/knowledge/goals'),
        ]);
        setFilterFolders(Array.isArray(foldersEnv.data) ? foldersEnv.data : []);
        setFilterTags(Array.isArray(tagsEnv.data) ? tagsEnv.data : []);
        setFilterGoals(Array.isArray(goalsEnv.data) ? goalsEnv.data : []);
      } catch {
        // Non-critical — filters just won't be populated.
      }
    }
    void loadFilters();
  }, []);

  // Load journals whenever filters or retry change
  useEffect(() => {
    let cancelled = false;
    setListRef.current({ status: 'loading' });

    const params = new URLSearchParams({ limit: '20' });
    const activeFolderId = navFolder ?? selectedFolder;
    if (activeFolderId) params.set('folderId', activeFolderId);
    if (selectedTag) params.set('tagId', selectedTag);
    if (selectedGoal) params.set('goalId', selectedGoal);

    apiGet<JournalResponse[]>(`/knowledge/journals?${params.toString()}`).then(
      (env) => {
        if (cancelled) return;
        setListRef.current({
          status: 'success',
          items: Array.isArray(env.data) ? env.data : [],
          cursor: env.meta?.cursor ?? null,
          hasMore: env.meta?.hasMore ?? false,
        });
      },
      (err: unknown) => {
        if (cancelled) return;
        setListRef.current({
          status: 'error',
          message: err instanceof Error ? err.message : 'Failed to load journals.',
          offline: isOfflineError(err),
          unauthorized: isUnauthorizedError(err),
        });
      },
    );

    return () => {
      cancelled = true;
    };
  }, [selectedFolder, selectedTag, selectedGoal, navFolder, retry]);

  async function handleLoadMore() {
    if (listState.status !== 'success' || !listState.cursor || loadingMore) return;
    const prevCursor = listState.cursor;
    setLoadingMore(true);
    try {
      const params = new URLSearchParams({ limit: '20', cursor: prevCursor });
      const activeFolderId = navFolder ?? selectedFolder;
      if (activeFolderId) params.set('folderId', activeFolderId);
      if (selectedTag) params.set('tagId', selectedTag);
      if (selectedGoal) params.set('goalId', selectedGoal);
      const env = await apiGet<JournalResponse[]>(`/knowledge/journals?${params.toString()}`);
      setListState((prev) => {
        if (prev.status !== 'success') return prev;
        return {
          ...prev,
          items: [...prev.items, ...(Array.isArray(env.data) ? env.data : [])],
          cursor: env.meta?.cursor ?? null,
          hasMore: env.meta?.hasMore ?? false,
        };
      });
    } catch {
      // Silently handle — user can scroll back and retry.
    } finally {
      setLoadingMore(false);
    }
  }

  function handleNavFolderSelect(id: string | undefined) {
    setNavFolder(id);
    setSelectedFolder(id ?? '');
  }

  return (
    <div className="flex gap-6">
      {/* Sidebar */}
      <aside className="hidden sm:block w-48 shrink-0">
        <FolderNav selectedFolderId={navFolder} onFolderSelect={handleNavFolderSelect} />
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold" style={{ color: 'var(--wt-navy)' }}>
            My Journals
          </h1>
          <Link href="/cabin/journals/new">
            <Button size="sm">New journal</Button>
          </Link>
        </div>

        {/* Filters */}
        <FilterBar
          folders={filterFolders}
          tags={filterTags}
          goals={filterGoals}
          selectedFolder={selectedFolder}
          selectedTag={selectedTag}
          selectedGoal={selectedGoal}
          onFolderChange={(v) => {
            setSelectedFolder(v);
            setNavFolder(v || undefined);
          }}
          onTagChange={setSelectedTag}
          onGoalChange={setSelectedGoal}
        />

        {/* List */}
        {listState.status === 'loading' ? (
          <LoadingSkeleton variant="journal" count={5} />
        ) : listState.status === 'error' ? (
          <ErrorState
            message={listState.message}
            isOffline={listState.offline}
            isUnauthorized={listState.unauthorized}
            onRetry={() => setRetry((n) => n + 1)}
          />
        ) : listState.items.length === 0 ? (
          <EmptyState
            title="No journals yet"
            description="Start writing your first entry."
            variant="journal"
            action={
              <Link href="/cabin/journals/new">
                <Button size="sm">Write first entry</Button>
              </Link>
            }
          />
        ) : (
          <>
            <ul className="space-y-2" aria-label="Journal entries">
              {listState.items.map((j) => (
                <li key={j.id}>
                  <JournalCard journal={j} />
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
    </div>
  );
}

function JournalCard({ journal }: { journal: JournalResponse }) {
  const updatedAt = new Date(journal.updatedAt).toLocaleDateString();
  return (
    <Link
      href={`/cabin/journals/${journal.id}`}
      className={[
        'block rounded-xl border p-4 transition-colors',
        'hover:border-[#0d9488]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488] focus-visible:ring-offset-2',
      ].join(' ')}
      style={{ backgroundColor: 'var(--wt-card)', borderColor: 'var(--wt-border)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-semibold text-sm leading-snug" style={{ color: 'var(--wt-navy)' }}>
          {journal.title}
        </h2>
        <VisibilityBadge visibility={journal.visibility} />
      </div>

      <div className="mt-2 flex flex-wrap gap-2 items-center">
        {journal.folder ? (
          <span
            className="text-xs rounded-full px-2 py-0.5 border"
            style={{ borderColor: 'var(--wt-border)', color: 'var(--wt-text-muted)' }}
          >
            {journal.folder.name}
          </span>
        ) : null}
        {journal.tags.map((tag) => (
          <span
            key={tag.id}
            className="text-xs rounded-full px-2 py-0.5"
            style={{ backgroundColor: '#f0fdfa', color: 'var(--wt-teal)' }}
          >
            #{tag.name}
          </span>
        ))}
        <span className="text-xs ml-auto" style={{ color: 'var(--wt-text-muted)' }}>
          {updatedAt}
        </span>
      </div>
    </Link>
  );
}
