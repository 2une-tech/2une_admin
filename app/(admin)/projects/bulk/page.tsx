'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { adminApi, type CreateProjectInput, type Project } from '../../../../lib/adminApi';

const SAMPLE_FALLBACK = `{
  "projects": [
    {
      "title": "Example project",
      "domain": "Legal",
      "payType": "per_task",
      "payMin": 1,
      "payMax": 1,
      "status": "draft",
      "config": {
        "task_type": "generic",
        "input_schema": {
          "type": "object",
          "fields": [{ "name": "text", "type": "string", "required": true, "description": "Input text" }]
        },
        "output_schema": { "type": "single_select", "options": ["Yes", "No"] },
        "evaluation": { "type": "manual", "passing_score": 0.8 }
      }
    }
  ]
}`;

/** Documents the JSON envelope after a successful HTTP response (upload status lives in `data`). */
const EXAMPLE_UPLOAD_STATUS_RESPONSE = `{
  "success": true,
  "data": {
    "totalRequested": 3,
    "totalCreated": 2,
    "results": [
      {
        "index": 0,
        "ok": true,
        "project": {
          "id": "0195f1a0-0000-7000-8000-000000000001",
          "title": "Sample — Draft legal review",
          "domain": "Legal",
          "status": "draft",
          "payType": "per_hour",
          "payMin": 45,
          "payMax": 65,
          "payPerTask": 65
        }
      },
      {
        "index": 1,
        "ok": false,
        "message": "Example: row failed validation or database error"
      },
      {
        "index": 2,
        "ok": true,
        "project": {
          "id": "0195f1a0-0000-7000-8000-000000000002",
          "title": "Sample — Paused finance tasks",
          "domain": "Finance",
          "status": "paused",
          "payType": "per_task",
          "payMin": 0.5,
          "payMax": 2.5,
          "payPerTask": 2.5
        }
      }
    ],
    "created": [ "…full project objects for successful rows…" ],
    "errors": [
      { "index": 1, "message": "Example: row failed validation or database error" }
    ]
  }
}`;

function normalizeBulkPayload(parsed: unknown): CreateProjectInput[] {
  if (Array.isArray(parsed)) {
    return parsed as CreateProjectInput[];
  }
  if (parsed && typeof parsed === 'object' && 'projects' in parsed && Array.isArray((parsed as { projects: unknown }).projects)) {
    return (parsed as { projects: CreateProjectInput[] }).projects;
  }
  throw new Error('JSON must be an array of projects or an object with a "projects" array');
}

type RowSummary = { index: number; title: string; domain: string; status: string };

