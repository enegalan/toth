const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

const AUTH_REQUEST_TIMEOUT_MS = 15000;

const defaultFetchOptions: RequestInit = {
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
};

function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number = AUTH_REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timeout),
  );
}

export interface AuthUser {
  id: string;
  email: string;
  role: 'user' | 'admin';
}

export async function authMe(): Promise<{ user: AuthUser | null }> {
  const res = await fetch(`${API_URL}/api/auth/me`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to get session');
  return res.json();
}

export async function authLogin(
  email: string,
  password: string,
): Promise<{ user: AuthUser }> {
  try {
    const res = await fetchWithTimeout(
      `${API_URL}/api/auth/login`,
      {
        method: 'POST',
        ...defaultFetchOptions,
        body: JSON.stringify({ email, password }),
      },
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error((data as { message?: string }).message ?? 'Login failed');
    }
    return res.json();
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(
        'Request timed out. Is the API running at ' + API_URL + '?',
      );
    }
    throw err;
  }
}

export async function authRegister(
  email: string,
  password: string,
): Promise<{ user: AuthUser }> {
  try {
    const res = await fetchWithTimeout(
      `${API_URL}/api/auth/register`,
      {
        method: 'POST',
        ...defaultFetchOptions,
        body: JSON.stringify({ email, password }),
      },
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error((data as { message?: string }).message ?? 'Registration failed');
    }
    return res.json();
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(
        'Request timed out. Is the API running at ' + API_URL + '?',
      );
    }
    throw err;
  }
}

