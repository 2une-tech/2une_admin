'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { adminApi } from '../../../../lib/adminApi';

type NoteRow = {
  id: string;
  note: string;
  createdAt?: string;
  admin?: { email?: string };
};

type UserBundle = {
  user?: { id?: string; email?: string };
  talent?: { profile?: { status?: string; internalRating?: number | null; tags?: string[]; rejectionReason?: string | null } };
} & Record<string, unknown>;

type AdminLanguageRow = {
  id: string;
  language: string;
  speakLevel?: string | null;
  writeLevel?: string | null;
};

function proficiencyLabel(v: string | null | undefined): string {
  if (!v) return '—';
  const map: Record<string, string> = {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
    fluent: 'Fluent',
    native: 'Native',
  };
  return map[v] ?? v;
}

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const userId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [bundle, setBundle] = useState<UserBundle | null>(null);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingStatus, setSavingStatus] = useState(false);
  const [addingNote, setAddingNote] = useState(false);

  const [talentStatus, setTalentStatus] = useState('reviewing');
  const [internalRating, setInternalRating] = useState('');
  const [tags, setTags] = useState('');
  const [reason, setReason] = useState('');
  const [noteText, setNoteText] = useState('');

  const title = useMemo(() => bundle?.user?.email ?? userId ?? 'User', [bundle, userId]);

  const languageRows = useMemo(() => {
    const raw = (bundle as { languages?: unknown } | null)?.languages;
    return Array.isArray(raw) ? (raw as AdminLanguageRow[]) : [];
  }, [bundle]);

  async function load() {
    if (!userId) return;
    setLoading(true);
    try {
      const [b, n] = await Promise.all([adminApi.getUserProfileBundle(userId), adminApi.listUserNotes(userId)]);
      const bundleObj = (b ?? null) as UserBundle | null;
      setBundle(bundleObj);
      setNotes(Array.isArray(n) ? (n as NoteRow[]) : []);

      const existingStatus = bundleObj?.talent?.profile?.status ?? 'reviewing';
      setTalentStatus(existingStatus);
      setInternalRating(bundleObj?.talent?.profile?.internalRating != null ? String(bundleObj.talent.profile.internalRating) : '');
      setTags(Array.isArray(bundleObj?.talent?.profile?.tags) ? bundleObj.talent.profile.tags.join(', ') : '');
      setReason(bundleObj?.talent?.profile?.rejectionReason ?? '');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load user');
      setBundle(null);
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  if (loading) return <div className="text-sm text-zinc-600">Loading…</div>;
  if (!bundle) return <div className="text-sm text-zinc-600">User not found.</div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">{title}</h1>
        <div className="mt-1 text-sm text-zinc-600">{bundle?.user?.id ?? userId}</div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="mb-2 text-sm font-medium">Talent decision</div>
          <div className="grid gap-3">
            <div className="space-y-1">
              <div className="text-xs font-medium text-zinc-600">Status</div>
              <input className="h-10 w-full rounded-md border border-zinc-200 px-3" value={talentStatus} onChange={(e) => setTalentStatus(e.target.value)} placeholder="new | reviewing | approved | rejected" />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-medium text-zinc-600">Internal rating (optional)</div>
              <input className="h-10 w-full rounded-md border border-zinc-200 px-3" value={internalRating} onChange={(e) => setInternalRating(e.target.value)} placeholder="e.g. 4.5" inputMode="decimal" />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-medium text-zinc-600">Tags (comma-separated)</div>
              <input className="h-10 w-full rounded-md border border-zinc-200 px-3" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="strong_english, medical" />
            </div>
            <div className="space-y-1">
              <div className="text-xs font-medium text-zinc-600">Reason (optional)</div>
              <input className="h-10 w-full rounded-md border border-zinc-200 px-3" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Only used for rejections" />
            </div>

            <button
              disabled={savingStatus}
              onClick={async () => {
                if (!userId) return;
                setSavingStatus(true);
                try {
                  const body: { status: string; internalRating?: number; tags?: string[]; reason?: string } = {
                    status: talentStatus.trim() || 'reviewing',
                  };
                  const rating = internalRating.trim() ? Number(internalRating) : undefined;
                  if (internalRating.trim() && Number.isFinite(rating)) body.internalRating = rating;
                  const tagList = tags
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean);
                  if (tagList.length) body.tags = tagList;
                  if (reason.trim()) body.reason = reason.trim();
                  await adminApi.setUserStatus(userId, body);
                  toast.success('Status updated');
                  await load();
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : 'Update failed');
                } finally {
                  setSavingStatus(false);
                }
              }}
              className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white disabled:opacity-60"
            >
              {savingStatus ? 'Saving…' : 'Save status'}
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="mb-2 text-sm font-medium">Admin notes</div>
          <div className="space-y-3">
            <textarea className="min-h-24 w-full rounded-md border border-zinc-200 px-3 py-2 text-sm" value={noteText} onChange={(e) => setNoteText(e.target.value)} placeholder="Write a note…" />
            <button
              disabled={addingNote || !noteText.trim()}
              onClick={async () => {
                if (!userId) return;
                setAddingNote(true);
                try {
                  await adminApi.addUserNote(userId, noteText.trim());
                  setNoteText('');
                  toast.success('Note added');
                  const n = await adminApi.listUserNotes(userId);
                  setNotes(Array.isArray(n) ? (n as NoteRow[]) : []);
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : 'Add note failed');
                } finally {
                  setAddingNote(false);
                }
              }}
              className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-60"
            >
              {addingNote ? 'Adding…' : 'Add note'}
            </button>
          </div>

          <div className="mt-4 space-y-2">
            {notes.length === 0 ? (
              <div className="text-sm text-zinc-600">No notes.</div>
            ) : (
              notes.map((n) => (
                <div key={n.id} className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
                  <div className="text-xs text-zinc-600">
                    {n.admin?.email ?? 'admin'} · {n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}
                  </div>
                  <div className="mt-1 whitespace-pre-wrap text-sm text-zinc-900">{n.note}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="mb-2 text-sm font-medium">Languages</div>
        {languageRows.length === 0 ? (
          <div className="text-sm text-zinc-600">No languages listed.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-left text-xs font-medium text-zinc-600">
                  <th className="py-2 pr-4">Language</th>
                  <th className="py-2 pr-4">Speak</th>
                  <th className="py-2">Write</th>
                </tr>
              </thead>
              <tbody>
                {languageRows.map((row) => (
                  <tr key={row.id} className="border-b border-zinc-100">
                    <td className="py-2 pr-4 text-zinc-900">{row.language}</td>
                    <td className="py-2 pr-4 text-zinc-700">{proficiencyLabel(row.speakLevel)}</td>
                    <td className="py-2 text-zinc-700">{proficiencyLabel(row.writeLevel)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="mb-2 text-sm font-medium">Profile bundle (raw)</div>
        <pre className="max-h-[520px] overflow-auto rounded-md bg-zinc-50 p-3 text-xs text-zinc-900">
          {JSON.stringify(bundle, null, 2)}
        </pre>
      </div>
    </div>
  );
}

