/**
 * Kendibo runtime configuration — single source of truth for backend access.
 *
 * Backend port is read from kendibo-backend's main.ts listen call
 * (`Number(process.env.PORT ?? 3000)` → default 3000).
 * Override per-environment via `EXPO_PUBLIC_API_URL` (embedded at build time).
 */

function resolveApiBaseUrl(): string {
  const raw =
    process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
  return raw.trim().replace(/\/+$/, '');
}

export const API_BASE_URL = resolveApiBaseUrl();

/** Per-request network timeout (ms) for all live API calls. */
export const REQUEST_TIMEOUT_MS = 15000;
