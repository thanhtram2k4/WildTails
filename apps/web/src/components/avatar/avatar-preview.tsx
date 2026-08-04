'use client';

import type { AvatarConfig } from '@wildtails/contracts';

interface AvatarPreviewProps {
  config: AvatarConfig;
  size?: number;
  className?: string;
}

/** Background colors per option */
const BG_COLORS: Record<string, string> = {
  none: '#18181b',
  stars: '#0f0f2e',
  planets: '#1a0a2e',
  nebula: '#1a0020',
  forest: '#0a1f0a',
};

/** Fur colors per option */
const FUR_COLORS: Record<string, string> = {
  orange: '#f97316',
  black: '#27272a',
  white: '#f4f4f5',
  gray: '#71717a',
  calico: '#d97706',
  tuxedo: '#1c1917',
};

/** Accent color for eyes */
const EYE_SHAPES: Record<string, string> = {
  round: 'M16,14 a2,2 0 1,0 4,0 a2,2 0 1,0 -4,0 M28,14 a2,2 0 1,0 4,0 a2,2 0 1,0 -4,0',
  almond: 'M15,15 Q18,12 21,15 Q18,18 15,15 M27,15 Q30,12 33,15 Q30,18 27,15',
  wink: 'M15,14 Q18,11 21,14 M28,14 a2,2 0 1,0 4,0 a2,2 0 1,0 -4,0',
  sleepy: 'M15,16 Q18,13 21,16 M27,16 Q30,13 33,16',
};

/** Base shape paths */
const BASE_PATHS: Record<string, string> = {
  'cat-round':
    'M24,8 C14,8 8,16 8,24 C8,34 14,40 24,40 C34,40 40,34 40,24 C40,16 34,8 24,8 Z M18,10 L15,4 M30,10 L33,4',
  'cat-slim':
    'M24,6 C16,6 10,16 10,24 C10,35 16,42 24,42 C32,42 38,35 38,24 C38,16 32,6 24,6 Z M19,8 L17,2 M29,8 L31,2',
  'cat-fluffy':
    'M24,7 C12,7 6,17 6,25 C6,36 13,43 24,43 C35,43 42,36 42,25 C42,17 36,7 24,7 Z M17,9 L14,3 M31,9 L34,3',
};

/** Outfit indicator badge color */
const OUTFIT_COLORS: Record<string, string | null> = {
  none: null,
  astronaut: '#94a3b8',
  explorer: '#78350f',
  scholar: '#1e3a5f',
  captain: '#7f1d1d',
};

/** Accessory indicator */
const ACCESSORY_COLORS: Record<string, string | null> = {
  none: null,
  glasses: '#a1a1aa',
  scarf: '#dc2626',
  hat: '#292524',
  earring: '#fbbf24',
};

/**
 * Minimal SVG-based avatar renderer.
 * Each layer is a colored shape stacked in order.
 * Placeholder art — visual sign-off required from design.
 */
export function AvatarPreview({ config, size = 80, className = '' }: AvatarPreviewProps) {
  const bgColor = BG_COLORS[config.background] ?? '#18181b';
  const furColor = FUR_COLORS[config.fur] ?? '#a1a1aa';
  const eyePath = EYE_SHAPES[config.eyes] ?? EYE_SHAPES['round'];
  const basePath = BASE_PATHS[config.base] ?? BASE_PATHS['cat-round'];
  const outfitColor = OUTFIT_COLORS[config.outfit] ?? null;
  const accessoryColor = ACCESSORY_COLORS[config.accessory] ?? null;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label={`Avatar: ${config.base} cat, ${config.fur} fur, ${config.eyes} eyes${config.outfit !== 'none' ? `, ${config.outfit} outfit` : ''}${config.accessory !== 'none' ? `, ${config.accessory} accessory` : ''}`}
      className={className}
      style={{ display: 'block', borderRadius: '50%', background: bgColor }}
    >
      {/* Background decoration dots for non-none backgrounds */}
      {config.background !== 'none' ? (
        <g opacity="0.4" fill="white">
          <circle cx="8" cy="8" r="1" />
          <circle cx="40" cy="12" r="0.8" />
          <circle cx="6" cy="38" r="0.6" />
          <circle cx="44" cy="36" r="0.9" />
          <circle cx="24" cy="4" r="0.7" />
        </g>
      ) : null}

      {/* Cat body */}
      <path d={basePath} fill={furColor} stroke="rgba(0,0,0,0.3)" strokeWidth="0.5" />

      {/* Muzzle */}
      <ellipse cx="24" cy="26" rx="5" ry="3.5" fill="rgba(255,255,255,0.25)" />

      {/* Eyes */}
      <path d={eyePath} fill="none" stroke="#1c1917" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="18" cy="14" r="1" fill="#1c1917" opacity="0.8" />
      <circle cx="30" cy="14" r="1" fill="#1c1917" opacity="0.8" />

      {/* Nose */}
      <path d="M23,22 L24,23 L25,22" fill="#f9a8d4" stroke="none" />

      {/* Whiskers */}
      <line x1="10" y1="22" x2="19" y2="23" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5" />
      <line x1="10" y1="25" x2="19" y2="25" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5" />
      <line x1="29" y1="23" x2="38" y2="22" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5" />
      <line x1="29" y1="25" x2="38" y2="25" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5" />

      {/* Outfit badge (bottom strip) */}
      {outfitColor ? (
        <rect x="10" y="36" width="28" height="6" rx="3" fill={outfitColor} opacity="0.85" />
      ) : null}

      {/* Accessory (top right) */}
      {accessoryColor ? <circle cx="38" cy="10" r="3" fill={accessoryColor} opacity="0.9" /> : null}
    </svg>
  );
}
