'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../../lib/httpClient';

export default function AdminHome() {
  const [projectsTotal, setProjectsTotal] = useState<number | null>(null);
  const [eventsTotal, setEventsTotal] = useState<number | null>(null);

  const cards = useMemo(
    () => [
      { href: '/projects', label: 'Projects', value: projectsTotal },
      { href: '/applications', label: 'Applications', value: null },
      { href: '/users', label: 'Users', value: null },
      { href: '/events', label: 'Events', value: eventsTotal },
    ],
    [projectsTotal, eventsTotal],
  );

  useEffect(() => {
    (async () => {
      try {
        const projects = await apiRequest<{ items: unknown[]; total: number }>('/admin/projects?page=1&limit=1', {
          auth: true,
        });
        setProjectsTotal(projects.total);
      } catch {
        setProjectsTotal(null);
      }
      try {
        const events = await apiRequest<{ items: unknown[]; total: number }>('/admin/events?page=1&limit=1', { auth: true });
        setEventsTotal(events.total);
      } catch {
        setEventsTotal(null);
      }
    })();
  }, []);

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {cards.map((c) => (
        <Link
          key={c.href}
          href={c.href}
          className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm hover:bg-zinc-50"
        >
          <div className="text-sm font-medium text-zinc-900">{c.label}</div>
          <div className="mt-2 text-2xl font-semibold text-zinc-900">{c.value ?? '—'}</div>
          <div className="mt-1 text-xs text-zinc-600">Open {c.label.toLowerCase()}</div>
        </Link>
      ))}
    </div>
  );
}