export async function authLogout(): Promise<void> {
  await fetch(`${API_URL}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
}

export async function getHome(): Promise<{
  popular: Array<{
    id: string;
    canonical_title: string;
    author_name: string;
    author_id: string;
    language: string;
    licenses: string[];
    source_ids: string[];
    cover_url: string | null;
    popularity_score: number;
  }>;
  recent: Array<{
    id: string;
    canonical_title: string;
    author_name: string;
    author_id: string;
    language: string;
    licenses: string[];
    source_ids: string[];
    cover_url: string | null;
    popularity_score: number;
  }>;
  bySubject: Array<{
    subject: string;
    works: Array<{
      id: string;
      canonical_title: string;
      author_name: string;
      author_id: string;
      language: string;
      licenses: string[];
      source_ids: string[];
      cover_url: string | null;
      popularity_score: number;
    }>;
  }>;
}> {
  const res = await fetch(`${API_URL}/api/home`, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to load home');
  return res.json();
}

export async function getWorkRatings(workId: string): Promise<{
  average: number;
  count: number;
  userRating?: number;
}> {
  const res = await fetch(`${API_URL}/api/works/${workId}/ratings`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to load ratings');
  return res.json();
}

export async function rateWork(
  workId: string,
  score: number,
): Promise<{ average: number; count: number; userRating: number }> {
  const res = await fetch(`${API_URL}/api/works/${workId}/rate`, {
    method: 'POST',
    ...defaultFetchOptions,
    body: JSON.stringify({ score }),
  });
  if (!res.ok) throw new Error('Failed to rate');
  return res.json();
}

export async function removeWorkRating(workId: string): Promise<{
  average: number;
  count: number;
}> {
  const res = await fetch(`${API_URL}/api/works/${workId}/rate`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to remove rating');
  return res.json();
}

export async function getSavedWorks(): Promise<{
  works: Array<{
    id: string;
    canonical_title: string;
    author_name: string;
    author_id: string;
    language: string;
    licenses: string[];
    source_ids: string[];
    cover_url: string | null;
    popularity_score: number;
  }>;
}> {
  const res = await fetch(`${API_URL}/api/me/saved`, { credentials: 'include' });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Not authenticated');
    throw new Error('Failed to load saved');
  }
  return res.json();
}

export async function checkSaved(workId: string): Promise<{ saved: boolean }> {
  const res = await fetch(`${API_URL}/api/me/saved/check/${workId}`, {
    credentials: 'include',
  });
  if (!res.ok) {
    if (res.status === 401) return { saved: false };
    throw new Error('Failed to check saved');
  }
  return res.json();
}

export async function addSaved(workId: string): Promise<{ saved: boolean }> {
  const res = await fetch(`${API_URL}/api/me/saved`, {
    method: 'POST',
    ...defaultFetchOptions,
    body: JSON.stringify({ work_id: workId }),
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Not authenticated');
    throw new Error('Failed to save');
  }
  return res.json();
}

export async function removeSaved(workId: string): Promise<{ removed: boolean }> {
  const res = await fetch(`${API_URL}/api/me/saved/${workId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to remove');
  return res.json();
}

export async function search(params: {
  q?: string;
  language?: string;
  license?: string;
  subject?: string;
  author_id?: string;
  source_id?: string;
  public_domain?: boolean;
  limit?: number;
  offset?: number;
}): Promise<{
  total: number;
  offset: number;
  limit: number;
  works: Array<{
    id: string;
    canonical_title: string;
    author_name: string;
    author_id: string;
    language: string;
    licenses: string[];
    source_ids: string[];
    cover_url: string | null;
    popularity_score: number;
  }>;
}> {
  const searchParams = new URLSearchParams();
  if (params.q) searchParams.set('q', params.q);
  if (params.language) searchParams.set('language', params.language);
  if (params.license) searchParams.set('license', params.license);
  if (params.subject) searchParams.set('subject', params.subject);
  if (params.author_id) searchParams.set('author_id', params.author_id);
  if (params.source_id) searchParams.set('source_id', params.source_id);
  if (params.public_domain === true) searchParams.set('public_domain', 'true');
  if (params.limit != null) searchParams.set('limit', String(params.limit));
  if (params.offset != null) searchParams.set('offset', String(params.offset));
  const res = await fetch(`${API_URL}/api/search?${searchParams}`);
  if (!res.ok) throw new Error('Search failed');
  return res.json();
}

export async function getSubjects(limit?: number): Promise<string[]> {
  const searchParams = new URLSearchParams();
  if (limit != null) searchParams.set('limit', String(limit));
  const url = `${API_URL}/api/search/subjects${searchParams.toString() ? `?${searchParams}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to load subjects');
  return res.json();
}

export async function getWork(id: string): Promise<{
  id: string;
  canonical_title: string;
  author: { id: string; canonical_name: string };
  language: string;
  description: string | null;
  subjects: string[];
  editions: Array<{
    id: string;
    license: string;
    download_url: string;
    cover_url: string | null;
    file_size: number | null;
    source: { id: string; name: string; base_url: string };
    quality_score: number;
  }>;
  cover_url: string | null;
  popularity_score: number;
  view_count: number;
  saved_count: number;
}> {
  const res = await fetch(`${API_URL}/api/works/${id}`);
  if (!res.ok) {
    if (res.status === 404) throw new Error('Work not found');
    throw new Error('Failed to load work');
  }
  return res.json();
}

export async function getAuthor(id: string): Promise<{
  id: string;
  canonical_name: string;
  aliases: string[];
  birth_year: number | null;
  death_year: number | null;
}> {
  const res = await fetch(`${API_URL}/api/authors/${id}`);
  if (!res.ok) {
    if (res.status === 404) throw new Error('Author not found');
    throw new Error('Failed to load author');
  }
  return res.json();
}

export async function getSources(): Promise<
  Array<{ id: string; name: string; base_url: string; trust_score: number; license_type: string }>
> {
  const res = await fetch(`${API_URL}/api/sources`);
  if (!res.ok) throw new Error('Failed to load sources');
  return res.json();
}

export async function triggerIngestion(): Promise<{ created: number; message: string }> {
  const res = await fetch(`${API_URL}/api/admin/ingestion/trigger`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to trigger ingestion');
  return res.json();
}

export async function getIngestionJobs(): Promise<{
  jobs: Array<{
    id: string;
    source_id: string;
    source_name: string;
    connector_type: string | null;
    status: string;
    started_at: string | null;
    completed_at: string | null;
    duration_seconds: number | null;
    error_message: string | null;
    created_at: string;
  }>;
}> {
  const res = await fetch(`${API_URL}/api/admin/ingestion/jobs`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to load jobs');
  return res.json();
}

export async function getIngestionJobDetail(jobId: string): Promise<{
  job: {
    id: string;
    source_id: string;
    source_name: string;
    status: string;
    started_at: string | null;
    completed_at: string | null;
    error_message: string | null;
    created_at: string;
  };
  events: Array<{
    id: string;
    event_type: string;
    message: string | null;
    detail: Record<string, unknown> | null;
    created_at: string;
  }>;
}> {
  const res = await fetch(`${API_URL}/api/admin/ingestion/jobs/${jobId}`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to load job');
  return res.json();
}

export async function cancelIngestionJob(
  jobId: string,
): Promise<{ message: string }> {
  const res = await fetch(`${API_URL}/api/admin/ingestion/jobs/${jobId}/cancel`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      (data as { message?: string }).message ?? 'Failed to cancel job',
    );
  }
  return res.json();
}

export async function retryIngestionJob(jobId: string): Promise<{ id: string; message: string }> {
  const res = await fetch(`${API_URL}/api/admin/ingestion/jobs/${jobId}/retry`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      (data as { message?: string }).message ?? 'Failed to retry job',
    );
  }
  return res.json();
}

export async function deleteIngestionJob(jobId: string): Promise<{ message: string }> {
  const res = await fetch(`${API_URL}/api/admin/ingestion/jobs/${jobId}`, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      (data as { message?: string }).message ?? 'Failed to delete job',
    );
  }
  return res.json();
}

export async function getAdminSources(): Promise<{
  sources: Array<{
    id: string;
    name: string;
    connector_type: string | null;
    base_url: string;
    enabled: boolean;
  }>;
}> {
  const res = await fetch(`${API_URL}/api/admin/ingestion/sources`, {
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to load sources');
  return res.json();
}

export async function triggerIngestionForSource(sourceId: string): Promise<{ created: boolean; jobId?: string; message: string }> {
  const res = await fetch(
    `${API_URL}/api/admin/ingestion/sources/${sourceId}/trigger`,
    { method: 'POST', credentials: 'include' },
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      (data as { message?: string }).message ?? 'Failed to trigger ingestion',
    );
  }
  return res.json();
}

export async function setSourceEnabled(sourceId: string, enabled: boolean): Promise<{ enabled: boolean; message: string }> {
  const res = await fetch(
    `${API_URL}/api/admin/ingestion/sources/${sourceId}`,
    {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    },
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(
      (data as { message?: string }).message ?? 'Failed to update source',
    );
  }
  return res.json();
}

export async function clearSearchIndex(): Promise<{ message: string; taskUid: number }> {
  const res = await fetch(`${API_URL}/api/admin/search/clear`, {
    method: 'POST',
    credentials: 'include',
  });
  if (!res.ok) throw new Error('Failed to clear search index');
  return res.json();
}

export type AdminStatsGroupBy = 'day' | 'week' | 'month';

export interface AdminStatsSummary {
  worksCount: number;
  authorsCount: number;
  editionsCount: number;
  sourcesCount: number;
  jobsByStatus: {
    pending: number;
    running: number;
    completed: number;
    failed: number;
    cancelled: number;
  };
}

export interface AdminStatsJobsTimeSeriesPoint {
  date: string;
  created: number;
  completed: number;
  failed: number;
}

export interface AdminStatsCatalogTimeSeriesPoint {
  date: string;
  works: number;
  editions: number;
}

export interface AdminStatsConnectorDurationPoint {
  connectorType: string;
  avgDurationSeconds: number;
  jobCount: number;
}

export interface AdminStatsResponse {
  summary: AdminStatsSummary;
  jobsTimeSeries: AdminStatsJobsTimeSeriesPoint[];
  catalogTimeSeries: AdminStatsCatalogTimeSeriesPoint[];
  connectorDurations: AdminStatsConnectorDurationPoint[];
}

export async function getAdminStats(params?: {
  from?: string;
  to?: string;
  groupBy?: AdminStatsGroupBy;
  sourceId?: string;
}): Promise<AdminStatsResponse> {
  const searchParams = new URLSearchParams();
  if (params?.from) searchParams.set('from', params.from);
  if (params?.to) searchParams.set('to', params.to);
  if (params?.groupBy) searchParams.set('groupBy', params.groupBy);
  if (params?.sourceId) searchParams.set('sourceId', params.sourceId);
  const qs = searchParams.toString();
  const url = qs ? `${API_URL}/api/admin/stats?${qs}` : `${API_URL}/api/admin/stats`;
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed to load admin stats');
  return res.json();
}
