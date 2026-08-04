'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    'bg-amber-500 text-white hover:bg-amber-600 focus-visible:ring-amber-500 disabled:bg-amber-300',
  secondary:
    'bg-zinc-700 text-zinc-100 hover:bg-zinc-600 focus-visible:ring-zinc-500 disabled:bg-zinc-800 disabled:text-zinc-500',
  ghost:
    'bg-transparent text-amber-400 hover:bg-zinc-800 focus-visible:ring-amber-500 disabled:text-zinc-600',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 disabled:bg-red-400',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      className = '',
      children,
      ...rest
    },
    ref,
  ) => {
    const isDisabled = disabled ?? isLoading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-busy={isLoading}
        className={[
          'inline-flex items-center justify-center gap-2 rounded-lg font-medium',
          'transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900',
          'disabled:cursor-not-allowed',
          VARIANT_CLASSES[variant],
          SIZE_CLASSES[size],
          className,
        ].join(' ')}
        {...rest}
      >
        {isLoading ? (
          <>
            <span
              className="motion-safe:animate-spin h-4 w-4 rounded-full border-2 border-current border-t-transparent"
              aria-hidden="true"
            />
            <span className="sr-only">Loading</span>
          </>
        ) : null}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