export default function BulkProjectsPage() {
  const router = useRouter();
  const [jsonText, setJsonText] = useState('');
  const [sampleLoading, setSampleLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<{
    created: Project[];
    errors: { index: number; message: string }[];
    results: Array<{ index: number; ok: true; project: Project } | { index: number; ok: false; message: string }>;
    totalRequested: number;
    totalCreated: number;
  } | null>(null);
  const [lastRowSummaries, setLastRowSummaries] = useState<RowSummary[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetch('/samples/bulk-projects-upload.json')
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then((t) => {
        if (!cancelled) setJsonText(t);
      })
      .catch(() => {
        if (!cancelled) setJsonText(SAMPLE_FALLBACK);
      })
      .finally(() => {
        if (!cancelled) setSampleLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const disabled = useMemo(
    () => submitting || sampleLoading || !jsonText.trim(),
    [submitting, sampleLoading, jsonText],
  );

  async function loadSampleFromFile() {
    try {
      const res = await fetch('/samples/bulk-projects-upload.json');
      if (!res.ok) throw new Error(String(res.status));
      const t = await res.text();
      setJsonText(t);
      toast.success('Loaded sample from /samples/bulk-projects-upload.json');
    } catch {
      setJsonText(SAMPLE_FALLBACK);
      toast.message('Using built-in fallback sample (file not found)');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Bulk upload projects</h1>
          <p className="mt-1 text-sm text-zinc-600">
            Up to 100 projects per request. Each row uses the same fields as single create (including optional{' '}
            <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">status</code>: draft · active · paused · completed). After upload, the UI lists
            per-row status; the API also returns <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">data.results</code> aligned by{' '}
            <code className="rounded bg-zinc-100 px-1 py-0.5 text-xs">index</code>.
          </p>
        </div>
        <Link
          href="/projects"
          className="inline-flex h-10 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
        >
          Back to list
        </Link>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="mb-2 text-sm font-medium text-zinc-900">Sample files and response shape</div>
        <ul className="list-inside list-disc space-y-1 text-xs text-zinc-600">
          <li>
            Download the upload template:{' '}
            <a
              href="/samples/bulk-projects-upload.json"
              download="bulk-projects-upload.json"
              className="font-medium text-zinc-900 underline"
            >
              bulk-projects-upload.json
            </a>{' '}
            (three rows with different <code className="rounded bg-zinc-100 px-1">status</code> values).
          </li>
          <li>
            The API responds with <code className="rounded bg-zinc-100 px-1">totalCreated</code>, <code className="rounded bg-zinc-100 px-1">totalRequested</code>,{' '}
            <code className="rounded bg-zinc-100 px-1">results[]</code> (per index), plus <code className="rounded bg-zinc-100 px-1">errors[]</code> for failed rows
            only. Download:{' '}
            <a
              href="/samples/bulk-upload-response.example.json"
              download="bulk-upload-response.example.json"
              className="font-medium text-zinc-900 underline"
            >
              bulk-upload-response.example.json
            </a>
            .
          </li>
        </ul>
        <details className="mt-3 rounded-md border border-zinc-200 bg-zinc-50 p-3">
          <summary className="cursor-pointer text-xs font-medium text-zinc-800">Example JSON: upload status (API response body)</summary>
          <pre className="mt-2 max-h-64 overflow-auto rounded border border-zinc-200 bg-white p-2 font-mono text-[11px] leading-relaxed text-zinc-800">
            {EXAMPLE_UPLOAD_STATUS_RESPONSE}
          </pre>
        </details>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-zinc-900">
            <span className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium hover:bg-zinc-100">Choose JSON file</span>
            <input
              type="file"
              accept=".json,application/json"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  const text = typeof reader.result === 'string' ? reader.result : '';
                  setJsonText(text);
                  toast.success(`Loaded ${file.name}`);
                };
                reader.onerror = () => toast.error('Could not read file');
                reader.readAsText(file, 'UTF-8');
                e.target.value = '';
              }}
            />
          </label>
          <button
            type="button"
            className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-900 hover:bg-zinc-50"
            onClick={() => void loadSampleFromFile()}
          >
            Load sample JSON
          </button>
          <a
            href="/samples/bulk-projects-upload.json"
            download="bulk-projects-upload.json"
            className="inline-flex items-center rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-900 hover:bg-zinc-50"
          >
            Download sample
          </a>
        </div>
        {sampleLoading ? (
          <div className="text-sm text-zinc-600">Loading sample template…</div>
        ) : (
          <textarea
            className="min-h-80 w-full rounded-md border border-zinc-200 px-3 py-2 font-mono text-xs"
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            spellCheck={false}
          />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          disabled={disabled}
          type="button"
          onClick={async () => {
            setSubmitting(true);
            setLastResult(null);
            setLastRowSummaries(null);
            try {
              let parsed: unknown;
              try {
                parsed = JSON.parse(jsonText) as unknown;
              } catch {
                throw new Error('Invalid JSON');
              }
              const projects = normalizeBulkPayload(parsed);
              if (projects.length === 0) {
                throw new Error('No projects in payload');
              }
              if (projects.length > 100) {
                throw new Error('Maximum 100 projects per request');
              }
              const summaries: RowSummary[] = projects.map((p, index) => ({
                index,
                title: p.title ?? `(row ${index})`,
                domain: p.domain ?? '—',
                status: p.status ?? 'draft',
              }));
              const result = await adminApi.bulkCreateProjects(projects);
              setLastResult(result);
              setLastRowSummaries(summaries);
              if (result.totalCreated === result.totalRequested) {
                toast.success(`Created ${result.totalCreated} project(s)`);
              } else if (result.totalCreated > 0) {
                toast.message(`Created ${result.totalCreated} of ${result.totalRequested}; see table below`);
              } else {
                toast.error('No projects were created');
              }
            } catch (e) {
              const msg = e instanceof Error ? e.message : 'Bulk upload failed';
              toast.error(msg);
            } finally {
              setSubmitting(false);
            }
          }}
          className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white disabled:opacity-60"
        >
          {submitting ? 'Uploading…' : 'Upload projects'}
        </button>
      </div>

      {lastResult && lastRowSummaries ? (
        <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div>
            <div className="text-sm font-medium text-zinc-900">Upload status</div>
            <p className="mt-1 text-sm text-zinc-600">
              <span className="font-medium text-zinc-900">{lastResult.totalCreated}</span> of{' '}
              <span className="font-medium text-zinc-900">{lastResult.totalRequested}</span> created.
              {lastResult.totalCreated > 0 ? (
                <button
                  type="button"
                  className="ml-2 text-sm font-medium text-zinc-900 underline"
                  onClick={() => router.push('/projects')}
                >
                  Open projects list
                </button>
              ) : null}
            </p>
          </div>

          <div className="overflow-x-auto rounded-lg border border-zinc-200">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-xs font-medium text-zinc-600">
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Title</th>
                  <th className="px-3 py-2">Requested status</th>
                  <th className="px-3 py-2">Result</th>
                  <th className="px-3 py-2">Details</th>
                </tr>
              </thead>
              <tbody>
                {lastRowSummaries.map((row) => {
                  const r = lastResult.results.find((x) => x.index === row.index);
                  const ok = r?.ok === true;
                  return (
                    <tr key={row.index} className="border-b border-zinc-100">
                      <td className="px-3 py-2 font-mono text-xs text-zinc-600">{row.index}</td>
                      <td className="max-w-[200px] truncate px-3 py-2 text-zinc-900" title={row.title}>
                        {row.title}
                      </td>
                      <td className="px-3 py-2">
                        <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs">{row.status}</span>
                      </td>
                      <td className="px-3 py-2">
                        {r == null ? (
                          <span className="text-xs text-zinc-500">—</span>
                        ) : ok ? (
                          <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-900">Created</span>
                        ) : (
                          <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-900">Failed</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-xs text-zinc-700">
                        {r == null ? (
                          '—'
                        ) : ok ? (
                          <Link className="font-medium text-zinc-900 underline" href={`/projects/${r.project.id}`}>
                            {r.project.id.slice(0, 8)}…
                          </Link>
                        ) : (
                          <span className="text-red-800">{r.message}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <details className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
            <summary className="cursor-pointer text-xs font-medium text-zinc-800">Raw API payload (debug)</summary>
            <pre className="mt-2 max-h-48 overflow-auto rounded border border-zinc-200 bg-white p-2 font-mono text-[11px] text-zinc-800">
              {JSON.stringify(
                {
                  totalRequested: lastResult.totalRequested,
                  totalCreated: lastResult.totalCreated,
                  errors: lastResult.errors,
                  results: lastResult.results,
                },
                null,
                2,
              )}
            </pre>
          </details>
        </div>
      ) : null}
    </div>
  );
}
