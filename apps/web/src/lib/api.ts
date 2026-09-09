'use client';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export class ApiError extends Error {
  status: number;
  method: string;
  path: string;
  body: unknown;
  constructor(
    status: number,
    message: string,
    opts?: { method?: string; path?: string; body?: unknown }
  ) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.method = opts?.method ?? 'GET';
    this.path = opts?.path ?? '';
    this.body = opts?.body;
  }

  /** One-line human summary, e.g. "HTTP 401: Invalid username or password". */
  get summary(): string {
    return this.status > 0 ? `HTTP ${this.status}: ${this.message}` : this.message;
  }

  /** Full technical detail for debugging (endpoint, status, raw body). */
  get detail(): string {
    const url = `${API_URL}${this.path}`;
    const body =
      typeof this.body === 'string'
        ? this.body
        : this.body != null
          ? JSON.stringify(this.body)
          : '(empty)';
    return `${this.method} ${url}\nstatus: ${this.status}\nbody: ${body}`;
  }
}

/** Normalize any thrown value into an ApiError (network failures become status 0). */
export function toApiError(err: unknown, method = 'GET', path = ''): ApiError {
  if (err instanceof ApiError) return err;
  const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  return new ApiError(0, message, { method, path });
}

export async function api<T = unknown>(path: string, opts: RequestInit = {}): Promise<T> {
  const method = (opts.method || 'GET').toUpperCase();
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(opts.headers as Record<string, string>) },
      ...opts
    });
  } catch (err) {
    // Network-level failure: DNS, connection refused, offline, or CORS-blocked.
    throw toApiError(err, method, path);
  }
  const text = await res.text().catch(() => '');
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!res.ok) {
    const message =
      body && typeof body === 'object' && 'error' in body && typeof (body as { error: unknown }).error === 'string'
        ? (body as { error: string }).error
        : `Request failed (${res.status})`;
    throw new ApiError(res.status, message, { method, path, body });
  }
  return body as T;
}
