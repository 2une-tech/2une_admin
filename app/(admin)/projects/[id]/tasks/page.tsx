'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { adminApi, type TaskRow, type TaskStatus } from '../../../../../lib/adminApi';

export default function ProjectTasksPage() {
  const params = useParams<{ id: string }>();
  const projectId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [items, setItems] = useState<TaskRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<TaskStatus | ''>('');

  async function load() {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await adminApi.listTasks(projectId, { page: 1, limit: 50, status: status || undefined });
      setItems(res.items);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load tasks';
      toast.error(msg);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Project tasks</h1>
          <div className="mt-1 text-sm text-zinc-600">{projectId}</div>
        </div>
        <Link className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white" href={`/projects/${projectId}/tasks/bulk-upload`}>
          Bulk upload
        </Link>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <div className="text-xs font-medium text-zinc-600">Status</div>
            <select
              className="h-10 w-full rounded-md border border-zinc-200 px-3"
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus | '')}
            >
              <option value="">All</option>
              <option value="pending">pending</option>
              <option value="assigned">assigned</option>
              <option value="completed">completed</option>
              <option value="skipped">skipped</option>
              <option value="archived">archived</option>
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={() => void load()} className="h-10 w-full rounded-md border border-zinc-200 bg-white text-sm font-medium hover:bg-zinc-50">
              Apply
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 px-4 py-3 text-sm font-medium">Tasks</div>
        {loading ? (
          <div className="p-4 text-sm text-zinc-600">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-4 text-sm text-zinc-600">No tasks found.</div>
        ) : (
          <div className="divide-y divide-zinc-200">
            {items.map((t) => (
              <div key={t.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-zinc-900">{t.id}</div>
                  <div className="text-xs text-zinc-600">{t.status}</div>
                </div>
                <pre className="mt-2 max-h-56 overflow-auto rounded-md bg-zinc-50 p-3 text-xs text-zinc-900">
                  {JSON.stringify(t.inputData, null, 2)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

