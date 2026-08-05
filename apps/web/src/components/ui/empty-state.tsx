'use client';

import React from 'react';
import type { ReactNode } from 'react';

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: ReactNode;
  /** Which icon variant to display. */
  variant?: 'journal' | 'goal' | 'folder' | 'generic';
}

function JournalIcon() {
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <rect
        x="12"
        y="8"
        width="40"
        height="48"
        rx="4"
        stroke="#0d9488"
        strokeWidth="2"
        fill="#f0fdfa"
      />
      <rect x="10" y="10" width="4" height="44" rx="2" fill="#0d9488" opacity="0.3" />
      <line
        x1="20"
        y1="22"
        x2="44"
        y2="22"
        stroke="#1e3a5f"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="20"
        y1="30"
        x2="44"
        y2="30"
        stroke="#1e3a5f"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="20"
        y1="38"
        x2="36"
        y2="38"
        stroke="#1e3a5f"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="48" cy="48" r="10" fill="#f59e0b" />
      <line
        x1="48"
        y1="43"
        x2="48"
        y2="53"
        stroke="#1e3a5f"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="43"
        y1="48"
        x2="53"
        y2="48"
        stroke="#1e3a5f"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GoalIcon() {
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="32" cy="32" r="22" stroke="#0d9488" strokeWidth="2" fill="#f0fdfa" />
      <circle cx="32" cy="32" r="14" stroke="#1e3a5f" strokeWidth="2" fill="none" />
      <circle cx="32" cy="32" r="6" fill="#f59e0b" />
      <line x1="32" y1="4" x2="32" y2="12" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" />
      <line
        x1="32"
        y1="52"
        x2="32"
        y2="60"
        stroke="#0d9488"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line x1="4" y1="32" x2="12" y2="32" stroke="#0d9488" strokeWidth="2" strokeLinecap="round" />
      <line
        x1="52"
        y1="32"
        x2="60"
        y2="32"
        stroke="#0d9488"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M8 20 Q8 14 14 14 L26 14 L30 20 L50 20 Q56 20 56 26 L56 48 Q56 54 50 54 L14 54 Q8 54 8 48 Z"
        stroke="#0d9488"
        strokeWidth="2"
        fill="#f0fdfa"
      />
      <line
        x1="20"
        y1="34"
        x2="44"
        y2="34"
        stroke="#1e3a5f"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <line
        x1="20"
        y1="42"
        x2="36"
        y2="42"
        stroke="#1e3a5f"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GenericIcon() {
  return (
    <svg
      width="64"
      height="64"
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="32" cy="32" r="24" stroke="#0d9488" strokeWidth="2" fill="#f0fdfa" />
      <line
        x1="32"
        y1="20"
        x2="32"
        y2="36"
        stroke="#1e3a5f"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx="32" cy="42" r="2" fill="#1e3a5f" />
    </svg>
  );
}

const ICONS: Record<NonNullable<EmptyStateProps['variant']>, () => React.ReactElement> = {
  journal: JournalIcon,
  goal: GoalIcon,
  folder: FolderIcon,
  generic: GenericIcon,
};

export function EmptyState({ title, description, action, variant = 'generic' }: EmptyStateProps) {
  const Icon = ICONS[variant];
  return (
    <div
      className="flex flex-col items-center gap-4 rounded-xl border border-dashed py-12 px-6 text-center"
      style={{ borderColor: 'var(--wt-border)' }}
    >
      <Icon />
      <div>
        <p className="font-semibold" style={{ color: 'var(--wt-navy)' }}>
          {title}
        </p>
        {description ? (
          <p className="mt-1 text-sm" style={{ color: 'var(--wt-text-muted)' }}>
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div>{action}</div> : null}
    </div>
  );
}
