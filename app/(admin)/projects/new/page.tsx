'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { adminApi, type CreateProjectInput, type ProjectPayType, type ProjectStatus, projectContractLabel } from '../../../../lib/adminApi';

const STATUSES: ProjectStatus[] = ['draft', 'active', 'paused', 'completed'];

function extractProjectRecord(parsed: unknown): Record<string, unknown> | null {
  if (!parsed || typeof parsed !== 'object') return null;
  const o = parsed as Record<string, unknown>;
  if ('projects' in o && Array.isArray(o.projects) && o.projects.length > 0) {
    const first = o.projects[0];
    if (first && typeof first === 'object') return first as Record<string, unknown>;
    return null;
  }
  if (typeof o.title === 'string' && typeof o.domain === 'string' && o.config !== undefined && typeof o.config === 'object' && o.config !== null) {
    return o;
  }
  return null;
}

/** Apply API-shaped project JSON to form setters. Returns error message or null. */
function applyProjectJsonToForm(
  raw: string,
  setters: {
    setTitle: (v: string) => void;
    setDomain: (v: string) => void;
    setDescription: (v: string) => void;
    setStatus: (v: CreateProjectInput['status']) => void;
    setPayType: (v: ProjectPayType) => void;
    setPayMin: (v: string) => void;
    setPayMax: (v: string) => void;
    setConfigJson: (v: string) => void;
    setRequirementJson: (v: string) => void;
  },
): string | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return 'Invalid JSON';
  }
  const o = extractProjectRecord(parsed);
  if (!o) {
    return 'Expected a project object with title, domain, and config, or { "projects": [ { … } ] }';
  }

  if (typeof o.title !== 'string' || !o.title.trim()) return 'Missing or invalid title';
  if (typeof o.domain !== 'string' || !o.domain.trim()) return 'Missing or invalid domain';
  if (typeof o.config !== 'object' || o.config === null) return 'Missing or invalid config object';

  setters.setTitle(o.title.trim());
  setters.setDomain(o.domain.trim());
  setters.setDescription(typeof o.description === 'string' ? o.description : '');

  const st = o.status;
  if (typeof st === 'string' && STATUSES.includes(st as ProjectStatus)) {
    setters.setStatus(st as ProjectStatus);
  } else {
    setters.setStatus('draft');
  }

  const hasMin = typeof o.payMin === 'number' && Number.isFinite(o.payMin) && o.payMin >= 0;
  const hasMax = typeof o.payMax === 'number' && Number.isFinite(o.payMax) && o.payMax >= 0;
  if (hasMin && hasMax) {
    setters.setPayMin(String(o.payMin));
    setters.setPayMax(String(o.payMax));
  } else if (typeof o.payPerTask === 'number' && Number.isFinite(o.payPerTask) && o.payPerTask >= 0) {
    const v = String(o.payPerTask);
    setters.setPayMin(v);
    setters.setPayMax(v);
  } else {
    return 'Provide payMin and payMax, or payPerTask';
  }

  const pt = o.payType;
  if (pt === 'per_hour' || pt === 'per_task') {
    setters.setPayType(pt);
  } else {
    setters.setPayType('per_task');
  }

  try {
    setters.setConfigJson(JSON.stringify(o.config, null, 2));
  } catch {
    return 'config could not be serialized';
  }

  if (o.requirement !== undefined && o.requirement !== null) {
    if (typeof o.requirement !== 'object') return 'requirement must be an object if present';
    try {
      setters.setRequirementJson(JSON.stringify(o.requirement, null, 2));
    } catch {
      return 'requirement could not be serialized';
    }
  } else {
    setters.setRequirementJson('');
  }

  return null;
}

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
  const [payType, setPayType] = useState<ProjectPayType>('per_task');
  const [payMin, setPayMin] = useState('1');
  const [payMax, setPayMax] = useState('1');
  const [status, setStatus] = useState<CreateProjectInput['status']>('draft');
  const [configJson, setConfigJson] = useState(JSON.stringify(DEFAULT_CONFIG, null, 2));
  const [requirementJson, setRequirementJson] = useState('');
  const [pasteJson, setPasteJson] = useState('');
  const [saving, setSaving] = useState(false);

  const minN = Number(payMin);
  const maxN = Number(payMax);
  const payValid = Number.isFinite(minN) && Number.isFinite(maxN) && minN >= 0 && maxN >= 0 && maxN >= minN;

  const disabled = useMemo(() => saving || !title.trim() || !domain.trim() || !payValid, [saving, title, domain, payValid]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">New project</h1>
        <p className="mt-1 text-sm text-zinc-600">Creates a project via `POST /admin/projects` (Mercor-style pay: min/max + per hour or per task).</p>
      </div>

      <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/80 p-4 shadow-sm">
        <div className="mb-2 text-sm font-medium text-zinc-900">Paste project JSON</div>
        <p className="mb-3 text-xs text-zinc-600">
          Paste a single project object (same shape as the API body) or <code className="rounded bg-white px-1 py-0.5">{`{ "projects": [ { … } ] }`}</code>.
          Click <strong>Fill form</strong> to load title, domain, description, status, pay fields, config, and optional requirement—then review and hit Create.
        </p>
        <textarea
          className="mb-3 min-h-40 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 font-mono text-xs"
          value={pasteJson}
          onChange={(e) => setPasteJson(e.target.value)}
          placeholder='{ "title": "…", "domain": "…", "payType": "per_hour", "payMin": 0, "payMax": 65, "config": { … } }'
          spellCheck={false}
        />
        <button
          type="button"
          onClick={() => {
            const err = applyProjectJsonToForm(pasteJson, {
              setTitle,
              setDomain,
              setDescription,
              setStatus,
              setPayType,
              setPayMin,
              setPayMax,
              setConfigJson,
              setRequirementJson,
            });
            if (err) {
              toast.error(err);
              return;
            }
            toast.success('Form filled from JSON — review and create when ready');
          }}
          className="inline-flex h-9 items-center justify-center rounded-md bg-zinc-900 px-3 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Fill form from JSON
        </button>
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
            <div className="text-xs font-medium text-zinc-600">Pay basis</div>
            <select
              className="h-10 w-full rounded-md border border-zinc-200 px-3"
              value={payType}
              onChange={(e) => setPayType(e.target.value as ProjectPayType)}
            >
              <option value="per_task">Per task</option>
              <option value="per_hour">Per hour</option>
            </select>
            <p className="text-xs text-zinc-500">{projectContractLabel(payType)}</p>
          </div>
          <div className="space-y-1 md:col-span-2 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="text-xs font-medium text-zinc-600">Compensation range (USD)</div>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-xs text-zinc-500">Minimum</label>
                <input
                  className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3"
                  value={payMin}
                  onChange={(e) => setPayMin(e.target.value)}
                  inputMode="decimal"
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-zinc-500">Maximum</label>
                <input
                  className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3"
                  value={payMax}
                  onChange={(e) => setPayMax(e.target.value)}
                  inputMode="decimal"
                  placeholder="65"
                />
              </div>
            </div>
            {!payValid ? (
              <p className="mt-2 text-xs text-red-700">Enter valid numbers with maximum ≥ minimum.</p>
            ) : (
              <p className="mt-2 text-xs text-zinc-600">
                Listing preview:{' '}
                <span className="font-medium text-zinc-900">
                  {payType === 'per_hour'
                    ? minN === maxN
                      ? `$${minN} per hour`
                      : `$${minN} – $${maxN} per hour`
                    : minN === maxN
                      ? `$${minN} per task`
                      : `$${minN} – $${maxN} per task`}
                </span>
              </p>
            )}
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

      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <div className="mb-2 text-sm font-medium">Requirement (JSON, optional)</div>
        <p className="mb-3 text-xs text-zinc-600">Filled automatically if your pasted JSON includes <code className="rounded bg-zinc-100 px-1">requirement</code>.</p>
        <textarea
          className="min-h-32 w-full rounded-md border border-zinc-200 px-3 py-2 font-mono text-xs"
          value={requirementJson}
          onChange={(e) => setRequirementJson(e.target.value)}
          placeholder='{"minAccuracy":0.85,"requiredSkills":[],"languages":[]}'
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
              let requirement: CreateProjectInput['requirement'] | undefined;
              if (requirementJson.trim()) {
                try {
                  requirement = JSON.parse(requirementJson) as CreateProjectInput['requirement'];
                } catch {
                  throw new Error('Requirement JSON is invalid');
                }
              }

              const created = await adminApi.createProject({
                title: title.trim(),
                description: description.trim() || undefined,
                domain: domain.trim(),
                status,
                payType,
                payMin: minN,
                payMax: maxN,
                config,
                ...(requirement ? { requirement } : {}),
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
