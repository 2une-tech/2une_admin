'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { adminApi } from '../../../lib/adminApi';

type AppRow = Awaited<ReturnType<typeof adminApi.listApplications>>[number];

export default function ApplicationsPage() {
  const [items, setItems] = useState<AppRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [projectId, setProjectId] = useState('');
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});

  const filteredLabel = useMemo(() => {
    const parts: string[] = [];
    if (status.trim()) parts.push(`status=${status.trim()}`);
    if (projectId.trim()) parts.push(`projectId=${projectId.trim()}`);
    return parts.length ? parts.join(' · ') : 'All applications';
  }, [status, projectId]);

  async function load() {
    setLoading(true);
    try {
      const res = await adminApi.listApplications({ status: status.trim() || undefined, projectId: projectId.trim() || undefined });
      setItems(res);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load applications';
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
      <div>
        <div className="text-sm text-zinc-600">{filteredLabel}</div>
        <h1 className="text-xl font-semibold">Applications</h1>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <div className="text-xs font-medium text-zinc-600">Status</div>
            <input className="h-10 w-full rounded-md border border-zinc-200 px-3" value={status} onChange={(e) => setStatus(e.target.value)} placeholder="approved | rejected | pending" />
          </div>
          <div className="space-y-1">
            <div className="text-xs font-medium text-zinc-600">Project ID</div>
            <input className="h-10 w-full rounded-md border border-zinc-200 px-3 font-mono text-xs" value={projectId} onChange={(e) => setProjectId(e.target.value)} placeholder="uuid" />
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
          <div className="p-4 text-sm text-zinc-600">No applications found.</div>
        ) : (
          <div className="divide-y divide-zinc-200">
            {items.map((a) => (
              <div key={a.id} className="px-4 py-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-zinc-900">
                      {a.project?.title ?? 'Project'} · {a.user?.email ?? a.userId}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-600">
                      <span className="rounded bg-zinc-100 px-2 py-0.5">status: {a.status}</span>
                      <span className="rounded bg-zinc-100 px-2 py-0.5">projectId: {a.projectId}</span>
                      <span className="rounded bg-zinc-100 px-2 py-0.5">appId: {a.id}</span>
                      {a.interviewScore != null ? (
                        <span className="rounded bg-zinc-100 px-2 py-0.5">score: {a.interviewScore}</span>
                      ) : null}
                    </div>
                    {a.rejectionReason ? <div className="mt-2 text-xs text-red-600">Reason: {a.rejectionReason}</div> : null}
                  </div>

                  <div className="flex flex-col gap-2 md:flex-row md:items-center">
                    <button
                      onClick={async () => {
                        try {
                          await adminApi.approveApplication(a.id);
                          toast.success('Approved');
                          await load();
                        } catch (e) {
                          toast.error(e instanceof Error ? e.message : 'Approve failed');
                        }
                      }}
                      className="h-9 rounded-md bg-zinc-900 px-3 text-sm font-medium text-white"
                    >
                      Approve
                    </button>
                    <div className="flex items-center gap-2">
                      <input
                        className="h-9 w-56 rounded-md border border-zinc-200 px-3 text-sm"
                        value={rejectReason[a.id] ?? ''}
                        onChange={(e) => setRejectReason((m) => ({ ...m, [a.id]: e.target.value }))}
                        placeholder="Reject reason (optional)"
                      />
                      <button
                        onClick={async () => {
                          try {
                            await adminApi.rejectApplication(a.id, (rejectReason[a.id] ?? '').trim() || undefined);
                            toast.success('Rejected');
                            await load();
                          } catch (e) {
                            toast.error(e instanceof Error ? e.message : 'Reject failed');
                          }
                        }}
                        className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium hover:bg-zinc-50"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

