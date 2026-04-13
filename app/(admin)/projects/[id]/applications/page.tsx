'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ApplicationReviewTable } from '@/components/ApplicationReviewTable';
import {
  adminApi,
  APPLICATION_STATUSES,
  type AdminApplicationRow,
  type ApplicationStatus,
} from '@/lib/adminApi';
import { formatConversionRate } from '@/lib/applicationFormat';

export default function ProjectApplicationsPage() {
  const params = useParams<{ id: string }>();
  const projectId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [stats, setStats] = useState<Awaited<ReturnType<typeof adminApi.getProjectApplicationStats>> | null>(null);
  const [envelope, setEnvelope] = useState<{
    items: AdminApplicationRow[];
    page: number;
    limit: number;
    total: number;
    project: { id: string; title: string };
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | ''>('');
  const [sort, setSort] = useState<'updatedAt' | 'createdAt' | 'interviewScore'>('updatedAt');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});

  const limit = 20;

  const loadStats = useCallback(async () => {
    if (!projectId) return;
    try {
      const s = await adminApi.getProjectApplicationStats(projectId);
      setStats(s);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load stats');
      setStats(null);
    }
  }, [projectId]);

  const loadApplications = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await adminApi.listProjectApplications(projectId, {
        page,
        limit,
        status: statusFilter,
        sort,
        dir,
      });
      setEnvelope(res);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load applications');
      setEnvelope(null);
    } finally {
      setLoading(false);
    }
  }, [projectId, page, limit, statusFilter, sort, dir]);

  useEffect(() => {
    void loadStats();
  }, [loadStats]);

  useEffect(() => {
    void loadApplications();
  }, [loadApplications]);

  const onApprove = async (id: string) => {
    try {
      await adminApi.approveApplication(id);
      toast.success('Approved — candidate will see this under Offers in the work app');
      await Promise.all([loadApplications(), loadStats()]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Approve failed');
    }
  };

  const onReject = async (id: string) => {
    try {
      await adminApi.rejectApplication(id, (rejectReason[id] ?? '').trim() || undefined);
      toast.success('Rejected');
      await Promise.all([loadApplications(), loadStats()]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Reject failed');
    }
  };

  if (!projectId) return <div className="text-sm text-zinc-600">Invalid project.</div>;

  const totalPages = envelope ? Math.max(1, Math.ceil(envelope.total / limit)) : 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm text-zinc-600">
            <Link href={`/projects/${projectId}`} className="text-violet-700 hover:underline">
              ← Project settings
            </Link>
          </div>
          <h1 className="mt-1 text-xl font-semibold">{envelope?.project.title ?? 'Applications'}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Review candidates for this project. Approving sends an offer (approved application) to the talent app.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/projects/${projectId}/tasks`}
            className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-medium hover:bg-zinc-50"
          >
            Tasks
          </Link>
        </div>
      </div>

      {stats ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-baseline gap-2 text-sm text-zinc-600">
            <span className="font-medium text-zinc-900">{stats.total}</span> total applications
            <span className="text-zinc-400">·</span>
            <span>
              Approved / total: {formatConversionRate(stats.conversionRate)} ({stats.byStatus.approved ?? 0} approved)
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            {APPLICATION_STATUSES.map((s) => (
              <div key={s} className="rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
                <div className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{s.replace(/_/g, ' ')}</div>
                <div className="mt-1 text-2xl font-semibold text-zinc-900">{stats.byStatus[s] ?? 0}</div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-sm text-zinc-500">Loading stats…</div>
      )}

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1">
            <div className="text-xs font-medium text-zinc-600">Filter by status</div>
            <select
              className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm"
              value={statusFilter}
              onChange={(e) => {
                setPage(1);
                setStatusFilter(e.target.value as ApplicationStatus | '');
              }}
            >
              <option value="">All statuses</option>
              {APPLICATION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <div className="text-xs font-medium text-zinc-600">Sort by</div>
            <select
              className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm"
              value={sort}
              onChange={(e) => {
                setPage(1);
                setSort(e.target.value as 'updatedAt' | 'createdAt' | 'interviewScore');
              }}
            >
              <option value="updatedAt">Last updated</option>
              <option value="createdAt">Created</option>
              <option value="interviewScore">Interview score</option>
            </select>
          </div>
          <div className="space-y-1">
            <div className="text-xs font-medium text-zinc-600">Direction</div>
            <select
              className="h-10 w-full rounded-md border border-zinc-200 px-3 text-sm"
              value={dir}
              onChange={(e) => {
                setPage(1);
                setDir(e.target.value as 'asc' | 'desc');
              }}
            >
              <option value="desc">Newest / highest first</option>
              <option value="asc">Oldest / lowest first</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => void loadApplications()}
              className="h-10 w-full rounded-md border border-zinc-200 bg-white text-sm font-medium hover:bg-zinc-50"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-200 px-4 py-3">
          <div className="text-sm font-medium">Candidates</div>
          {envelope ? (
            <div className="text-xs text-zinc-500">
              Page {envelope.page} of {totalPages} · {envelope.total} rows
            </div>
          ) : null}
        </div>
        {loading ? (
          <div className="p-4 text-sm text-zinc-600">Loading…</div>
        ) : envelope ? (
          <ApplicationReviewTable
            rows={envelope.items}
            expandedId={expandedId}
            onToggleExpand={setExpandedId}
            rejectReason={rejectReason}
            onRejectReasonChange={(id, value) => setRejectReason((m) => ({ ...m, [id]: value }))}
            onApprove={onApprove}
            onReject={onReject}
          />
        ) : (
          <div className="p-4 text-sm text-zinc-600">Nothing to show.</div>
        )}

        {envelope && envelope.total > limit ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 px-4 py-3">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-9 rounded-md border border-zinc-200 px-3 text-sm disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-xs text-zinc-500">
              Page {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="h-9 rounded-md border border-zinc-200 px-3 text-sm disabled:opacity-40"
            >
              Next
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
