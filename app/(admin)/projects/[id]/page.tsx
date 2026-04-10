'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { adminApi, type Project, type ProjectStatus } from '../../../../lib/adminApi';

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [domain, setDomain] = useState('');
  const [description, setDescription] = useState('');
  const [payPerTask, setPayPerTask] = useState('0');
  const [status, setStatus] = useState<ProjectStatus>('draft');
  const [configJson, setConfigJson] = useState<string>('');
  const [requirementJson, setRequirementJson] = useState<string>('');

  const disabled = useMemo(() => saving || !title.trim() || !domain.trim() || Number(payPerTask) < 0, [saving, title, domain, payPerTask]);

  async function load() {
    if (!id) return;
    setLoading(true);
    try {
      const p = await adminApi.getProject(id);
      setProject(p);
      setTitle(p.title ?? '');
      setDomain(p.domain ?? '');
      setDescription(p.description ?? '');
      setPayPerTask(String(p.payPerTask ?? 0));
      setStatus((p.status ?? 'draft') as ProjectStatus);

      const pAny = p as unknown as { config?: unknown };
      const cfg =
        typeof pAny.config === 'object' && pAny.config
          ? ((pAny.config as Record<string, unknown>)['config'] as unknown) ?? pAny.config
          : null;
      setConfigJson(cfg ? JSON.stringify(cfg, null, 2) : '');
      setRequirementJson(p.requirement ? JSON.stringify(p.requirement, null, 2) : '');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to load project';
      toast.error(msg);
      setProject(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) return <div className="text-sm text-zinc-600">Loading…</div>;
  if (!project) return <div className="text-sm text-zinc-600">Project not found.</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{project.title}</h1>
          <div className="mt-1 text-sm text-zinc-600">{project.id}</div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-medium hover:bg-zinc-50"
            href={`/projects/${project.id}/tasks`}
          >
            View tasks
          </Link>
          <Link
            className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-medium hover:bg-zinc-50"
            href={`/projects/${project.id}/tasks/bulk-upload`}
          >
            Bulk upload
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <div className="text-xs font-medium text-zinc-600">Title</div>
            <input className="h-10 w-full rounded-md border border-zinc-200 px-3" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1">
            <div className="text-xs font-medium text-zinc-600">Domain</div>
            <input className="h-10 w-full rounded-md border border-zinc-200 px-3" value={domain} onChange={(e) => setDomain(e.target.value)} />
          </div>
          <div className="space-y-1 md:col-span-2">
            <div className="text-xs font-medium text-zinc-600">Description</div>
            <textarea className="min-h-24 w-full rounded-md border border-zinc-200 px-3 py-2" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div className="space-y-1">
            <div className="text-xs font-medium text-zinc-600">Status</div>
            <select
              className="h-10 w-full rounded-md border border-zinc-200 px-3"
              value={status}
              onChange={(e) => setStatus(e.target.value as ProjectStatus)}
            >
              <option value="draft">draft</option>
              <option value="active">active</option>
              <option value="paused">paused</option>
              <option value="completed">completed</option>
            </select>
          </div>
          <div className="space-y-1">
            <div className="text-xs font-medium text-zinc-600">Pay per task</div>
            <input className="h-10 w-full rounded-md border border-zinc-200 px-3" value={payPerTask} onChange={(e) => setPayPerTask(e.target.value)} inputMode="decimal" />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="mb-2 text-sm font-medium">Config (JSON)</div>
        <textarea
          className="min-h-56 w-full rounded-md border border-zinc-200 px-3 py-2 font-mono text-xs"
          value={configJson}
          onChange={(e) => setConfigJson(e.target.value)}
          placeholder="{ ... }"
        />
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="mb-2 text-sm font-medium">Requirement (JSON, optional)</div>
        <textarea
          className="min-h-40 w-full rounded-md border border-zinc-200 px-3 py-2 font-mono text-xs"
          value={requirementJson}
          onChange={(e) => setRequirementJson(e.target.value)}
          placeholder='{"minAccuracy":0.8,"requiredSkills":[],"languages":[]}'
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          disabled={disabled}
          onClick={async () => {
            if (!id) return;
            setSaving(true);
            try {
              const patch: Record<string, unknown> = {
                title: title.trim(),
                domain: domain.trim(),
                description: description.trim() || null,
                status,
                payPerTask: Number(payPerTask),
              };
              if (configJson.trim()) {
                try {
                  patch.config = JSON.parse(configJson);
                } catch {
                  throw new Error('Config JSON is invalid');
                }
              }
              if (requirementJson.trim()) {
                try {
                  patch.requirement = JSON.parse(requirementJson);
                } catch {
                  throw new Error('Requirement JSON is invalid');
                }
              }
              const updated = await adminApi.updateProject(id, patch);
              setProject(updated);
              toast.success('Project updated');
            } catch (e) {
              const msg = e instanceof Error ? e.message : 'Update failed';
              toast.error(msg);
            } finally {
              setSaving(false);
            }
          }}
          className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          onClick={() => void load()}
          className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
        >
          Reload
        </button>
      </div>
    </div>
  );
}

