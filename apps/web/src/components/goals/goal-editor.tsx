'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { apiPost, apiPatch } from '@/lib/api-helpers';
import type { GoalResponse } from '@wildtails/contracts';

interface GoalEditorProps {
  existing?: GoalResponse;
}

export function GoalEditor({ existing }: GoalEditorProps) {
  const router = useRouter();

  const [title, setTitle] = useState(existing?.title ?? '');
  const [description, setDescription] = useState(existing?.description ?? '');
  const [deadline, setDeadline] = useState(
    existing?.deadline ? existing.deadline.slice(0, 10) : '',
  );
  const [progress, setProgress] = useState(existing?.progress ?? 0);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      setSaveError('Title is required.');
      return;
    }
    setSaving(true);
    setSaveError(null);

    try {
      if (existing) {
        const payload: Record<string, unknown> = {
          title: title.trim(),
          description: description || undefined,
          deadline: deadline ? new Date(deadline).toISOString() : undefined,
          progress,
        };
        await apiPatch(`/knowledge/goals/${existing.id}`, payload);
        router.push(`/goals/${existing.id}`);
      } else {
        const payload: Record<string, unknown> = {
          title: title.trim(),
          description: description || undefined,
          deadline: deadline ? new Date(deadline).toISOString() : undefined,
        };
        const env = await apiPost<GoalResponse>('/knowledge/goals', payload);
        router.push(`/goals/${env.data.id}`);
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save goal.');
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
        <label htmlFor="goal-title" className={labelClass} style={labelStyle}>
          Title <span aria-hidden="true">*</span>
        </label>
        <input
          id="goal-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={255}
          required
          placeholder="Goal title"
          className={inputClass}
          style={inputStyle}
          aria-required="true"
          aria-describedby={saveError ? 'goal-save-error' : undefined}
        />
      </div>

      {/* Description */}
      <div>
        <label htmlFor="goal-description" className={labelClass} style={labelStyle}>
          Description
        </label>
        <textarea
          id="goal-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          placeholder="Describe your goal..."
          className={[inputClass, 'resize-y'].join(' ')}
          style={inputStyle}
        />
      </div>

      {/* Deadline */}
      <div>
        <label htmlFor="goal-deadline" className={labelClass} style={labelStyle}>
          Deadline (optional)
        </label>
        <input
          id="goal-deadline"
          type="date"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
          min={new Date().toISOString().slice(0, 10)}
          className={inputClass}
          style={inputStyle}
        />
      </div>

      {/* Progress — only shown when editing */}
      {existing !== undefined ? (
        <div>
          <label htmlFor="goal-progress" className={labelClass} style={labelStyle}>
            Progress: <strong style={{ color: 'var(--wt-navy)' }}>{progress}%</strong>
          </label>
          <input
            id="goal-progress"
            type="range"
            min={0}
            max={100}
            step={1}
            value={progress}
            onChange={(e) => setProgress(Number(e.target.value))}
            className="w-full accent-[#0d9488] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488] focus-visible:ring-offset-2 rounded"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
          />
          {/* Visual progress bar */}
          <div
            className="mt-2 w-full rounded-full overflow-hidden"
            style={{ backgroundColor: '#e2e8f0', height: '8px' }}
          >
            <div
              className="h-full rounded-full transition-all duration-150 motion-reduce:transition-none"
              style={{ width: `${progress}%`, backgroundColor: 'var(--wt-teal)' }}
            />
          </div>
        </div>
      ) : null}

      {/* Error */}
      {saveError ? (
        <p id="goal-save-error" className="text-sm text-red-600" role="alert">
          {saveError}
        </p>
      ) : null}

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <Button type="submit" isLoading={saving} disabled={saving || !title.trim()}>
          {existing ? 'Save changes' : 'Create goal'}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={saving}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
