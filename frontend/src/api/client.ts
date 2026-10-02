// fetch wrapper: every request has a 5 s timeout (SPEC §9.2). GET responses are cached so
// dashboards can show the last data when the API is unreachable (SPEC §9.4).
import { setSyncState } from './syncStatus';

export const API_BASE: string = (import.meta.env.VITE_API_URL as string | undefined) ?? '/api';
const TIMEOUT_MS = 5000;
const CACHE_PREFIX = 'rl.cache:';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init: RequestInit = {}, timeoutMs = TIMEOUT_MS): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      ...init,
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    });
    if (!res.ok) {
      let detail = res.statusText;
      try {
        const body = (await res.json()) as { detail?: unknown };
        if (body.detail) detail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail);
      } catch {
        // ignore
      }
      // The server answered, so we are online even if the request was rejected.
      setSyncState({ online: true });
      throw new ApiError(detail, res.status);
    }
    setSyncState({ online: true });
    return (await res.json()) as T;
  } catch (err) {
    if (!(err instanceof ApiError)) setSyncState({ online: false });
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

export const post = <T>(path: string, body: unknown) => api<T>(path, { method: 'POST', body: JSON.stringify(body) });
export const put = <T>(path: string, body: unknown) => api<T>(path, { method: 'PUT', body: JSON.stringify(body) });

export function readCache<T>(path: string): T | undefined {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + path);
    return raw ? (JSON.parse(raw) as T) : undefined;
  } catch {
    return undefined;
  }
}

export function writeCache(path: string, data: unknown): void {
  try {
    localStorage.setItem(CACHE_PREFIX + path, JSON.stringify(data));
  } catch {
    // storage full or unavailable: caching is best-effort
  }
}
