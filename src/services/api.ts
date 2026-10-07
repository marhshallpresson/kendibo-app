import Constants, { ExecutionEnvironment } from 'expo-constants';
import NetInfo from '@react-native-community/netinfo';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../constants/config';
import { ACCESS_KEY } from './api/client';

export interface ApiErrorShape {
  code: string;
  message: string;
  retryable: boolean;
}

function baseUrl(): string {
  // Single source of truth lives in constants/config (EXPO_PUBLIC_API_URL).
  // On Android emulators, host loopback is reachable via 10.0.2.2.
  if (!__DEV__) return API_BASE_URL;
  if (process.env.EXPO_PUBLIC_API_URL) return API_BASE_URL;
  const extra = Constants.expoConfig?.extra as { apiUrl?: string } | undefined;
  if (extra?.apiUrl) return extra.apiUrl;
  if (/localhost|127\.0\.0\.1/.test(API_BASE_URL)) {
    return API_BASE_URL.replace(/localhost|127\.0\.0\.1/, '10.0.2.2');
  }
  return API_BASE_URL;
}

async function resolveToken(explicit?: string): Promise<string | null> {
  if (explicit) return explicit;
  try {
    return (await SecureStore.getItemAsync(ACCESS_KEY)) ?? null;
  } catch {
    return null;
  }
}

export function newIdemKey(prefix = 'm'): string {
  return `${prefix}_${Date.now().toString(36)}${Math.floor(Math.random() * 1e9).toString(36)}`;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Backend HTTP client — mobile-first:
 * - 12s timeout (no endless blocking spinners on weak networks)
 * - exponential backoff retry ONLY when error.retryable or network down
 * - Idempotency-Key auto-attached on every POST (double-tap safe)
 * - structured errors map to App J error states (what happened / retry?)
 */
export async function api<T>(
  path: string,
  opts: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    body?: unknown;
    token?: string;
    idempotencyKey?: string;
    timeoutMs?: number;
    retries?: number;
  } = {},
): Promise<T> {
  const { method = 'GET', timeoutMs = 12000, retries = 2 } = opts;
  const idem = opts.idempotencyKey ?? (method === 'POST' ? newIdemKey() : undefined);
  const token = await resolveToken(opts.token);
  let lastErr: ApiErrorShape = { code: 'NETWORK_OFFLINE', message: 'No connection. Your data is saved — retry when online.', retryable: true };

  for (let attempt = 0; attempt <= retries; attempt++) {
    const net = await NetInfo.fetch();
    if (!net.isConnected) {
      lastErr = { code: 'NETWORK_OFFLINE', message: 'No connection. Will retry automatically.', retryable: true };
      await sleep(800 * (attempt + 1));
      continue;
    }
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(`${baseUrl()}${path}`, {
        method,
        signal: ctrl.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(idem ? { 'Idempotency-Key': idem } : {}),
        },
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      });
      const json = (await res.json().catch(() => ({}))) as { data?: T; error?: ApiErrorShape };
      if (!res.ok || json.error) {
        const e = json.error ?? { code: `HTTP_${res.status}`, message: 'Request failed.', retryable: res.status >= 500 };
        if (!e.retryable || attempt === retries) throw e;
        lastErr = e;
        await sleep(1000 * 2 ** attempt);
        continue;
      }
      return json.data as T;
    } catch (e: unknown) {
      const shaped: ApiErrorShape =
        (e as ApiErrorShape)?.code
          ? (e as ApiErrorShape)
          : { code: 'NETWORK_TIMEOUT', message: 'Slow network — timed out. Nothing was lost; retry.', retryable: true };
      if (!shaped.retryable || attempt === retries) throw shaped;
      lastErr = shaped;
      await sleep(1000 * 2 ** attempt);
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastErr;
}

export function isExpoGo(): boolean {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}
