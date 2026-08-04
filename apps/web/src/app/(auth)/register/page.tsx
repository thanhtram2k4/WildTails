'use client';

import { useState, useRef, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { authFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth/auth-context';

interface FieldErrors {
  displayName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
}

interface ApiErrorEnvelope {
  success: false;
  error: { code: string; message: string };
}

function isApiErrorEnvelope(v: unknown): v is ApiErrorEnvelope {
  return typeof v === 'object' && v !== null && (v as ApiErrorEnvelope).success === false;
}

export default function RegisterPage() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const displayNameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldErrors({});
    setServerError(null);

    const errors: FieldErrors = {};
    if (!displayName.trim()) errors.displayName = 'Display name is required';
    else if (displayName.trim().length > 50)
      errors.displayName = 'Display name must be 50 characters or fewer';
    if (!email) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errors.email = 'Enter a valid email address';
    if (!password) errors.password = 'Password is required';
    else if (password.length < 8) errors.password = 'Password must be at least 8 characters';
    if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      if (errors.displayName) displayNameRef.current?.focus();
      else if (errors.email) emailRef.current?.focus();
      else if (errors.password) passwordRef.current?.focus();
      else if (errors.confirmPassword) confirmPasswordRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await authFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          displayName: displayName.trim(),
          email,
          password,
        }),
      });

      const data: unknown = await res.json();

      if (!res.ok) {
        if (isApiErrorEnvelope(data)) {
          if (data.error.code === 'CONFLICT') {
            setFieldErrors({ email: 'An account with this email already exists' });
            emailRef.current?.focus();
          } else {
            setServerError(data.error.message);
          }
        } else {
          setServerError('Registration failed. Please try again.');
        }
        return;
      }

      const success = data as {
        success: true;
        data: {
          accessToken: string;
          expiresIn: number;
          userId: string;
          email: string;
          displayName: string;
        };
      };

      signIn(success.data.accessToken, success.data.expiresIn, {
        userId: success.data.userId,
        email: success.data.email,
        displayName: success.data.displayName,
      });

      router.replace('/onboarding');
    } catch {
      setServerError('A network error occurred. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--wt-navy)' }}>
          Create your account
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--wt-text-muted)' }}>
          Join the WildTails universe
        </p>
      </div>

      {serverError ? (
        <div
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {serverError}
        </div>
      ) : null}

      <FormField
        id="displayName"
        label="Display name"
        error={fieldErrors.displayName}
        required
        hint="Up to 50 characters. This is what other explorers will see."
      >
        <Input
          id="displayName"
          ref={displayNameRef}
          type="text"
          autoComplete="nickname"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          hasError={Boolean(fieldErrors.displayName)}
          aria-describedby={fieldErrors.displayName ? 'displayName-error' : 'displayName-hint'}
          disabled={isSubmitting}
          placeholder="StargazerFelicia"
          maxLength={50}
        />
      </FormField>

      <FormField id="email" label="Email" error={fieldErrors.email} required>
        <Input
          id="email"
          ref={emailRef}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          hasError={Boolean(fieldErrors.email)}
          aria-describedby={fieldErrors.email ? 'email-error' : undefined}
          disabled={isSubmitting}
          placeholder="you@example.com"
        />
      </FormField>

      <FormField
        id="password"
        label="Password"
        error={fieldErrors.password}
        hint="At least 8 characters."
        required
      >
        <Input
          id="password"
          ref={passwordRef}
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hasError={Boolean(fieldErrors.password)}
          aria-describedby={fieldErrors.password ? 'password-error' : 'password-hint'}
          disabled={isSubmitting}
          placeholder="Min. 8 characters"
        />
      </FormField>

      <FormField
        id="confirmPassword"
        label="Confirm password"
        error={fieldErrors.confirmPassword}
        required
      >
        <Input
          id="confirmPassword"
          ref={confirmPasswordRef}
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          hasError={Boolean(fieldErrors.confirmPassword)}
          aria-describedby={fieldErrors.confirmPassword ? 'confirmPassword-error' : undefined}
          disabled={isSubmitting}
          placeholder="Repeat your password"
        />
      </FormField>

      <Button type="submit" isLoading={isSubmitting} className="w-full">
        Create account
      </Button>

      <p className="text-center text-sm" style={{ color: 'var(--wt-text-muted)' }}>
        Already have an account?{' '}
        <Link
          href="/login"
          className="underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 rounded"
          style={{ color: 'var(--wt-teal)' }}
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
