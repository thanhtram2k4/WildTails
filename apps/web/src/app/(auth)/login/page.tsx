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
  email?: string;
  password?: string;
}

interface ApiErrorEnvelope {
  success: false;
  error: { code: string; message: string };
}

function isApiErrorEnvelope(v: unknown): v is ApiErrorEnvelope {
  return typeof v === 'object' && v !== null && (v as ApiErrorEnvelope).success === false;
}

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFieldErrors({});
    setServerError(null);

    // Client-side validation
    const errors: FieldErrors = {};
    if (!email) errors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errors.email = 'Enter a valid email address';
    if (!password) errors.password = 'Password is required';
    else if (password.length < 8) errors.password = 'Password must be at least 8 characters';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      if (errors.email) emailRef.current?.focus();
      else if (errors.password) passwordRef.current?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await authFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      const data: unknown = await res.json();

      if (!res.ok) {
        if (isApiErrorEnvelope(data)) {
          if (data.error.code === 'VALIDATION_ERROR') {
            setFieldErrors({ email: 'Check your credentials and try again' });
          } else {
            setServerError(data.error.message);
          }
        } else {
          setServerError('Login failed. Please try again.');
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

      router.replace('/dashboard');
    } catch {
      setServerError('A network error occurred. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <div>
        <h1 className="text-xl font-bold text-zinc-100">Welcome back</h1>
        <p className="mt-1 text-sm text-zinc-400">Sign in to your account</p>
      </div>

      {serverError ? (
        <div
          role="alert"
          className="rounded-lg border border-red-700 bg-red-900/30 px-4 py-3 text-sm text-red-300"
        >
          {serverError}
        </div>
      ) : null}

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

      <FormField id="password" label="Password" error={fieldErrors.password} required>
        <Input
          id="password"
          ref={passwordRef}
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hasError={Boolean(fieldErrors.password)}
          aria-describedby={fieldErrors.password ? 'password-error' : undefined}
          disabled={isSubmitting}
          placeholder="Min. 8 characters"
        />
      </FormField>

      <Button type="submit" isLoading={isSubmitting} className="w-full">
        Sign in
      </Button>

      <p className="text-center text-sm text-zinc-500">
        No account?{' '}
        <Link
          href="/register"
          className="text-amber-400 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded"
        >
          Create one
        </Link>
      </p>
    </form>
  );
}
