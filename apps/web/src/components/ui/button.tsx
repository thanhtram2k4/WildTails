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
  // Yellow/amber primary — navy text for WCAG AA contrast on amber-400
  primary:
    'bg-amber-400 text-[#1e3a5f] hover:bg-amber-500 focus-visible:ring-amber-400 disabled:bg-amber-200 disabled:text-amber-600',
  // Teal outline secondary
  secondary:
    'border border-[#0d9488] text-[#0d9488] bg-white hover:bg-teal-50 focus-visible:ring-[#0d9488] disabled:border-teal-200 disabled:text-teal-300',
  // Ghost — teal text, subtle hover
  ghost:
    'bg-transparent text-[#0d9488] hover:bg-teal-50 focus-visible:ring-[#0d9488] disabled:text-teal-200',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 disabled:bg-red-300',
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
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
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
