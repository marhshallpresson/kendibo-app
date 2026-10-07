import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { api, newIdemKey } from './api';

export interface QueuedCommand {
  clientEventId: string;
  command: string;
  jobId: string;
  clientTs: string;
  payload?: Record<string, unknown>;
}

const KEY = 'KENDIBO_PROVIDER_SYNC_QUEUE';
let flushing = false;
let listeners: Array<() => void> = [];

export function onSyncFlush(fn: () => void): () => void {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}

async function readQueue(): Promise<QueuedCommand[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as QueuedCommand[]) : [];
  } catch {
    return [];
  }
}

async function writeQueue(q: QueuedCommand[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(q));
}

/**
 * Offline-first provider command queue (PRD §60, backend POST /v1/provider/sync).
 * - persisted across app kills (provider device dies / loses network)
 * - clientEventId dedupes server-side: replays are safe
 * - flushes on reconnect; failures stay queued for next flush
 */
export async function enqueueCommand(command: string, jobId: string, payload?: Record<string, unknown>): Promise<QueuedCommand> {
  const cmd: QueuedCommand = {
    clientEventId: newIdemKey('evt'),
    command,
    jobId,
    clientTs: new Date().toISOString(),
    payload,
  };
  const q = await readQueue();
  q.push(cmd);
  await writeQueue(q);
  void flushQueue();
  return cmd;
}

export async function pendingCount(): Promise<number> {
  return (await readQueue()).length;
}

export async function flushQueue(token?: string): Promise<{ applied: number; pending: number }> {
  if (flushing) return { applied: 0, pending: await pendingCount() };
  const net = await NetInfo.fetch();
  if (!net.isConnected) return { applied: 0, pending: await pendingCount() };
  const q = await readQueue();
  if (q.length === 0) return { applied: 0, pending: 0 };
  flushing = true;
  try {
    const res = await api<{ results: { clientEventId: string; status: string }[] }>('/v1/provider/sync', {
      method: 'POST',
      body: { commands: q },
      token,
    });
    const settled = new Set(res.results.filter((r) => r.status !== 'rejected').map((r) => r.clientEventId));
    // rejected (e.g. JOB_ALREADY_COMPLETED) stays visible to caller but leaves queue
    await writeQueue(q.filter((c) => !settled.has(c.clientEventId)));
    listeners.forEach((l) => l());
    return { applied: settled.size, pending: (await readQueue()).length };
  } catch {
    return { applied: 0, pending: q.length };
  } finally {
    flushing = false;
  }
}

NetInfo.addEventListener((state) => {
  if (state.isConnected) void flushQueue();
});
