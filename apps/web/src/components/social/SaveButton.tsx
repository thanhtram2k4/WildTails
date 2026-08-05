'use client';

import { useState } from 'react';
import { apiPost, apiDelete } from '@/lib/api-helpers';

interface SaveButtonProps {
  postId: string;
  initialSaved?: boolean;
}

export function SaveButton({ postId, initialSaved = false }: SaveButtonProps) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, setPending] = useState(false);

  async function handleToggle() {
    if (pending) return;
    const next = !saved;
    setSaved(next); // optimistic
    setPending(true);
    try {
      if (next) {
        await apiPost(`/posts/${postId}/save`, {});
      } else {
        await apiDelete(`/posts/${postId}/save`);
      }
    } catch {
      setSaved(!next); // revert
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleToggle()}
      disabled={pending}
      aria-pressed={saved}
      aria-label={saved ? 'Remove from saved posts' : 'Save post'}
      className={[
        'inline-flex items-center justify-center rounded p-1.5',
        'transition-colors duration-150 motion-reduce:transition-none',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0d9488] focus-visible:ring-offset-1',
        'disabled:cursor-not-allowed disabled:opacity-60',
        saved ? 'text-[#f59e0b]' : 'text-[#94a3b8] hover:text-[#f59e0b]',
      ].join(' ')}
    >
      {/* Bookmark SVG — filled when saved, outline when not */}
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill={saved ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
      </svg>
    </button>
  );
}
