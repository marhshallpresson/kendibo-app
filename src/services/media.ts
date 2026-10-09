import { API_BASE_URL } from '../constants/config';
import { apiFetch } from './api/client';
import { uriToBase64 } from '../utils/images';

/**
 * Photo/avatar upload against the real media contract:
 *
 *   1. POST /v1/media/presign {kind}        -> { assetId, uploadUrl }
 *   2. POST /v1/media/:id/ingest {dataBase64, mime} -> quarantine -> clean
 *
 * There is NO `POST /v1/media/ingest` route (it 404s); the ingest step is
 * scoped to the asset created by presign. `presign.uploadUrl` is a `store://`
 * placeholder for the local/ftp drivers, so bytes must go through ingest —
 * the same flow `fileManager` uses for provider evidence.
 */
export type MediaKind = 'avatar' | 'photo' | 'video' | 'doc';

export interface UploadedMedia {
  id: string;
  /** Absolute URL (backend returns a relative `/v1/media/:id/file?...` path). */
  url: string;
  status: string;
}

/** Mime types the backend accepts (`ALLOWED_MIME` in media.service.ts). */
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'video/mp4', 'application/pdf'];

function extensionOf(uri: string): string {
  const clean = uri.split('?')[0].split('#')[0];
  const ext = clean.slice(clean.lastIndexOf('.') + 1).toLowerCase();
  return /^[a-z0-9]{2,5}$/.test(ext) ? ext : '';
}

/** Best-effort mime for picker output; backend re-validates on ingest. */
export function normalizeMime(mime?: string, uri = ''): string {
  const m = (mime ?? '').toLowerCase().split(';')[0].trim();
  if (m === 'image/jpg') return 'image/jpeg';
  if (m && ALLOWED_MIME.includes(m)) return m;
  const byExt: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    mp4: 'video/mp4',
    pdf: 'application/pdf',
  };
  return byExt[extensionOf(uri)] ?? (m || 'image/jpeg');
}

/** Backend serves files at a relative path — resolve it against the API host. */
export function absoluteMediaUrl(url?: string): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  return `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

/**
 * Upload one local file and return its served URL.
 * Throws when presign/ingest fails or the file is rejected (wrong type/size),
 * so callers can surface a real error instead of silently storing a
 * `file://` URI that no one else can open.
 */
export async function uploadMedia(
  localUri: string,
  kind: MediaKind = 'photo',
  mime?: string,
): Promise<UploadedMedia> {
  const presign = await apiFetch<{ assetId?: string; uploadUrl?: string }>('/v1/media/presign', {
    method: 'POST',
    body: { kind },
  });
  const assetId = presign?.assetId;
  if (!assetId) throw new Error('Photo upload failed. Please try again.');

  const dataBase64 = await uriToBase64(localUri);
  if (!dataBase64) throw new Error('Photo upload failed. The file could not be read.');

  const done = await apiFetch<{ id?: string; url?: string; status?: string }>(
    `/v1/media/${encodeURIComponent(assetId)}/ingest`,
    { method: 'POST', body: { dataBase64, mime: normalizeMime(mime, localUri) } },
  );

  const url = absoluteMediaUrl(done?.url);
  if (done?.status === 'rejected' || !url) {
    throw new Error(
      done?.status === 'rejected'
        ? 'That file type or size is not allowed. Use a JPG or PNG photo.'
        : 'Photo upload failed. Please try again.',
    );
  }
  return { id: done.id ?? assetId, url, status: done.status ?? 'clean' };
}
