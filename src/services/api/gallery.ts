import { API_BASE_URL } from '../../constants/config';
import { apiFetch } from './client';
import { uploadMedia } from '../media';

export interface GalleryEntry {
  id: string;
  assetId: string;
  caption: string | null;
  position: number;
  createdAt: string;
  /** Absolute URL — resolve via `absoluteMediaUrl` if the backend returns a path. */
  url?: string;
}

/**
 * The gallery row carries only `assetId`; files are served from the media
 * route. Resolve it here so every screen renders photos without guessing.
 * A backend-provided absolute url (e.g. from a CDN) wins over the path form.
 */
export function galleryUrl(entry: GalleryEntry): string {
  if (entry.url && /^https?:\/\//i.test(entry.url)) return entry.url;
  return `${API_BASE_URL}/v1/media/${encodeURIComponent(entry.assetId)}/file`;
}

/** Public storefront read — keyed by provider id, no session required. */
export async function listGallery(providerId: string): Promise<GalleryEntry[]> {
  const rows = await apiFetch<GalleryEntry[]>(`/v1/provider/${encodeURIComponent(providerId)}/gallery`, { auth: false });
  return Array.isArray(rows) ? rows : [];
}

/** The signed-in provider's own gallery. */
export async function listMyGallery(): Promise<GalleryEntry[]> {
  const rows = await apiFetch<GalleryEntry[]>('/v1/provider/gallery/mine');
  return Array.isArray(rows) ? rows : [];
}

/**
 * Upload a local file and attach it to the caller's storefront gallery.
 * Two steps: the media pipeline (presign -> ingest -> clean), then the
 * gallery reference — the endpoint only accepts assets that cleared quarantine.
 */
export async function addGalleryPhoto(localUri: string, mime?: string, caption?: string): Promise<GalleryEntry[]> {
  const asset = await uploadMedia(localUri, 'photo', mime);
  return apiFetch<GalleryEntry[]>('/v1/provider/gallery', {
    method: 'POST',
    body: { assetId: asset.id, caption },
  });
}

/** Detach one photo. Scoped server-side to the caller's own provider row. */
export async function removeGalleryPhoto(entryId: string): Promise<void> {
  await apiFetch(`/v1/provider/gallery/${encodeURIComponent(entryId)}`, { method: 'DELETE' });
}
