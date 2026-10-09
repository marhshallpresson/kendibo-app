import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import Constants from 'expo-constants';

/**
 * WatchUp React Native client — same ingest contract as the official SDKs:
 * POST https://api.watchup.site/api/v1/ingest/batch
 * (Bearer + X-Api-Key + Idempotency-Key), kinds errors/traces/events,
 * client-side PII redaction + truncation, offline-durable queue (max 1000,
 * oldest drop), NetInfo-gated flush, 30s flag refresh with deterministic
 * local evaluation, sampling. Fail-open everywhere — monitoring must never
 * break booking, payment or tracking flows, and must survive weak networks.
 */

const BASE_URL = 'https://api.watchup.site';
const INGEST_PATH = '/api/v1/ingest/batch';
/** Telemetry/flags calls are best-effort: short timeout, never reject. */
const TELEMETRY_TIMEOUT_MS = 5000;
const QUEUE_KEY = 'KENDIBO_WATCHUP_QUEUE';
const FLAGS_KEY = 'KENDIBO_WATCHUP_FLAGS';
const MAX_BATCH = 100;
const MAX_QUEUE = 1000;
const REDACTED = '[REDACTED]';


const SENSITIVE = new Set([
  'password', 'passwd', 'secret', 'api_key', 'apikey', 'access_token',
  'refresh_token', 'refreshtoken', 'authorization', 'auth', 'token', 'otp',
  'pin', 'card', 'cvv', 'bvn', 'nin', 'account_number', 'accountnumber',
  'cookie', 'cookies', 'private_key', 'client_secret',
]);

export interface WatchupUser {
  id: string;
  email?: string;
  name?: string;
}

interface Item {
  kind: 'error' | 'trace' | 'event';
  [k: string]: unknown;
}

function truncate(value: string, maxBytes: number): string {
  const bytes = value.length * 3; // conservative: assume worst-case UTF-8
  void bytes;
  if (value.length <= maxBytes) return value;
  return `${value.slice(0, maxBytes)}…[truncated]`;
}

function sanitize(value: unknown, depth = 0): unknown {
  if (value == null || depth > 10) return value;
  if (typeof value === 'string') return truncate(value, 8192);
  if (Array.isArray(value)) return value.slice(0, 200).map((v) => sanitize(v, depth + 1));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    let n = 0;
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (n++ >= 200) break;
      out[k] = SENSITIVE.has(k.toLowerCase()) ? REDACTED : sanitize(v, depth + 1);
    }
    return out;
  }
  return value;
}

function bucket(key: string, id: string): number {
  let h = 2166136261;
  for (const c of `${key}:${id}`) {
    h ^= c.codePointAt(0) ?? 0;
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % 100;
}

/**
 * Fire-and-forget fetch for telemetry. Resolves to `null` on ANY failure
 * (offline, DNS reset, timeout, non-2xx) so a WatchUp host outage can never
 * reject into app code — login/booking must not see telemetry errors.
 */
async function quietFetch(url: string, init?: RequestInit): Promise<Response | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TELEMETRY_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}


interface FlagRule {
  key: string;
  enabled: boolean;
  rollout?: number;
  variants?: { name: string; weight: number }[];
}

class WatchupRN {
  private apiKey = '';
  private environment = 'development';
  private release = 'dev';
  private user: WatchupUser | null = null;
  private queue: Item[] = [];
  private flags = new Map<string, FlagRule>();
  private flushing = false;
  private loaded = false;
  sampleRate = 1;

  configure(opts: { apiKey?: string; environment?: string; release?: string; sampleRate?: number } = {}): void {
    const extra = (Constants.expoConfig?.extra ?? {}) as { watchupKey?: string };
    this.apiKey =
      opts.apiKey ?? process.env.EXPO_PUBLIC_WATCHUP_KEY ?? extra.watchupKey ?? '';
    this.environment = opts.environment ?? process.env.EXPO_PUBLIC_WATCHUP_ENV ?? 'development';
    this.release = opts.release ?? 'dev';
    if (opts.sampleRate !== undefined) this.sampleRate = opts.sampleRate;
  }

  get enabled(): boolean {
    return this.apiKey.length > 0;
  }

  setUser(user: WatchupUser | null): void {
    this.user = user;
  }

  private async load(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;
    try {
      const [q, f] = await Promise.all([
        AsyncStorage.getItem(QUEUE_KEY),
        AsyncStorage.getItem(FLAGS_KEY),
      ]);
      if (q) this.queue = (JSON.parse(q) as Item[]).slice(-MAX_QUEUE);
      if (f) {
        for (const r of JSON.parse(f) as FlagRule[]) this.flags.set(r.key, r);
      }
    } catch {
      /* corrupted storage -> start fresh */
    }
  }

