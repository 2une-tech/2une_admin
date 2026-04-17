import { apiRequest } from './httpClient';

export type PageEnvelope<T> = { items: T[]; page: number; limit: number; total: number };

export type ProjectStatus = 'draft' | 'active' | 'paused' | 'completed';

export type ProjectPayType = 'per_task' | 'per_hour';

const INR_FORMATTER = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

function formatINR(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return INR_FORMATTER.format(n);
}

/** Mercor-style summary for list rows and chips. */
export function formatProjectPaySummary(p: { payType: ProjectPayType; payMin: number; payMax: number }): string {
  const unit = p.payType === 'per_hour' ? 'hour' : 'task';
  if (p.payMin === p.payMax) return `${formatINR(p.payMin)} / ${unit}`;
  return `${formatINR(p.payMin)} – ${formatINR(p.payMax)} / ${unit}`;
}

export function projectContractLabel(payType: ProjectPayType): string {
  return payType === 'per_hour' ? 'Hourly contract' : 'Per-task contract';
}

export type ProjectConfig = {
  task_type: string;
  input_schema: {
    type: 'object';
    fields: Array<{
      name: string;
      type: 'string' | 'number' | 'boolean' | 'object' | 'array';
      required?: boolean;
      description?: string;
    }>;
  };
  output_schema:
    | { type: 'single_select'; options: string[] }
    | { type: 'multi_select'; options: string[]; minSelections?: number; maxSelections?: number }
    | { type: 'free_text'; maxLength?: number }
    | { type: 'structured'; schema: Record<string, unknown> };
  evaluation: { type: 'golden_set' | 'llm' | 'manual'; passing_score: number };
};

export type ProjectRequirement = {
  minAccuracy: number;
  requiredSkills: string[];
  languages: string[];
};

export type Project = {
  id: string;
  title: string;
  description?: string | null;
  domain: string;
  status: ProjectStatus;
  payType: ProjectPayType;
  payMin: number;
  payMax: number;
  /** Synced to payMax for sorting / legacy use. */
  payPerTask: number;
  createdAt?: string;
  updatedAt?: string;
  config?: { config: ProjectConfig } | null;
  requirement?: ProjectRequirement | null;
};

export type CreateProjectInput = {
  title: string;
  description?: string;
  domain: string;
  status?: ProjectStatus;
  payType?: ProjectPayType;
  payMin?: number;
  payMax?: number;
  /** Legacy single rate; use payMin + payMax + payType for Mercor-style ranges. */
  payPerTask?: number;
  config: ProjectConfig;
  requirement?: { minAccuracy: number; requiredSkills: string[]; languages: string[] };
};

export type UpdateProjectInput = Partial<CreateProjectInput>;

export type TaskStatus = 'pending' | 'assigned' | 'completed' | 'skipped' | 'archived';

export type TaskRow = {
  id: string;
  projectId: string;
  status: TaskStatus;
  inputData: unknown;
  expectedOutputs?: unknown;
  createdAt?: string;
  updatedAt?: string;
};

