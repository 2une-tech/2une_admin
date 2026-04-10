'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { adminApi } from '../../../lib/adminApi';

type UserRow = Awaited<ReturnType<typeof adminApi.listUsers>>['items'][number];

export default function UsersPage() {
  const [items, setItems] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');

  const label = useMemo(() => {
    const parts: string[] = [];
    if (q.trim()) parts.push(`q=${q.trim()}`);
    if (status.trim()) parts.push(`status=${status.trim()}`);
    return parts.length ? parts.join(' · ') : 'All users';
  }, [q, status]);

  async function load() {
    setLoading(true);
    try {
      const res = await adminApi.listUsers({ page: 1, limit: 50, q: q.trim() || undefined, status: status.trim() || undefined });
      setItems(res.items);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load users');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm text-zinc-600">{label}</div>
        <h1 className="text-xl font-semibold">Users</h1>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <div className="text-xs font-medium text-zinc-600">Search (email contains)</div>
            <input className="h-10 w-full rounded-md border border-zinc-200 px-3" value={q} onChange={(e) => setQ(e.target.value)} placeholder="someone@" />
          </div>
          <div className="space-y-1">
            <div className="text-xs font-medium text-zinc-600">Talent status</div>
            <input className="h-10 w-full rounded-md border border-zinc-200 px-3" value={status} onChange={(e) => setStatus(e.target.value)} placeholder="new | approved | rejected ..." />
          </div>
          <div className="flex items-end">
            <button onClick={() => void load()} className="h-10 w-full rounded-md border border-zinc-200 bg-white text-sm font-medium hover:bg-zinc-50">
              Apply filters
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 px-4 py-3 text-sm font-medium">Results</div>
        {loading ? (
          <div className="p-4 text-sm text-zinc-600">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-4 text-sm text-zinc-600">No users found.</div>
        ) : (
          <div className="divide-y divide-zinc-200">
            {items.map((u) => (
              <Link key={u.id} href={`/users/${u.id}`} className="block px-4 py-3 hover:bg-zinc-50">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-zinc-900">{u.email}</div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-600">
                      <span className="rounded bg-zinc-100 px-2 py-0.5">role: {u.role}</span>
                      <span className="rounded bg-zinc-100 px-2 py-0.5">status: {u.status}</span>
                      <span className="rounded bg-zinc-100 px-2 py-0.5">verified: {String(u.isVerified)}</span>
                      {u.talentProfile?.status ? (
                        <span className="rounded bg-zinc-100 px-2 py-0.5">talent: {u.talentProfile.status}</span>
                      ) : null}
                    </div>
                  </div>
                  <div className="text-xs text-zinc-600">Open</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