  private async persist(): Promise<void> {
    try {
      await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue.slice(-MAX_QUEUE)));
    } catch {
      /* storage full/unavailable -> keep serving */
    }
  }

  private push(item: Item): void {
    try {
      if (this.queue.length >= MAX_QUEUE) this.queue.shift();
      this.queue.push(item);
      void this.persist();
    } catch {
      /* fail open */
    }
  }

  captureException(err: unknown, ctx?: Record<string, unknown>): void {
    try {
      if (!this.enabled) return;
      const e = err as { message?: string; name?: string; stack?: string };
      this.load()
        .then(() =>
          this.push({
            kind: 'error',
            message: truncate(String(e?.message ?? err), 8192),
            level: 'error',
            timestamp: new Date().toISOString(),
            type: e?.name,
            stack: e?.stack ? truncate(e.stack, 32768) : undefined,
            context: ctx ? (sanitize(ctx) as Record<string, unknown>) : undefined,
            environment: this.environment,
            release: this.release,
            service: 'kendibo-app',
            user: this.user ?? undefined,
          }),
        )
        .catch(() => {
          /* fail open — telemetry never rejects into callers */
        });
    } catch {
      /* fail open */
    }
  }

  /** Business event: booking.created, payment.failed, provider.assigned, ... */
  track(name: string, properties?: Record<string, unknown>): void {
    try {
      if (!this.enabled) return;
      this.load()
        .then(() =>
          this.push({
            kind: 'event',
            name,
            occurred_at: new Date().toISOString(),
            properties: {
              ...((sanitize(properties) as Record<string, unknown>) ?? {}),
              environment: this.environment,
              release: this.release,
              service: 'kendibo-app',
            },
          }),
        )
        .catch(() => {
          /* fail open */
        });
    } catch {
      /* fail open */
    }
  }

  /** Screen trace (route + duration + status). No bodies, no PII. */
  traceScreen(route: string, ms: number, status: 'ok' | 'err' = 'ok'): void {
    try {
      if (!this.enabled || Math.random() > this.sampleRate) return;
      this.load()
        .then(() =>
          this.push({
            kind: 'trace',
            span: `screen ${route}`,
            ms: Math.round(ms * 100) / 100,
            status_code: status === 'ok' ? 200 : 500,
            status,
            timestamp: new Date().toISOString(),
            environment: this.environment,
            release: this.release,
            service: 'kendibo-app',
            meta: { route },
          }),
        )
        .catch(() => {
          /* fail open */
        });
    } catch {
      /* fail open */
    }
  }

  isEnabled(key: string, fallback = false): boolean {
    try {
      const rule = this.flags.get(key);
      if (!rule || !rule.enabled) return rule?.enabled ?? fallback;
      if (!rule.rollout || rule.rollout >= 100) return true;
      if (!this.user) return fallback;
      return bucket(key, this.user.id) < rule.rollout;
    } catch {
      return fallback;
    }
  }

  /**
   * Flags refresh — fail-open by contract. `quietFetch` swallows outages
   * (the api.watchup.site host resetting connections is normal), so this
   * NEVER rejects: a WatchUp outage can't surface as "API not reachable"
   * during login or block any screen.
   */
  async refreshFlags(): Promise<void> {
    try {
      if (!this.enabled) return;
      const net = await NetInfo.fetch();
      if (!net.isConnected) return;
      const res = await quietFetch(`${BASE_URL}/api/v1/flags`, {
        headers: { Authorization: `Bearer ${this.apiKey}`, 'X-Api-Key': this.apiKey },
      });
      if (!res || !res.ok) return;
      const json = (await res.json().catch(() => null)) as { flags?: FlagRule[] } | null;
      if (!json) return;
      for (const f of json.flags ?? []) this.flags.set(f.key, f);
      try {
        await AsyncStorage.setItem(FLAGS_KEY, JSON.stringify([...this.flags.values()]));
      } catch {
        /* ignore */
      }
    } catch {
      /* fail open, cached flags stand */
    }
  }

  async flush(): Promise<void> {
    if (this.flushing || !this.enabled || this.queue.length === 0) return;
    try {
      const net = await NetInfo.fetch();
      if (!net.isConnected) return;
    } catch {
      return;
    }
    this.flushing = true;
    try {
      await this.load();
      while (this.queue.length > 0) {
        const batch = this.queue.splice(0, MAX_BATCH);
        const events = batch.filter(i => i.kind === 'event');
        const errors = batch.filter(i => i.kind === 'error');
        const traces = batch.filter(i => i.kind === 'trace');
        const body = JSON.stringify({
          contract_version: 1,
          sdk: { name: 'kendibo-watchup-rn', version: '1.0.0' },
          service: 'kendibo-app',
          events,
          errors,
          traces,
        });
        const res = await quietFetch(`${BASE_URL}${INGEST_PATH}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
            'X-Api-Key': this.apiKey,
          },
          body,
        });
        if (!res?.ok) {
          this.queue.unshift(...batch.slice(-50));
          break;
        }
      }
      await this.persist();
    } catch {
      /* fail open */
    } finally {
      this.flushing = false;
    }
  }

  get queueDepth(): number {
    return this.queue.length;
  }
}

export const watchup = new WatchupRN();

/** Call once at app boot (before rendering providers that may throw). */
export function initWatchup(): void {
  try {
    watchup.configure();
    const ErrorUtils = (globalThis as unknown as { ErrorUtils?: { setGlobalHandler: (fn: (e: unknown) => void) => void } }).ErrorUtils;
    try {
      ErrorUtils?.setGlobalHandler((err) => {
        watchup.captureException(err, { source: 'globalHandler' });
      });
    } catch {
      /* non-RN runtimes (web) */
    }
    try {
      NetInfo.addEventListener((state) => {
        if (state.isConnected) watchup.flush().catch(() => {});
      });
    } catch {
      /* ignore */
    }
    const timer = setInterval(() => {
      watchup.flush().catch(() => {});
      watchup.refreshFlags().catch(() => {});
    }, 30000);
    const t = timer as unknown as { unref?: () => void };
    try {
      t.unref?.();
    } catch {
      /* browsers have no unref */
    }
  } catch {
    /* fail open — telemetry setup must never block app boot or login */
  }
}



