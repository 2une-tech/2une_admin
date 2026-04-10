'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { adminApi, type Project, type ProjectStatus } from '../../../lib/adminApi';

export default function ProjectsPage() {
  const [items, setItems] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  const [domain, setDomain] = useState('');
  const [status, setStatus] = useState<ProjectStatus | ''>('');

  const filteredLabel = useMemo(() => {
    const parts: string[] = [];
    if (domain.trim()) parts.push(`domain=${domain.trim()}`);
    if (status) parts.push(`status=${status}`);
    return parts.length ? parts.join(' · ') : 'All projects';
  }, [domain, status]);

  async function load() {
    setLoading(true);
    try {
      const res = await adminApi.listProjects({ page: 1, limit: 50, domain: domain.trim() || undefined, status: status || undefined });
      setItems(res.items);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load projects';
      toast.error(msg);
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
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm text-zinc-600">{filteredLabel}</div>
          <h1 className="text-xl font-semibold">Projects</h1>
        </div>
        <Link className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white" href="/projects/new">
          New project
        </Link>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <div className="text-xs font-medium text-zinc-600">Domain</div>
            <input className="h-10 w-full rounded-md border border-zinc-200 px-3" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="e.g. Legal" />
          </div>
          <div className="space-y-1">
            <div className="text-xs font-medium text-zinc-600">Status</div>
            <select
              className="h-10 w-full rounded-md border border-zinc-200 px-3"
              value={status}
              onChange={(e) => setStatus(e.target.value as ProjectStatus | '')}
            >
              <option value="">All</option>
              <option value="draft">draft</option>
              <option value="active">active</option>
              <option value="paused">paused</option>
              <option value="completed">completed</option>
            </select>
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
          <div className="p-4 text-sm text-zinc-600">No projects found.</div>
        ) : (
          <div className="divide-y divide-zinc-200">
            {items.map((p) => (
              <Link key={p.id} href={`/projects/${p.id}`} className="block px-4 py-3 hover:bg-zinc-50">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-zinc-900">{p.title}</div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-600">
                      <span className="rounded bg-zinc-100 px-2 py-0.5">domain: {p.domain}</span>
                      <span className="rounded bg-zinc-100 px-2 py-0.5">status: {p.status}</span>
                      <span className="rounded bg-zinc-100 px-2 py-0.5">pay: ${p.payPerTask}/task</span>
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

