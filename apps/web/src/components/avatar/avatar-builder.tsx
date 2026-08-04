'use client';

import {
  AVATAR_BASES,
  AVATAR_FURS,
  AVATAR_EYES,
  AVATAR_OUTFITS,
  AVATAR_ACCESSORIES,
  AVATAR_BACKGROUNDS,
  type AvatarConfig,
} from '@wildtails/contracts';

interface AvatarBuilderProps {
  value: AvatarConfig;
  onChange: (config: AvatarConfig) => void;
}

type LayerKey = keyof AvatarConfig;

interface LayerSpec {
  key: LayerKey;
  label: string;
  options: readonly string[];
}

const LAYERS: LayerSpec[] = [
  { key: 'base', label: 'Body shape', options: AVATAR_BASES },
  { key: 'fur', label: 'Fur colour', options: AVATAR_FURS },
  { key: 'eyes', label: 'Eyes', options: AVATAR_EYES },
  { key: 'outfit', label: 'Outfit', options: AVATAR_OUTFITS },
  { key: 'accessory', label: 'Accessory', options: AVATAR_ACCESSORIES },
  { key: 'background', label: 'Background', options: AVATAR_BACKGROUNDS },
];

const FUR_SWATCH: Record<string, string> = {
  orange: '#f97316',
  black: '#27272a',
  white: '#f4f4f5',
  gray: '#71717a',
  calico: '#d97706',
  tuxedo: '#1c1917',
};

function optionLabel(option: string): string {
  return option.replace(/-/g, ' ');
}

function LayerRow({
  spec,
  currentValue,
  onSelect,
}: {
  spec: LayerSpec;
  currentValue: string;
  onSelect: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">{spec.label}</p>
      <div role="radiogroup" aria-label={spec.label} className="flex flex-wrap gap-2">
        {spec.options.map((option) => {
          const selected = option === currentValue;
          const swatch = spec.key === 'fur' ? FUR_SWATCH[option] : undefined;
          return (
            <label
              key={option}
              className={[
                'relative flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm',
                'transition-colors duration-100',
                'focus-within:ring-2 focus-within:ring-amber-500 focus-within:ring-offset-2 focus-within:ring-offset-zinc-900',
                selected
                  ? 'border-amber-500 bg-amber-500/10 text-amber-300'
                  : 'border-zinc-600 text-zinc-400 hover:border-zinc-400 hover:text-zinc-200',
              ].join(' ')}
            >
              <input
                type="radio"
                name={`avatar-${spec.key}`}
                value={option}
                checked={selected}
                onChange={() => onSelect(option)}
                className="sr-only"
              />
              {swatch ? (
                <span
                  className="h-3 w-3 rounded-full border border-zinc-600"
                  style={{ background: swatch }}
                  aria-hidden="true"
                />
              ) : null}
              {optionLabel(option)}
            </label>
          );
        })}
      </div>
    </div>
  );
}

export function AvatarBuilder({ value, onChange }: AvatarBuilderProps) {
  function handleLayerChange(key: LayerKey, option: string) {
    onChange({ ...value, [key]: option } as AvatarConfig);
  }

  return (
    <div className="flex flex-col gap-5">
      {LAYERS.map((spec) => (
        <LayerRow
          key={spec.key}
          spec={spec}
          currentValue={value[spec.key]}
          onSelect={(option) => handleLayerChange(spec.key, option)}
        />
      ))}
    </div>
  );
}
