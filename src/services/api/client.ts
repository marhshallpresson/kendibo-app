import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL, REQUEST_TIMEOUT_MS } from '../../constants/config';

/** SecureStore keys for the live session (Bearer access + rotation refresh). */
export const ACCESS_KEY = 'kendibo_access';
export const REFRESH_KEY = 'kendibo_refresh';
/** Legacy key (mock era) — kept for import compat, no longer written. */
export const SESSION_STORAGE_KEY = 'kendibo_session';

/** Structured error for all live backend failures. */
export class ApiError extends Error {
  status: number;
  code?: string;
  retryable?: boolean;
  constructor(message: string, status: number, code?: string, retryable?: boolean) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.retryable = retryable;
  }
}

export interface ApiFetchOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** When false, no Authorization header is attached (e.g. OTP request). Default true. */
  auth?: boolean;
  timeoutMs?: number;
  /** Explicit Idempotency-Key; auto-generated for POST when absent. */
  idempotencyKey?: string;
}

async function readToken(key: string): Promise<string | null> {
  try {
    const v = await SecureStore.getItemAsync(key);
    return v ?? null;
  } catch {
    return null;
  }
}

function newIdemKey(prefix = 'm'): string {
  return `${prefix}_${Date.now().toString(36)}${Math.floor(Math.random() * 1e9).toString(36)}`;
}

interface Envelope {
  data?: unknown;
  error?: { code?: string; message?: string; retryable?: boolean } | string;
}

async function doFetch<T>(
  path: string,
  opts: ApiFetchOptions,
  token: string | null,
  timeoutMs: number,
): Promise<T> {
  const method = opts.method ?? 'GET';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (method === 'POST') {
      headers['Idempotency-Key'] = opts.idempotencyKey ?? newIdemKey();
    } else if (opts.idempotencyKey) {
      headers['Idempotency-Key'] = opts.idempotencyKey;
    }
    let res: Response;
    try {
      res = await fetch(`${API_BASE_URL}${path}`, {
        method,
        signal: controller.signal,
        headers,
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      });
    } catch (err) {
      if (err instanceof TypeError) throw new TypeError('API unreachable');
      throw new TypeError('API unreachable');
    }
    let json: Envelope = {};
    try {
      json = (await res.json()) as Envelope;
    } catch {
      json = {};
    }
    if (json && typeof json.error !== 'undefined' && json.error !== null) {
      const e = json.error;
      const message =
        typeof e === 'string' ? e : e.message || e.code || `Request failed (${res.status}).`;
      const code = typeof e === 'string' ? undefined : e.code;
      const retryable = typeof e === 'string' ? undefined : e.retryable;
      throw new ApiError(message, res.status, code, retryable);
    }
    if (!res.ok) {
      throw new ApiError(`Request failed (${res.status}).`, res.status);
    }
    // Backend contract is {data} | {error}. Unwrap data; endpoints without
    // data (e.g. {ok:true} legacy) fall back to the raw payload.
    if (json && typeof json === 'object' && 'data' in (json as object)) {
      return (json as { data: T }).data as T;
    }
    return json as unknown as T;
  } catch (err) {
    if (err instanceof ApiError || err instanceof TypeError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new TypeError('API unreachable');
    }
    throw new TypeError('API unreachable');
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Typed fetch wrapper for the Kendibo live backend (`/v1/*`, `{data}|{error}`).
 *
 * - Base URL + timeout from `src/constants/config.ts`
 * - JSON in/out; `{error}` envelope or non-2xx → `ApiError{message,status}`
 * - Network failure / timeout → `TypeError('API unreachable')`
 * - Bearer access token from SecureStore `kendibo_access` (unless `auth:false`)
 * - Auto-refresh once on 401 via `kendibo_refresh` → POST /v1/auth/refresh, then retry
 */
export async function apiFetch<T>(path: string, opts: ApiFetchOptions = {}): Promise<T> {
  const timeoutMs = opts.timeoutMs ?? REQUEST_TIMEOUT_MS;
  const useAuth = opts.auth ?? true;
  const token = useAuth ? await readToken(ACCESS_KEY) : null;

  try {
    return await doFetch<T>(path, opts, token, timeoutMs);
  } catch (err) {
    // Single auto-refresh + retry on 401 (authenticated calls only).
    if (err instanceof ApiError && err.status === 401 && useAuth) {
      const refresh = await readToken(REFRESH_KEY);
      if (!refresh) throw err;
      try {
        const rotated = await doFetch<{ access: string; refresh: string }>(
          '/v1/auth/refresh',
          { method: 'POST', body: { refresh }, auth: false },
          null,
          timeoutMs,
        );
        if (rotated?.access) {
          try {
            await SecureStore.setItemAsync(ACCESS_KEY, rotated.access);
          } catch {
            /* memory-only fallback */
          }
          if (rotated.refresh) {
            try {
              await SecureStore.setItemAsync(REFRESH_KEY, rotated.refresh);
            } catch {
              /* ignore */
            }
          }
          return await doFetch<T>(path, opts, rotated.access, timeoutMs);
        }
      } catch (refreshErr) {
        if (refreshErr instanceof ApiError) throw err;
        if (refreshErr instanceof TypeError) throw refreshErr;
        throw err;
      }
    }
    throw err;
  }
}
