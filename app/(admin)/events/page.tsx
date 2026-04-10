'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { adminApi } from '../../../lib/adminApi';

export default function EventsPage() {
  const [items, setItems] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  const [eventName, setEventName] = useState('');
  const [userId, setUserId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const label = useMemo(() => {
    const parts: string[] = [];
    if (eventName.trim()) parts.push(`eventName=${eventName.trim()}`);
    if (userId.trim()) parts.push(`userId=${userId.trim()}`);
    if (from.trim()) parts.push(`from=${from.trim()}`);
    if (to.trim()) parts.push(`to=${to.trim()}`);
    return parts.length ? parts.join(' · ') : 'All events';
  }, [eventName, userId, from, to]);

  async function load() {
    setLoading(true);
    try {
      const res = await adminApi.listEvents({
        page: 1,
        limit: 50,
        eventName: eventName.trim() || undefined,
        userId: userId.trim() || undefined,
        from: from.trim() || undefined,
        to: to.trim() || undefined,
      });
      setItems(res.items ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load events');
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
        <h1 className="text-xl font-semibold">Events</h1>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-4">
          <div className="space-y-1">
            <div className="text-xs font-medium text-zinc-600">Event name</div>
            <input className="h-10 w-full rounded-md border border-zinc-200 px-3" value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="user_login" />
          </div>
          <div className="space-y-1">
            <div className="text-xs font-medium text-zinc-600">User ID</div>
            <input className="h-10 w-full rounded-md border border-zinc-200 px-3 font-mono text-xs" value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="uuid" />
          </div>
          <div className="space-y-1">
            <div className="text-xs font-medium text-zinc-600">From (ISO date)</div>
            <input className="h-10 w-full rounded-md border border-zinc-200 px-3 font-mono text-xs" value={from} onChange={(e) => setFrom(e.target.value)} placeholder="2026-04-01" />
          </div>
          <div className="space-y-1">
            <div className="text-xs font-medium text-zinc-600">To (ISO date)</div>
            <input className="h-10 w-full rounded-md border border-zinc-200 px-3 font-mono text-xs" value={to} onChange={(e) => setTo(e.target.value)} placeholder="2026-04-09" />
          </div>
          <div className="md:col-span-4">
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
          <div className="p-4 text-sm text-zinc-600">No events found.</div>
        ) : (
          <div className="divide-y divide-zinc-200">
            {items.map((ev, idx) => {
              const row = (ev ?? {}) as Record<string, unknown>;
              const id = typeof row.id === 'string' ? row.id : `row-${idx}`;
              const eventName = typeof row.eventName === 'string' ? row.eventName : 'event';
              const createdAt = typeof row.createdAt === 'string' ? row.createdAt : '';
              const userId = typeof row.userId === 'string' ? row.userId : '';
              const actorUserId = typeof row.actorUserId === 'string' ? row.actorUserId : '';
              const actorRole = typeof row.actorRole === 'string' ? row.actorRole : '';

              return (
              <div key={id} className="px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm font-medium text-zinc-900">{eventName}</div>
                  <div className="text-xs text-zinc-600">{createdAt ? new Date(createdAt).toLocaleString() : ''}</div>
                </div>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-600">
                  {userId ? <span className="rounded bg-zinc-100 px-2 py-0.5">userId: {userId}</span> : null}
                  {actorUserId ? <span className="rounded bg-zinc-100 px-2 py-0.5">actorUserId: {actorUserId}</span> : null}
                  {actorRole ? <span className="rounded bg-zinc-100 px-2 py-0.5">actorRole: {actorRole}</span> : null}
                </div>
                <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-zinc-50 p-3 text-xs text-zinc-900">
                  {JSON.stringify(row, null, 2)}
                </pre>
              </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