export const APPLICATION_STATUSES = [
  'applied',
  'under_review',
  'interview_pending',
  'approved',
  'rejected',
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export type ApplicationUserPreview = {
  id: string;
  email: string;
  profile?: { fullName: string | null } | null;
  skills: { id: string; name: string }[];
  languages: { id: string; language: string; speakLevel: string | null; writeLevel: string | null }[];
  talentProfile?: { status: string | null; internalRating: number | null; tags: string[] | null } | null;
};

export type AdminApplicationRow = {
  id: string;
  projectId: string;
  userId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  interviewScore: number | null;
  interviewTranscript: unknown;
  interviewCompletedAt: string | null;
  rejectionReason: string | null;
  reviewedAt: string | null;
  reviewedBy?: { id: string; email: string } | null;
  project?: { id: string; title: string };
  user: ApplicationUserPreview;
};

export const adminApi = {
  async listProjects(params: {
    page?: number;
    limit?: number;
    domain?: string;
    status?: ProjectStatus;
    minPay?: number;
    maxPay?: number;
  }): Promise<PageEnvelope<Project>> {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.domain) qs.set('domain', params.domain);
    if (params.status) qs.set('status', params.status);
    if (params.minPay != null) qs.set('minPay', String(params.minPay));
    if (params.maxPay != null) qs.set('maxPay', String(params.maxPay));
    const suffix = qs.toString() ? `?${qs}` : '';
    return apiRequest(`/admin/projects${suffix}`, { auth: true });
  },

  async createProject(input: CreateProjectInput): Promise<Project> {
    return apiRequest('/admin/projects', { method: 'POST', auth: true, body: input });
  },

  async bulkCreateProjects(projects: CreateProjectInput[]): Promise<{
    created: Project[];
    errors: { index: number; message: string }[];
    results: Array<
      | { index: number; ok: true; project: Project }
      | { index: number; ok: false; message: string }
    >;
    totalRequested: number;
    totalCreated: number;
  }> {
    return apiRequest('/admin/projects/bulk', { method: 'POST', auth: true, body: { projects } });
  },

  async getProject(id: string): Promise<Project> {
    return apiRequest(`/admin/projects/${id}`, { auth: true });
  },

  async updateProject(id: string, patch: UpdateProjectInput): Promise<Project> {
    return apiRequest(`/admin/projects/${id}`, { method: 'PUT', auth: true, body: patch });
  },

  async listTasks(projectId: string, params: { page?: number; limit?: number; status?: TaskStatus } = {}) {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.status) qs.set('status', params.status);
    const suffix = qs.toString() ? `?${qs}` : '';
    return apiRequest<PageEnvelope<TaskRow>>(`/admin/projects/${projectId}/tasks${suffix}`, { auth: true });
  },

  async bulkUploadTasks(
    projectId: string,
    body:
      | { format: 'json'; rows: Array<Record<string, unknown>>; expectedOutputs?: unknown }
      | { format: 'csv'; csv: string; delimiter?: string; expectedOutputs?: unknown },
  ) {
    return apiRequest(`/admin/projects/${projectId}/tasks/bulk-upload`, { method: 'POST', auth: true, body });
  },

  async getProjectApplicationStats(projectId: string): Promise<{
    projectId: string;
    total: number;
    byStatus: Record<string, number>;
    conversionRate: number;
  }> {
    return apiRequest(`/admin/projects/${projectId}/application-stats`, { auth: true });
  },

  async listProjectApplications(
    projectId: string,
    params: {
      page?: number;
      limit?: number;
      status?: ApplicationStatus | '';
      sort?: 'updatedAt' | 'createdAt' | 'interviewScore';
      dir?: 'asc' | 'desc';
    } = {},
  ): Promise<PageEnvelope<AdminApplicationRow> & { project: { id: string; title: string } }> {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.status) qs.set('status', params.status);
    if (params.sort) qs.set('sort', params.sort);
    if (params.dir) qs.set('dir', params.dir);
    const suffix = qs.toString() ? `?${qs}` : '';
    return apiRequest(`/admin/projects/${projectId}/applications${suffix}`, { auth: true });
  },

  async listApplications(
    params: {
      status?: ApplicationStatus | '';
      projectId?: string;
      page?: number;
      limit?: number;
      sort?: 'updatedAt' | 'createdAt' | 'interviewScore';
      dir?: 'asc' | 'desc';
    } = {},
  ): Promise<PageEnvelope<AdminApplicationRow>> {
    const qs = new URLSearchParams();
    if (params.status) qs.set('status', params.status);
    if (params.projectId) qs.set('projectId', params.projectId);
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.sort) qs.set('sort', params.sort);
    if (params.dir) qs.set('dir', params.dir);
    const suffix = qs.toString() ? `?${qs}` : '';
    return apiRequest(`/admin/applications${suffix}`, { auth: true });
  },

  async approveApplication(id: string): Promise<AdminApplicationRow> {
    return apiRequest(`/admin/applications/${id}/approve`, { method: 'POST', auth: true });
  },

  async rejectApplication(id: string, reason?: string): Promise<AdminApplicationRow> {
    return apiRequest(`/admin/applications/${id}/reject`, { method: 'POST', auth: true, body: reason ? { reason } : {} });
  },

  async listUsers(params: { page?: number; limit?: number; status?: string; q?: string } = {}) {
    const qs = new URLSearchParams();
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.status) qs.set('status', params.status);
    if (params.q) qs.set('q', params.q);
    const suffix = qs.toString() ? `?${qs}` : '';
    return apiRequest<{
      items: Array<{
        id: string;
        email: string;
        role: string;
        status: string;
        isVerified: boolean;
        createdAt: string;
        talentProfile?: { status?: string | null } | null;
      }>;
      page: number;
      limit: number;
      total: number;
    }>(`/admin/users${suffix}`, { auth: true });
  },

  async getUserProfileBundle(userId: string) {
    return apiRequest<unknown>(`/admin/users/${userId}/profile`, { auth: true });
  },

  async setUserStatus(userId: string, body: { status: string; internalRating?: number | null; tags?: string[]; reason?: string }) {
    return apiRequest(`/admin/users/${userId}/status`, { method: 'POST', auth: true, body });
  },

  async addUserNote(userId: string, note: string) {
    return apiRequest(`/admin/users/${userId}/notes`, { method: 'POST', auth: true, body: { note } });
  },

  async listUserNotes(userId: string) {
    return apiRequest<unknown[]>(`/admin/users/${userId}/notes`, { auth: true });
  },

  async listEvents(params: { eventName?: string; userId?: string; from?: string; to?: string; page?: number; limit?: number } = {}) {
    const qs = new URLSearchParams();
    if (params.eventName) qs.set('eventName', params.eventName);
    if (params.userId) qs.set('userId', params.userId);
    if (params.from) qs.set('from', params.from);
    if (params.to) qs.set('to', params.to);
    if (params.page) qs.set('page', String(params.page));
    if (params.limit) qs.set('limit', String(params.limit));
    const suffix = qs.toString() ? `?${qs}` : '';
    return apiRequest<{ items: unknown[]; page: number; limit: number; total: number }>(`/admin/events${suffix}`, { auth: true });
  },
};

