'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuthStore } from '../../lib/store';
import { BrandLogo } from '@/components/BrandLogo';

export default function LoginPage() {
  const router = useRouter();
  const { login, logout, isLoading, user } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  // #region agent log
  useEffect(() => {
    // Runtime evidence via dev server console output.
    // eslint-disable-next-line no-console
    console.log('[debug-09a1a0] LoginPage mounted');
  }, []);
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('[debug-09a1a0] LoginPage state', {
      isLoading,
      hasUser: !!user,
      userRole: user?.role ?? null,
      emailLen: email.length,
      passwordLen: password.length,
    });
  }, [isLoading]); // intentionally not tracking email/password to avoid log spam
  // #endregion

  useEffect(() => {
    if (user?.role === 'admin') router.replace('/');
  }, [router, user?.role]);

  const disabled = useMemo(() => isLoading || !email.trim() || password.length < 8, [isLoading, email, password]);
  const busyLabel = isLoading ? 'Signing in…' : 'Sign in';

  return (
    <div className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-4">
            <BrandLogo size={36} />
          </div>
          <h1 className="text-xl font-semibold">2une Admin</h1>
          <p className="mt-1 text-sm text-zinc-600">Sign in with an admin account.</p>
        </div>

        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (disabled) return;
            setError(null);
            try {
              await login(email, password);
              const role = useAuthStore.getState().user?.role;
              if (role !== 'admin') {
                await logout();
                const msg = 'This account is not an admin.';
                setError(msg);
                toast.error(msg);
                return;
              }
              router.replace('/');
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Login failed';
              setError(message);
              toast.error(message);
            }
          }}
        >
          <div className="space-y-1">
            <label className="text-sm font-medium">Email</label>
            <input
              className="h-10 w-full rounded-md border border-zinc-200 px-3 outline-none ring-offset-2 focus:ring-2 focus:ring-indigo-500 disabled:bg-zinc-50 disabled:text-zinc-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              inputMode="email"
              placeholder="admin@company.com"
              disabled={isLoading}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Password</label>
            <input
              className="h-10 w-full rounded-md border border-zinc-200 px-3 outline-none ring-offset-2 focus:ring-2 focus:ring-indigo-500 disabled:bg-zinc-50 disabled:text-zinc-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              type="password"
              placeholder="********"
              disabled={isLoading}
            />
          </div>
          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
          ) : null}
          <button
            type="submit"
            disabled={disabled}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-indigo-600 text-white shadow-sm hover:bg-indigo-500 active:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? (
              <span
                className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
                aria-hidden="true"
              />
            ) : null}
            {busyLabel}
          </button>
        </form>
      </div>
    </div>
  );
}

