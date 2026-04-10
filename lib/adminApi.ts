import { apiRequest } from './httpClient';

export type PageEnvelope<T> = { items: T[]; page: number; limit: number; total: number };

export type ProjectStatus = 'draft' | 'active' | 'paused' | 'completed';

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
  payPerTask: number;
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

  async listApplications(params: { status?: string; projectId?: string } = {}) {
    const qs = new URLSearchParams();
    if (params.status) qs.set('status', params.status);
    if (params.projectId) qs.set('projectId', params.projectId);
    const suffix = qs.toString() ? `?${qs}` : '';
    return apiRequest<
      Array<{
        id: string;
        projectId: string;
        userId: string;
        status: string;
        createdAt: string;
        updatedAt: string;
        interviewScore?: number | null;
        rejectionReason?: string | null;
        project?: { id: string; title: string };
        user?: { id: string; email: string };
      }>
    >(`/admin/applications${suffix}`, { auth: true });
  },

  async approveApplication(id: string) {
    return apiRequest(`/admin/applications/${id}/approve`, { method: 'POST', auth: true });
  },

  async rejectApplication(id: string, reason?: string) {
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

