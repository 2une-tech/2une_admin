'use client';

import Link from 'next/link';
import { useAuthStore } from '../../lib/store';
import { BrandLogo } from '@/components/BrandLogo';

export default function ForbiddenPage() {
  const { user, logout } = useAuthStore();
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex justify-center">
          <BrandLogo size={32} />
        </div>
        <h1 className="text-xl font-semibold">Forbidden</h1>
        <p className="mt-2 text-sm text-zinc-600">
          This area is restricted to admin accounts. You are signed in as{' '}
          <span className="font-medium">{user?.email ?? 'unknown'}</span>.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <button
            onClick={() => void logout()}
            className="h-10 rounded-md bg-zinc-900 px-4 text-sm font-medium text-white"
          >
            Sign out
          </button>
          <Link className="text-sm font-medium text-zinc-900 underline" href="/login">
            Go to login
          </Link>
        </div>
      </div>
    </div>
  );
}

