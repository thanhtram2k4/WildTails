/**
 * Unit tests for PostCard.
 *
 * Verifies rendering, author display, type badges, and delete button visibility.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PostCard } from './PostCard';
import type { PostResponse } from '@wildtails/contracts';

// Mock api-helpers so tests don't make real network calls.
vi.mock('@/lib/api-helpers', () => ({
  apiDelete: vi.fn().mockResolvedValue(undefined),
  apiPost: vi.fn().mockResolvedValue({ data: {} }),
  ApiError: class ApiError extends Error {
    constructor(
      message: string,
      public readonly status: number,
    ) {
      super(message);
      this.name = 'ApiError';
    }
  },
}));

const BASE_POST: PostResponse = {
  id: 'post-1',
  body: 'Hello **world**',
  authorId: 'user-1',
  author: {
    id: 'user-1',
    displayName: 'Alice',
    avatarUrl: null,
  },
  planetId: 'planet-1',
  type: 'ORIGINAL',
  reactionCounts: { LIKE: 3, INSIGHTFUL: 1, SUPPORTIVE: 0, FUNNY: 0 },
  commentCount: 5,
  createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('PostCard rendering', () => {
  it('renders author display name', () => {
    render(<PostCard post={BASE_POST} />);
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('renders author initial fallback when no avatarUrl', () => {
    render(<PostCard post={BASE_POST} />);
    // The initial "A" appears inside the fallback span
    expect(screen.getAllByText('A').length).toBeGreaterThan(0);
  });

  it('renders post body via markdown', () => {
    render(<PostCard post={BASE_POST} />);
    // "Hello " and "world" (bold) are in the document
    expect(screen.getByText(/hello/i)).toBeInTheDocument();
    const bold = document.querySelector('strong');
    expect(bold?.textContent).toBe('world');
  });

  it('renders comment count link', () => {
    render(<PostCard post={BASE_POST} />);
    const link = screen.getByRole('link', { name: /5 comment/i });
    expect(link).toBeInTheDocument();
  });

  it('shows relative timestamp', () => {
    render(<PostCard post={BASE_POST} />);
    expect(screen.getByText(/2h ago/i)).toBeInTheDocument();
  });
});

describe('PostCard type badges', () => {
  it('does NOT show a type badge for ORIGINAL posts', () => {
    render(<PostCard post={BASE_POST} />);
    expect(screen.queryByText('Journal share')).toBeNull();
    expect(screen.queryByText('Goal update')).toBeNull();
  });

  it('shows JOURNAL_SHARE badge', () => {
    render(<PostCard post={{ ...BASE_POST, type: 'JOURNAL_SHARE' }} />);
    expect(screen.getByText('Journal share')).toBeInTheDocument();
  });

  it('shows GOAL_UPDATE badge', () => {
    render(<PostCard post={{ ...BASE_POST, type: 'GOAL_UPDATE' }} />);
    expect(screen.getByText('Goal update')).toBeInTheDocument();
  });
});

describe('PostCard delete button', () => {
  it('shows delete button for the post owner', () => {
    render(<PostCard post={BASE_POST} currentUserId="user-1" />);
    expect(screen.getByRole('button', { name: /delete this post/i })).toBeInTheDocument();
  });

  it('does NOT show delete button for non-owners', () => {
    render(<PostCard post={BASE_POST} currentUserId="user-2" />);
    expect(screen.queryByRole('button', { name: /delete this post/i })).toBeNull();
  });

  it('does NOT show delete button when currentUserId is undefined', () => {
    render(<PostCard post={BASE_POST} />);
    expect(screen.queryByRole('button', { name: /delete this post/i })).toBeNull();
  });
});

describe('PostCard report button', () => {
  it('shows report button for non-owners', () => {
    render(<PostCard post={BASE_POST} currentUserId="user-2" />);
    expect(screen.getByRole('button', { name: /report this post/i })).toBeInTheDocument();
  });

  it('does NOT show report button for the post owner', () => {
    render(<PostCard post={BASE_POST} currentUserId="user-1" />);
    expect(screen.queryByRole('button', { name: /report this post/i })).toBeNull();
  });
});

describe('PostCard save button', () => {
  it('renders save button', () => {
    render(<PostCard post={BASE_POST} />);
    expect(screen.getByRole('button', { name: /save post/i })).toBeInTheDocument();
  });
});

describe('PostCard reaction bar', () => {
  it('renders all four reaction buttons', () => {
    render(<PostCard post={BASE_POST} />);
    expect(screen.getByRole('button', { name: /like/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /insightful/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /supportive/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /funny/i })).toBeInTheDocument();
  });

  it('displays reaction counts', () => {
    render(<PostCard post={BASE_POST} />);
    // LIKE count is 3 — visible in the button label "Like: 3"
    expect(screen.getByRole('button', { name: /like: 3/i })).toBeInTheDocument();
  });
});

describe('PostCard delete flow', () => {
  beforeEach(() => {
    vi.stubGlobal('confirm', () => true);
  });

  it('calls apiDelete and invokes onDeleted callback', async () => {
    const { apiDelete } = await import('@/lib/api-helpers');
    const onDeleted = vi.fn();
    const user = userEvent.setup();

    render(<PostCard post={BASE_POST} currentUserId="user-1" onDeleted={onDeleted} />);

    await user.click(screen.getByRole('button', { name: /delete this post/i }));

    expect(apiDelete).toHaveBeenCalledWith('/posts/post-1');
    // After deletion the card unmounts — confirm by checking onDeleted
    expect(onDeleted).toHaveBeenCalledWith('post-1');
  });
});
