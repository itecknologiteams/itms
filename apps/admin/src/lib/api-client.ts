import { ApiErrorBody } from '@/types/api';
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from './tokens';

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

let refreshPromise: Promise<void> | null = null;

async function refreshAccessToken(): Promise<void> {
  const refresh = getRefreshToken();
  if (!refresh) throw new ApiError('NO_REFRESH_TOKEN', 'Session expired', 401);

  const res = await fetch('/api/v1/auth/token/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refresh }),
  });
  if (!res.ok) {
    clearTokens();
    throw new ApiError('REFRESH_FAILED', 'Session expired', 401);
  }
  const body = (await res.json()) as { access: string; refresh: string };
  setTokens(body.access, body.refresh);
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  /** Skip attaching the Authorization header (login/OTP endpoints). */
  unauthenticated?: boolean;
}

/**
 * Fetch wrapper for the real backend, hitting the /api/v1/* rewrites that
 * emulate Kong locally (see next.config.js). Applies the standard error
 * envelope (docs/api-design.md §1) and retries once on 401 via refresh.
 */
export async function apiFetch<T>(path: string, opts: RequestOptions = {}, isRetry = false): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (!opts.unauthenticated) {
    const token = getAccessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`/api/v1${path}`, {
    method: opts.method ?? 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  if (res.status === 401 && !opts.unauthenticated && !isRetry) {
    refreshPromise ??= refreshAccessToken().finally(() => (refreshPromise = null));
    await refreshPromise;
    return apiFetch<T>(path, opts, true);
  }

  if (!res.ok) {
    let body: ApiErrorBody | undefined;
    try {
      body = (await res.json()) as ApiErrorBody;
    } catch {
      // non-JSON error body (e.g. gateway timeout) — fall through to generic error
    }
    throw new ApiError(
      body?.error.code ?? 'UNKNOWN_ERROR',
      body?.error.message ?? `Request failed (${res.status})`,
      res.status,
      body?.error.details,
    );
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
