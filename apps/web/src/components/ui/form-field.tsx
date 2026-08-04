'use client';

import { type ReactNode } from 'react';

interface FormFieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}

export function FormField({ id, label, error, hint, required = false, children }: FormFieldProps) {
  const errorId = error ? `${id}-error` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-zinc-300">
        {label}
        {required ? (
          <span className="ml-1 text-amber-400" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>

      {hint ? (
        <p id={hintId} className="text-xs text-zinc-500">
          {hint}
        </p>
      ) : null}

      {/* Pass aria-describedby via cloneElement is fragile — children must apply these themselves */}
      <div data-error-id={errorId} data-hint-id={hintId}>
        {children}
      </div>

      {error ? (
        <p id={errorId} role="alert" className="text-xs text-red-400">
          {error}
        </p>
      ) : null}
    </div>
  );
}
