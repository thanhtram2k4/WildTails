'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MarkdownRenderer } from '@/components/markdown-renderer';
import { ReactionBar } from './ReactionBar';
import { SaveButton } from './SaveButton';
import { ReportDialog } from './ReportDialog';
import { apiDelete } from '@/lib/api-helpers';
import type { PostResponse, ReactionType } from '@wildtails/contracts';

/** Returns a relative time string (e.g. "2h ago", "3d ago"). */
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

/** Author avatar — circle with initial fallback. */
function AuthorAvatar({
  displayName,
  avatarUrl,
}: {
  displayName: string;
  avatarUrl?: string | null;
}) {
  const initial = displayName.charAt(0).toUpperCase();
  if (avatarUrl) {
    return (
      <Image
        src={avatarUrl}
        alt={displayName}
        width={36}
        height={36}
        className="rounded-full object-cover shrink-0"
        style={{ border: '2px solid var(--wt-border)' }}
        unoptimized
      />
    );
  }
  return (
    <span
      className="flex items-center justify-center rounded-full text-sm font-bold shrink-0"
      style={{
        width: 36,
        height: 36,
        backgroundColor: '#e0f2fe',
        color: 'var(--wt-navy)',
        border: '2px solid var(--wt-border)',
      }}
      aria-hidden="true"
    >
      {initial}
    </span>
  );
}

const POST_TYPE_LABELS: Record<string, string> = {
  JOURNAL_SHARE: 'Journal share',
  GOAL_UPDATE: 'Goal update',
};

interface PostCardProps {
  post: PostResponse;
  currentUserId?: string;
  /** If provided, delete removes the card from this setter. */
  onDeleted?: (postId: string) => void;
}

export function PostCard({ post, currentUserId, onDeleted }: PostCardProps) {
  const [showReport, setShowReport] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const isOwner = currentUserId === post.authorId;
  const postTypeBadge = post.type !== 'ORIGINAL' ? POST_TYPE_LABELS[post.type] : null;

  // Build initial reaction counts as Record<ReactionType, number>
  const initialCounts: Record<ReactionType, number> = Object.assign(
    { LIKE: 0, INSIGHTFUL: 0, SUPPORTIVE: 0, FUNNY: 0 },
    post.reactionCounts,
  );

  async function handleDelete() {
    if (!window.confirm('Delete this post? This cannot be undone.')) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await apiDelete(`/posts/${post.id}`);
      setDeleted(true);
      onDeleted?.(post.id);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete post.');
    } finally {
      setDeleting(false);
    }
  }

  if (deleted) return null;

  return (
    <>
      <article
        className="rounded-xl border p-4 flex flex-col gap-3"
        style={{ backgroundColor: 'var(--wt-card)', borderColor: 'var(--wt-border)' }}
        aria-label={`Post by ${post.author.displayName}`}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <AuthorAvatar displayName={post.author.displayName} avatarUrl={post.author.avatarUrl} />
            <div>
              <p
                className="text-sm font-semibold leading-tight"
                style={{ color: 'var(--wt-navy)' }}
              >
                {post.author.displayName}
              </p>
              <p className="text-xs" style={{ color: 'var(--wt-text-muted)' }}>
                <time dateTime={post.createdAt}>{relativeTime(post.createdAt)}</time>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {postTypeBadge ? (
              <span
                className="rounded-full px-2 py-0.5 text-xs font-medium"
                style={{ backgroundColor: '#fef9c3', color: '#92400e' }}
              >
                {postTypeBadge}
              </span>
            ) : null}
          </div>
        </div>

        {/* Body */}
        <div className="text-sm">
          <MarkdownRenderer content={post.body} />
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          {/* Reactions */}
          <ReactionBar postId={post.id} initialCounts={initialCounts} />

          <div className="flex items-center gap-1 ml-auto">
            {/* Comment count link */}
            <Link
              href={`/planets/${post.planetId}/posts/${post.id}`}
              className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488]"
              style={{ color: 'var(--wt-text-muted)' }}
              aria-label={`${post.commentCount} comment${post.commentCount !== 1 ? 's' : ''} — view post`}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              {post.commentCount}
            </Link>

            {/* Save */}
            <SaveButton postId={post.id} />

            {/* Report */}
            {!isOwner ? (
              <button
                type="button"
                onClick={() => setShowReport(true)}
                aria-label="Report this post"
                className="inline-flex items-center justify-center rounded p-1.5 text-[#94a3b8] hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488] focus-visible:ring-offset-1 transition-colors duration-150 motion-reduce:transition-none"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                  <line x1="4" y1="22" x2="4" y2="15" />
                </svg>
              </button>
            ) : null}

            {/* Delete (owner only) */}
            {isOwner ? (
              <button
                type="button"
                onClick={() => void handleDelete()}
                disabled={deleting}
                aria-label="Delete this post"
                className="inline-flex items-center justify-center rounded p-1.5 text-[#94a3b8] hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 transition-colors duration-150 motion-reduce:transition-none disabled:opacity-50"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6" />
                  <path d="M14 11v6" />
                  <path d="M9 6V4h6v2" />
                </svg>
              </button>
            ) : null}
          </div>
        </div>

        {deleteError ? (
          <p className="text-sm text-red-600" role="alert">
            {deleteError}
          </p>
        ) : null}
      </article>

      {showReport ? (
        <ReportDialog targetType="POST" targetId={post.id} onClose={() => setShowReport(false)} />
      ) : null}
    </>
  );
}
