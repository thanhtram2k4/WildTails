/**
 * Unit tests for ReportDialog.
 *
 * Covers: rendering, form validation, submission, 409 conflict, and ESC to close.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReportDialog } from './ReportDialog';

const mockApiPost = vi.fn();

vi.mock('@/lib/api-helpers', () => ({
  apiPost: (...args: unknown[]) => mockApiPost(...args),
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

beforeEach(() => {
  mockApiPost.mockReset();
});

describe('ReportDialog rendering', () => {
  it('renders dialog with correct role', () => {
    render(<ReportDialog targetType="POST" targetId="post-1" onClose={() => {}} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('renders reason textarea', () => {
    render(<ReportDialog targetType="POST" targetId="post-1" onClose={() => {}} />);
    expect(screen.getByLabelText(/reason/i)).toBeInTheDocument();
  });

  it('submit button is disabled when reason is empty', () => {
    render(<ReportDialog targetType="POST" targetId="post-1" onClose={() => {}} />);
    expect(screen.getByRole('button', { name: /submit report/i })).toBeDisabled();
  });
});

describe('ReportDialog submission', () => {
  it('calls apiPost with correct payload', async () => {
    const user = userEvent.setup();
    mockApiPost.mockResolvedValueOnce({ data: {} });
    render(<ReportDialog targetType="POST" targetId="post-1" onClose={() => {}} />);

    await user.type(screen.getByLabelText(/reason/i), 'Spam content');
    await user.click(screen.getByRole('button', { name: /submit report/i }));

    expect(mockApiPost).toHaveBeenCalledWith('/reports', {
      targetType: 'POST',
      targetId: 'post-1',
      reason: 'Spam content',
      description: undefined,
    });
  });

  it('shows success state after successful submission', async () => {
    const user = userEvent.setup();
    mockApiPost.mockResolvedValueOnce({ data: {} });
    render(<ReportDialog targetType="POST" targetId="post-1" onClose={() => {}} />);

    await user.type(screen.getByLabelText(/reason/i), 'Spam content');
    await user.click(screen.getByRole('button', { name: /submit report/i }));

    await waitFor(() => {
      expect(screen.getByText('Report submitted')).toBeInTheDocument();
    });
  });

  it('shows conflict message on 409', async () => {
    const { ApiError } = await import('@/lib/api-helpers');
    const user = userEvent.setup();
    mockApiPost.mockRejectedValueOnce(new ApiError('Conflict', 409));
    render(<ReportDialog targetType="POST" targetId="post-1" onClose={() => {}} />);

    await user.type(screen.getByLabelText(/reason/i), 'Spam');
    await user.click(screen.getByRole('button', { name: /submit report/i }));

    await waitFor(() => {
      expect(screen.getByText(/you already have a pending report/i)).toBeInTheDocument();
    });
  });
});

describe('ReportDialog close', () => {
  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ReportDialog targetType="POST" targetId="post-1" onClose={onClose} />);

    await user.click(screen.getByRole('button', { name: /close report dialog/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when Escape key is pressed', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ReportDialog targetType="POST" targetId="post-1" onClose={onClose} />);

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledOnce();
  });
});
