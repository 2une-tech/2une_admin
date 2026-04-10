'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { adminApi, type Project } from '../../../lib/adminApi';

export default function TasksIndexPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await adminApi.listProjects({ page: 1, limit: 50 });
        setProjects(res.items);
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Failed to load projects';
        toast.error(msg);
        setProjects([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Tasks</h1>
        <p className="mt-1 text-sm text-zinc-600">Select a project to view tasks or bulk-upload.</p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 px-4 py-3 text-sm font-medium">Projects</div>
        {loading ? (
          <div className="p-4 text-sm text-zinc-600">Loading…</div>
        ) : projects.length === 0 ? (
          <div className="p-4 text-sm text-zinc-600">No projects found.</div>
        ) : (
          <div className="divide-y divide-zinc-200">
            {projects.map((p) => (
              <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-zinc-900">{p.title}</div>
                  <div className="mt-1 text-xs text-zinc-600">
                    {p.domain} · {p.status} · ${p.payPerTask}/task
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link className="h-9 rounded-md border border-zinc-200 px-3 text-sm leading-9 hover:bg-zinc-50" href={`/projects/${p.id}/tasks`}>
                    View
                  </Link>
                  <Link className="h-9 rounded-md bg-zinc-900 px-3 text-sm leading-9 text-white" href={`/projects/${p.id}/tasks/bulk-upload`}>
                    Bulk upload
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

