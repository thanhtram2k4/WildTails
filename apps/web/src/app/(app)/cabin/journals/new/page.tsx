'use client';

import Link from 'next/link';
import { JournalEditor } from '@/components/cabin/journal-editor';

export default function NewJournalPage() {
  return (
    <div className="max-w-3xl mx-auto flex flex-col gap-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="text-sm" style={{ color: 'var(--wt-text-muted)' }}>
        <ol className="flex items-center gap-1">
          <li>
            <Link
              href="/cabin"
              className="hover:underline underline-offset-2 rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0d9488]"
              style={{ color: 'var(--wt-teal)' }}
            >
              Cabin
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              href="/cabin/journals"
              className="hover:underline underline-offset-2 rounded focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0d9488]"
              style={{ color: 'var(--wt-teal)' }}
            >
              Journals
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page">New</li>
        </ol>
      </nav>

      <h1 className="text-2xl font-bold" style={{ color: 'var(--wt-navy)' }}>
        New journal entry
      </h1>

      <JournalEditor />
    </div>
  );
}
