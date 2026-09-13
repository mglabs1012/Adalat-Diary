import type { CaseListResponse, CaseRecord, DiaryStats } from '@/types/case';

export class ApiError extends Error {
  status: number;
  issues?: { path: string; message: string }[];
  constructor(message: string, status: number, issues?: { path: string; message: string }[]) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.issues = issues;
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    throw new ApiError(body?.error ?? `Request failed (${res.status})`, res.status, body?.issues);
  }
  return body as T;
}

export const fetcher = <T,>(url: string) => request<T>(url);

export const casesApi = {
  list: (query: string) => request<CaseListResponse>(`/api/cases?${query}`),
  get: (id: string) => request<CaseRecord>(`/api/cases/${id}`),
  create: (data: unknown) =>
    request<CaseRecord>('/api/cases', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: unknown) =>
    request<CaseRecord>(`/api/cases/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  remove: (id: string) => request<{ id: string }>(`/api/cases/${id}`, { method: 'DELETE' }),
  adjourn: (id: string, data: unknown) =>
    request<CaseRecord>(`/api/cases/${id}/adjourn`, { method: 'POST', body: JSON.stringify(data) }),
  stats: () => request<DiaryStats>('/api/stats'),
};
