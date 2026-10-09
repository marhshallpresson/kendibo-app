/**
 * Kendibo runtime configuration — single source of truth for backend access.
 *
 * Resolution order:
 *  1. `EXPO_PUBLIC_API_URL` — inlined by Metro (dev) / EAS (build) at bundle
 *     time, so it is the only value that is correct on a real device.
 *  2. `expo.extra.apiUrl` — machine-local dev override (emulator/LAN).
 *  3. Dev → local backend (Android emulators reach the host via 10.0.2.2);
 *     release → the live API. A release build must never fall back to
 *     `localhost`, which no phone can reach (it surfaces as "API unreachable"
 *     on login even though the live API is up).
 */
import { Platform } from 'react-native';
import Constants from 'expo-constants';

/** Live KENDIBO API — release fallback when no env/extra is embedded. */
export const LIVE_API_URL = 'https://api-kendibo.pxxlspace.cv';

function normalize(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

function isHttpUrl(url: string): boolean {
  return /^https?:\/\/[^\s]+$/i.test(url);
}

/** Android emulators reach the dev machine through 10.0.2.2, not localhost. */
function forPlatform(url: string): string {
  if (Platform.OS !== 'android') return url;
  return url.replace(/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i, 'http://10.0.2.2$2');
}

function resolveApiBaseUrl(): string {
  // 1. Build-time env — authoritative in every environment.
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv && isHttpUrl(normalize(fromEnv))) return normalize(fromEnv);

  // 2. app.json `extra.apiUrl` — dev machines only; a loopback address in a
  //    release build would be unreachable from a phone, so ignore it there.
  const extra = (Constants.expoConfig?.extra ?? {}) as { apiUrl?: string };
  const fromExtra = extra?.apiUrl ? normalize(extra.apiUrl) : '';
  if (fromExtra && isHttpUrl(fromExtra)) {
    const isLoopback = /^https?:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:\d+)?/i.test(fromExtra);
    if (!isLoopback) return fromExtra;
    if (__DEV__) return forPlatform(fromExtra);
    if (fromExtra.startsWith('https://')) return fromExtra;
  }

  // 3. Nothing configured: dev → local backend, release → live API.
  return __DEV__ ? forPlatform('http://localhost:3000') : LIVE_API_URL;
}

export const API_BASE_URL = resolveApiBaseUrl();

/** Host of {@link API_BASE_URL} — used in user-facing "can't reach" errors. */
export const API_HOST = API_BASE_URL.replace(/^https?:\/\//i, '');

/** Per-request network timeout (ms) for all live API calls. */
export const REQUEST_TIMEOUT_MS = 15000;
