'use client';

import Link from 'next/link';
import { GoalEditor } from '@/components/goals/goal-editor';

export default function NewGoalPage() {
  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="text-sm" style={{ color: 'var(--wt-text-muted)' }}>
        <ol className="flex items-center gap-1">
          <li>
            <Link
              href="/goals"
              className="hover:underline underline-offset-2 rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0d9488]"
              style={{ color: 'var(--wt-teal)' }}
            >
              Goals
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">New</li>
        </ol>
      </nav>

      <h1 className="text-2xl font-bold" style={{ color: 'var(--wt-navy)' }}>
        New goal
      </h1>

      <GoalEditor />
    </div>
  );
}
