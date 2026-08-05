'use client';

import { useState } from 'react';
import { MarkdownRenderer } from '@/components/markdown-renderer';
import { Button } from '@/components/ui/button';
import { ReportDialog } from './ReportDialog';
import { apiPost, apiDelete } from '@/lib/api-helpers';
import type { CommentResponse } from '@wildtails/contracts';

/** Returns a relative time string. */
function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

/** Inline reply composer. */
function ReplyComposer({
  postId,
  parentId,
  onSubmitted,
  onCancel,
}: {
  postId: string;
  parentId: string;
  onSubmitted: (comment: CommentResponse) => void;
  onCancel: () => void;
}) {
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setError(null);
    try {
      const env = await apiPost<CommentResponse>(`/posts/${postId}/comments`, {
        body: trimmed,
        postId,
        parentId,
      });
      onSubmitted(env.data);
      setBody('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post reply.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-2 mt-2">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={2000}
        rows={2}
        placeholder="Write a reply..."
        className={[
          'w-full rounded-lg border px-3 py-2 text-sm resize-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488] focus-visible:ring-offset-1',
        ].join(' ')}
        style={{ borderColor: 'var(--wt-border)', color: 'var(--wt-text)' }}
        aria-label="Reply body"
        autoFocus
      />
      {error ? (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button
          type="submit"
          size="sm"
          isLoading={submitting}
          disabled={submitting || !body.trim()}
        >
          Reply
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={submitting}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

/** A single comment row (supports replies one level deep). */
function CommentRow({
  comment,
  postId,
  currentUserId,
  onDeleted,
  replies,
  onReplyAdded,
}: {
  comment: CommentResponse;
  postId: string;
  currentUserId?: string;
  onDeleted: (id: string) => void;
  replies: CommentResponse[];
  onReplyAdded: (reply: CommentResponse) => void;
}) {
  const [showReply, setShowReply] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);

  const isOwner = currentUserId === comment.authorId;

  async function handleDelete() {
    if (!window.confirm('Delete this comment?')) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await apiDelete(`/comments/${comment.id}`);
      setDeleted(true);
      onDeleted(comment.id);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete comment.');
    } finally {
      setDeleting(false);
    }
  }

  if (deleted) return null;

  return (
    <li className="flex flex-col gap-1">
      <div
        className="rounded-lg p-3"
        style={{ backgroundColor: '#f8fafc', border: '1px solid var(--wt-border)' }}
      >
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-xs font-semibold" style={{ color: 'var(--wt-navy)' }}>
            {comment.authorId}
          </span>
          <time
            className="text-xs"
            style={{ color: 'var(--wt-text-muted)' }}
            dateTime={comment.createdAt}
          >
            {relativeTime(comment.createdAt)}
          </time>
        </div>

        <div className="text-sm">
          <MarkdownRenderer content={comment.body} />
        </div>

        <div className="flex items-center gap-2 mt-2">
          <button
            type="button"
            onClick={() => setShowReply((v) => !v)}
            className="text-xs font-medium focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0d9488] rounded"
            style={{ color: 'var(--wt-teal)' }}
            aria-expanded={showReply}
          >
            {showReply ? 'Cancel reply' : 'Reply'}
          </button>

          {!isOwner ? (
            <button
              type="button"
              onClick={() => setShowReport(true)}
              aria-label="Report this comment"
              className="text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0d9488] rounded"
              style={{ color: 'var(--wt-text-muted)' }}
            >
              Report
            </button>
          ) : null}

          {isOwner ? (
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={deleting}
              aria-label="Delete this comment"
              className="text-xs text-red-500 hover:text-red-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-red-500 rounded disabled:opacity-50"
            >
              Delete
            </button>
          ) : null}
        </div>

        {deleteError ? (
          <p className="text-xs text-red-600 mt-1" role="alert">
            {deleteError}
          </p>
        ) : null}

        {showReply ? (
          <ReplyComposer
            postId={postId}
            parentId={comment.id}
            onSubmitted={(reply) => {
              onReplyAdded(reply);
              setShowReply(false);
            }}
            onCancel={() => setShowReply(false)}
          />
        ) : null}
      </div>

      {/* One-level replies */}
      {replies.length > 0 ? (
        <ul className="ml-6 flex flex-col gap-2" aria-label="Replies">
          {replies.map((r) => (
            <li
              key={r.id}
              className="rounded-lg p-3"
              style={{ backgroundColor: '#f1f5f9', border: '1px solid var(--wt-border)' }}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-xs font-semibold" style={{ color: 'var(--wt-navy)' }}>
                  {r.authorId}
                </span>
                <time
                  className="text-xs"
                  style={{ color: 'var(--wt-text-muted)' }}
                  dateTime={r.createdAt}
                >
                  {relativeTime(r.createdAt)}
                </time>
              </div>
              <div className="text-sm">
                <MarkdownRenderer content={r.body} />
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {showReport ? (
        <ReportDialog
          targetType="COMMENT"
          targetId={comment.id}
          onClose={() => setShowReport(false)}
        />
      ) : null}
    </li>
  );
}

/** Top-level comment composer. */
function TopLevelComposer({
  postId,
  onSubmitted,
}: {
  postId: string;
  onSubmitted: (comment: CommentResponse) => void;
}) {
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed) return;
    setSubmitting(true);
    setError(null);
    try {
      const env = await apiPost<CommentResponse>(`/posts/${postId}/comments`, {
        body: trimmed,
        postId,
      });
      onSubmitted(env.data);
      setBody('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post comment.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-2">
      <label
        htmlFor="new-comment"
        className="block text-xs font-semibold"
        style={{ color: 'var(--wt-text-muted)' }}
      >
        Add a comment
      </label>
      <textarea
        id="new-comment"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={2000}
        rows={3}
        placeholder="Write a comment..."
        className={[
          'w-full rounded-lg border px-3 py-2 text-sm resize-y',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488] focus-visible:ring-offset-1',
        ].join(' ')}
        style={{ borderColor: 'var(--wt-border)', color: 'var(--wt-text)' }}
      />
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <div className="flex justify-end">
        <Button
          type="submit"
          size="sm"
          isLoading={submitting}
          disabled={submitting || !body.trim()}
        >
          Post comment
        </Button>
      </div>
    </form>
  );
}

interface CommentThreadProps {
  postId: string;
  initialComments: CommentResponse[];
  currentUserId?: string;
  hasMore: boolean;
  onLoadMore: () => void;
  loadingMore: boolean;
}

export function CommentThread({
  postId,
  initialComments,
  currentUserId,
  hasMore,
  onLoadMore,
  loadingMore,
}: CommentThreadProps) {
  const [comments, setComments] = useState<CommentResponse[]>(initialComments);

  function handleDeleted(id: string) {
    setComments((prev) => prev.filter((c) => c.id !== id));
  }

  function handleNewComment(comment: CommentResponse) {
    setComments((prev) => [comment, ...prev]);
  }

  function handleReplyAdded(reply: CommentResponse) {
    setComments((prev) => [...prev, reply]);
  }

  // Separate top-level from replies
  const topLevel = comments.filter((c) => !c.parentId);
  const getReplies = (parentId: string) => comments.filter((c) => c.parentId === parentId);

  return (
    <section aria-label="Comments" className="flex flex-col gap-4">
      <h2 className="text-base font-semibold" style={{ color: 'var(--wt-navy)' }}>
        Comments ({comments.length})
      </h2>

      <TopLevelComposer postId={postId} onSubmitted={handleNewComment} />

      {topLevel.length === 0 ? (
        <p className="text-sm text-center py-4" style={{ color: 'var(--wt-text-muted)' }}>
          No comments yet. Be the first to comment.
        </p>
      ) : (
        <ul className="flex flex-col gap-3" aria-label="Comment list">
          {topLevel.map((c) => (
            <CommentRow
              key={c.id}
              comment={c}
              postId={postId}
              currentUserId={currentUserId}
              onDeleted={handleDeleted}
              replies={getReplies(c.id)}
              onReplyAdded={handleReplyAdded}
            />
          ))}
        </ul>
      )}

      {hasMore ? (
        <div className="flex justify-center">
          <Button variant="secondary" size="sm" isLoading={loadingMore} onClick={onLoadMore}>
            Load more comments
          </Button>
        </div>
      ) : null}
    </section>
  );
}
