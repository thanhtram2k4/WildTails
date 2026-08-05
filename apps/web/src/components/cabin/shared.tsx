'use client';

export function VisibilityBadge({ visibility }: { visibility: string }) {
  const map: Record<string, { label: string; bg: string; text: string }> = {
    PRIVATE: { label: 'Private', bg: '#f1f5f9', text: '#64748b' },
    PUBLIC: { label: 'Public', bg: '#f0fdfa', text: '#0d9488' },
    SELECTED_USERS: { label: 'Shared', bg: '#fef9c3', text: '#92400e' },
    PLANET_MEMBERS: { label: 'Planet', bg: '#ede9fe', text: '#5b21b6' },
  };
  const style = map[visibility] ?? {
    label: visibility,
    bg: '#f1f5f9',
    text: '#64748b',
  };
  return (
    <span
      className="shrink-0 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {style.label}
    </span>
  );
}

export function ProgressBar({ progress }: { progress: number }) {
  const clamped = Math.max(0, Math.min(100, progress));
  return (
    <div
      className="w-full h-2 rounded-full overflow-hidden"
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${clamped}% complete`}
      style={{ backgroundColor: 'var(--wt-border)' }}
    >
      <div
        className="h-full rounded-full transition-all duration-300"
        style={{
          width: `${clamped}%`,
          backgroundColor: clamped >= 100 ? '#10b981' : 'var(--wt-teal)',
        }}
      />
    </div>
  );
}
