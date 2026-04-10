'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { adminApi, type CreateProjectInput } from '../../../../lib/adminApi';

const SAMPLE_PROJECT_MARKDOWN = `### About the Role
We’re hiring experienced reviewers to support a leading AI lab in advancing research and development of cutting-edge AI systems. This engagement focuses on domain-specific analysis and high-quality feedback to help improve model performance.

### Key Responsibilities
- You’ll be asked to create tasks and deliverables regarding common requests within your professional domain.
- Review model outputs for accuracy, completeness, and clarity.
- Provide structured feedback and edge cases to improve quality.

### Ideal Qualifications
- 4+ years of professional experience in your respective field.
- Excellent written communication with strong grammar and spelling.
- Comfortable following detailed guidelines and meeting quality targets.

### More About the Opportunity
- Project-based work; 15+ hours per week, with flexibility to scale up to 30+ hours.
- Typical review cadence: weekly; task time varies from 3–4 weeks per batch depending on scope.

### Contract and Payment Terms
- You will be engaged as an independent contractor.
- Payments are weekly via Stripe or Wise based on session records.
- Please note: we can only support US 8am–5pm (PST) coordination at this time.
`;

const DEFAULT_CONFIG: CreateProjectInput['config'] = {
  task_type: 'generic',
  input_schema: { type: 'object', fields: [{ name: 'text', type: 'string', required: true, description: 'Input text' }] },
  output_schema: { type: 'single_select', options: ['Yes', 'No'] },
  evaluation: { type: 'manual', passing_score: 0.8 },
};

export default function NewProjectPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [domain, setDomain] = useState('');
  const [description, setDescription] = useState(SAMPLE_PROJECT_MARKDOWN);
  const [payPerTask, setPayPerTask] = useState('1');
  const [status, setStatus] = useState<CreateProjectInput['status']>('draft');
  const [configJson, setConfigJson] = useState(JSON.stringify(DEFAULT_CONFIG, null, 2));
  const [saving, setSaving] = useState(false);

  const disabled = useMemo(() => saving || !title.trim() || !domain.trim() || Number(payPerTask) < 0, [saving, title, domain, payPerTask]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">New project</h1>
        <p className="mt-1 text-sm text-zinc-600">Creates a project via `POST /admin/projects`.</p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <div className="text-xs font-medium text-zinc-600">Title</div>
            <input className="h-10 w-full rounded-md border border-zinc-200 px-3" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-1">
            <div className="text-xs font-medium text-zinc-600">Domain</div>
            <input className="h-10 w-full rounded-md border border-zinc-200 px-3" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="e.g. Legal" />
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
              onChange={(e) => setStatus(e.target.value as CreateProjectInput['status'])}
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
        <p className="mb-3 text-xs text-zinc-600">
          This must match the backend `createProjectSchema` (`task_type`, `input_schema`, `output_schema`, `evaluation`).
        </p>
        <textarea
          className="min-h-64 w-full rounded-md border border-zinc-200 px-3 py-2 font-mono text-xs"
          value={configJson}
          onChange={(e) => setConfigJson(e.target.value)}
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          disabled={disabled}
          onClick={async () => {
            setSaving(true);
            try {
              let config: CreateProjectInput['config'];
              try {
                config = JSON.parse(configJson) as CreateProjectInput['config'];
              } catch {
                throw new Error('Config JSON is invalid');
              }
              const created = await adminApi.createProject({
                title: title.trim(),
                description: description.trim() || undefined,
                domain: domain.trim(),
                status,
                payPerTask: Number(payPerTask),
                config,
              });
              toast.success('Project created');
              router.replace(`/projects/${created.id}`);
            } catch (e) {
              const msg = e instanceof Error ? e.message : 'Create failed';
              toast.error(msg);
            } finally {
              setSaving(false);
            }
          }}
          className="inline-flex h-10 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white disabled:opacity-60"
        >
          {saving ? 'Creating…' : 'Create'}
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

