'use client';

import { useState, useEffect, useRef, use } from 'react';
import { PostCard } from '@/components/social/PostCard';
import { PostComposer } from '@/components/social/PostComposer';
import { LoadingSkeleton } from '@/components/ui/loading-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { ErrorState } from '@/components/ui/error-state';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/auth/auth-context';
import { apiGet, isOfflineError, isUnauthorizedError } from '@/lib/api-helpers';
import type { PostResponse, PlanetResponse } from '@wildtails/contracts';

type FeedState =
  | { status: 'loading' }
  | { status: 'success'; posts: PostResponse[]; cursor: string | null; hasMore: boolean }
  | { status: 'error'; message: string; offline: boolean; unauthorized: boolean };

export default function PlanetFeedPage({ params }: { params: Promise<{ planetId: string }> }) {
  const { planetId } = use(params);
  const { user } = useAuth();

  const [planet, setPlanet] = useState<PlanetResponse | null>(null);
  const [feedState, setFeedState] = useState<FeedState>({ status: 'loading' });
  const feedStateRef = useRef(setFeedState);
  const [loadingMore, setLoadingMore] = useState(false);
  const [retry, setRetry] = useState(0);

  // Fetch planet info
  useEffect(() => {
    apiGet<PlanetResponse>(`/planets/${planetId}`).then(
      (env) => setPlanet(env.data),
      () => {
        // Non-critical — we'll show ID in header as fallback
      },
    );
  }, [planetId]);

  // Fetch feed
  useEffect(() => {
    let cancelled = false;
    feedStateRef.current({ status: 'loading' });

    apiGet<PostResponse[]>(`/planets/${planetId}/posts?limit=20`).then(
      (env) => {
        if (cancelled) return;
        feedStateRef.current({
          status: 'success',
          posts: Array.isArray(env.data) ? env.data : [],
          cursor: env.meta?.cursor ?? null,
          hasMore: env.meta?.hasMore ?? false,
        });
      },
      (err: unknown) => {
        if (cancelled) return;
        feedStateRef.current({
          status: 'error',
          message: err instanceof Error ? err.message : 'Could not load feed.',
          offline: isOfflineError(err),
          unauthorized: isUnauthorizedError(err),
        });
      },
    );

    return () => {
      cancelled = true;
    };
  }, [planetId, retry]);

  async function handleLoadMore() {
    if (feedState.status !== 'success' || !feedState.cursor || loadingMore) return;
    const cursor = feedState.cursor;
    setLoadingMore(true);
    try {
      const env = await apiGet<PostResponse[]>(
        `/planets/${planetId}/posts?limit=20&cursor=${cursor}`,
      );
      setFeedState((prev) => {
        if (prev.status !== 'success') return prev;
        return {
          ...prev,
          posts: [...prev.posts, ...(Array.isArray(env.data) ? env.data : [])],
          cursor: env.meta?.cursor ?? null,
          hasMore: env.meta?.hasMore ?? false,
        };
      });
    } catch {
      // Silently fail — user can retry.
    } finally {
      setLoadingMore(false);
    }
  }

  function handlePostCreated(post: PostResponse) {
    setFeedState((prev) => {
      if (prev.status !== 'success') return prev;
      return { ...prev, posts: [post, ...prev.posts] };
    });
  }

  function handlePostDeleted(postId: string) {
    setFeedState((prev) => {
      if (prev.status !== 'success') return prev;
      return { ...prev, posts: prev.posts.filter((p) => p.id !== postId) };
    });
  }

  const planetName = planet?.name ?? `Planet ${planetId}`;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--wt-navy)' }}>
            {planetName}
          </h1>
          {planet?.description ? (
            <p className="mt-1 text-sm" style={{ color: 'var(--wt-text-muted)' }}>
              {planet.description}
            </p>
          ) : null}
        </div>
        <a
          href={`/planets/${planetId}/moderation`}
          className="text-xs rounded px-2 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488]"
          style={{ color: 'var(--wt-text-muted)' }}
        >
          Moderation
        </a>
      </div>

      {/* Composer */}
      <PostComposer planetId={planetId} onPostCreated={handlePostCreated} />

      {/* Feed */}
      {feedState.status === 'loading' ? (
        <LoadingSkeleton variant="post" count={4} />
      ) : feedState.status === 'error' ? (
        <ErrorState
          message={feedState.message}
          isOffline={feedState.offline}
          isUnauthorized={feedState.unauthorized}
          onRetry={() => setRetry((n) => n + 1)}
        />
      ) : feedState.posts.length === 0 ? (
        <EmptyState
          title="No posts yet — be the first to share!"
          description="Share a thought, a journal insight, or a goal update with the planet."
          variant="post"
        />
      ) : (
        <div className="flex flex-col gap-4">
          <ul className="flex flex-col gap-4" aria-label="Planet feed">
            {feedState.posts.map((post) => (
              <li key={post.id}>
                <PostCard post={post} currentUserId={user?.userId} onDeleted={handlePostDeleted} />
              </li>
            ))}
          </ul>

          {feedState.hasMore ? (
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
        </div>
      )}
    </div>
  );
}
