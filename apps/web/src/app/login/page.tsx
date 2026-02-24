'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/';
  const { user, loading: authLoading, login } = useAuth();
  const [email, setEmail] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (user) router.replace('/');
  }, [authLoading, user, router]);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (authLoading || user) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main>
      <div className="mx-auto max-w-sm px-4 py-12">
        <h1 className="text-2xl font-bold text-stone-900">Log in</h1>
        <p className="mt-1 text-sm text-stone-600">
          Sign in to rate books and save them for later.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </div>
          )}
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-stone-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:ring-offset-2"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-stone-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-stone-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200 focus:ring-offset-2"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full rounded-lg px-4 py-2.5 font-medium focus:outline-none focus:ring-2 focus:ring-primary-400 focus:ring-offset-2 disabled:opacity-50"
          >
            {submitting ? 'Signing in…' : 'Log in'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-stone-600">
          No account?{' '}
          <Link href="/register" className="font-medium text-stone-800 underline">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main>
          <div className="mx-auto max-w-sm px-4 py-12">
            <div className="h-8 w-48 animate-pulse rounded bg-stone-200" />
            <div className="mt-6 h-10 animate-pulse rounded bg-stone-100" />
          </div>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
