'use client';

import Link from 'next/link';
import { Fragment, useMemo } from 'react';
import type { AdminApplicationRow } from '../lib/adminApi';
import { transcriptPreview } from '../lib/applicationFormat';

function canReview(status: string): boolean {
  return status === 'applied' || status === 'under_review' || status === 'interview_pending';
}

function skillChips(skills: { name: string }[], max = 5): string {
  return skills
    .slice(0, max)
    .map((s) => s.name)
    .join(', ');
}

function langSummary(
  langs: { language: string; speakLevel?: string | null; writeLevel?: string | null }[],
  max = 4,
): string {
  return langs
    .slice(0, max)
    .map((l) => l.language)
    .join(', ');
}

type Props = {
  rows: AdminApplicationRow[];
  showProjectColumn?: boolean;
  expandedId: string | null;
  onToggleExpand: (id: string | null) => void;
  rejectReason: Record<string, string>;
  onRejectReasonChange: (id: string, value: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
};

export function ApplicationReviewTable({
  rows,
  showProjectColumn,
  expandedId,
  onToggleExpand,
  rejectReason,
  onRejectReasonChange,
  onApprove,
  onReject,
}: Props) {
  const colSpan = useMemo(() => (showProjectColumn ? 8 : 7), [showProjectColumn]);

  if (rows.length === 0) {
    return <div className="p-4 text-sm text-zinc-600">No applications in this view.</div>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[880px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium uppercase tracking-wide text-zinc-600">
            {showProjectColumn ? <th className="px-3 py-2">Project</th> : null}
            <th className="px-3 py-2">Candidate</th>
            <th className="px-3 py-2">Profile</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Interview</th>
            <th className="px-3 py-2">Updated</th>
            <th className="px-3 py-2">Review</th>
            <th className="px-3 py-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => {
            const open = expandedId === a.id;
            const tp = a.user.talentProfile;
            return (
              <Fragment key={a.id}>
                <tr className="border-b border-zinc-100 align-top">
                  {showProjectColumn ? (
                    <td className="max-w-[10rem] px-3 py-3">
                      <div className="truncate font-medium text-zinc-900">{a.project?.title ?? '—'}</div>
                      <div className="font-mono text-[10px] text-zinc-400">{a.projectId}</div>
                    </td>
                  ) : null}
                  <td className="px-3 py-3">
                    <div className="font-medium text-zinc-900">{a.user.profile?.fullName?.trim() || a.user.email}</div>
                    <div className="text-xs text-zinc-500">{a.user.email}</div>
                    <Link href={`/users/${a.userId}`} className="mt-1 inline-block text-xs font-medium text-violet-700 hover:underline">
                      Full profile
                    </Link>
                  </td>
                  <td className="max-w-[14rem] px-3 py-3 text-xs text-zinc-700">
                    <div>
                      <span className="text-zinc-500">Talent:</span> {tp?.status ?? '—'}
                      {tp?.internalRating != null ? ` · rating ${tp.internalRating}` : ''}
                    </div>
                    {tp?.tags && tp.tags.length > 0 ? (
                      <div className="mt-1 text-zinc-600">Tags: {tp.tags.join(', ')}</div>
                    ) : null}
                    <div className="mt-1 line-clamp-2" title={skillChips(a.user.skills, 20)}>
                      <span className="text-zinc-500">Skills:</span> {skillChips(a.user.skills) || '—'}
                    </div>
                    <div className="mt-1 line-clamp-1" title={langSummary(a.user.languages, 20)}>
                      <span className="text-zinc-500">Languages:</span> {langSummary(a.user.languages) || '—'}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs">{a.status}</span>
                    {a.rejectionReason ? <div className="mt-1 text-xs text-red-600">{a.rejectionReason}</div> : null}
                    {a.reviewedAt ? (
                      <div className="mt-1 text-[10px] text-zinc-500">
                        Reviewed {new Date(a.reviewedAt).toLocaleString()}
                        {a.reviewedBy?.email ? ` · ${a.reviewedBy.email}` : ''}
                      </div>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 text-xs">
                    <div>Score: {a.interviewScore != null ? a.interviewScore : '—'}</div>
                    <div className="text-zinc-500">
                      Done: {a.interviewCompletedAt ? new Date(a.interviewCompletedAt).toLocaleString() : '—'}
                    </div>
                    <button
                      type="button"
                      onClick={() => onToggleExpand(open ? null : a.id)}
                      className="mt-1 text-violet-700 hover:underline"
                    >
                      {open ? 'Hide' : 'View'} transcript
                    </button>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-xs text-zinc-600">{new Date(a.updatedAt).toLocaleString()}</td>
                  <td className="px-3 py-3 text-xs text-zinc-600">
                    {canReview(a.status) ? (
                      <div className="flex flex-col gap-2">
                        <input
                          className="h-8 w-full min-w-[6rem] rounded border border-zinc-200 px-2 text-xs"
                          value={rejectReason[a.id] ?? ''}
                          onChange={(e) => onRejectReasonChange(a.id, e.target.value)}
                          placeholder="Reject reason"
                        />
                      </div>
                    ) : (
                      <span className="text-zinc-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right">
                    {canReview(a.status) ? (
                      <div className="flex flex-col items-end gap-2">
                        <button
                          type="button"
                          onClick={() => void onApprove(a.id)}
                          className="h-8 rounded-md bg-zinc-900 px-3 text-xs font-medium text-white"
                        >
                          Approve (offer)
                        </button>
                        <button
                          type="button"
                          onClick={() => void onReject(a.id)}
                          className="h-8 rounded-md border border-zinc-200 px-3 text-xs font-medium hover:bg-zinc-50"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-400">{a.status === 'approved' ? 'Approved' : 'Closed'}</span>
                    )}
                  </td>
                </tr>
                {open ? (
                  <tr className="border-b border-zinc-100 bg-zinc-50">
                    <td colSpan={colSpan} className="px-3 py-3">
                      <div className="text-xs font-medium text-zinc-700">Interview transcript (preview)</div>
                      <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded border border-zinc-200 bg-white p-3 font-mono text-[11px] text-zinc-800">
                        {transcriptPreview(a.interviewTranscript)}
                      </pre>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
