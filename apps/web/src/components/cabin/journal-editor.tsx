'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { MarkdownRenderer } from '@/components/markdown-renderer';
import { apiGet, apiPost, apiPatch } from '@/lib/api-helpers';
import type {
  FolderResponse,
  TagResponse,
  GoalResponse,
  Visibility,
  JournalResponse,
} from '@wildtails/contracts';
import { JOURNAL_BODY_MAX_LENGTH, JOURNAL_MAX_TAGS } from '@wildtails/contracts';

interface JournalEditorProps {
  /** When provided, we are editing an existing journal. */
  existing?: JournalResponse;
}

const VISIBILITY_OPTIONS: { value: Visibility; label: string }[] = [
  { value: 'PRIVATE', label: 'Private — only me' },
  { value: 'SELECTED_USERS', label: 'Selected users' },
  { value: 'PLANET_MEMBERS', label: 'Planet members' },
  { value: 'PUBLIC', label: 'Public' },
];

interface Options {
  folders: FolderResponse[];
  tags: TagResponse[];
  goals: GoalResponse[];
}

export function JournalEditor({ existing }: JournalEditorProps) {
  const router = useRouter();

  const [title, setTitle] = useState(existing?.title ?? '');
  const [body, setBody] = useState(existing?.body ?? '');
  const [visibility, setVisibility] = useState<Visibility>(existing?.visibility ?? 'PRIVATE');
  const [folderId, setFolderId] = useState(existing?.folder?.id ?? '');
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    existing?.tags.map((t) => t.id) ?? [],
  );
  const [goalId, setGoalId] = useState(existing?.goal?.id ?? '');

  const [options, setOptions] = useState<Options>({ folders: [], tags: [], goals: [] });

  const [previewMode, setPreviewMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [foldersEnv, tagsEnv, goalsEnv] = await Promise.all([
          apiGet<FolderResponse[]>('/knowledge/folders'),
          apiGet<TagResponse[]>('/knowledge/tags'),
          apiGet<GoalResponse[]>('/knowledge/goals'),
        ]);
        if (!cancelled) {
          setOptions({
            folders: Array.isArray(foldersEnv.data) ? foldersEnv.data : [],
            tags: Array.isArray(tagsEnv.data) ? tagsEnv.data : [],
            goals: Array.isArray(goalsEnv.data) ? goalsEnv.data : [],
          });
        }
      } catch {
        // Non-critical — selectors just won't have options.
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  function toggleTag(tagId: string) {
    setSelectedTagIds((prev) => {
      if (prev.includes(tagId)) {
        return prev.filter((id) => id !== tagId);
      }
      if (prev.length >= JOURNAL_MAX_TAGS) return prev;
      return [...prev, tagId];
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setSaveError('Title is required.');
      return;
    }
    setSaving(true);
    setSaveError(null);

    const payload: Record<string, unknown> = {
      title: title.trim(),
      body: body || undefined,
      visibility,
      folderId: folderId || undefined,
      goalId: goalId || undefined,
      tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
    };

    try {
      if (existing) {
        await apiPatch(`/knowledge/journals/${existing.id}`, payload);
        router.push(`/cabin/journals/${existing.id}`);
      } else {
        const env = await apiPost<JournalResponse>('/knowledge/journals', payload);
        router.push(`/cabin/journals/${env.data.id}`);
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save journal.');
    } finally {
      setSaving(false);
    }
  }

  const inputClass = [
    'w-full rounded-lg border px-3 py-2 text-sm',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488] focus-visible:ring-offset-1',
  ].join(' ');
  const inputStyle = { borderColor: 'var(--wt-border)', color: 'var(--wt-text)' };

  const labelClass = 'block text-xs font-semibold mb-1';
  const labelStyle = { color: 'var(--wt-text-muted)' };

  return (
    <form onSubmit={(e) => void handleSave(e)} className="flex flex-col gap-6">
      {/* Title */}
      <div>
        <label htmlFor="journal-title" className={labelClass} style={labelStyle}>
          Title <span aria-hidden="true">*</span>
        </label>
        <input
          id="journal-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={255}
          required
          placeholder="Journal title"
          className={inputClass}
          style={inputStyle}
          aria-required="true"
          aria-describedby={saveError ? 'journal-save-error' : undefined}
        />
      </div>

      {/* Body with preview toggle */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label htmlFor="journal-body" className={labelClass} style={labelStyle}>
            Body (Markdown)
          </label>
          <button
            type="button"
            onClick={() => setPreviewMode((m) => !m)}
            className="text-xs underline underline-offset-2 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488]"
            style={{ color: 'var(--wt-teal)' }}
            aria-pressed={previewMode}
          >
            {previewMode ? 'Edit' : 'Preview'}
          </button>
        </div>

        {previewMode ? (
          <div
            className="min-h-48 rounded-lg border p-4"
            style={{ borderColor: 'var(--wt-border)', backgroundColor: 'var(--wt-card)' }}
          >
            {body ? (
              <MarkdownRenderer content={body} />
            ) : (
              <p className="text-sm italic" style={{ color: 'var(--wt-text-muted)' }}>
                Nothing to preview yet.
              </p>
            )}
          </div>
        ) : (
          <textarea
            id="journal-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={JOURNAL_BODY_MAX_LENGTH}
            rows={16}
            placeholder="Write in Markdown..."
            className={[inputClass, 'resize-y font-mono'].join(' ')}
            style={inputStyle}
            aria-describedby="journal-body-count"
          />
        )}

        {!previewMode ? (
          <p
            id="journal-body-count"
            className="mt-1 text-right text-xs"
            style={{ color: 'var(--wt-text-muted)' }}
          >
            {body.length.toLocaleString()} / {JOURNAL_BODY_MAX_LENGTH.toLocaleString()}
          </p>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* Visibility */}
        <div>
          <label htmlFor="journal-visibility" className={labelClass} style={labelStyle}>
            Visibility
          </label>
          <select
            id="journal-visibility"
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as Visibility)}
            className={inputClass}
            style={inputStyle}
          >
            {VISIBILITY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* Folder */}
        <div>
          <label htmlFor="journal-folder" className={labelClass} style={labelStyle}>
            Folder
          </label>
          <select
            id="journal-folder"
            value={folderId}
            onChange={(e) => setFolderId(e.target.value)}
            className={inputClass}
            style={inputStyle}
          >
            <option value="">No folder</option>
            {options.folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        {/* Goal */}
        <div>
          <label htmlFor="journal-goal" className={labelClass} style={labelStyle}>
            Linked goal
          </label>
          <select
            id="journal-goal"
            value={goalId}
            onChange={(e) => setGoalId(e.target.value)}
            className={inputClass}
            style={inputStyle}
          >
            <option value="">No goal</option>
            {options.goals.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tags multi-select */}
      {options.tags.length > 0 ? (
        <div>
          <p className={labelClass} style={labelStyle}>
            Tags (select up to {JOURNAL_MAX_TAGS})
          </p>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Select tags">
            {options.tags.map((tag) => {
              const selected = selectedTagIds.includes(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  aria-pressed={selected}
                  className={[
                    'rounded-full px-3 py-1 text-xs font-medium transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488] focus-visible:ring-offset-1',
                  ].join(' ')}
                  style={
                    selected
                      ? { backgroundColor: 'var(--wt-teal)', color: 'white' }
                      : {
                          backgroundColor: '#f1f5f9',
                          color: 'var(--wt-text-muted)',
                          border: '1px solid var(--wt-border)',
                        }
                  }
                >
                  #{tag.name}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Error */}
      {saveError ? (
        <p id="journal-save-error" className="text-sm text-red-600" role="alert">
          {saveError}
        </p>
      ) : null}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button type="submit" isLoading={saving} disabled={saving || !title.trim()}>
          {existing ? 'Save changes' : 'Create journal'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={saving}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
