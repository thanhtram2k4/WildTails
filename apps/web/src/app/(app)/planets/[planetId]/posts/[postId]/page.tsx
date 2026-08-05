'use client';

import { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';
import { PostCard } from '@/components/social/PostCard';
import { CommentThread } from '@/components/social/CommentThread';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { ErrorState } from '@/components/ui/error-state';
import { Skeleton } from '@/components/ui/loading-skeleton';
import { useAuth } from '@/lib/auth/auth-context';
import { apiGet, isOfflineError, isUnauthorizedError } from '@/lib/api-helpers';
import type { PostResponse, CommentResponse } from '@wildtails/contracts';

type PostState =
  | { status: 'loading' }
  | { status: 'success'; post: PostResponse }
  | { status: 'error'; message: string; offline: boolean; unauthorized: boolean };

type CommentsState =
  | { status: 'loading' }
  | { status: 'success'; comments: CommentResponse[]; cursor: string | null; hasMore: boolean }
  | { status: 'error'; message: string };

export default function PostDetailPage({
  params,
}: {
  params: Promise<{ planetId: string; postId: string }>;
}) {
  const { planetId, postId } = use(params);
  const { user } = useAuth();

  const [postState, setPostState] = useState<PostState>({ status: 'loading' });
  const [commentsState, setCommentsState] = useState<CommentsState>({ status: 'loading' });
  const postRetryRef = useRef(0);
  const [retry, setRetry] = useState(0);
  const [loadingMoreComments, setLoadingMoreComments] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadPost() {
      setPostState({ status: 'loading' });
      try {
        const env = await apiGet<PostResponse>(`/posts/${postId}`);
        if (!cancelled) setPostState({ status: 'success', post: env.data });
      } catch (err: unknown) {
        if (!cancelled) {
          setPostState({
            status: 'error',
            message: err instanceof Error ? err.message : 'Could not load post.',
            offline: isOfflineError(err),
            unauthorized: isUnauthorizedError(err),
          });
        }
      }
    }
    void loadPost();
    return () => {
      cancelled = true;
    };
  }, [postId, retry]);

  useEffect(() => {
    let cancelled = false;
    async function loadComments() {
      setCommentsState({ status: 'loading' });
      try {
        const env = await apiGet<CommentResponse[]>(`/posts/${postId}/comments?limit=20`);
        if (!cancelled) {
          setCommentsState({
            status: 'success',
            comments: Array.isArray(env.data) ? env.data : [],
            cursor: env.meta?.cursor ?? null,
            hasMore: env.meta?.hasMore ?? false,
          });
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setCommentsState({
            status: 'error',
            message: err instanceof Error ? err.message : 'Could not load comments.',
          });
        }
      }
    }
    void loadComments();
    return () => {
      cancelled = true;
    };
  }, [postId, retry]);

  async function handleLoadMoreComments() {
    if (commentsState.status !== 'success' || !commentsState.cursor || loadingMoreComments) return;
    const cursor = commentsState.cursor;
    setLoadingMoreComments(true);
    try {
      const env = await apiGet<CommentResponse[]>(
        `/posts/${postId}/comments?limit=20&cursor=${cursor}`,
      );
      setCommentsState((prev) => {
        if (prev.status !== 'success') return prev;
        return {
          ...prev,
          comments: [...prev.comments, ...(Array.isArray(env.data) ? env.data : [])],
          cursor: env.meta?.cursor ?? null,
          hasMore: env.meta?.hasMore ?? false,
        };
      });
    } catch {
      // Silently fail
    } finally {
      setLoadingMoreComments(false);
    }
  }

  // Suppress unused ref warning
  void postRetryRef;

  return (
    <div className="flex flex-col gap-6">
      {/* Back link */}
      <nav aria-label="Breadcrumb">
        <Link
          href={`/planets/${planetId}/feed`}
          className="text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488] rounded"
          style={{ color: 'var(--wt-teal)' }}
        >
          &larr; Back to feed
        </Link>
      </nav>

      {/* Post */}
      {postState.status === 'loading' ? (
        <div className="space-y-3" role="status" aria-label="Loading post">
          <LoadingSkeleton variant="post" count={1} />
        </div>
      ) : postState.status === 'error' ? (
        <ErrorState
          message={postState.message}
          isOffline={postState.offline}
          isUnauthorized={postState.unauthorized}
          onRetry={() => setRetry((n) => n + 1)}
        />
      ) : (
        <PostCard post={postState.post} currentUserId={user?.userId} />
      )}

      <hr style={{ borderColor: 'var(--wt-border)' }} />

      {/* Comments */}
      {commentsState.status === 'loading' ? (
        <div className="space-y-3" role="status" aria-label="Loading comments">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col gap-2 rounded-lg p-3"
              style={{ border: '1px solid var(--wt-border)' }}
              aria-hidden="true"
            >
              <div className="flex gap-2 items-center">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-16 ml-auto" />
              </div>
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-3/4" />
            </div>
          ))}
        </div>
      ) : commentsState.status === 'error' ? (
        <ErrorState message={commentsState.message} onRetry={() => setRetry((n) => n + 1)} />
      ) : (
        <CommentThread
          postId={postId}
          initialComments={commentsState.comments}
          currentUserId={user?.userId}
          hasMore={commentsState.hasMore}
          onLoadMore={() => void handleLoadMoreComments()}
          loadingMore={loadingMoreComments}
        />
      )}
    </div>
  );
}
