'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { apiGet, apiPost, apiDelete, ApiError } from '@/lib/api-helpers';
import type { FolderResponse } from '@wildtails/contracts';

interface FolderNavProps {
  /** Currently selected folder ID. */
  selectedFolderId?: string;
  onFolderSelect?: (id: string | undefined) => void;
}

type FetchState =
  | { status: 'loading' }
  | { status: 'success'; folders: FolderResponse[] }
  | { status: 'error'; message: string };

export function FolderNav({ selectedFolderId, onFolderSelect }: FolderNavProps) {
  const [state, setState] = useState<FetchState>({ status: 'loading' });
  const setRef = useRef(setState);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);

  const load = useCallback(async () => {
    setRef.current({ status: 'loading' });
    try {
      const env = await apiGet<FolderResponse[]>('/folders');
      setRef.current({ status: 'success', folders: env.data });
    } catch (err) {
      setRef.current({
        status: 'error',
        message: err instanceof Error ? err.message : 'Failed to load folders.',
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, retry]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    setCreateError(null);
    try {
      await apiPost('/folders', { name });
      setNewName('');
      setRetry((n) => n + 1);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create folder.');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this folder? Journals in it will be unfoldered.')) return;
    setDeletingId(id);
    try {
      await apiDelete(`/folders/${id}`);
      if (selectedFolderId === id) onFolderSelect?.(undefined);
      setRetry((n) => n + 1);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : 'Failed to delete folder.');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <nav aria-label="Folders" className="flex flex-col gap-2">
      <h2
        className="text-xs font-semibold uppercase tracking-wide"
        style={{ color: 'var(--wt-text-muted)' }}
      >
        Folders
      </h2>

      {/* All journals link */}
      <button
        type="button"
        onClick={() => onFolderSelect?.(undefined)}
        className={[
          'w-full text-left rounded px-2 py-1.5 text-sm transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488]',
          selectedFolderId === undefined ? 'font-semibold bg-teal-50' : 'hover:bg-slate-100',
        ].join(' ')}
        style={{ color: selectedFolderId === undefined ? 'var(--wt-teal)' : 'var(--wt-text)' }}
        aria-current={selectedFolderId === undefined ? 'true' : undefined}
      >
        All journals
      </button>

      {state.status === 'loading' ? (
        <div className="space-y-1">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-8 rounded bg-slate-200 motion-safe:animate-pulse"
              aria-hidden="true"
            />
          ))}
        </div>
      ) : state.status === 'error' ? (
        <div className="text-xs text-red-600 flex items-center gap-2">
          <span>{state.message}</span>
          <button
            type="button"
            onClick={() => setRetry((n) => n + 1)}
            className="underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0d9488]"
          >
            Retry
          </button>
        </div>
      ) : (
        <ul className="space-y-0.5">
          {state.folders.map((folder) => (
            <li key={folder.id} className="flex items-center gap-1 group">
              <button
                type="button"
                onClick={() => onFolderSelect?.(folder.id)}
                className={[
                  'flex-1 text-left rounded px-2 py-1.5 text-sm transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488]',
                  selectedFolderId === folder.id
                    ? 'font-semibold bg-teal-50'
                    : 'hover:bg-slate-100',
                ].join(' ')}
                style={{
                  color: selectedFolderId === folder.id ? 'var(--wt-teal)' : 'var(--wt-text)',
                }}
                aria-current={selectedFolderId === folder.id ? 'true' : undefined}
              >
                <span className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path
                      d="M1 4 Q1 2 3 2 L5 2 L6 4 L11 4 Q13 4 13 6 L13 11 Q13 13 11 13 L3 13 Q1 13 1 11 Z"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      fill="none"
                    />
                  </svg>
                  <span className="truncate">{folder.name}</span>
                  <span className="text-xs ml-auto" style={{ color: 'var(--wt-text-muted)' }}>
                    {folder.journalCount}
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => void handleDelete(folder.id)}
                disabled={deletingId === folder.id}
                aria-label={`Delete folder ${folder.name}`}
                className={[
                  'opacity-0 group-hover:opacity-100 focus-visible:opacity-100 rounded p-1',
                  'text-red-400 hover:text-red-600 transition-opacity',
                  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500',
                ].join(' ')}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <line
                    x1="2"
                    y1="2"
                    x2="10"
                    y2="10"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <line
                    x1="10"
                    y1="2"
                    x2="2"
                    y2="10"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Create folder form */}
      <form onSubmit={(e) => void handleCreate(e)} className="mt-2">
        <div className="flex gap-1">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New folder"
            maxLength={100}
            aria-label="New folder name"
            className={[
              'flex-1 rounded border px-2 py-1 text-sm',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488] focus-visible:ring-offset-1',
            ].join(' ')}
            style={{ borderColor: 'var(--wt-border)', color: 'var(--wt-text)' }}
          />
          <Button
            type="submit"
            size="sm"
            isLoading={creating}
            disabled={!newName.trim() || creating}
          >
            Add
          </Button>
        </div>
        {createError ? <p className="mt-1 text-xs text-red-600">{createError}</p> : null}
      </form>
    </nav>
  );
}
