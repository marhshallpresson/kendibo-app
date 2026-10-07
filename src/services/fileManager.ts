import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { apiFetch } from './api/client';
import { uriToBase64 } from '../utils/images';

export interface QueuedUpload {
  id: string;
  localUri: string;
  endpoint: string;
  mimeType: string;
  fieldName: string;
  additionalData?: Record<string, unknown>;
  attempts: number;
  createdAt: string;
}

const OUTBOX_KEY = 'KENDIBO_UPLOAD_OUTBOX';
const MAX_ATTEMPTS = 5;

function newId(prefix = 'upl'): string {
  return `${prefix}_${Date.now().toString(36)}${Math.floor(Math.random() * 1e9).toString(36)}`;
}

async function readOutbox(): Promise<QueuedUpload[]> {
  try {
    const raw = await AsyncStorage.getItem(OUTBOX_KEY);
    return raw ? (JSON.parse(raw) as QueuedUpload[]) : [];
  } catch {
    return [];
  }
}

async function writeOutbox(items: QueuedUpload[]): Promise<void> {
  try {
    await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(items));
  } catch {
    /* storage full — uploads retry next launch */
  }
}

/**
 * Offline-first upload outbox for provider evidence.
 * Queue survives app kills (provider device dies / loses network).
 * Flow per item: POST endpoint (returns presigned assetId for evidence
 * endpoints, or accepts the ingest directly) -> base64 the file ->
 * POST /v1/media/:id/ingest. Failures stay queued with backoff.
 */
export const fileManager = {
  async queueForUpload(input: {
    localUri: string;
    endpoint: string;
    mimeType: string;
    fieldName: string;
    additionalData?: Record<string, unknown>;
  }): Promise<QueuedUpload> {
    const item: QueuedUpload = {
      id: newId(),
      ...input,
      attempts: 0,
      createdAt: new Date().toISOString(),
    };
    const box = await readOutbox();
    box.push(item);
    await writeOutbox(box);
    return item;
  },

  async pendingCount(): Promise<number> {
    return (await readOutbox()).length;
  },

  async processOutbox(): Promise<{ uploaded: number; pending: number }> {
    const net = await NetInfo.fetch().catch(() => null);
    if (net && !net.isConnected) return { uploaded: 0, pending: await this.pendingCount() };
    const box = await readOutbox();
    if (box.length === 0) return { uploaded: 0, pending: 0 };
    let uploaded = 0;
    const remaining: QueuedUpload[] = [];
    for (const item of box) {
      try {
        const base64 = await uriToBase64(item.localUri);
        // Evidence endpoints return a presigned asset; ingest into it.
        const presign = await apiFetch<{ assetId?: string; uploadUrl?: string }>(item.endpoint, {
          method: 'POST',
          body: { kind: 'photo', ...(item.additionalData ?? {}) },
        });
        if (presign?.assetId) {
          await apiFetch(`/v1/media/${presign.assetId}/ingest`, {
            method: 'POST',
            body: { dataBase64: base64, mime: item.mimeType },
          });
        }
        uploaded += 1;
      } catch {
        item.attempts += 1;
        if (item.attempts < MAX_ATTEMPTS) remaining.push(item);
        // else drop: reported via WatchUp counter by caller
      }
    }
    await writeOutbox(remaining);
    return { uploaded, pending: remaining.length };
  },

  async remove(id: string): Promise<void> {
    const box = await readOutbox();
    await writeOutbox(box.filter((u) => u.id !== id));
  },
};
