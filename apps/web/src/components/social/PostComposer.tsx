'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PublishFromJournalDialog } from './PublishFromJournalDialog';
import { apiPost, apiGet } from '@/lib/api-helpers';
import type { PostResponse, PostType, GoalResponse } from '@wildtails/contracts';

type PostTypeOption = { value: PostType; label: string };

const POST_TYPE_OPTIONS: PostTypeOption[] = [
  { value: 'ORIGINAL', label: 'Original post' },
  { value: 'JOURNAL_SHARE', label: 'Share from journal' },
  { value: 'GOAL_UPDATE', label: 'Goal update' },
];

interface PostComposerProps {
  planetId: string;
  onPostCreated: (post: PostResponse) => void;
}

type GoalListState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; goals: GoalResponse[] }
  | { status: 'error'; message: string };

export function PostComposer({ planetId, onPostCreated }: PostComposerProps) {
  const [body, setBody] = useState('');
  const [postType, setPostType] = useState<PostType>('ORIGINAL');
  const [selectedGoalId, setSelectedGoalId] = useState('');
  const [goalState, setGoalState] = useState<GoalListState>({ status: 'idle' });
  const [showJournalDialog, setShowJournalDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const BODY_MAX = 5000;
  const bodyCharsLeft = BODY_MAX - body.length;

  async function loadGoals() {
    if (goalState.status === 'success' || goalState.status === 'loading') return;
    setGoalState({ status: 'loading' });
    try {
      const env = await apiGet<GoalResponse[]>('/goals?limit=50');
      setGoalState({
        status: 'success',
        goals: Array.isArray(env.data) ? env.data : [],
      });
    } catch (err) {
      setGoalState({
        status: 'error',
        message: err instanceof Error ? err.message : 'Failed to load goals.',
      });
    }
  }

  function handleTypeChange(type: PostType) {
    setPostType(type);
    setSelectedGoalId('');
    setSubmitError(null);

    if (type === 'GOAL_UPDATE') {
      void loadGoals();
    }

    if (type === 'JOURNAL_SHARE') {
      setShowJournalDialog(true);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    if (postType === 'JOURNAL_SHARE') {
      // Journal share goes through the dialog
      setShowJournalDialog(true);
      return;
    }
    await submitPost(trimmed, postType, undefined, selectedGoalId || undefined);
  }

  async function submitPost(postBody: string, type: PostType, journalId?: string, goalId?: string) {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const env = await apiPost<PostResponse>('/posts', {
        body: postBody,
        planetId,
        type,
        journalId,
        goalId,
      });
      onPostCreated(env.data);
      setBody('');
      setPostType('ORIGINAL');
      setSelectedGoalId('');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create post.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleJournalConfirm(postBody: string, journalId: string) {
    await submitPost(postBody, 'JOURNAL_SHARE', journalId);
  }

  const inputClass = [
    'w-full rounded-lg border px-3 py-2 text-sm',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488] focus-visible:ring-offset-1',
  ].join(' ');
  const inputStyle = { borderColor: 'var(--wt-border)', color: 'var(--wt-text)' };

  return (
    <>
      <div
        className="rounded-xl border p-4 flex flex-col gap-4"
        style={{ backgroundColor: 'var(--wt-card)', borderColor: 'var(--wt-border)' }}
      >
        <h2 className="text-base font-semibold" style={{ color: 'var(--wt-navy)' }}>
          Create a post
        </h2>

        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-3">
          {/* Type selector */}
          <div>
            <label
              htmlFor="post-type"
              className="block text-xs font-semibold mb-1"
              style={{ color: 'var(--wt-text-muted)' }}
            >
              Post type
            </label>
            <select
              id="post-type"
              value={postType}
              onChange={(e) => handleTypeChange(e.target.value as PostType)}
              className={inputClass}
              style={inputStyle}
            >
              {POST_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          {/* Goal picker — visible when type is GOAL_UPDATE */}
          {postType === 'GOAL_UPDATE' ? (
            <div>
              <label
                htmlFor="post-goal"
                className="block text-xs font-semibold mb-1"
                style={{ color: 'var(--wt-text-muted)' }}
              >
                Select a goal <span aria-hidden="true">*</span>
              </label>
              {goalState.status === 'loading' ? (
                <div
                  className="h-9 rounded-lg border"
                  style={{ borderColor: 'var(--wt-border)', backgroundColor: '#f1f5f9' }}
                  aria-busy="true"
                  aria-label="Loading goals"
                />
              ) : goalState.status === 'error' ? (
                <p className="text-sm text-red-600" role="alert">
                  {goalState.message}
                </p>
              ) : (
                <select
                  id="post-goal"
                  value={selectedGoalId}
                  onChange={(e) => setSelectedGoalId(e.target.value)}
                  className={inputClass}
                  style={inputStyle}
                  aria-required="true"
                >
                  <option value="">— Choose a goal —</option>
                  {goalState.status === 'success'
                    ? goalState.goals.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.title}
                        </option>
                      ))
                    : null}
                </select>
              )}
            </div>
          ) : null}

          {/* Body — hidden for JOURNAL_SHARE (handled by dialog) */}
          {postType !== 'JOURNAL_SHARE' ? (
            <div>
              <label
                htmlFor="post-body"
                className="block text-xs font-semibold mb-1"
                style={{ color: 'var(--wt-text-muted)' }}
              >
                {postType === 'GOAL_UPDATE' ? 'Update message' : "What's on your mind?"}
              </label>
              <textarea
                id="post-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={BODY_MAX}
                rows={4}
                placeholder={
                  postType === 'GOAL_UPDATE'
                    ? 'Share your progress...'
                    : 'Write something to share with the planet...'
                }
                className={[inputClass, 'resize-y'].join(' ')}
                style={inputStyle}
                aria-describedby="post-body-count"
                aria-required="true"
              />
              <p
                id="post-body-count"
                className={[
                  'mt-0.5 text-right text-xs',
                  bodyCharsLeft < 100 ? 'text-amber-600' : '',
                ].join(' ')}
                style={bodyCharsLeft >= 100 ? { color: 'var(--wt-text-muted)' } : undefined}
                aria-live="polite"
              >
                {body.length}/{BODY_MAX}
              </p>
            </div>
          ) : (
            <div
              className="rounded-lg p-3 text-sm"
              style={{ backgroundColor: '#f0fdfa', border: '1px solid #0d9488' }}
            >
              <p style={{ color: 'var(--wt-navy)' }}>
                Click &quot;Open journal picker&quot; below to choose a journal and write your
                message.
              </p>
            </div>
          )}

          {submitError ? (
            <p className="text-sm text-red-600" role="alert">
              {submitError}
            </p>
          ) : null}

          <div className="flex justify-end">
            {postType === 'JOURNAL_SHARE' ? (
              <Button
                type="button"
                size="sm"
                onClick={() => setShowJournalDialog(true)}
                disabled={submitting}
              >
                Open journal picker
              </Button>
            ) : (
              <Button
                type="submit"
                size="sm"
                isLoading={submitting}
                disabled={
                  submitting || !body.trim() || (postType === 'GOAL_UPDATE' && !selectedGoalId)
                }
              >
                Post
              </Button>
            )}
          </div>
        </form>
      </div>

      {showJournalDialog ? (
        <PublishFromJournalDialog
          planetId={planetId}
          onConfirm={handleJournalConfirm}
          onClose={() => {
            setShowJournalDialog(false);
            // Reset type back to ORIGINAL if user closed without posting
            if (!submitting) setPostType('ORIGINAL');
          }}
        />
      ) : null}
    </>
  );
}
