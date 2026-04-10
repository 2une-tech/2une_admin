'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { adminApi } from '../../../../../../lib/adminApi';

const EXAMPLE_JSON = JSON.stringify(
  {
    format: 'json',
    rows: [{ text: 'Example input row 1' }, { text: 'Example input row 2' }],
    expectedOutputs: [{ type: 'single_select', options: ['Yes', 'No'] }],
  },
  null,
  2,
);

const EXAMPLE_CSV = `format: csv

text
"Example input row 1"
"Example input row 2"
`;

export default function BulkUploadPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const projectId = Array.isArray(params?.id) ? params.id[0] : params?.id;

  const [mode, setMode] = useState<'json' | 'csv'>('json');
  const [jsonBody, setJsonBody] = useState(EXAMPLE_JSON);
  const [csvText, setCsvText] = useState('text\n"Example input row 1"\n"Example input row 2"\n');
  const [delimiter, setDelimiter] = useState(',');
  const [expectedOutputsJson, setExpectedOutputsJson] = useState('[{"type":"single_select","options":["Yes","No"]}]');
  const [uploading, setUploading] = useState(false);

  const disabled = useMemo(() => uploading || !projectId, [uploading, projectId]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Bulk upload tasks</h1>
        <p className="mt-1 text-sm text-zinc-600">Uploads tasks via `POST /admin/projects/:id/tasks/bulk-upload`.</p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setMode('json')}
            className={[
              'h-9 rounded-md px-3 text-sm font-medium',
              mode === 'json' ? 'bg-zinc-900 text-white' : 'border border-zinc-200 bg-white hover:bg-zinc-50',
            ].join(' ')}
          >
            JSON
          </button>
          <button
            onClick={() => setMode('csv')}
            className={[
              'h-9 rounded-md px-3 text-sm font-medium',
              mode === 'csv' ? 'bg-zinc-900 text-white' : 'border border-zinc-200 bg-white hover:bg-zinc-50',
            ].join(' ')}
          >
            CSV
          </button>
        </div>
      </div>

      {mode === 'json' ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="mb-2 text-sm font-medium">Request body (JSON)</div>
          <p className="mb-3 text-xs text-zinc-600">
            Must include <span className="font-mono">{`format: "json"`}</span> and <span className="font-mono">rows: [...]</span>.
          </p>
          <textarea
            className="min-h-72 w-full rounded-md border border-zinc-200 px-3 py-2 font-mono text-xs"
            value={jsonBody}
            onChange={(e) => setJsonBody(e.target.value)}
          />
          <div className="mt-3 text-xs text-zinc-600">Example</div>
          <pre className="mt-2 overflow-auto rounded-md bg-zinc-50 p-3 text-xs">{EXAMPLE_JSON}</pre>
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="mb-2 text-sm font-medium">CSV content</div>
          <p className="mb-3 text-xs text-zinc-600">First row must be headers. Backend parses with `csv-parse`.</p>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1 md:col-span-1">
              <div className="text-xs font-medium text-zinc-600">Delimiter</div>
              <input
                className="h-10 w-full rounded-md border border-zinc-200 px-3 font-mono text-sm"
                value={delimiter}
                onChange={(e) => setDelimiter(e.target.value)}
                placeholder=","
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <div className="text-xs font-medium text-zinc-600">Expected outputs (JSON, optional)</div>
              <input
                className="h-10 w-full rounded-md border border-zinc-200 px-3 font-mono text-xs"
                value={expectedOutputsJson}
                onChange={(e) => setExpectedOutputsJson(e.target.value)}
              />
            </div>
          </div>
          <textarea
            className="mt-3 min-h-72 w-full rounded-md border border-zinc-200 px-3 py-2 font-mono text-xs"
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
          />
          <div className="mt-3 text-xs text-zinc-600">Example (conceptual)</div>
          <pre className="mt-2 overflow-auto rounded-md bg-zinc-50 p-3 text-xs">{EXAMPLE_CSV}</pre>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          disabled={disabled}
          onClick={async () => {
            if (!projectId) return;
            setUploading(true);
            try {
              if (mode === 'json') {
                let body: unknown;
                try {
                  body = JSON.parse(jsonBody);
                } catch {
                  throw new Error('JSON body is invalid');
                }
                const parsed = body as { format?: unknown };
                if (!parsed || typeof parsed !== 'object') throw new Error('JSON body must be an object');
                if (parsed.format !== 'json') throw new Error('JSON body must include format: "json"');
                await adminApi.bulkUploadTasks(
                  projectId,
                  body as { format: 'json'; rows: Array<Record<string, unknown>>; expectedOutputs?: unknown },
                );
              } else {
                let expectedOutputs: unknown | undefined;
                if (expectedOutputsJson.trim()) {
                  try {
                    expectedOutputs = JSON.parse(expectedOutputsJson);
                  } catch {
                    throw new Error('Expected outputs JSON is invalid');
                  }
                }
                await adminApi.bulkUploadTasks(projectId, {
                  format: 'csv',
                  csv: csvText,
                  delimiter: delimiter || ',',
                  expectedOutputs,
                });
              }
              toast.success('Bulk upload submitted');
              router.replace(`/projects/${projectId}/tasks`);
            } catch (e) {
              const msg = e instanceof Error ? e.message : 'Bulk upload failed';
              toast.error(msg);
            } finally {
              setUploading(false);
            }
          }}
          className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white disabled:opacity-60"
        >
          {uploading ? 'Uploading…' : 'Upload'}
        </button>
        <button
          onClick={() => router.back()}
          className="inline-flex h-10 items-center justify-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

