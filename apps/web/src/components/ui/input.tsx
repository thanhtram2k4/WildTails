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
          'bg-white placeholder-slate-400',
          'transition-colors duration-150',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white',
          hasError
            ? 'border-red-400 text-red-900 focus:ring-red-400'
            : [
                'border-[#e2e8f0] text-[#1e3a5f]',
                'hover:border-slate-400',
                'focus:border-[#0d9488] focus:ring-[#0d9488]',
              ].join(' '),
          'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-slate-50',
          className,
        ].join(' ')}
        {...rest}
      />
    );
  },
);

Input.displayName = 'Input';
