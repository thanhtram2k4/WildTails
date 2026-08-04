'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ hasError = false, className = '', ...rest }, ref) => {
    return (
      <input
        ref={ref}
        className={[
          'block w-full rounded-lg border px-3 py-2 text-sm',
          'bg-zinc-800 text-zinc-100 placeholder-zinc-500',
          'transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900',
          hasError
            ? 'border-red-500 focus:ring-red-500'
            : 'border-zinc-600 hover:border-zinc-500 focus:border-amber-500 focus:ring-amber-500',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        ].join(' ')}
        {...rest}
      />
    );
  },
);

Input.displayName = 'Input';
