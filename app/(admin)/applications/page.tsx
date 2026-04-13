'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { adminApi } from '../../../lib/adminApi';

type AppRow = Awaited<ReturnType<typeof adminApi.listApplications>>[number];

function canReviewApplication(status: string): boolean {
  return status === 'applied' || status === 'under_review' || status === 'interview_pending';
}

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

  const groupedByProject = useMemo(() => {
    const map = new Map<string, AppRow[]>();
    for (const a of items) {
      const key = a.projectId;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return [...map.entries()].sort((x, y) => {
      const titleA = x[1][0]?.project?.title ?? x[0];
      const titleB = y[1][0]?.project?.title ?? y[0];
      return titleA.localeCompare(titleB, undefined, { sensitivity: 'base' });
    });
  }, [items]);

  async function load() {
    setLoading(true);
    try {
      const res = await adminApi.listApplications({
        status: status.trim() || undefined,
        projectId: projectId.trim() || undefined,
      });
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
        <p className="mt-1 text-sm text-zinc-500">
          Grouped by project. Open a section to review candidates. Use View profile for full worker details.
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="space-y-1">
            <div className="text-xs font-medium text-zinc-600">Status</div>
            <input
              className="h-10 w-full rounded-md border border-zinc-200 px-3"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              placeholder="approved | rejected | interview_pending …"
            />
          </div>
          <div className="space-y-1">
            <div className="text-xs font-medium text-zinc-600">Project ID</div>
            <input
              className="h-10 w-full rounded-md border border-zinc-200 px-3 font-mono text-xs"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              placeholder="uuid filter"
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => void load()}
              className="h-10 w-full rounded-md border border-zinc-200 bg-white text-sm font-medium hover:bg-zinc-50"
            >
              Apply filters
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="border-b border-zinc-200 px-4 py-3 text-sm font-medium">Results by project</div>
        {loading ? (
          <div className="p-4 text-sm text-zinc-600">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-4 text-sm text-zinc-600">No applications found.</div>
        ) : (
          <div className="divide-y divide-zinc-200">
            {groupedByProject.map(([pid, rows]) => {
              const title = rows[0]?.project?.title ?? 'Project';
              return (
                <details key={pid} className="px-4 py-2">
                  <summary className="cursor-pointer list-none py-3 text-sm font-semibold text-zinc-900 marker:hidden [&::-webkit-details-marker]:hidden">
                    <span className="inline-flex flex-wrap items-center gap-2">
                      <span className="text-zinc-400">▸</span>
                      {title}
                      <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-normal text-zinc-600">
                        {rows.length} application{rows.length === 1 ? '' : 's'}
                      </span>
                      <span className="font-mono text-xs font-normal text-zinc-500">{pid}</span>
                    </span>
                  </summary>
                  <div className="space-y-0 border-t border-zinc-100 pt-2 pb-4">
                    {rows.map((a) => (
                      <div key={a.id} className="border-b border-zinc-100 px-2 py-4 last:border-b-0">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium text-zinc-900">{a.user?.email ?? a.userId}</div>
                            <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-600">
                              <span className="rounded bg-zinc-100 px-2 py-0.5">status: {a.status}</span>
                              <span className="rounded bg-zinc-100 px-2 py-0.5">appId: {a.id}</span>
                              {a.interviewScore != null ? (
                                <span className="rounded bg-zinc-100 px-2 py-0.5">score: {a.interviewScore}</span>
                              ) : null}
                            </div>
                            {a.rejectionReason ? (
                              <div className="mt-2 text-xs text-red-600">Reason: {a.rejectionReason}</div>
                            ) : null}
                            <Link
                              href={`/users/${a.userId}`}
                              className="mt-2 inline-block text-sm font-medium text-violet-700 hover:text-violet-900 hover:underline"
                            >
                              View profile
                            </Link>
                          </div>

                          {canReviewApplication(a.status) ? (
                            <div className="flex flex-col gap-2 md:flex-row md:items-center">
                              <button
                                type="button"
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
                              <div className="flex flex-wrap items-center gap-2">
                                <input
                                  className="h-9 min-w-[8rem] flex-1 rounded-md border border-zinc-200 px-3 text-sm md:w-56"
                                  value={rejectReason[a.id] ?? ''}
                                  onChange={(e) => setRejectReason((m) => ({ ...m, [a.id]: e.target.value }))}
                                  placeholder="Reject reason (optional)"
                                />
                                <button
                                  type="button"
                                  onClick={async () => {
                                    try {
                                      await adminApi.rejectApplication(
                                        a.id,
                                        (rejectReason[a.id] ?? '').trim() || undefined,
                                      );
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
                          ) : (
                            <div className="text-xs text-zinc-500">
                              {a.status === 'approved' ? 'Approved' : a.status === 'rejected' ? 'Rejected' : 'No actions'}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
