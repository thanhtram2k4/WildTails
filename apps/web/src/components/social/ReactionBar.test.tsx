/**
 * Unit tests for ReactionBar.
 *
 * Covers: initial counts, optimistic toggle, aria-pressed state.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReactionBar } from './ReactionBar';

const mockApiPost = vi.fn().mockResolvedValue({ data: {} });

vi.mock('@/lib/api-helpers', () => ({
  apiPost: (...args: unknown[]) => mockApiPost(...args),
}));

const initialCounts = { LIKE: 2, INSIGHTFUL: 0, SUPPORTIVE: 1, FUNNY: 0 };

describe('ReactionBar rendering', () => {
  it('renders all four reaction types', () => {
    render(<ReactionBar postId="p1" initialCounts={initialCounts} />);
    expect(screen.getByRole('button', { name: /like/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /insightful/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /supportive/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /funny/i })).toBeInTheDocument();
  });

  it('displays non-zero counts', () => {
    render(<ReactionBar postId="p1" initialCounts={initialCounts} />);
    expect(screen.getByRole('button', { name: /like: 2/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /supportive: 1/i })).toBeInTheDocument();
  });

  it('starts with no reaction pressed when no initialUserReaction', () => {
    render(<ReactionBar postId="p1" initialCounts={initialCounts} />);
    const likeBtn = screen.getByRole('button', { name: /like/i });
    expect(likeBtn.getAttribute('aria-pressed')).toBe('false');
  });

  it('marks initialUserReaction as pressed', () => {
    render(<ReactionBar postId="p1" initialCounts={initialCounts} initialUserReaction="LIKE" />);
    const likeBtn = screen.getByRole('button', { name: /like/i });
    expect(likeBtn.getAttribute('aria-pressed')).toBe('true');
  });
});

describe('ReactionBar optimistic update', () => {
  it('increments count and sets aria-pressed when clicking a reaction', async () => {
    const user = userEvent.setup();
    render(<ReactionBar postId="p1" initialCounts={initialCounts} />);

    const insightfulBtn = screen.getByRole('button', { name: /insightful/i });
    await user.click(insightfulBtn);

    // Optimistic: count goes from 0 to 1
    expect(screen.getByRole('button', { name: /insightful: 1/i })).toBeInTheDocument();
    expect(insightfulBtn.getAttribute('aria-pressed')).toBe('true');
  });

  it('calls apiPost with correct payload', async () => {
    const user = userEvent.setup();
    mockApiPost.mockResolvedValueOnce({ data: {} });
    render(<ReactionBar postId="p1" initialCounts={initialCounts} />);

    await user.click(screen.getByRole('button', { name: /funny/i }));

    expect(mockApiPost).toHaveBeenCalledWith('/posts/p1/reactions', {
      postId: 'p1',
      type: 'FUNNY',
    });
  });

  it('toggles off when same reaction clicked twice', async () => {
    const user = userEvent.setup();
    render(<ReactionBar postId="p1" initialCounts={initialCounts} initialUserReaction="LIKE" />);

    const likeBtn = screen.getByRole('button', { name: /like/i });
    await user.click(likeBtn);

    // LIKE count drops from 2 to 1 (optimistic)
    await waitFor(() => {
      expect(likeBtn.getAttribute('aria-pressed')).toBe('false');
    });
  });
});

describe('ReactionBar reverts on error', () => {
  it('reverts optimistic update when API fails', async () => {
    const user = userEvent.setup();
    mockApiPost.mockRejectedValueOnce(new Error('Network error'));
    render(<ReactionBar postId="p1" initialCounts={initialCounts} />);

    const insightfulBtn = screen.getByRole('button', { name: /insightful/i });
    await user.click(insightfulBtn);

    // Wait for the revert to happen after the failed API call
    await waitFor(() => {
      expect(insightfulBtn.getAttribute('aria-pressed')).toBe('false');
    });
  });
});
