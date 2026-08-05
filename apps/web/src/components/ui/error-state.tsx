'use client';

import { Button } from './button';

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  /** True when the request failed due to no network connection. */
  isOffline?: boolean;
  /** True when the API returned 401. */
  isUnauthorized?: boolean;
}

export function ErrorState({ message, onRetry, isOffline, isUnauthorized }: ErrorStateProps) {
  return (
    <div
      className="flex flex-col items-center gap-4 rounded-xl border py-10 px-6 text-center"
      style={{ borderColor: '#fca5a5', backgroundColor: '#fff1f2' }}
      role="alert"
    >
      {isOffline ? (
        <svg
          width="48"
          height="48"
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <circle cx="24" cy="24" r="20" stroke="#ef4444" strokeWidth="2" fill="#fee2e2" />
          <path
            d="M14 22 Q24 14 34 22"
            stroke="#ef4444"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M18 26 Q24 20 30 26"
            stroke="#ef4444"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="24" cy="30" r="2" fill="#ef4444" />
          <line
            x1="10"
            y1="10"
            x2="38"
            y2="38"
            stroke="#ef4444"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      ) : isUnauthorized ? (
        <svg
          width="48"
          height="48"
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <rect
            x="10"
            y="22"
            width="28"
            height="20"
            rx="4"
            stroke="#ef4444"
            strokeWidth="2"
            fill="#fee2e2"
          />
          <path
            d="M16 22 L16 16 Q16 8 24 8 Q32 8 32 16 L32 22"
            stroke="#ef4444"
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
          />
          <circle cx="24" cy="31" r="3" fill="#ef4444" />
          <line
            x1="24"
            y1="34"
            x2="24"
            y2="38"
            stroke="#ef4444"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg
          width="48"
          height="48"
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <circle cx="24" cy="24" r="20" stroke="#ef4444" strokeWidth="2" fill="#fee2e2" />
          <line
            x1="24"
            y1="14"
            x2="24"
            y2="28"
            stroke="#ef4444"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <circle cx="24" cy="33" r="2" fill="#ef4444" />
        </svg>
      )}

      <div>
        <p className="font-semibold text-red-700">
          {isOffline
            ? 'You appear to be offline'
            : isUnauthorized
              ? 'You are not authorised to view this'
              : 'Something went wrong'}
        </p>
        <p className="mt-1 text-sm text-red-600">{message}</p>
      </div>

      {onRetry ? (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}
